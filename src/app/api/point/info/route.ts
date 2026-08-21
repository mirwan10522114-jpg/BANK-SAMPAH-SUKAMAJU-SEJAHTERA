import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'
import { toNumber } from '@/lib/format'

// =====================================================================
// GET /api/point/info?userId=xxx
// Returns: saldo poin, tier, rule aktif, produk yang bisa diredeem,
//          riwayat poin, riwayat redemption, next reset info
// =====================================================================
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId') || ''

  if (!userId) {
    return NextResponse.json({ error: 'userId wajib' }, { status: 400 })
  }

  // Validate user exists
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!user) {
    return NextResponse.json({ error: 'Nasabah tidak ditemukan' }, { status: 404 })
  }

  // 1) Balance (poin)
  const balance = await db.balance.findUnique({ where: { userId } })
  const points = balance ? toNumber(balance.points) : 0

  // 2) Point rule aktif
  const rule = await db.pointRule.findFirst({ where: { isActive: true }, orderBy: { effectiveFrom: 'desc' } })

  // 3) Tentukan tier
  let tier = 'Bronze'
  let tierMult = 1
  if (rule) {
    if (points >= 2500) { tier = 'Platinum'; tierMult = toNumber(rule.tierPlatinumMult) }
    else if (points >= 1000) { tier = 'Gold'; tierMult = toNumber(rule.tierGoldMult) }
    else if (points >= 500) { tier = 'Silver'; tierMult = toNumber(rule.tierSilverMult) }
    else { tier = 'Bronze'; tierMult = toNumber(rule.tierBronzeMult) }
  }

  // 4) Produk yang bisa diredeem dengan poin
  const redeemableProducts = await db.product.findMany({
    where: { dijualDenganPoin: true, isActive: true, pointsCost: { gt: 0 } },
    select: {
      id: true,
      name: true,
      unit: true,
      pointsCost: true,
      stock: true,
      image: true,
    },
  })

  // 5) Riwayat poin (10 terbaru)
  const pointHistory = await db.pointHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      type: true,
      points: true,
      balanceAfter: true,
      description: true,
      createdAt: true,
    },
  })

  // 6) Riwayat redemption (5 terbaru)
  const redemptions = await db.redemption.findMany({
    where: { userId },
    orderBy: { redeemedAt: 'desc' },
    take: 5,
    select: {
      id: true,
      productNameSnapshot: true,
      unitSnapshot: true,
      quantity: true,
      pointsUsed: true,
      redeemedAt: true,
    },
  })

  // 7) Riwayat cash out (5 terbaru)
  const cashOuts = await db.pointCashOut.findMany({
    where: { userId },
    orderBy: { cashedOutAt: 'desc' },
    take: 5,
    select: {
      id: true,
      pointsUsed: true,
      cashAmount: true,
      cashedOutAt: true,
    },
  })

  // 8) Hitung next reset
  let nextResetAt: string | null = null
  if (rule && rule.resetPeriod !== 'never') {
    const now = new Date()
    const next = new Date(now.getFullYear(), now.getMonth() + 1, rule.resetDay)
    if (rule.resetPeriod === 'quarterly') next.setMonth(now.getMonth() + 3)
    if (rule.resetPeriod === 'yearly') next.setFullYear(now.getFullYear() + 1)
    nextResetAt = next.toISOString()
  }

  return NextResponse.json({
    points,
    tier,
    tierMultiplier: tierMult,
    rule: rule ? {
      id: rule.id,
      pointsPerRupiah: toNumber(rule.pointsPerRupiah),
      rupiahPerPoint: toNumber(rule.rupiahPerPoint),
      resetPeriod: rule.resetPeriod,
      resetDay: rule.resetDay,
      minRedeemPoints: rule.minRedeemPoints,
      expiryDays: rule.expiryDays,
      rolloverPoints: rule.rolloverPoints,
      streakBonusEnabled: rule.streakBonusEnabled,
      streakBonusMonths: rule.streakBonusMonths,
      streakBonusMult: toNumber(rule.streakBonusMult),
    } : null,
    redeemableProducts: redeemableProducts.map((p) => ({
      ...p,
      stock: toNumber(p.stock),
    })),
    pointHistory,
    redemptions,
    cashOuts: cashOuts.map((c) => ({
      ...c,
      cashAmount: toNumber(c.cashAmount),
    })),
    nextResetAt,
    // Tier progress info
    tierProgress: {
      current: points,
      nextTier: tier === 'Bronze' ? 'Silver' : tier === 'Silver' ? 'Gold' : tier === 'Gold' ? 'Platinum' : null,
      nextTierAt: tier === 'Bronze' ? 500 : tier === 'Silver' ? 1000 : tier === 'Gold' ? 2500 : null,
      progressPct: tier === 'Bronze' ? (points / 500) * 100
        : tier === 'Silver' ? ((points - 500) / 500) * 100
        : tier === 'Gold' ? ((points - 1000) / 1500) * 100
        : 100,
    },
  })
}
