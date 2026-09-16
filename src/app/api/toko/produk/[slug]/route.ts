import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'

// GET: Public produk detail by slug
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const produk = await db.produk.findFirst({
    where: { slug, dijualOnline: true, isActive: true },
    include: {
      category: true,
    },
  })

  if (!produk) {
    return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
  }

  // Parse images: DB stores as JSON string, frontend expects array
  let parsedImages: string[] = []
  if (produk.images) {
    try {
      const parsed = JSON.parse(produk.images)
      parsedImages = Array.isArray(parsed) ? parsed : []
    } catch {
      parsedImages = []
    }
  }

  return NextResponse.json({
    id: produk.id,
    name: produk.name,
    slug: produk.slug,
    description: produk.description,
    image: produk.image,
    images: parsedImages,
    price: toNumber(produk.price),
    stock: toNumber(produk.stock),
    unit: produk.unit,
    weightGram: produk.weightGram,
    lengthCm: produk.lengthCm,
    widthCm: produk.widthCm,
    heightCm: produk.heightCm,
    minOrderQty: produk.minOrderQty,
    maxOrderQty: produk.maxOrderQty,
    category: produk.category?.name || null,
    createdAt: produk.createdAt,
    updatedAt: produk.updatedAt,
  })
}