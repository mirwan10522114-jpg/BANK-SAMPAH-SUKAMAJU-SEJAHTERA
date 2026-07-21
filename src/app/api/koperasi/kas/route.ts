import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'

// GET: kas koperasi list + balance summary
// Supports optional dari/sampai period filter for list + stats.
// Note: saldo is always all-time (current koperasi cash balance).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sumber = searchParams.get('sumber')
  const tipe = searchParams.get('tipe')
  const dari = searchParams.get('dari')
  const sampai = searchParams.get('sampai')

  const where: any = {}
  if (sumber) where.sumber = sumber
  if (tipe) where.tipe = tipe

  // Period filter for list (saldo stays all-time)
  const periodFilter: any = {}
  if (dari) periodFilter.gte = new Date(dari)
  if (sampai) periodFilter.lte = new Date(sampai + 'T23:59:59')
  const hasPeriod = !!(dari || sampai)
  if (hasPeriod) where.tanggalTransaksi = periodFilter

  const [list, masukAggAll, keluarAggAll, masukAggPeriod, keluarAggPeriod] = await Promise.all([
    db.koperasiKasTransaksi.findMany({ where, orderBy: { tanggalTransaksi: 'desc' }, include: { createdBy: true }, take: 200 }),
    // All-time for saldo
    db.koperasiKasTransaksi.aggregate({ where: { tipe: 'masuk' }, _sum: { jumlah: true } }),
    db.koperasiKasTransaksi.aggregate({ where: { tipe: 'keluar' }, _sum: { jumlah: true } }),
    // Period-filtered for stats
    db.koperasiKasTransaksi.aggregate({ where: { tipe: 'masuk', ...(hasPeriod ? { tanggalTransaksi: periodFilter } : {}) }, _sum: { jumlah: true } }),
    db.koperasiKasTransaksi.aggregate({ where: { tipe: 'keluar', ...(hasPeriod ? { tanggalTransaksi: periodFilter } : {}) }, _sum: { jumlah: true } }),
  ])
  const saldo = toNumber(masukAggAll._sum.jumlah) - toNumber(keluarAggAll._sum.jumlah) // all-time
  const totalMasuk = toNumber(masukAggPeriod._sum.jumlah) // filtered
  const totalKeluar = toNumber(keluarAggPeriod._sum.jumlah) // filtered
  // breakdown by sumber (all-time for completeness)
  const bySumber = await db.koperasiKasTransaksi.groupBy({
    by: ['sumber', 'tipe'],
    _sum: { jumlah: true },
  })
  return NextResponse.json({ list, saldo, totalMasuk, totalKeluar, bySumber, periode: hasPeriod ? { dari, sampai } : null })
}
