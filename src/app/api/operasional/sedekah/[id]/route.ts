import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, addInventory, reduceInventory } from '@/lib/business'
import { toNumber } from '@/lib/format'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tx = await db.sedekahTransaction.findUnique({
    where: { id },
    include: { user: true, items: { include: { wasteItem: { include: { category: true } } } }, createdBy: true },
  })
  if (!tx) return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })
  return NextResponse.json(tx)
}

// PATCH: edit QC for an existing sedekah transaction (recalculates weights, adjusts inventory)
// Note: sedekah does not affect saldo/points — only inventory and weight stats.
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

  const existing = await db.sedekahTransaction.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })
  }

  const oldTotalBersih = toNumber(existing.totalWeightBersih ?? existing.totalWeight)
  const oldTotalKotor = toNumber(existing.totalWeightKotor ?? existing.totalWeight)

  const editMap = new Map<string, { quantityAfterQc: number; qcReason: string | null }>()
  for (const ei of editItems) {
    const qty = toNumber(ei.quantityAfterQc)
    if (qty < 0) {
      return NextResponse.json({ error: 'Kuantitas bersih tidak boleh negatif' }, { status: 400 })
    }
    editMap.set(ei.id, { quantityAfterQc: qty, qcReason: ei.qcReason ?? null })
  }

  let newTotalBersih = 0
  let newTotalKotor = 0
  const itemUpdates: {
    id: string
    quantity: number
    quantityAfterQc: number
    susutQc: number
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
    newTotalBersih += after
    newTotalKotor += before
    itemUpdates.push({
      id: item.id,
      quantity: after,
      quantityAfterQc: after,
      susutQc: susut,
      qcReason: edit.qcReason,
      wasteItemId: item.wasteItemId,
      oldQuantity: toNumber(item.quantity),
    })
  }

  if (itemUpdates.length === 0) {
    return NextResponse.json({ error: 'Tidak ada item yang cocok untuk diperbarui' }, { status: 400 })
  }

  const persentaseSusut = newTotalKotor > 0 ? (newTotalKotor - newTotalBersih) / newTotalKotor * 100 : 0
  const newQcStatus = itemUpdates.some((u) => u.susutQc > 0) ? 'adjusted' : 'passed'

  const updated = await db.$transaction(async (prisma) => {
    for (const upd of itemUpdates) {
      await prisma.sedekahTransactionItem.update({
        where: { id: upd.id },
        data: {
          quantity: upd.quantity,
          quantityAfterQc: upd.quantityAfterQc,
          susutQc: upd.susutQc,
          qcReason: upd.qcReason,
        },
      })
    }

    const tx = await prisma.sedekahTransaction.update({
      where: { id },
      data: {
        totalWeight: newTotalBersih,
        totalWeightKotor: newTotalKotor,
        totalWeightBersih: newTotalBersih,
        persentaseSusut,
        qcStatus: newQcStatus,
        qcAt: new Date(),
        qcById: actor?.id ?? null,
        qcNotes: qcNotes ?? null,
      },
      include: { items: true },
    })
    return tx
  })

  // Adjust inventory for each item delta
  for (const upd of itemUpdates) {
    const qtyDelta = upd.quantity - upd.oldQuantity
    if (qtyDelta > 0) {
      try {
        await addInventory(upd.wasteItemId, 'sedekah', qtyDelta, 'qc_adjustment', 'sedekah_transaction', id, actor?.id, `Koreksi QC tambah stok sedekah`)
      } catch {}
    } else if (qtyDelta < 0) {
      try {
        await reduceInventory(upd.wasteItemId, 'sedekah', Math.abs(qtyDelta), 'qc_adjustment', 'sedekah_transaction', id, actor?.id, `Koreksi QC kurangi stok sedekah`)
      } catch {}
    }
  }

  return NextResponse.json({
    ...updated,
    _meta: {
      oldTotalBersih,
      newTotalBersih,
      oldTotalKotor,
      newTotalKotor,
      persentaseSusut,
      qcStatus: newQcStatus,
    },
  })
}
