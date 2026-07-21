import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, recordKasTx, generateTxNo } from '@/lib/business'
import { toNumber } from '@/lib/format'

// GET: list penarikan sukarela
// Query params:
//   anggotaId — filter by anggota
//   status    — 'menunggu' | 'disetujui' | 'ditolak' | 'dicairkan'
//   dari      — ISO date (gte tanggalPengajuan)
//   sampai    — ISO date (lte tanggalPengajuan)
//   q         — search by nomorPengajuan (case-insensitive contains)
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
    where.nomorPengajuan = { contains: q }
  }
  const list = await db.koperasiPenarikanSukarela.findMany({
    where,
    orderBy: { tanggalPengajuan: 'desc' },
    include: { anggota: true },
    take: 100,
  })
  return NextResponse.json(list)
}

// POST: ajukan penarikan sukarela
export async function POST(req: NextRequest) {
  const body = await req.json()
  const actor = await getActingUser(req)
  const { anggotaId, jumlah, alasan } = body
  if (!anggotaId) return NextResponse.json({ error: 'Anggota wajib dipilih' }, { status: 400 })
  if (jumlah <= 0) return NextResponse.json({ error: 'Jumlah harus > 0' }, { status: 400 })
  if (!alasan) return NextResponse.json({ error: 'Alasan wajib diisi' }, { status: 400 })
  const counter = await db.koperasiPenarikanSukarela.count()
  const nomor = `PS-${String(counter + 1).padStart(4, '0')}`
  const ps = await db.koperasiPenarikanSukarela.create({
    data: {
      nomorPengajuan: nomor,
      koperasiAnggotaId: anggotaId,
      jumlah,
      alasan,
      status: 'menunggu',
    },
    include: { anggota: true },
  })
  return NextResponse.json(ps, { status: 201 })
}
