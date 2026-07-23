import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, creditSaldoTertahan, creditPoints, addInventory, calcPointsForRupiah, generateTxNo } from '@/lib/business'
import { toNumber } from '@/lib/format'

// GET: list all saving transactions
// Query params:
//   userId   — filter by nasabah
//   qcStatus — 'passed' | 'adjusted' | 'failed' | 'pending'
//   dari     — ISO date (gte transactedAt)
//   sampai   — ISO date (lte transactedAt)
//   q        — search by nasabah name (case-insensitive contains)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const qcStatus = searchParams.get('qcStatus')
  const dari = searchParams.get('dari')
  const sampai = searchParams.get('sampai')
  const q = (searchParams.get('q') || '').trim()

  const where: any = {}
  if (userId) where.userId = userId
  if (qcStatus) where.qcStatus = qcStatus
  if (dari || sampai) {
    where.transactedAt = {}
    if (dari) where.transactedAt.gte = new Date(dari)
    if (sampai) {
      const s = new Date(sampai)
      // include the full end day
      s.setHours(23, 59, 59, 999)
      where.transactedAt.lte = s
    }
  }

  // Search by user name: fetch matching user IDs first, then filter.
  if (q) {
    const matched = await db.user.findMany({
      where: { name: { contains: q } },
      select: { id: true },
      take: 200,
    })
    const matchedUserIds = matched.map((u) => u.id)
    if (matchedUserIds.length === 0) {
      return NextResponse.json([])
    }
    where.userId = { in: matchedUserIds }
  }

  const tx = await db.savingTransaction.findMany({
    where,
    orderBy: { transactedAt: 'desc' },
    include: { user: true, items: { include: { wasteItem: true } } },
    take: 100,
  })
  return NextResponse.json(tx)
}

// POST: create a nabung sampah transaction with QC + balance + points + inventory integration
export async function POST(req: NextRequest) {
  const body = await req.json()
  const actor = await getActingUser(req)
  const { userId, items, notes, applyQc } = body as {
    userId: string
    items: { wasteItemId: string; quantityBeforeQc: number; quantityAfterQc?: number; qcReason?: string }[]
    notes?: string
    applyQc?: boolean
  }

  if (!userId) return NextResponse.json({ error: 'Nasabah wajib dipilih' }, { status: 400 })
  if (!items?.length) return NextResponse.json({ error: 'Minimal 1 item sampah' }, { status: 400 })

  // Build item snapshots
  const wasteItems = await db.wasteItem.findMany({
    where: { id: { in: items.map((i) => i.wasteItemId) } },
    include: { category: true, prices: { orderBy: { effectiveFrom: 'desc' }, take: 1 } },
  })

  let totalWeight = 0
  let totalValue = 0
  const itemRows = items.map((it) => {
    const wi = wasteItems.find((w) => w.id === it.wasteItemId)
    if (!wi) throw new Error('Barang sampah tidak ditemukan')
    const price = wi.prices[0] ? toNumber(wi.prices[0].pricePerUnit) : toNumber(wi.pricePerUnit)
    const wastePriceId = wi.prices[0]?.id
    const before = toNumber(it.quantityBeforeQc)
    const after = applyQc && it.quantityAfterQc != null ? toNumber(it.quantityAfterQc) : before
    const susut = Math.max(0, before - after)
    const finalQty = after
    const subtotal = finalQty * price
    const subtotalBefore = before * price
    totalWeight += finalQty
    totalValue += subtotal
    return {
      wasteItemId: wi.id,
      wastePriceId,
      itemCodeSnapshot: wi.code,
      itemNameSnapshot: wi.name,
      categoryNameSnapshot: wi.category.name,
      unitSnapshot: wi.unit,
      pricePerUnitSnapshot: price,
      quantity: finalQty,
      subtotal,
      quantityBeforeQc: before,
      quantityAfterQc: applyQc ? after : null,
      susutQc: susut,
      subtotalBeforeQc: subtotalBefore,
      qcReason: it.qcReason || null,
    }
  })

  const qcStatus = applyQc ? (itemRows.some((r) => r.susutQc > 0) ? 'adjusted' : 'passed') : 'passed'
  const { points } = await calcPointsForRupiah(totalValue)

  // Create transaction + items in a transaction
  const tx = await db.$transaction(async (prisma) => {
    const saving = await prisma.savingTransaction.create({
      data: {
        userId,
        totalWeight,
        totalValue,
        pointsAwarded: points,
        notes,
        createdById: actor?.id,
        qcStatus,
        qcAt: new Date(),
        qcById: actor?.id,
        items: { create: itemRows },
      },
      include: { items: true },
    })
    return saving
  })

  // Post-transaction integration (balance, points, inventory)
  // 1. Credit saldo tertahan
  await creditSaldoTertahan(userId, totalValue, 'saving_transaction', tx.id, `Setoran sampah ${tx.id.slice(-6)}`, actor?.id)
  // 2. Credit points
  if (points > 0) {
    const { rule } = await calcPointsForRupiah(totalValue)
    await creditPoints(userId, points, 'saving_transaction', tx.id, `Reward poin setoran sampah`, actor?.id, rule?.id)
  }
  // 3. Add inventory stock (source: nabung)
  for (const row of itemRows) {
    await addInventory(row.wasteItemId, 'nabung', toNumber(row.quantity), 'saving', 'saving_transaction', tx.id, actor?.id, `Setoran dari nasabah`)
  }

  return NextResponse.json(tx, { status: 201 })
}
