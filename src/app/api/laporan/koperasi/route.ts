import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'

// Laporan Laba Rugi Koperasi Simpan Pinjam
// Source of truth: KoperasiKasTransaksi (Buku Kas Koperasi)
// Revenue (masuk): simpanan (setor), angsuran, denda, saldo_awal
// Expense (keluar): penarikan (tarik sukarela), pinjaman (pencairan)
// Balance Sheet: total simpanan (pokok+wajib+sukarela), sisa pinjaman berjalan
// Pendapatan dari bunga pinjaman = angsuran - (jumlahPokok/bulan) ... dihitung dari bunga

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const periode = searchParams.get('periode') || 'bulan_ini'
  const dari = searchParams.get('dari')
  const sampai = searchParams.get('sampai')

  const now = new Date()
  const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  let rangeStart: Date
  let rangeEnd: Date = endOfCurrentMonth
  if (periode === 'custom' && dari && sampai) {
    rangeStart = new Date(dari); rangeStart.setHours(0, 0, 0, 0)
    rangeEnd = new Date(sampai); rangeEnd.setHours(23, 59, 59, 999)
  } else if (periode === '1bul') {
    rangeStart = new Date(now); rangeStart.setDate(rangeStart.getDate() - 29); rangeStart.setHours(0, 0, 0, 0)
  } else if (periode === '3bul') {
    rangeStart = new Date(now); rangeStart.setDate(rangeStart.getDate() - 89); rangeStart.setHours(0, 0, 0, 0)
  } else if (periode === '6bul') {
    rangeStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  } else if (periode === '1thn') {
    rangeStart = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  } else {
    rangeStart = new Date(now.getFullYear(), now.getMonth(), 1)
  }

  const dateRange = { gte: rangeStart, lte: rangeEnd }

  // ===== Parallel aggregation =====
  const [
    allKasTx,
    simpananSaldoAgg,
    simpananSaldoByJenis,
    pinjamanBerjalan,
    pinjamanLunas,
    angsuranInPeriod,
    pinjamanCairInPeriod,
    setting,
    anggotaCount,
    anggotaKeluarInPeriod,
  ] = await Promise.all([
    db.koperasiKasTransaksi.findMany({
      where: { tanggalTransaksi: dateRange },
      orderBy: { tanggalTransaksi: 'desc' },
    }),
    db.koperasiSimpananSaldo.aggregate({ _sum: { saldo: true } }),
    db.koperasiSimpananSaldo.groupBy({
      by: ['jenisSimpanan'],
      _sum: { saldo: true },
    }),
    db.koperasiPinjaman.findMany({
      where: { status: 'berjalan' },
      select: { id: true, sisaPinjaman: true, jumlahPinjaman: true, tenorBulan: true, sukuBunga: true, nomorPinjaman: true, koperasiAnggotaId: true },
    }),
    db.koperasiPinjaman.aggregate({
      where: { status: 'lunas', tanggalPencairan: dateRange },
      _sum: { jumlahPinjaman: true, biayaAdmin: true },
      _count: true,
    }),
    db.koperasiPinjamanAngsuran.findMany({
      where: { tanggalBayar: dateRange },
      include: { pinjaman: { include: { anggota: true } } },
    }),
    db.koperasiPinjaman.findMany({
      where: { tanggalPencairan: dateRange, status: { in: ['berjalan', 'lunas'] } },
      select: { id: true, jumlahPinjaman: true, biayaAdmin: true, tenorBulan: true, sukuBunga: true, nomorPinjaman: true, anggota: true },
    }),
    db.koperasiSetting.findFirst(),
    db.koperasiAnggota.count({ where: { status: 'aktif' } }),
    db.koperasiAnggotaKeluar.findMany({ where: { tanggalKeluar: dateRange } }),
  ])

  // ===== Group kas by sumber + tipe =====
  const bySumber: Record<string, { masuk: number; keluar: number; count: number }> = {}
  for (const tx of allKasTx) {
    const s = tx.sumber || 'lainnya'
    if (!bySumber[s]) bySumber[s] = { masuk: 0, keluar: 0, count: 0 }
    if (tx.tipe === 'masuk') bySumber[s].masuk += toNumber(tx.jumlah)
    else bySumber[s].keluar += toNumber(tx.jumlah)
    bySumber[s].count++
  }

  // ===== P&L Sections =====
  // Pendapatan:
  // - Pendapatan bunga pinjaman (dihitung dari angsuran: bunga = jumlahBayar - (jumlahPokok/bulan))
  // - Pendapatan biaya admin pinjaman (saat pencairan)
  // - Pendapatan denda keterlambatan
  // - Setoran simpanan (inflow kas, tapi ini LIABILITAS bukan revenue)
  // Note: setor simpanan = kas masuk + utang ke anggota. Tarik simpanan = kas keluar - utang.

  // Hitung pendapatan bunga dari angsuran
  let totalBungaPinjaman = 0
  let totalPokokAngsuran = 0
  let totalDenda = 0
  for (const a of angsuranInPeriod) {
    const pinjaman = a.pinjaman
    if (!pinjaman) continue
    const angsuranPerBulan = toNumber(pinjaman.angsuranPerBulan) || (toNumber(pinjaman.jumlahPinjaman) / Math.max(1, pinjaman.tenorBulan))
    const pokokPerBulan = toNumber(pinjaman.jumlahPinjaman) / Math.max(1, pinjaman.tenorBulan)
    const bungaPerBulan = Math.max(0, angsuranPerBulan - pokokPerBulan)
    totalBungaPinjaman += bungaPerBulan
    totalPokokAngsuran += pokokPerBulan
    totalDenda += toNumber(a.dendaBayar)
  }

  // Pendapatan biaya admin dari pencairan pinjaman
  let totalBiayaAdmin = 0
  for (const p of pinjamanCairInPeriod) {
    totalBiayaAdmin += toNumber(p.biayaAdmin)
  }

  // Pendapatan (revenue) — yang benar-benar income koperasi
  const pendapatan = {
    bungaPinjaman: totalBungaPinjaman,
    biayaAdminPinjaman: totalBiayaAdmin,
    dendaKeterlambatan: totalDenda,
    lainnya: bySumber['lainnya']?.masuk || 0,
  }
  const totalPendapatan = Object.values(pendapatan).reduce((a, b) => a + b, 0)

  // Beban (expense) — kas keluar yang benar-benar beban
  // pencairan pinjaman = kas keluar + asset (piutang). Bukan beban.
  // tarik simpanan = kas keluar - utang. Bukan beban.
  // Jadi koperasi tidak punya beban operasional dalam data ini (kecuali 'lainnya' keluar)
  const beban = {
    pencairanPinjaman: bySumber['pinjaman']?.keluar || 0,
    penarikanSimpanan: bySumber['penarikan']?.keluar || 0,
    lainnya: bySumber['lainnya']?.keluar || 0,
  }
  const totalBebanKas = Object.values(beban).reduce((a, b) => a + b, 0)
  // Beban operasional nyata (exclude pencairan & penarikan yg bukan beban)
  const bebanOperasional = beban.lainnya
  const labaRugiBersih = totalPendapatan - bebanOperasional

  // ===== Balance Sheet =====
  const totalSimpanan = toNumber(simpananSaldoAgg._sum.saldo)
  const simpananByJenis: Record<string, number> = { pokok: 0, wajib: 0, sukarela: 0 }
  for (const s of simpananSaldoByJenis) {
    simpananByJenis[s.jenisSimpanan] = toNumber(s._sum.saldo)
  }
  const totalPinjamanBerjalan = pinjamanBerjalan.reduce((sum, p) => sum + toNumber(p.sisaPinjaman), 0)
  const totalPinjamanPokokBerjalan = pinjamanBerjalan.reduce((sum, p) => sum + toNumber(p.jumlahPinjaman), 0)
  // Estimasi bunga yang akan diterima dari pinjaman berjalan
  const estimasiBungaBerjalan = pinjamanBerjalan.reduce((sum, p) => {
    const angsuranPerBulan = toNumber((p as any).angsuranPerBulan) || (toNumber(p.jumlahPinjaman) / Math.max(1, p.tenorBulan))
    const pokokPerBulan = toNumber(p.jumlahPinjaman) / Math.max(1, p.tenorBulan)
    const bungaPerBulan = Math.max(0, angsuranPerBulan - pokokPerBulan)
    // Sisa bulan = sisaPinjaman / angsuranPerBulan
    const sisaBulan = toNumber(p.sisaPinjaman) / Math.max(0.01, angsuranPerBulan)
    return sum + (bungaPerBulan * sisaBulan)
  }, 0)

  // ===== Trend (monthly buckets) =====
  const months = new Map<string, { masuk: number; keluar: number; bunga: number; label: string }>()
  // Pre-fill bunga from angsuran
  const angsuranByMonth = new Map<string, number>()
  for (const a of angsuranInPeriod) {
    const d = new Date(a.tanggalBayar)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const pinjaman = a.pinjaman
    if (!pinjaman) continue
    const angsuranPerBulan = toNumber((pinjaman as any).angsuranPerBulan) || (toNumber(pinjaman.jumlahPinjaman) / Math.max(1, pinjaman.tenorBulan))
    const pokokPerBulan = toNumber(pinjaman.jumlahPinjaman) / Math.max(1, pinjaman.tenorBulan)
    const bunga = Math.max(0, angsuranPerBulan - pokokPerBulan)
    angsuranByMonth.set(key, (angsuranByMonth.get(key) || 0) + bunga)
  }
  for (const tx of allKasTx) {
    const d = new Date(tx.tanggalTransaksi)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
    if (!months.has(key)) months.set(key, { masuk: 0, keluar: 0, bunga: angsuranByMonth.get(key) || 0, label })
    const m = months.get(key)!
    if (tx.tipe === 'masuk') m.masuk += toNumber(tx.jumlah)
    else m.keluar += toNumber(tx.jumlah)
    m.bunga = angsuranByMonth.get(key) || m.bunga
  }
  const trend = Array.from(months.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, v]) => ({ key, ...v, net: v.masuk - v.keluar }))

  // ===== Saldo kas koperasi (all-time) =====
  const kasMasukAllAgg = await db.koperasiKasTransaksi.aggregate({ where: { tipe: 'masuk' }, _sum: { jumlah: true } })
  const kasKeluarAllAgg = await db.koperasiKasTransaksi.aggregate({ where: { tipe: 'keluar' }, _sum: { jumlah: true } })
  const saldoKas = toNumber(kasMasukAllAgg._sum.jumlah) - toNumber(kasKeluarAllAgg._sum.jumlah)

  return NextResponse.json({
    periode: { start: rangeStart, end: rangeEnd, label: periode },
    ringkasan: {
      totalPendapatan,
      bebanOperasional,
      labaRugiBersih,
      saldoKas,
      totalSimpanan,
      totalPinjamanBerjalan,
      estimasiBungaBerjalan,
      totalAnggota: anggotaCount,
      anggotaKeluar: anggotaKeluarInPeriod.length,
    },
    pendapatan,
    beban,
    kasFlow: {
      totalMasuk: bySumber['simpanan']?.masuk + (bySumber['angsuran']?.masuk || 0) + (bySumber['denda']?.masuk || 0) + (bySumber['saldo_awal']?.masuk || 0) + (bySumber['lainnya']?.masuk || 0),
      totalKeluar: totalBebanKas,
      netKas: 0, // dihitung di client
    },
    simpanan: {
      total: totalSimpanan,
      pokok: simpananByJenis.pokok,
      wajib: simpananByJenis.wajib,
      sukarela: simpananByJenis.sukarela,
    },
    pinjaman: {
      totalBerjalan: totalPinjamanBerjalan,
      totalPokokBerjalan: totalPinjamanPokokBerjalan,
      countBerjalan: pinjamanBerjalan.length,
      estimasiBungaBerjalan,
      cairDalamPeriode: {
        count: pinjamanCairInPeriod.length,
        totalPokok: pinjamanCairInPeriod.reduce((s, p) => s + toNumber(p.jumlahPinjaman), 0),
        totalBiayaAdmin: totalBiayaAdmin,
      },
      lunasDalamPeriode: {
        count: toNumber(pinjamanLunas._count),
        totalPokok: toNumber(pinjamanLunas._sum.jumlahPinjaman),
      },
    },
    angsuranDalamPeriode: {
      count: angsuranInPeriod.length,
      totalBayar: angsuranInPeriod.reduce((s, a) => s + toNumber(a.jumlahBayar), 0),
      totalPokok: totalPokokAngsuran,
      totalBunga: totalBungaPinjaman,
      totalDenda,
    },
    setting: setting ? {
      namaKoperasi: setting.namaKoperasi,
      sukuBungaPinjaman: toNumber(setting.sukuBungaPinjaman),
      biayaAdminPinjaman: toNumber(setting.biayaAdminPinjaman),
      nominalSimpananPokok: toNumber(setting.nominalSimpananPokok),
      nominalSimpananWajib: toNumber(setting.nominalSimpananWajib),
    } : null,
    bySumber,
    trend,
    transaksi: allKasTx.slice(0, 100),
  })
}
