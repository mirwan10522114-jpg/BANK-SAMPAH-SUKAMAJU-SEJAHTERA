import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: Public list of produk categories (for catalog filter on the merchandise page)
export const dynamic = 'force-dynamic'

export async function GET() {
  const categories = await db.kategoriProduk.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      image: true,
      _count: { select: { produks: { where: { isActive: true, dijualOnline: true } } } },
    },
  })

  const result = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    image: c.image,
    productCount: c._count.produks,
  }))

  return NextResponse.json(result)
}
