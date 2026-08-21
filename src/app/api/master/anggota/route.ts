import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const anggota = await db.koperasiAnggota.findMany({
    where: { deletedAt: null },
    orderBy: { tanggalBergabung: 'desc' },
    include: {
      user: true,
      simpananSaldos: true,
      _count: { select: { pinjamans: true } },
    },
  })
  return NextResponse.json(anggota)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const counter = await db.koperasiAnggota.count()
  const nomor = body.nomorAnggota || `KP${String(counter + 1).padStart(3, '0')}`
  const agt = await db.koperasiAnggota.create({
    data: {
      nomorAnggota: nomor,
      nama: body.nama,
      noKtp: body.noKtp,
      noTelepon: body.noTelepon,
      alamat: body.alamat,
      status: 'aktif',
      tanggalBergabung: new Date(),
      userId: body.userId || null,
    },
  })
  for (const jenis of ['pokok', 'wajib', 'sukarela']) {
    await db.koperasiSimpananSaldo.create({
      data: { koperasiAnggotaId: agt.id, jenisSimpanan: jenis, saldo: 0 },
    })
  }
  return NextResponse.json(agt, { status: 201 })
}
