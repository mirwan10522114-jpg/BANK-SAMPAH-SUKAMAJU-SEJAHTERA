import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'

// GET: List all produk categories
export const dynamic = 'force-dynamic'

export async function GET() {
  const categories = await db.kategoriProduk.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { produks: true },
      },
    },
  })

  // Map _count.produks -> flat productCount field expected by frontend
  const result = categories.map((c) => ({
    ...c,
    productCount: c._count.produks,
  }))

  return NextResponse.json(result)
}

// POST: Create category
export async function POST(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, description, image } = body as {
    name: string
    description?: string
    image?: string
  }

  if (!name) return NextResponse.json({ error: 'Nama kategori wajib' }, { status: 400 })

  // Generate slug
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()

  // Check uniqueness
  const existing = await db.kategoriProduk.findUnique({ where: { slug } })
  if (existing) return NextResponse.json({ error: 'Slug sudah digunakan' }, { status: 400 })

  const category = await db.kategoriProduk.create({
    data: {
      name,
      slug,
      description: description || null,
      image: image || null,
    },
  })

  return NextResponse.json(category, { status: 201 })
}