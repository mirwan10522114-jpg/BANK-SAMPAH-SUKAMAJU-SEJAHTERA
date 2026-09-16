import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pengguna = await db.pengguna.findUnique({
    where: { id },
    include: {
      saldo: true,
      koperasiAnggota: { include: { simpananSaldos: true, pinjamans: true } },
      transaksiNabungs: { take: 10, orderBy: { transactedAt: 'desc' } },
      transaksiSedekahs: { take: 10, orderBy: { transactedAt: 'desc' } },
    },
  })
  if (!pengguna) return NextResponse.json({ error: 'Nasabah tidak ditemukan' }, { status: 404 })
  return NextResponse.json(pengguna)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const roles = body.roles || undefined
  const isMember = roles ? roles.includes('koperasi') : undefined
  const pengguna = await db.pengguna.update({
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
  return NextResponse.json(pengguna)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.pengguna.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
