import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'
import { toNumber } from '@/lib/format'

// =====================================================================
// GET /api/point/info?penggunaId=xxx
// Returns: saldo poin, tier, rule aktif, produk yang bisa diredeem,
//          riwayat poin, riwayat penukaranPoin, next reset info
// =====================================================================
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const penggunaId = searchParams.get('penggunaId') || ''

  if (!penggunaId) {
    return NextResponse.json({ error: 'penggunaId wajib' }, { status: 400 })
  }

  // Validate pengguna exists
  const pengguna = await db.pengguna.findUnique({ where: { id: penggunaId }, select: { id: true } })
  if (!pengguna) {
    return NextResponse.json({ error: 'Nasabah tidak ditemukan' }, { status: 404 })
  }

  // 1) Saldo (poin)
  const saldo = await db.saldo.findUnique({ where: { penggunaId } })
  const points = saldo ? toNumber(saldo.points) : 0

  // 2) Point rule aktif
  const rule = await db.aturanPoin.findFirst({ where: { isActive: true }, orderBy: { effectiveFrom: 'desc' } })

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
  const rupiahPerPoint = rule && toNumber(rule.rupiahPerPoint) > 0 ? toNumber(rule.rupiahPerPoint) : 40

  const rawProducts = await db.produk.findMany({
    where: { dijualDenganPoin: true, isActive: true },
    select: {
      id: true,
      name: true,
      unit: true,
      price: true,
      pointsCost: true,
      stock: true,
      image: true,
    },
  })

  const redeemableProducts = rawProducts
    .map((p) => {
      const effPoints = p.pointsCost > 0
        ? p.pointsCost
        : (rupiahPerPoint > 0 && toNumber(p.price) > 0 ? Math.ceil(toNumber(p.price) / rupiahPerPoint) : 0)
      return {
        id: p.id,
        name: p.name,
        unit: p.unit,
        price: toNumber(p.price),
        pointsCost: effPoints,
        stock: toNumber(p.stock),
        image: p.image,
      }
    })
    .filter((p) => p.pointsCost > 0)

  // 5) Riwayat poin (10 terbaru)
  const riwayatPoin = await db.riwayatPoin.findMany({
    where: { penggunaId },
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

  // 6) Riwayat penukaranPoin (5 terbaru)
  const penukaranPoins = await db.penukaranPoin.findMany({
    where: { penggunaId },
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
  const cashOuts = await db.pencairanPoin.findMany({
    where: { penggunaId },
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
      rupiahPerPointEarn: rule.rupiahPerPointEarn || (toNumber(rule.pointsPerRupiah) > 0 ? Math.round(1 / toNumber(rule.pointsPerRupiah)) : 1000),
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
    riwayatPoin,
    penukaranPoins,
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
