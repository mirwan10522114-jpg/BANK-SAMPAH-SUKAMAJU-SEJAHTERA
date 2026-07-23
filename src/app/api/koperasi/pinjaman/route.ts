import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, generateTxNo, calcAngsuranSchedule } from '@/lib/business'
import { toNumber } from '@/lib/format'

// GET: list pinjaman
// Query params:
//   anggotaId — filter by anggota
//   status    — 'diajukan' | 'disetujui' | 'ditolak' | 'berjalan' | 'lunas'
//   dari      — ISO date (gte tanggalPengajuan)
//   sampai    — ISO date (lte tanggalPengajuan)
//   q         — search by nomorPinjaman (case-insensitive contains)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const anggotaId = searchParams.get('anggotaId')
  const status = searchParams.get('status')
  const dari = searchParams.get('dari')
  const sampai = searchParams.get('sampai')
  const q = (searchParams.get('q') || '').trim()

  const where: any = {}
  if (anggotaId) where.koperasiAnggotaId = anggotaId
  if (status) where.status = status
  if (dari || sampai) {
    where.tanggalPengajuan = {}
    if (dari) where.tanggalPengajuan.gte = new Date(dari)
    if (sampai) {
      const s = new Date(sampai)
      s.setHours(23, 59, 59, 999)
      where.tanggalPengajuan.lte = s
    }
  }
  if (q) {
    where.nomorPinjaman = { contains: q }
  }
  const pinjaman = await db.koperasiPinjaman.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { anggota: true, angsurans: { orderBy: { angsuranKe: 'asc' } } },
    take: 100,
  })
  return NextResponse.json(pinjaman)
}

// POST: ajukan pinjaman baru
export async function POST(req: NextRequest) {
  const body = await req.json()
  const actor = await getActingUser(req)
  const { anggotaId, jumlahPinjaman, tenorBulan, keterangan } = body as {
    anggotaId: string
    jumlahPinjaman: number
    tenorBulan: number
    keterangan?: string
  }
  if (!anggotaId) return NextResponse.json({ error: 'Anggota wajib dipilih' }, { status: 400 })
  if (jumlahPinjaman <= 0) return NextResponse.json({ error: 'Jumlah pinjaman harus > 0' }, { status: 400 })
  if (tenorBulan <= 0) return NextResponse.json({ error: 'Tenor harus > 0' }, { status: 400 })

  // Server-side eligibility check
  const anggotaData = await db.koperasiAnggota.findUnique({
    where: { id: anggotaId },
    include: { pinjamans: { include: { angsurans: true } } },
  })
  if (!anggotaData) return NextResponse.json({ error: 'Anggota tidak ditemukan' }, { status: 404 })

  const setting = await db.koperasiSetting.findFirst()
  const minimalBulan = setting?.minimalBulanAnggota ?? 3
  const nowMs = Date.now()
  const joinMs = new Date(anggotaData.tanggalBergabung).getTime()
  const memberMonths = Math.max(0, Math.floor((nowMs - joinMs) / (1000 * 60 * 60 * 24 * 30.44)))
  if (memberMonths < minimalBulan) return NextResponse.json({ error: `Masa keanggotaan belum mencukupi (${memberMonths} bulan, minimal ${minimalBulan} bulan)` }, { status: 400 })
  if (anggotaData.pinjamans.some((p) => p.status === 'berjalan')) return NextResponse.json({ error: 'Masih memiliki pinjaman yang sedang berjalan' }, { status: 400 })
  if (anggotaData.pinjamanDiblokir) return NextResponse.json({ error: 'Pinjaman diblokir. Ajukan perbaikan eligibilitas terlebih dahulu.' }, { status: 400 })
  const withHistory = anggotaData.pinjamans.filter((p) => (p.status === 'lunas' || p.status === 'berjalan') && p.angsurans.length > 0)
  for (const px of withHistory) {
    for (const a of px.angsurans) {
      if (toNumber(a.dendaBayar) > 0) return NextResponse.json({ error: 'Riwayat pembayaran bermasalah. Ajukan perbaikan eligibilitas terlebih dahulu.' }, { status: 400 })
    }
  }

  const sukuBunga = setting ? toNumber(setting.sukuBungaPinjaman) : 0
  const { angsuranPerBulan } = calcAngsuranSchedule(jumlahPinjaman, tenorBulan, sukuBunga)
  const counter = await db.koperasiPinjaman.count()
  const nomor = `PNJ-${String(counter + 1).padStart(4, '0')}`

  const pinjaman = await db.koperasiPinjaman.create({
    data: {
      nomorPinjaman: nomor,
      koperasiAnggotaId: anggotaId,
      jumlahPinjaman,
      tenorBulan,
      angsuranPerBulan,
      biayaAdmin: setting ? toNumber(setting.biayaAdminPinjaman) : 0,
      tanggalPengajuan: new Date(),
      status: 'diajukan',
      sisaPinjaman: jumlahPinjaman,
      sukuBunga,
      keterangan,
      userId: actor?.id,
    },
    include: { anggota: true },
  })
  return NextResponse.json(pinjaman, { status: 201 })
}
