import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'

// GET: Public catalog — products where dijualOnline=true AND isActive=true
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q') || ''
  const kategoriId = url.searchParams.get('kategoriId') || url.searchParams.get('category') || ''
  const sort = url.searchParams.get('sort') || ''

  const where: any = {
    dijualOnline: true,
    isActive: true,
  }

  if (q) {
    where.name = { contains: q }
  }

  // Support both ?category=<name> and ?kategoriId=<uuid>
  if (kategoriId) {
    // UUIDs start with 'cmr' in this app — treat anything else as a name
    if (/^cmr/.test(kategoriId) && kategoriId.length > 15) {
      where.productCategoryId = kategoriId
    } else {
      // Otherwise treat as category name and look up the ID
      const cat = await db.productCategory.findFirst({
        where: { name: kategoriId },
        select: { id: true },
      })
      if (cat) {
        where.productCategoryId = cat.id
      } else {
        // No matching category — return empty
        return NextResponse.json([])
      }
    }
  }

  // Support both ?sort=termurah/termahal and ?sort=price_asc/price_desc
  let orderBy: any = { createdAt: 'desc' }
  if (sort === 'termurah' || sort === 'price_asc') orderBy = { price: 'asc' }
  if (sort === 'termahal' || sort === 'price_desc') orderBy = { price: 'desc' }
  if (sort === 'terbaru') orderBy = { createdAt: 'desc' }

  const products = await db.product.findMany({
    where,
    orderBy,
    include: {
      category: {
        select: { id: true, name: true, slug: true, image: true },
      },
    },
  })

  const result = products.map((p) => {
    // Parse images: DB stores as JSON string, frontend expects array
    let parsedImages: string[] = []
    if (p.images) {
      try {
        const parsed = JSON.parse(p.images)
        parsedImages = Array.isArray(parsed) ? parsed : []
      } catch {
        parsedImages = []
      }
    }
    // If no images in array but single image exists, use it as the first image
    if (parsedImages.length === 0 && p.image) {
      parsedImages = [p.image]
    }

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      image: p.image,
      images: parsedImages,
      price: toNumber(p.price),
      stock: toNumber(p.stock),
      unit: p.unit,
      weightGram: p.weightGram,
      minOrderQty: p.minOrderQty,
      category: p.category?.name || null,
    }
  })

  return NextResponse.json(result)
}