import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const rules = await db.pointRule.findMany({ orderBy: { effectiveFrom: 'desc' } })
  return NextResponse.json(rules)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  // deactivate others if this is active
  if (body.isActive) {
    await db.pointRule.updateMany({ where: { isActive: true }, data: { isActive: false } })
  }
  const rule = await db.pointRule.create({
    data: {
      pointsPerRupiah: body.pointsPerRupiah,
      rupiahPerPoint: body.rupiahPerPoint || 0,
      effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : new Date(),
      notes: body.notes,
      isActive: body.isActive ?? true,
    },
  })
  return NextResponse.json(rule, { status: 201 })
}
