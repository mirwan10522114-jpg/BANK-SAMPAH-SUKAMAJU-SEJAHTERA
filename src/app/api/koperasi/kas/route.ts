import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber, parseFilterStartDate, parseFilterEndDate } from '@/lib/format'
import { getActingUser, recordKasTx, getKoperasiKasBalance } from '@/lib/business'

// GET: kas koperasi list + saldo summary
// Supports optional dari/sampai period filter for list + stats.
// Note: saldo is always all-time (current koperasi cash saldo).
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sumber = searchParams.get('sumber')
    const tipe = searchParams.get('tipe')
    const dari = searchParams.get('dari')
    const sampai = searchParams.get('sampai')
    const q = (searchParams.get('q') || '').trim()
    const limit = parseInt(searchParams.get('limit') || '5000', 10)

    const where: any = {}
    if (sumber && sumber !== 'all' && sumber !== 'Semua') where.sumber = sumber
    if (tipe && tipe !== 'all' && tipe !== 'Semua') where.tipe = tipe

    // Robust date filter
    const startDate = parseFilterStartDate(dari)
    const endDate = parseFilterEndDate(sampai)
    const hasPeriod = !!(startDate || endDate)
    if (hasPeriod) {
      where.tanggalTransaksi = {}
      if (startDate) where.tanggalTransaksi.gte = startDate
      if (endDate) where.tanggalTransaksi.lte = endDate
    }

    if (q) {
      where.OR = [
        { nomorKas: { contains: q } },
        { keterangan: { contains: q } },
        { nomorReferensi: { contains: q } },
      ]
    }

    const [list, totalCount, masukAggAll, keluarAggAll, masukAggPeriod, keluarAggPeriod] = await Promise.all([
      db.koperasiKasTransaksi.findMany({
        where,
        orderBy: { tanggalTransaksi: 'desc' },
        include: { createdBy: true },
        take: limit,
      }),
      db.koperasiKasTransaksi.count({ where }),
      // All-time for saldo
      db.koperasiKasTransaksi.aggregate({ where: { tipe: 'masuk' }, _sum: { jumlah: true } }),
      db.koperasiKasTransaksi.aggregate({ where: { tipe: 'keluar' }, _sum: { jumlah: true } }),
      // Period-filtered for stats
      db.koperasiKasTransaksi.aggregate({ where: { tipe: 'masuk', ...(where.tanggalTransaksi ? { tanggalTransaksi: where.tanggalTransaksi } : {}) }, _sum: { jumlah: true } }),
      db.koperasiKasTransaksi.aggregate({ where: { tipe: 'keluar', ...(where.tanggalTransaksi ? { tanggalTransaksi: where.tanggalTransaksi } : {}) }, _sum: { jumlah: true } }),
    ])
    const saldo = toNumber(masukAggAll._sum.jumlah) - toNumber(keluarAggAll._sum.jumlah) // all-time
    const totalMasuk = toNumber(masukAggPeriod._sum.jumlah) // filtered
    const totalKeluar = toNumber(keluarAggPeriod._sum.jumlah) // filtered
    // breakdown by sumber (all-time for completeness)
    const bySumber = await db.koperasiKasTransaksi.groupBy({
      by: ['sumber', 'tipe'],
      _sum: { jumlah: true },
    })
    return NextResponse.json({
      list,
      saldo,
      saldoKas: saldo,
      totalCount,
      totalSum: totalMasuk + totalKeluar,
      totalMasuk,
      totalKeluar,
      bySumber,
      periode: hasPeriod ? { dari, sampai } : null,
    })
  } catch (err: any) {
    console.error('Error in koperasi/kas GET:', err)
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 })
  }
}

// POST: Catat pengeluaran operasional atau biaya lain pada kas koperasi
export async function POST(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const tipe = body.tipe === 'masuk' ? 'masuk' : 'keluar' // default keluar
  const sumber = body.sumber || 'operasional'
  const jumlah = Number(body.jumlah)
  const keterangan = (body.keterangan || '').trim()
  const nomorReferensi = (body.nomorReferensi || '').trim() || undefined
  const tanggalTransaksi = body.tanggalTransaksi ? new Date(body.tanggalTransaksi) : undefined

  if (!jumlah || isNaN(jumlah) || jumlah <= 0) {
    return NextResponse.json({ error: 'Nominal transaksi kas harus lebih dari Rp 0' }, { status: 400 })
  }

  if (!keterangan) {
    return NextResponse.json({ error: 'Keterangan pengeluaran operasional wajib diisi' }, { status: 400 })
  }

  // Jika pengeluaran (keluar), validasi kecukupan saldo kas koperasi
  const currentSaldo = await getKoperasiKasBalance()
  if (tipe === 'keluar' && currentSaldo < jumlah) {
    return NextResponse.json({
      error: `Saldo kas koperasi tidak mencukupi. Saldo saat ini: Rp ${currentSaldo.toLocaleString('id-ID')}, pengeluaran diajukan: Rp ${jumlah.toLocaleString('id-ID')}`,
    }, { status: 400 })
  }

  try {
    const tx = await recordKasTx(
      sumber,
      tipe,
      jumlah,
      keterangan,
      actor.id,
      nomorReferensi,
      tanggalTransaksi
    )

    const newSaldo = await getKoperasiKasBalance()

    return NextResponse.json({
      success: true,
      message: `Berhasil mencatat ${tipe === 'keluar' ? 'pengeluaran' : 'pemasukan'} kas koperasi`,
      tx,
      saldoKas: newSaldo,
    }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Gagal mencatat transaksi kas' }, { status: 400 })
  }
}
