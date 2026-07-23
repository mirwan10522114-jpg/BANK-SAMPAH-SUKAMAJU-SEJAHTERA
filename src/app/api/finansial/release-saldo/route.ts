import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'
import { releaseSaldo, getBankSampahKasBalance, getTotalSaldoTertahan, getTotalSaldoTersedia, getActingUser } from '@/lib/business'

// GET: list nasabah with saldo tertahan (candidates for release) + kas status
export async function GET(req: NextRequest) {
  const [balances, kasSaldo, totalTertahan, totalTersedia] = await Promise.all([
    db.balance.findMany({
      where: { saldoTertahan: { gt: 0 } },
      include: { user: { select: { id: true, name: true, memberCode: true, phone: true } } },
      orderBy: { saldoTertahan: 'desc' },
    }),
    getBankSampahKasBalance(),
    getTotalSaldoTertahan(),
    getTotalSaldoTersedia(),
  ])

  const rows = balances.map((b) => ({
    id: b.id,
    userId: b.userId,
    name: b.user?.name || '-',
    memberCode: b.user?.memberCode || null,
    phone: b.user?.phone || null,
    saldoTertahan: toNumber(b.saldoTertahan),
    saldoTersedia: toNumber(b.saldoTersedia),
    points: b.points,
  }))

  return NextResponse.json({
    nasabahList: rows,
    kasStatus: {
      kasSaldo,
      totalTertahan,
      totalTersedia,
      // Capacity: how much more can be released (kas - totalTersedia, since release adds to tersedia)
      releaseCapacity: Math.max(0, kasSaldo - totalTersedia),
      // Liquidity ratio: kas vs (tersedia + tertahan) — should be >= 1 for full safety
      likuiditasRatio: (totalTersedia + totalTertahan) > 0 ? kasSaldo / (totalTersedia + totalTertahan) : 0,
    },
  })
}

// POST: release saldo tertahan → saldo tersedia
export async function POST(req: NextRequest) {
  const body = await req.json()
  const actor = await getActingUser(req)
  const { userId, amount, keterangan } = body as { userId: string; amount: number; keterangan?: string }

  if (!userId) return NextResponse.json({ error: 'Nasabah wajib dipilih' }, { status: 400 })
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Nominal harus > 0' }, { status: 400 })

  try {
    const result = await releaseSaldo(userId, amount, actor?.id, keterangan)
    return NextResponse.json(result, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
