import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'

// GET: Public product detail by slug
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const product = await db.product.findFirst({
    where: { slug, dijualOnline: true, isActive: true },
    include: {
      category: true,
    },
  })

  if (!product) {
    return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
  }

  // Parse images: DB stores as JSON string, frontend expects array
  let parsedImages: string[] = []
  if (product.images) {
    try {
      const parsed = JSON.parse(product.images)
      parsedImages = Array.isArray(parsed) ? parsed : []
    } catch {
      parsedImages = []
    }
  }

  return NextResponse.json({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    image: product.image,
    images: parsedImages,
    price: toNumber(product.price),
    stock: toNumber(product.stock),
    unit: product.unit,
    weightGram: product.weightGram,
    lengthCm: product.lengthCm,
    widthCm: product.widthCm,
    heightCm: product.heightCm,
    minOrderQty: product.minOrderQty,
    maxOrderQty: product.maxOrderQty,
    category: product.category?.name || null,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  })
}