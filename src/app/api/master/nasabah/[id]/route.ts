import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await db.user.findUnique({
    where: { id },
    include: {
      balance: true,
      koperasiAnggota: { include: { simpananSaldos: true, pinjamans: true } },
      savingTransactions: { take: 10, orderBy: { transactedAt: 'desc' } },
      sedekahTransactions: { take: 10, orderBy: { transactedAt: 'desc' } },
    },
  })
  if (!user) return NextResponse.json({ error: 'Nasabah tidak ditemukan' }, { status: 404 })
  return NextResponse.json(user)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const roles = body.roles || undefined
  const isMember = roles ? roles.includes('koperasi') : undefined
  const user = await db.user.update({
    where: { id },
    data: {
      name: body.name,
      email: body.email,
      nik: body.nik,
      phone: body.phone,
      address: body.address,
      roles: roles ? JSON.stringify(roles) : undefined,
      isMember,
    },
  })
  return NextResponse.json(user)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
