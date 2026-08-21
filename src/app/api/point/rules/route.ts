import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'
import { toNumber } from '@/lib/format'
import { z } from 'zod'

// =====================================================================
// GET /api/point/rules
// List semua point rules
// =====================================================================
export async function GET() {
  const rules = await db.pointRule.findMany({
    orderBy: { effectiveFrom: 'desc' },
    include: { createdBy: { select: { name: true } } },
  })
  return NextResponse.json(rules.map((r) => ({
    ...r,
    pointsPerRupiah: toNumber(r.pointsPerRupiah),
    rupiahPerPoint: toNumber(r.rupiahPerPoint),
    tierBronzeMult: toNumber(r.tierBronzeMult),
    tierSilverMult: toNumber(r.tierSilverMult),
    tierGoldMult: toNumber(r.tierGoldMult),
    tierPlatinumMult: toNumber(r.tierPlatinumMult),
    streakBonusMult: toNumber(r.streakBonusMult),
  })))
}

// =====================================================================
// POST /api/point/rules — buat/update aturan poin
// =====================================================================
const CreateSchema = z.object({
  pointsPerRupiah: z.number().positive(),
  rupiahPerPoint: z.number().min(0).default(0),
  effectiveFrom: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
  resetPeriod: z.enum(['never', 'monthly', 'quarterly', 'yearly']).default('never'),
  resetDay: z.number().int().min(1).max(28).default(1),
  minRedeemPoints: z.number().int().min(0).default(50),
  expiryDays: z.number().int().min(0).default(0),
  rolloverPoints: z.number().int().min(0).default(0),
  tierBronzeMult: z.number().min(1).default(1),
  tierSilverMult: z.number().min(1).default(1.2),
  tierGoldMult: z.number().min(1).default(1.5),
  tierPlatinumMult: z.number().min(1).default(2),
  streakBonusEnabled: z.boolean().default(true),
  streakBonusMonths: z.number().int().min(1).default(3),
  streakBonusMult: z.number().min(1).default(1.5),
})

export async function POST(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const raw = await req.json()
  const parsed = CreateSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Data tidak valid', details: parsed.error.issues }, { status: 400 })
  }
  const d = parsed.data

  // Nonaktifkan semua rule lama jika rule baru aktif
  if (d.isActive) {
    await db.pointRule.updateMany({ where: { isActive: true }, data: { isActive: false } })
  }

  const rule = await db.pointRule.create({
    data: {
      pointsPerRupiah: d.pointsPerRupiah,
      rupiahPerPoint: d.rupiahPerPoint,
      effectiveFrom: d.effectiveFrom ? new Date(d.effectiveFrom) : new Date(),
      notes: d.notes || null,
      isActive: d.isActive,
      resetPeriod: d.resetPeriod,
      resetDay: d.resetDay,
      minRedeemPoints: d.minRedeemPoints,
      expiryDays: d.expiryDays,
      rolloverPoints: d.rolloverPoints,
      tierBronzeMult: d.tierBronzeMult,
      tierSilverMult: d.tierSilverMult,
      tierGoldMult: d.tierGoldMult,
      tierPlatinumMult: d.tierPlatinumMult,
      streakBonusEnabled: d.streakBonusEnabled,
      streakBonusMonths: d.streakBonusMonths,
      streakBonusMult: d.streakBonusMult,
      createdById: actor.id,
    },
  })

  return NextResponse.json({ id: rule.id, message: 'Aturan poin berhasil disimpan' }, { status: 201 })
}
