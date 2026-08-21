import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await db.partner.findUnique({ where: { id }, include: { salesTransactions: { orderBy: { transactedAt: 'desc' }, take: 10 } } })
  if (!p) return NextResponse.json({ error: 'Mitra tidak ditemukan' }, { status: 404 })
  return NextResponse.json(p)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const p = await db.partner.update({
    where: { id },
    data: { name: body.name, type: body.type, phone: body.phone, email: body.email, address: body.address, notes: body.notes, isActive: body.isActive },
  })
  return NextResponse.json(p)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.partner.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
