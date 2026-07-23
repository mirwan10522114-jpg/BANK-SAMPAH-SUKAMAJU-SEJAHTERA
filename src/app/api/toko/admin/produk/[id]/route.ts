import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, addProductStock, reduceProductStock } from '@/lib/business'
import { toNumber } from '@/lib/format'

// GET: Full product with category and recent movements
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const actor = await getActingUser(_req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const product = await db.product.findUnique({
    where: { id },
    include: {
      category: true,
      movements: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          createdBy: {
            select: { id: true, name: true },
          },
        },
      },
    },
  })

  if (!product) return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })

  return NextResponse.json({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    image: product.image,
    images: product.images,
    unit: product.unit,
    price: toNumber(product.price),
    pointsCost: product.pointsCost,
    stock: toNumber(product.stock),
    isActive: product.isActive,
    productCategoryId: product.productCategoryId,
    weightGram: product.weightGram,
    lengthCm: product.lengthCm,
    widthCm: product.widthCm,
    heightCm: product.heightCm,
    dijualOnline: product.dijualOnline,
    dijualOffline: product.dijualOffline,
    minOrderQty: product.minOrderQty,
    maxOrderQty: product.maxOrderQty,
    category: product.category || null,
    recentMovements: product.movements.map((m) => ({
      id: m.id,
      direction: m.direction,
      reason: m.reason,
      quantity: toNumber(m.quantity),
      stockAfter: toNumber(m.stockAfter),
      sourceRefType: m.sourceRefType,
      sourceRefId: m.sourceRefId,
      notes: m.notes,
      createdBy: m.createdBy,
      createdAt: m.createdAt,
    })),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  })
}

// PUT: Update product fields
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const product = await db.product.findUnique({ where: { id } })
  if (!product) return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })

  const body = await req.json()
  const {
    name,
    description,
    image,
    images,
    unit,
    price,
    productCategoryId,
    weightGram,
    lengthCm,
    widthCm,
    heightCm,
    dijualOnline,
    dijualOffline,
    minOrderQty,
    maxOrderQty,
    isActive,
    pointsCost,
  } = body as {
    name?: string
    description?: string
    image?: string
    images?: string
    unit?: string
    price?: number
    productCategoryId?: string | null
    weightGram?: number
    lengthCm?: number
    widthCm?: number
    heightCm?: number
    dijualOnline?: boolean
    dijualOffline?: boolean
    minOrderQty?: number
    maxOrderQty?: number
    isActive?: boolean
    pointsCost?: number
  }

  const updateData: any = {}
  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description || null
  if (image !== undefined) updateData.image = image || null
  if (images !== undefined) updateData.images = images || '[]'
  if (unit !== undefined) updateData.unit = unit
  if (price !== undefined) updateData.price = price
  if (productCategoryId !== undefined) updateData.productCategoryId = productCategoryId
  if (weightGram !== undefined) updateData.weightGram = weightGram
  if (lengthCm !== undefined) updateData.lengthCm = lengthCm
  if (widthCm !== undefined) updateData.widthCm = widthCm
  if (heightCm !== undefined) updateData.heightCm = heightCm
  if (dijualOnline !== undefined) updateData.dijualOnline = dijualOnline
  if (dijualOffline !== undefined) updateData.dijualOffline = dijualOffline
  if (minOrderQty !== undefined) updateData.minOrderQty = minOrderQty
  if (maxOrderQty !== undefined) updateData.maxOrderQty = maxOrderQty
  if (isActive !== undefined) updateData.isActive = isActive
  if (pointsCost !== undefined) updateData.pointsCost = pointsCost

  // Validate category if provided
  if (productCategoryId && productCategoryId !== product.productCategoryId) {
    const cat = await db.productCategory.findUnique({ where: { id: productCategoryId } })
    if (!cat) return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 400 })
  }

  const updated = await db.product.update({
    where: { id },
    data: updateData,
    include: { category: true },
  })

  return NextResponse.json(updated)
}

// DELETE: Soft delete (isActive=false) if has sales, hard delete if none
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const actor = await getActingUser(_req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const product = await db.product.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          saleItems: true,
          tokoOrderItems: true,
          redemptions: true,
        },
      },
    },
  })

  if (!product) return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })

  const hasSales = product._count.saleItems > 0 || product._count.tokoOrderItems > 0 || product._count.redemptions > 0

  if (hasSales) {
    // Soft delete
    const updated = await db.product.update({
      where: { id },
      data: { isActive: false, dijualOnline: false, dijualOffline: false },
    })
    return NextResponse.json({ message: 'Produk dinonaktifkan (soft delete)', product: updated })
  }

  // Hard delete
  await db.product.delete({ where: { id } })
  return NextResponse.json({ message: 'Produk dihapus permanen' })
}