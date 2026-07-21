import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cat = await db.wasteCategory.findUnique({ where: { id }, include: { items: true } })
  if (!cat) return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 })
  return NextResponse.json(cat)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const cat = await db.wasteCategory.update({
    where: { id },
    data: {
      name: body.name,
      slug: body.slug,
      codePrefix: body.codePrefix,
      description: body.description,
      isActive: body.isActive,
    },
  })
  return NextResponse.json(cat)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.wasteCategory.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
