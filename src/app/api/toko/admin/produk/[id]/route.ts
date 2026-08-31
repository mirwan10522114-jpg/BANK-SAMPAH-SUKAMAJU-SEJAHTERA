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
  const name = body.name !== undefined ? body.name : body.nama
  const description = body.description !== undefined ? body.description : body.deskripsi
  const image = body.image !== undefined ? body.image : body.gambar
  const images = body.images
  const unit = body.unit !== undefined ? body.unit : body.satuan
  const price = body.price !== undefined ? body.price : (body.hargaJual !== undefined ? body.hargaJual : body.harga)
  const productCategoryId = body.productCategoryId !== undefined ? body.productCategoryId : body.kategoriId
  const weightGram = body.weightGram !== undefined ? body.weightGram : body.beratGram
  const lengthCm = body.lengthCm
  const widthCm = body.widthCm
  const heightCm = body.heightCm
  const dijualOnline = body.dijualOnline
  const dijualOffline = body.dijualOffline
  const minOrderQty = body.minOrderQty
  const maxOrderQty = body.maxOrderQty
  const isActive = body.isActive !== undefined ? body.isActive : (body.aktif !== undefined ? body.aktif : body.is_active)
  const pointsCost = body.pointsCost
  const dijualDenganPoin = body.dijualDenganPoin

  const updateData: any = {}
  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description || null
  if (image !== undefined) updateData.image = image || null
  if (images !== undefined) updateData.images = images || '[]'
  if (unit !== undefined) updateData.unit = unit
  if (price !== undefined) updateData.price = Number(price)
  if (productCategoryId !== undefined) updateData.productCategoryId = productCategoryId
  if (weightGram !== undefined) updateData.weightGram = Number(weightGram)
  if (lengthCm !== undefined) updateData.lengthCm = Number(lengthCm)
  if (widthCm !== undefined) updateData.widthCm = Number(widthCm)
  if (heightCm !== undefined) updateData.heightCm = Number(heightCm)
  if (dijualOnline !== undefined) updateData.dijualOnline = Boolean(dijualOnline)
  if (dijualOffline !== undefined) updateData.dijualOffline = Boolean(dijualOffline)
  if (minOrderQty !== undefined) updateData.minOrderQty = Number(minOrderQty)
  if (maxOrderQty !== undefined) updateData.maxOrderQty = Number(maxOrderQty)
  if (isActive !== undefined) updateData.isActive = Boolean(isActive)
  if (pointsCost !== undefined) updateData.pointsCost = Number(pointsCost)
  if (dijualDenganPoin !== undefined) updateData.dijualDenganPoin = Boolean(dijualDenganPoin)

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

// DELETE: Soft delete (isActive=false)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const actor = await getActingUser(_req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const product = await db.product.findUnique({
    where: { id },
  })

  if (!product) return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })

  const updated = await db.product.update({
    where: { id },
    data: { isActive: false, dijualOnline: false, dijualOffline: false },
  })
  return NextResponse.json({
    message: 'Produk dinonaktifkan (soft delete)',
    product: updated,
    is_active: false,
    isActive: false,
  })
}