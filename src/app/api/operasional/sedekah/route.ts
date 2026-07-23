import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, addInventory, generateTxNo } from '@/lib/business'
import { toNumber } from '@/lib/format'

// GET: list sedekah transactions
// Query params:
//   userId   — filter by donor (nasabah)
//   qcStatus — 'passed' | 'adjusted' | 'failed' | 'pending'
//   dari     — ISO date (gte transactedAt)
//   sampai   — ISO date (lte transactedAt)
//   q        — search by user name OR donorName (case-insensitive contains)
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
      s.setHours(23, 59, 59, 999)
      where.transactedAt.lte = s
    }
  }

  if (q) {
    // Match either user.name OR donorName (OR-combined via Prisma OR).
    const matched = await db.user.findMany({
      where: { name: { contains: q } },
      select: { id: true },
      take: 200,
    })
    const matchedUserIds = matched.map((u) => u.id)
    const orClauses: any[] = [
      { donorName: { contains: q } },
    ]
    if (matchedUserIds.length > 0) {
      orClauses.push({ userId: { in: matchedUserIds } })
    }
    where.OR = orClauses
  }

  const tx = await db.sedekahTransaction.findMany({
    where,
    orderBy: { transactedAt: 'desc' },
    include: { user: true, items: { include: { wasteItem: true } } },
    take: 100,
  })
  return NextResponse.json(tx)
}

// POST: create sedekah sampah transaction (no balance/points - pure donation to bank)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const actor = await getActingUser(req)
  const { userId, donorName, items, notes, applyQc } = body as {
    userId?: string
    donorName?: string
    items: { wasteItemId: string; quantityBeforeQc: number; quantityAfterQc?: number; qcReason?: string }[]
    notes?: string
    applyQc?: boolean
  }

  if (!userId && !donorName) return NextResponse.json({ error: 'Nasabah atau nama donatur wajib diisi' }, { status: 400 })
  if (!items?.length) return NextResponse.json({ error: 'Minimal 1 item sampah' }, { status: 400 })

  const wasteItems = await db.wasteItem.findMany({
    where: { id: { in: items.map((i) => i.wasteItemId) } },
    include: { category: true },
  })

  let totalKotor = 0
  let totalBersih = 0
  const itemRows = items.map((it) => {
    const wi = wasteItems.find((w) => w.id === it.wasteItemId)
    if (!wi) throw new Error('Barang sampah tidak ditemukan')
    const before = toNumber(it.quantityBeforeQc)
    const after = applyQc && it.quantityAfterQc != null ? toNumber(it.quantityAfterQc) : before
    const susut = Math.max(0, before - after)
    totalKotor += before
    totalBersih += after
    return {
      wasteItemId: wi.id,
      itemCodeSnapshot: wi.code,
      itemNameSnapshot: wi.name,
      categoryNameSnapshot: wi.category.name,
      unitSnapshot: wi.unit,
      quantity: after,
      quantityBeforeQc: before,
      quantityAfterQc: applyQc ? after : null,
      susutQc: susut,
      qcReason: it.qcReason || null,
    }
  })

  const qcStatus = applyQc ? (itemRows.some((r) => r.susutQc > 0) ? 'adjusted' : 'passed') : 'passed'
  const persentaseSusut = totalKotor > 0 ? (Math.round(((totalKotor - totalBersih) / totalKotor) * 10000) / 100) : 0

  const tx = await db.sedekahTransaction.create({
    data: {
      userId: userId || null,
      donorName: donorName || null,
      totalWeight: totalBersih,
      totalWeightKotor: totalKotor,
      totalWeightBersih: totalBersih,
      persentaseSusut,
      notes,
      createdById: actor?.id,
      qcStatus,
      qcAt: new Date(),
      qcById: actor?.id,
      filterAt: new Date(),
      filterById: actor?.id,
      items: { create: itemRows },
    },
    include: { items: true },
  })

  // Sedekah adds to inventory as bank asset (source: sedekah), no balance/points
  for (const row of itemRows) {
    await addInventory(row.wasteItemId, 'sedekah', toNumber(row.quantity), 'sedekah', 'sedekah_transaction', tx.id, actor?.id, `Sedekah sampah`)
  }

  return NextResponse.json(tx, { status: 201 })
}
