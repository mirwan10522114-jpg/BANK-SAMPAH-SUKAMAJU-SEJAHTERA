import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, setorSimpanan, tarikSimpananSukarela } from '@/lib/business'

// GET: list simpanan transactions
// Query params:
//   anggotaId      — filter by anggota
//   jenisSimpanan  — 'pokok' | 'wajib' | 'sukarela'
//   tipe           — 'setor' | 'tarik'
//   dari           — ISO date (gte tanggalTransaksi)
//   sampai         — ISO date (lte tanggalTransaksi)
//   q              — search by nomorTransaksi (case-insensitive contains)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const anggotaId = searchParams.get('anggotaId')
  const jenisSimpanan = searchParams.get('jenisSimpanan')
  const tipe = searchParams.get('tipe')
  const dari = searchParams.get('dari')
  const sampai = searchParams.get('sampai')
  const q = (searchParams.get('q') || '').trim()

  const where: any = {}
  if (anggotaId) where.koperasiAnggotaId = anggotaId
  if (jenisSimpanan) where.jenisSimpanan = jenisSimpanan
  if (tipe) where.tipe = tipe
  if (dari || sampai) {
    where.tanggalTransaksi = {}
    if (dari) where.tanggalTransaksi.gte = new Date(dari)
    if (sampai) {
      const s = new Date(sampai)
      s.setHours(23, 59, 59, 999)
      where.tanggalTransaksi.lte = s
    }
  }
  if (q) {
    where.nomorTransaksi = { contains: q }
  }
  const tx = await db.koperasiSimpananTransaksi.findMany({
    where,
    orderBy: { tanggalTransaksi: 'desc' },
    include: { anggota: true },
    take: 100,
  })
  return NextResponse.json(tx)
}

// POST: setor or tarik simpanan
export async function POST(req: NextRequest) {
  const body = await req.json()
  const actor = await getActingUser(req)
  const { anggotaId, jenisSimpanan, tipe, jumlah, keterangan } = body as {
    anggotaId: string
    jenisSimpanan: 'pokok' | 'wajib' | 'sukarela'
    tipe: 'setor' | 'tarik'
    jumlah: number
    keterangan?: string
  }
  if (!anggotaId) return NextResponse.json({ error: 'Anggota wajib dipilih' }, { status: 400 })
  if (jumlah <= 0) return NextResponse.json({ error: 'Jumlah harus > 0' }, { status: 400 })
  try {
    if (tipe === 'setor') {
      const tx = await setorSimpanan(anggotaId, jenisSimpanan, jumlah, actor?.id, keterangan)
      return NextResponse.json(tx, { status: 201 })
    } else {
      if (jenisSimpanan !== 'sukarela') return NextResponse.json({ error: 'Hanya simpanan sukarela yang dapat ditarik' }, { status: 400 })
      const tx = await tarikSimpananSukarela(anggotaId, jumlah, actor?.id, keterangan)
      return NextResponse.json(tx, { status: 201 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
