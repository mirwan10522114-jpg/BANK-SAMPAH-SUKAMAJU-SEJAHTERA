import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await db.wasteItem.findUnique({
    where: { id },
    include: { category: true, prices: { orderBy: { effectiveFrom: 'desc' } } },
  })
  if (!item) return NextResponse.json({ error: 'Barang tidak ditemukan' }, { status: 404 })
  return NextResponse.json(item)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  // If price changed, create a new price record
  const current = await db.wasteItem.findUnique({ where: { id } })
  const item = await db.wasteItem.update({
    where: { id },
    data: {
      name: body.name,
      code: body.code,
      unit: body.unit,
      pricePerUnit: body.pricePerUnit,
      description: body.description,
      isActive: body.isActive,
      wasteCategoryId: body.wasteCategoryId,
    },
  })
  if (current && body.pricePerUnit && Number(body.pricePerUnit) !== Number(current.pricePerUnit)) {
    await db.wastePrice.create({
      data: {
        wasteItemId: id,
        pricePerUnit: body.pricePerUnit,
        effectiveFrom: new Date(),
        notes: 'Update harga.',
      },
    })
  }
  return NextResponse.json(item)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.wasteItem.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
