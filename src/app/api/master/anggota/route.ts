import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'


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
  const { nama, noKtp, noTelepon, alamat, userId, simpananPokok } = body

  if (!nama || !nama.trim()) {
    return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })
  }

  if (noKtp) {
    const existing = await db.koperasiAnggota.findFirst({
      where: { noKtp: noKtp.trim(), deletedAt: null },
    })
    if (existing) {
      return NextResponse.json({ error: 'KTP sudah terdaftar' }, { status: 400 })
    }
  }

  const actor = await getActingUser(req)
  const counter = await db.koperasiAnggota.count()
  const nomor = body.nomorAnggota || `KP${String(counter + 1).padStart(3, '0')}`

  const agt = await db.koperasiAnggota.create({
    data: {
      nomorAnggota: nomor,
      nama: nama.trim(),
      noKtp: noKtp ? noKtp.trim() : null,
      noTelepon,
      alamat,
      status: 'aktif',
      tanggalBergabung: new Date(),
      userId: userId || null,
    },
  })

  for (const jenis of ['pokok', 'wajib', 'sukarela'] as const) {
    await db.koperasiSimpananSaldo.create({
      data: { koperasiAnggotaId: agt.id, jenisSimpanan: jenis, saldo: 0 },
    })
  }

  if (simpananPokok && simpananPokok > 0) {
    const { setorSimpanan } = await import('@/lib/business')
    await setorSimpanan(agt.id, 'pokok', Number(simpananPokok), actor?.id, 'Simpanan pokok awal pendaftaran')
  }

  return NextResponse.json(agt, { status: 201 })
}

