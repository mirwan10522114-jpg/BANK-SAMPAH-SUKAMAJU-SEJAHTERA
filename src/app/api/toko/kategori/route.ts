import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: Public list of product categories (for catalog filter on the merchandise page)
export async function GET() {
  const categories = await db.productCategory.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      image: true,
      _count: { select: { products: { where: { isActive: true, dijualOnline: true } } } },
    },
  })

  const result = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    image: c.image,
    productCount: c._count.products,
  }))

  return NextResponse.json(result)
}
