import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'
import { toNumber } from '@/lib/format'
import { Prisma } from '@prisma/client'

// GET: List products with category, stock, and sale stats
export async function GET(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const kategoriId = url.searchParams.get('kategoriId') || ''
  const dijualOnline = url.searchParams.get('dijualOnline') || ''
  const dijualOffline = url.searchParams.get('dijualOffline') || ''
  const q = url.searchParams.get('q') || ''

  const where: Prisma.ProductWhereInput = {}

  if (kategoriId) where.productCategoryId = kategoriId
  if (dijualOnline === 'true') where.dijualOnline = true
  if (dijualOnline === 'false') where.dijualOnline = false
  if (dijualOffline === 'true') where.dijualOffline = true
  if (dijualOffline === 'false') where.dijualOffline = false

  if (q) {
    where.name = { contains: q }
  }

  const products = await db.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      category: {
        select: { id: true, name: true, slug: true },
      },
      _count: {
        select: {
          saleItems: true,
          tokoOrderItems: true,
          movements: true,
        },
      },
    },
    take: 200,
  })

  const result = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    image: p.image,
    images: p.images,
    unit: p.unit,
    price: toNumber(p.price),
    stock: toNumber(p.stock),
    isActive: p.isActive,
    productCategoryId: p.productCategoryId,
    weightGram: p.weightGram,
    lengthCm: p.lengthCm,
    widthCm: p.widthCm,
    heightCm: p.heightCm,
    dijualOnline: p.dijualOnline,
    dijualOffline: p.dijualOffline,
    minOrderQty: p.minOrderQty,
    maxOrderQty: p.maxOrderQty,
    category: p.category || null,
    totalOfflineSales: p._count.saleItems,
    totalOnlineOrderItems: p._count.tokoOrderItems,
    totalMovements: p._count.movements,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }))

  return NextResponse.json(result)
}

// POST: Create product with all fields
export async function POST(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    name,
    slug,
    description,
    image,
    images,
    unit,
    price,
    stock,
    productCategoryId,
    weightGram,
    lengthCm,
    widthCm,
    heightCm,
    dijualOnline,
    dijualOffline,
    minOrderQty,
    maxOrderQty,
  } = body as {
    name: string
    slug?: string
    description?: string
    image?: string
    images?: string
    unit?: string
    price?: number
    stock?: number
    productCategoryId?: string
    weightGram?: number
    lengthCm?: number
    widthCm?: number
    heightCm?: number
    dijualOnline?: boolean
    dijualOffline?: boolean
    minOrderQty?: number
    maxOrderQty?: number
  }

  if (!name) return NextResponse.json({ error: 'Nama produk wajib' }, { status: 400 })

  // Generate slug if not provided
  const productSlug = slug || name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()

  // Check uniqueness
  const existing = await db.product.findUnique({ where: { slug: productSlug } })
  if (existing) return NextResponse.json({ error: 'Slug sudah digunakan' }, { status: 400 })

  // Validate category if provided
  if (productCategoryId) {
    const cat = await db.productCategory.findUnique({ where: { id: productCategoryId } })
    if (!cat) return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 400 })
  }

  const product = await db.product.create({
    data: {
      name,
      slug: productSlug,
      description: description || null,
      image: image || null,
      images: images || '[]',
      unit: unit || 'pcs',
      price: price || 0,
      stock: stock || 0,
      productCategoryId: productCategoryId || null,
      weightGram: weightGram || 0,
      lengthCm: lengthCm || 0,
      widthCm: widthCm || 0,
      heightCm: heightCm || 0,
      dijualOnline: dijualOnline || false,
      dijualOffline: dijualOffline !== false,
      minOrderQty: minOrderQty || 1,
      maxOrderQty: maxOrderQty || 0,
    },
    include: { category: true },
  })

  return NextResponse.json(product, { status: 201 })
}