import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, debitPoints, creditSaldoTersedia } from '@/lib/business'
import { toNumber } from '@/lib/format'
import { z } from 'zod'

// =====================================================================
// POST /api/point/cashout
// Tukar poin dengan saldo tunai
// Body: { userId, points }
// =====================================================================

const BodySchema = z.object({
  userId: z.string().min(1),
  points: z.number().int().positive(),
})

export async function POST(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const raw = await req.json()
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Data tidak valid', details: parsed.error.issues }, { status: 400 })
  }
  const { userId, points } = parsed.data

  // 1) Cek point rule aktif
  const rule = await db.pointRule.findFirst({ where: { isActive: true }, orderBy: { effectiveFrom: 'desc' } })
  if (!rule) return NextResponse.json({ error: 'Aturan poin belum dikonfigurasi' }, { status: 400 })

  const rupiahPerPoint = toNumber(rule.rupiahPerPoint)
  if (rupiahPerPoint <= 0) {
    return NextResponse.json({ error: 'Cash out poin belum diaktifkan (rupiahPerPoint = 0)' }, { status: 400 })
  }

  // 2) Cek minimum redeem
  if (points < rule.minRedeemPoints) {
    return NextResponse.json({
      error: `Minimal penukaran: ${rule.minRedeemPoints} pt.`,
    }, { status: 400 })
  }

  // 3) Cek saldo poin
  const balance = await db.balance.findUnique({ where: { userId } })
  const currentPoints = balance ? toNumber(balance.points) : 0
  if (currentPoints < points) {
    return NextResponse.json({
      error: `Poin tidak mencukupi. Dibutuhkan: ${points} pt, tersedia: ${currentPoints} pt.`,
    }, { status: 400 })
  }

  // 4) Hitung nilai tunai
  const cashAmount = Math.floor(points * rupiahPerPoint)
  if (cashAmount <= 0) {
    return NextResponse.json({ error: 'Nilai tunai tidak valid' }, { status: 400 })
  }

  // 5) Proses: debit poin + kredit saldo tunai + catat PointCashOut
  try {
    // Debit poin
    await debitPoints(userId, points, 'cash_out', 'point_cashout', 'manual', `Cash out ${points} pt → Rp ${cashAmount}`, actor.id)

    // Kredit saldo tunai
    await creditSaldoTersedia(userId, cashAmount, 'point_cashout', userId, `Cash out poin: ${points} pt → Rp ${cashAmount}`, actor.id)

    // Catat PointCashOut
    const cashOut = await db.pointCashOut.create({
      data: {
        userId,
        pointRuleId: rule.id,
        pointsUsed: points,
        rateSnapshot: rupiahPerPoint,
        cashAmount,
        notes: `Dicairkan oleh ${actor.name}`,
        processedById: actor.id,
      },
    })

    // Get updated balance
    const updatedBalance = await db.balance.findUnique({ where: { userId } })
    const remainingPoints = updatedBalance ? toNumber(updatedBalance.points) : 0
    const newSaldo = updatedBalance ? toNumber(updatedBalance.saldoTersedia) : 0

    return NextResponse.json({
      success: true,
      cashOut,
      pointsUsed: points,
      cashAmount,
      remainingPoints,
      newSaldo,
      message: `Cash out berhasil! ${points} pt → Rp ${cashAmount.toLocaleString('id-ID')}. Sisa poin: ${remainingPoints} pt. Saldo: Rp ${newSaldo.toLocaleString('id-ID')}.`,
    }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Gagal memproses cash out' }, { status: 500 })
  }
}
