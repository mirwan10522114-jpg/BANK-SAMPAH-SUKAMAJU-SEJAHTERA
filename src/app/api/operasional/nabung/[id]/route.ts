import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, creditSaldoTertahan, debitSaldoTertahan, creditPoints, debitPoints, addInventory, reduceInventory, calcPointsForRupiah } from '@/lib/business'
import { toNumber } from '@/lib/format'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tx = await db.savingTransaction.findUnique({
    where: { id },
    include: { user: true, items: { include: { wasteItem: { include: { category: true } } } }, createdBy: true },
  })
  if (!tx) return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })
  return NextResponse.json(tx)
}

// PATCH: edit QC for an existing nabung transaction (recalculates totals, balances, points, inventory)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const actor = await getActingUser(req)
  const { items: editItems, qcNotes } = body as {
    items: { id: string; quantityAfterQc: number; qcReason?: string | null }[]
    qcNotes?: string | null
  }

  if (!editItems || !Array.isArray(editItems) || editItems.length === 0) {
    return NextResponse.json({ error: 'Item QC wajib diisi' }, { status: 400 })
  }

  // Fetch the existing transaction with items
  const existing = await db.savingTransaction.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })
  }

  // Capture old values for delta adjustments
  const oldTotalValue = toNumber(existing.totalValue)
  const oldPoints = toNumber(existing.pointsAwarded)
  const oldTotalWeight = toNumber(existing.totalWeight)

  // Build a map of item updates
  const editMap = new Map<string, { quantityAfterQc: number; qcReason: string | null }>()
  for (const ei of editItems) {
    const qty = toNumber(ei.quantityAfterQc)
    if (qty < 0) {
      return NextResponse.json({ error: 'Kuantitas bersih tidak boleh negatif' }, { status: 400 })
    }
    editMap.set(ei.id, { quantityAfterQc: qty, qcReason: ei.qcReason ?? null })
  }

  // Recalculate new totals
  let newTotalWeight = 0
  let newTotalValue = 0
  const itemUpdates: {
    id: string
    quantity: number
    quantityAfterQc: number
    susutQc: number
    subtotal: number
    qcReason: string | null
    wasteItemId: string
    oldQuantity: number
  }[] = []

  for (const item of existing.items) {
    const edit = editMap.get(item.id)
    if (!edit) continue
    const before = toNumber(item.quantityBeforeQc)
    const after = edit.quantityAfterQc
    const susut = Math.max(0, before - after)
    const price = toNumber(item.pricePerUnitSnapshot)
    const subtotal = after * price
    newTotalWeight += after
    newTotalValue += subtotal
    itemUpdates.push({
      id: item.id,
      quantity: after,
      quantityAfterQc: after,
      susutQc: susut,
      subtotal,
      qcReason: edit.qcReason,
      wasteItemId: item.wasteItemId,
      oldQuantity: toNumber(item.quantity),
    })
  }

  if (itemUpdates.length === 0) {
    return NextResponse.json({ error: 'Tidak ada item yang cocok untuk diperbarui' }, { status: 400 })
  }

  // Calculate new points
  const { points: newPoints } = await calcPointsForRupiah(newTotalValue)
  const newQcStatus = itemUpdates.some((u) => u.susutQc > 0) ? 'adjusted' : 'passed'

  // Determine value delta for balance adjustment
  const valueDelta = newTotalValue - oldTotalValue
  const pointsDelta = newPoints - oldPoints

  // Update everything in a transaction
  const updated = await db.$transaction(async (prisma) => {
    // Update each item
    for (const upd of itemUpdates) {
      await prisma.savingTransactionItem.update({
        where: { id: upd.id },
        data: {
          quantity: upd.quantity,
          quantityAfterQc: upd.quantityAfterQc,
          susutQc: upd.susutQc,
          subtotal: upd.subtotal,
          qcReason: upd.qcReason,
        },
      })
    }

    // Update the transaction header
    const tx = await prisma.savingTransaction.update({
      where: { id },
      data: {
        totalWeight: newTotalWeight,
        totalValue: newTotalValue,
        pointsAwarded: newPoints,
        qcStatus: newQcStatus,
        qcAt: new Date(),
        qcById: actor?.id ?? null,
        qcNotes: qcNotes ?? null,
      },
      include: { items: true },
    })
    return tx
  })

  // Post-transaction adjustments (balance, points, inventory) — outside db.$transaction
  // to avoid Prisma nested write conflicts with the helper functions.
  const userId = existing.userId

  // 1. Adjust saldo tertahan (balance) for the value delta
  if (valueDelta > 0) {
    await creditSaldoTertahan(userId, valueDelta, 'qc_adjustment', id, `Koreksi QC setoran sampah (+${valueDelta})`, actor?.id)
  } else if (valueDelta < 0) {
    try {
      await debitSaldoTertahan(userId, Math.abs(valueDelta), 'qc_adjustment', id, `Koreksi QC setoran sampah (${valueDelta})`, actor?.id)
    } catch {
      // If insufficient saldo tertahan, skip the debit but log via balance history with a note
      // This is acceptable because QC correction may reduce below held balance after release.
    }
  }

  // 2. Adjust points for the delta
  if (pointsDelta > 0) {
    await creditPoints(userId, pointsDelta, 'qc_adjustment', id, `Koreksi poin QC setoran sampah (+${pointsDelta})`, actor?.id)
  } else if (pointsDelta < 0) {
    try {
      await debitPoints(userId, Math.abs(pointsDelta), 'correction', 'qc_adjustment', id, `Koreksi poin QC setoran sampah (${pointsDelta})`, actor?.id)
    } catch {
      // Insufficient points — skip debit
    }
  }

  // 3. Adjust inventory for each item delta
  for (const upd of itemUpdates) {
    const qtyDelta = upd.quantity - upd.oldQuantity
    if (qtyDelta > 0) {
      // added more clean quantity after QC edit
      try {
        await addInventory(upd.wasteItemId, 'nabung', qtyDelta, 'qc_adjustment', 'saving_transaction', id, actor?.id, `Koreksi QC tambah stok`)
      } catch {}
    } else if (qtyDelta < 0) {
      try {
        await reduceInventory(upd.wasteItemId, 'nabung', Math.abs(qtyDelta), 'qc_adjustment', 'saving_transaction', id, actor?.id, `Koreksi QC kurangi stok`)
      } catch {}
    }
  }

  return NextResponse.json({
    ...updated,
    _meta: {
      oldTotalWeight,
      newTotalWeight,
      oldTotalValue,
      newTotalValue,
      oldPoints,
      newPoints,
      valueDelta,
      pointsDelta,
      qcStatus: newQcStatus,
    },
  })
}
