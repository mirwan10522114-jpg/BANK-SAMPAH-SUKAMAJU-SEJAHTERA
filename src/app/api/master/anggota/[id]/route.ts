import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const agt = await db.koperasiAnggota.findUnique({
    where: { id },
    include: {
      user: true,
      simpananSaldos: true,
      simpananTx: { orderBy: { tanggalTransaksi: 'desc' }, take: 20 },
      pinjamans: { include: { angsurans: { orderBy: { angsuranKe: 'asc' } } }, orderBy: { createdAt: 'desc' } },
    },
  })
  if (!agt) return NextResponse.json({ error: 'Anggota tidak ditemukan' }, { status: 404 })
  return NextResponse.json(agt)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const agt = await db.koperasiAnggota.update({
    where: { id },
    data: {
      nama: body.nama,
      noKtp: body.noKtp,
      noTelepon: body.noTelepon,
      alamat: body.alamat,
      status: body.status,
    },
  })
  return NextResponse.json(agt)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.koperasiAnggota.update({ where: { id }, data: { status: 'keluar', tanggalKeluar: new Date() } })
  return NextResponse.json({ ok: true })
}
