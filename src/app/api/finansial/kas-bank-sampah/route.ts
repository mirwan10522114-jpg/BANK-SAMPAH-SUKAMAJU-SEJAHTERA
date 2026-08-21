import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'
import { getBankSampahKasBalance, recordBankSampahKas, getActingUser } from '@/lib/business'

// GET: Buku Kas Utama institusi (list + balance + summary)
// Supports optional dari/sampai period filter for summary stats.
// Note: kasSaldo is always all-time (current cash on hand).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tipe = searchParams.get('tipe')
  const sumber = searchParams.get('sumber')
  const dari = searchParams.get('dari')
  const sampai = searchParams.get('sampai')

  const where: any = {}
  if (tipe) where.tipe = tipe
  if (sumber) where.sumber = sumber

  // Period filter for list + summary (kasSaldo stays all-time)
  const periodFilter: any = {}
  if (dari) periodFilter.gte = new Date(dari)
  if (sampai) periodFilter.lte = new Date(sampai + 'T23:59:59')
  const hasPeriod = !!(dari || sampai)
  if (hasPeriod) where.transactedAt = periodFilter

  const masukWhere = { tipe: 'masuk' as const, ...(hasPeriod ? { transactedAt: periodFilter } : {}) }
  const keluarWhere = { tipe: 'keluar' as const, ...(hasPeriod ? { transactedAt: periodFilter } : {}) }

  const [list, kasSaldo, masukAgg, keluarAgg] = await Promise.all([
    db.bankSampahKas.findMany({
      where,
      orderBy: { transactedAt: 'desc' },
      include: { createdBy: { select: { name: true } } },
      take: 200,
    }),
    getBankSampahKasBalance(), // always all-time
    db.bankSampahKas.aggregate({ where: masukWhere, _sum: { jumlah: true } }),
    db.bankSampahKas.aggregate({ where: keluarWhere, _sum: { jumlah: true } }),
  ])

  return NextResponse.json({
    list: list.map((k) => ({
      ...k,
      jumlah: toNumber(k.jumlah),
      saldoSetelah: toNumber(k.saldoSetelah),
    })),
    kasSaldo, // all-time current balance
    totalMasuk: toNumber(masukAgg._sum.jumlah), // filtered by period if provided
    totalKeluar: toNumber(keluarAgg._sum.jumlah), // filtered by period if provided
    periode: hasPeriod ? { dari, sampai } : null,
  })
}

// POST: manual top-up / penyesuaian kas (admin only)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const actor = await getActingUser(req)
  const { tipe, sumber, jumlah, keterangan } = body as {
    tipe: 'masuk' | 'keluar'
    sumber: string
    jumlah: number
    keterangan: string
  }

  if (!jumlah || jumlah <= 0) return NextResponse.json({ error: 'Jumlah harus > 0' }, { status: 400 })
  if (!['masuk', 'keluar'].includes(tipe)) return NextResponse.json({ error: 'Tipe harus masuk/keluar' }, { status: 400 })

  try {
    const result = await recordBankSampahKas(tipe, sumber, jumlah, keterangan, actor?.id)
    return NextResponse.json(result, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
