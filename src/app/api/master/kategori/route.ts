import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const cats = await db.wasteCategory.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { items: true } } },
  })
  return NextResponse.json(cats)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const cat = await db.wasteCategory.create({
    data: {
      name: body.name,
      slug: body.slug || body.name.toLowerCase().replace(/\s+/g, '-'),
      codePrefix: body.codePrefix,
      description: body.description || null,
      isActive: body.isActive ?? true,
    },
  })
  return NextResponse.json(cat, { status: 201 })
}
