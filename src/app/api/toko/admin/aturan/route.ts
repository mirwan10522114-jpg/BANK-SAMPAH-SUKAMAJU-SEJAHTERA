import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'

// GET: List all AturanPenjualan with category info
export async function GET(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rules = await db.aturanPenjualan.findMany({
    include: {
      category: {
        select: { id: true, name: true, slug: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(rules)
}

// POST: Create new rule
export async function POST(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { productCategoryId, minPembelian, maxPembelian, berlakuOffline, berlakuOnline } = body as {
    productCategoryId?: string
    minPembelian?: number
    maxPembelian?: number
    berlakuOffline?: boolean
    berlakuOnline?: boolean
  }

  // Validate category if provided
  if (productCategoryId) {
    const cat = await db.productCategory.findUnique({ where: { id: productCategoryId } })
    if (!cat) return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 400 })
  }

  const rule = await db.aturanPenjualan.create({
    data: {
      productCategoryId: productCategoryId || null,
      minPembelian: minPembelian || 1,
      maxPembelian: maxPembelian || 0,
      berlakuOffline: berlakuOffline !== false,
      berlakuOnline: berlakuOnline !== false,
    },
    include: { category: true },
  })

  return NextResponse.json(rule, { status: 201 })
}