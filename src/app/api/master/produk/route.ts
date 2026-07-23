import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const products = await db.product.findMany({
    orderBy: { name: 'asc' },
    include: { prices: { orderBy: { effectiveFrom: 'desc' }, take: 1 } },
  })
  return NextResponse.json(products)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const slug = body.slug || body.name.toLowerCase().replace(/\s+/g, '-')
  const p = await db.product.create({
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
    await db.productPrice.create({
      data: { productId: p.id, pricePerUnit: body.price, effectiveFrom: new Date() },
    })
  }
  return NextResponse.json(p, { status: 201 })
}
