import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await db.produk.findUnique({ where: { id }, include: { prices: { orderBy: { effectiveFrom: 'desc' } }, movements: { orderBy: { createdAt: 'desc' }, take: 20 } } })
  if (!p) return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
  return NextResponse.json(p)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const current = await db.produk.findUnique({ where: { id } })
  const p = await db.produk.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      image: body.image,
      unit: body.unit,
      price: body.price,
      pointsCost: body.pointsCost,
      isActive: body.isActive,
    },
  })
  if (current && body.price && Number(body.price) !== Number(current.price)) {
    await db.hargaProduk.create({ data: { produkId: id, pricePerUnit: body.price, effectiveFrom: new Date() } })
  }
  return NextResponse.json(p)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.produk.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
