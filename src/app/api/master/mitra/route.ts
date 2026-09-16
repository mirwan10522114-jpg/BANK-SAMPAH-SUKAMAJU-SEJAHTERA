import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const mitras = await db.mitra.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { transaksiPenjualanMitras: true } } } })
  return NextResponse.json(mitras)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const p = await db.mitra.create({
    data: {
      name: body.name,
      type: body.type || 'pengepul',
      phone: body.phone,
      email: body.email,
      address: body.address,
      notes: body.notes,
      isActive: body.isActive ?? true,
    },
  })
  return NextResponse.json(p, { status: 201 })
}
