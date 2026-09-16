import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const rules = await db.aturanPoin.findMany({ orderBy: { effectiveFrom: 'desc' } })
  return NextResponse.json(rules.map((r) => {
    const ppr = Number(r.pointsPerRupiah)
    const earnRp = r.rupiahPerPointEarn || (ppr > 0 ? Math.round(1 / ppr) : 1000)
    return {
      ...r,
      rupiahPerPointEarn: earnRp,
      pointsPerRupiah: ppr > 0 ? ppr : (1 / earnRp),
      rupiahPerPoint: Number(r.rupiahPerPoint),
    }
  }))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  // deactivate others if this is active
  if (body.isActive) {
    await db.aturanPoin.updateMany({ where: { isActive: true }, data: { isActive: false } })
  }

  let rupiahPerPointEarn = Number(body.rupiahPerPointEarn)
  let pointsPerRupiah = Number(body.pointsPerRupiah)

  if (rupiahPerPointEarn && rupiahPerPointEarn > 0) {
    pointsPerRupiah = 1 / rupiahPerPointEarn
  } else if (pointsPerRupiah && pointsPerRupiah > 0) {
    rupiahPerPointEarn = Math.round(1 / pointsPerRupiah)
  } else {
    rupiahPerPointEarn = 1000
    pointsPerRupiah = 0.001
  }

  const rule = await db.aturanPoin.create({
    data: {
      rupiahPerPointEarn,
      pointsPerRupiah,
      rupiahPerPoint: body.rupiahPerPoint || 0,
      effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : new Date(),
      notes: body.notes,
      isActive: body.isActive ?? true,
    },
  })
  return NextResponse.json(rule, { status: 201 })
}
