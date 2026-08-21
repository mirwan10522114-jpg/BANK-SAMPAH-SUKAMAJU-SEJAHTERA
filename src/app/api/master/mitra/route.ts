import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const partners = await db.partner.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { salesTransactions: true } } } })
  return NextResponse.json(partners)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const p = await db.partner.create({
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
