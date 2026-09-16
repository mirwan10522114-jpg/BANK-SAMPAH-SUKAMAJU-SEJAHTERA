import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const produks = await db.produk.findMany({
    orderBy: { name: 'asc' },
    include: { prices: { orderBy: { effectiveFrom: 'desc' }, take: 1 } },
  })
  return NextResponse.json(produks)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const slug = body.slug || body.name.toLowerCase().replace(/\s+/g, '-')
  const p = await db.produk.create({
    data: {
      name: body.name,
      slug,
      description: body.description,
      image: body.image,
      unit: body.unit || 'pcs',
      price: body.price || 0,
      pointsCost: body.pointsCost || 0,
      stock: body.stock || 0,
      isActive: body.isActive ?? true,
    },
  })
  if (body.price) {
    await db.hargaProduk.create({
      data: { produkId: p.id, pricePerUnit: body.price, effectiveFrom: new Date() },
    })
  }
  return NextResponse.json(p, { status: 201 })
}
