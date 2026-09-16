import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber, parseFilterStartDate, parseFilterEndDate } from '@/lib/format'
import { getActingUser, setorSimpanan, tarikSimpananSukarela } from '@/lib/business'

// GET: list simpanan transactions
// Query params:
//   anggotaId      — filter by anggota
//   jenisSimpanan  — 'pokok' | 'wajib' | 'sukarela' | 'all'
//   tipe           — 'setor' | 'tarik' | 'all'
//   dari           — YYYY-MM-DD, YYYY-MM, DD/MM/YYYY, or ISO date
//   sampai         — YYYY-MM-DD, YYYY-MM, DD/MM/YYYY, or ISO date
//   q              — search by nomorTransaksi or anggota name/code
//   limit          — max rows to return (default 5000)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const anggotaId = searchParams.get('anggotaId')
  const jenisSimpanan = searchParams.get('jenisSimpanan')
  const tipe = searchParams.get('tipe')
  const dari = searchParams.get('dari')
  const sampai = searchParams.get('sampai')
  const q = (searchParams.get('q') || '').trim()
  const limit = parseInt(searchParams.get('limit') || '5000', 10)

  const where: any = {}
  if (anggotaId) where.koperasiAnggotaId = anggotaId
  if (jenisSimpanan && jenisSimpanan !== 'all' && jenisSimpanan !== 'Semua') where.jenisSimpanan = jenisSimpanan
  if (tipe && tipe !== 'all' && tipe !== 'Semua') where.tipe = tipe

  const startDate = parseFilterStartDate(dari)
  const endDate = parseFilterEndDate(sampai)
  if (startDate || endDate) {
    where.tanggalTransaksi = {}
    if (startDate) where.tanggalTransaksi.gte = startDate
    if (endDate) where.tanggalTransaksi.lte = endDate
  }

  if (q) {
    where.OR = [
      { nomorTransaksi: { contains: q } },
      { anggota: { nama: { contains: q } } },
      { anggota: { nomorAnggota: { contains: q } } },
    ]
  }

  const [tx, countAgg, sumAgg] = await Promise.all([
    db.koperasiSimpananTransaksi.findMany({
      where,
      orderBy: { tanggalTransaksi: 'desc' },
      include: { anggota: true },
      take: limit,
    }),
    db.koperasiSimpananTransaksi.count({ where }),
    db.koperasiSimpananTransaksi.aggregate({ where, _sum: { jumlah: true } }),
  ])

  const totalCount = countAgg
  const totalSum = toNumber(sumAgg._sum.jumlah)

  const format = searchParams.get('format')
  if (format === 'wrapped') {
    return NextResponse.json({ list: tx, totalCount, totalSum })
  }

  return NextResponse.json(tx, {
    headers: {
      'x-total-count': String(totalCount),
      'x-total-sum': String(totalSum),
    },
  })
}

// POST: setor or tarik simpanan
export async function POST(req: NextRequest) {
  const body = await req.json()
  const actor = await getActingUser(req)
  const anggotaId = body.anggotaId
  const jenisSimpanan = (body.jenisSimpanan || body.jenis) as 'pokok' | 'wajib' | 'sukarela'
  const tipe = (body.tipe || 'setor') as 'setor' | 'tarik'
  const jumlah = Number(body.jumlah || 0)
  const keterangan = body.keterangan

  if (!anggotaId) return NextResponse.json({ error: 'Anggota wajib dipilih' }, { status: 400 })
  if (!['pokok', 'wajib', 'sukarela'].includes(jenisSimpanan)) {
    return NextResponse.json({ error: 'Jenis simpanan tidak valid' }, { status: 400 })
  }
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
