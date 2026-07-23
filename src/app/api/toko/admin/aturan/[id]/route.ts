import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'

// PUT: Update rule
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rule = await db.aturanPenjualan.findUnique({ where: { id } })
  if (!rule) return NextResponse.json({ error: 'Aturan tidak ditemukan' }, { status: 404 })

  const body = await req.json()
  const { productCategoryId, minPembelian, maxPembelian, berlakuOffline, berlakuOnline } = body as {
    productCategoryId?: string | null
    minPembelian?: number
    maxPembelian?: number
    berlakuOffline?: boolean
    berlakuOnline?: boolean
  }

  if (productCategoryId) {
    const cat = await db.productCategory.findUnique({ where: { id: productCategoryId } })
    if (!cat) return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 400 })
  }

  const updated = await db.aturanPenjualan.update({
    where: { id },
    data: {
      productCategoryId: productCategoryId !== undefined ? productCategoryId : rule.productCategoryId,
      minPembelian: minPembelian !== undefined ? minPembelian : rule.minPembelian,
      maxPembelian: maxPembelian !== undefined ? maxPembelian : rule.maxPembelian,
      berlakuOffline: berlakuOffline !== undefined ? berlakuOffline : rule.berlakuOffline,
      berlakuOnline: berlakuOnline !== undefined ? berlakuOnline : rule.berlakuOnline,
    },
    include: { category: true },
  })

  return NextResponse.json(updated)
}

// DELETE: Delete rule
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const actor = await getActingUser(_req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rule = await db.aturanPenjualan.findUnique({ where: { id } })
  if (!rule) return NextResponse.json({ error: 'Aturan tidak ditemukan' }, { status: 404 })

  await db.aturanPenjualan.delete({ where: { id } })

  return NextResponse.json({ message: 'Aturan dihapus' })
}