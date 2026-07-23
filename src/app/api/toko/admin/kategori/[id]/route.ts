import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'

// PUT: Update category
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const category = await db.productCategory.findUnique({ where: { id } })
  if (!category) return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 })

  const body = await req.json()
  const { name, description, image, isActive } = body as {
    name?: string
    description?: string
    image?: string
    isActive?: boolean
  }

  const updateData: any = {}
  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description || null
  if (image !== undefined) updateData.image = image || null
  if (isActive !== undefined) updateData.isActive = isActive

  const updated = await db.productCategory.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json(updated)
}

// DELETE: Delete category if no products linked
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const actor = await getActingUser(_req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const category = await db.productCategory.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  })

  if (!category) return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 })
  if (category._count.products > 0) {
    return NextResponse.json({ error: `Tidak bisa menghapus kategori yang masih memiliki ${category._count.products} produk` }, { status: 400 })
  }

  await db.productCategory.delete({ where: { id } })

  return NextResponse.json({ message: 'Kategori dihapus' })
}