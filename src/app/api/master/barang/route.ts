import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get('categoryId')
  const where: any = { isActive: true }
  if (categoryId) where.wasteCategoryId = categoryId
  const items = await db.wasteItem.findMany({
    where,
    orderBy: { code: 'asc' },
    include: {
      category: true,
      prices: { orderBy: { effectiveFrom: 'desc' }, take: 1 },
      inventories: true,
    },
  })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const actor = await getActingUser(req)
  const slug = body.slug || body.name.toLowerCase().replace(/\s+/g, '-') + '-' + body.code.toLowerCase()
  const item = await db.wasteItem.create({
    data: {
      wasteCategoryId: body.wasteCategoryId,
      code: body.code,
      name: body.name,
      slug,
      unit: body.unit || 'kg',
      pricePerUnit: body.pricePerUnit || 0,
      description: body.description || null,
      isActive: body.isActive ?? true,
    },
  })
  // create initial price record
  if (body.pricePerUnit) {
    await db.wastePrice.create({
      data: {
        wasteItemId: item.id,
        pricePerUnit: body.pricePerUnit,
        effectiveFrom: new Date(),
        notes: 'Harga awal saat barang dibuat.',
        createdById: actor?.id,
      },
    })
  }
  return NextResponse.json(item, { status: 201 })
}
