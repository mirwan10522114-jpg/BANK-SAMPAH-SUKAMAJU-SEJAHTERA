import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'

// Koperasi Executive Dashboard API
// Returns: 5 metric cards, arus kas trend (monthly), komposisi simpanan, transaction log
// Supports period filters: periode (bulan_ini/custom), dari, sampai

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const periode = searchParams.get('periode') || 'bulan_ini'
  const dari = searchParams.get('dari') // yyyy-mm-dd
  const sampai = searchParams.get('sampai') // yyyy-mm-dd
  const logSearch = searchParams.get('q') || ''
  const logWaktu = searchParams.get('waktu') || 'Semua Waktu'
  const logDari = searchParams.get('logDari') // yyyy-mm-dd (custom log range)
  const logSampai = searchParams.get('logSampai') // yyyy-mm-dd (custom log range)
  const logJenis = searchParams.get('jenis') || 'Semua Jenis'
  const logStatus = searchParams.get('status') || 'Semua Status'

  // Compute period range
  const now = new Date()
  let rangeStart: Date
  let rangeEnd: Date = now
  if (periode === 'custom' && dari && sampai) {
    rangeStart = new Date(dari)
    rangeStart.setHours(0, 0, 0, 0)
    rangeEnd = new Date(sampai)
    rangeEnd.setHours(23, 59, 59, 999)
  } else if (periode === '1bul') {
    rangeStart = new Date(now); rangeStart.setDate(rangeStart.getDate() - 29); rangeStart.setHours(0, 0, 0, 0)
  } else if (periode === '3bul') {
    rangeStart = new Date(now); rangeStart.setDate(rangeStart.getDate() - 89); rangeStart.setHours(0, 0, 0, 0)
  } else if (periode === '6bul') {
    rangeStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  } else if (periode === '1thn') {
    rangeStart = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  } else {
    // bulan_ini (default)
    rangeStart = new Date(now.getFullYear(), now.getMonth(), 1)
    rangeEnd = now
  }

  // ===== 5 METRIC CARDS (use period range) =====
  const [kasMasukAgg, kasKeluarAgg, simpananSaldoAgg, pinjamanAktif, dendaAgg, anggotaCount] = await Promise.all([
    db.koperasiKasTransaksi.aggregate({
      where: { tipe: 'masuk', tanggalTransaksi: { gte: rangeStart, lte: rangeEnd } },
      _sum: { jumlah: true },
    }),
    db.koperasiKasTransaksi.aggregate({
      where: { tipe: 'keluar', tanggalTransaksi: { gte: rangeStart, lte: rangeEnd } },
      _sum: { jumlah: true },
    }),
    db.koperasiSimpananSaldo.aggregate({ _sum: { saldo: true } }),
    db.koperasiPinjaman.findMany({
      where: { status: 'berjalan' },
      select: { sisaPinjaman: true },
    }),
    db.koperasiPinjamanAngsuran.aggregate({
      where: { tanggalBayar: { gte: rangeStart, lte: rangeEnd } },
      _sum: { dendaBayar: true },
    }),
    db.koperasiAnggota.count({ where: { status: 'aktif' } }),
  ])

  const totalKas = toNumber(kasMasukAgg._sum.jumlah) - toNumber(kasKeluarAgg._sum.jumlah)
  const totalSimpanan = toNumber(simpananSaldoAgg._sum.saldo)
  const sisaPinjaman = pinjamanAktif.reduce((s, p) => s + toNumber(p.sisaPinjaman), 0)
  const pemasukanDenda = toNumber(dendaAgg._sum.dendaBayar)
  const totalAnggota = anggotaCount

  // ===== ARUS KAS TREND (uses period rangeStart/rangeEnd with dynamic bucketing) =====
  function kBucketKey(d: Date, granularity: 'day' | 'week' | 'month'): string {
    if (granularity === 'day') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (granularity === 'week') {
      const tmp = new Date(d)
      const day = tmp.getDay()
      const diff = tmp.getDate() - day + (day === 0 ? -6 : 1)
      tmp.setDate(diff)
      return `${tmp.getFullYear()}-${String(tmp.getMonth() + 1).padStart(2, '0')}-${String(tmp.getDate()).padStart(2, '0')}`
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  function kFormatLabel(d: Date, granularity: 'day' | 'week' | 'month'): string {
    if (granularity === 'day') return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
    if (granularity === 'week') return `Ming ${d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}`
    return d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
  }

  const kDiffDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24))
  let kGranularity: 'day' | 'week' | 'month'
  if (kDiffDays <= 31) kGranularity = 'day'
  else if (kDiffDays <= 92) kGranularity = 'week'
  else kGranularity = 'month'

  const kMonthKeys: string[] = []
  const kMonthLabels: string[] = []
  const kSeen = new Set<string>()
  if (kGranularity === 'day') {
    const cursor = new Date(rangeStart); cursor.setHours(0, 0, 0, 0)
    while (cursor <= rangeEnd) {
      const k = kBucketKey(cursor, 'day')
      if (!kSeen.has(k)) { kSeen.add(k); kMonthKeys.push(k); kMonthLabels.push(kFormatLabel(cursor, 'day')) }
      cursor.setDate(cursor.getDate() + 1)
    }
  } else if (kGranularity === 'week') {
    const start = new Date(rangeStart)
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1)
    start.setDate(diff); start.setHours(0, 0, 0, 0)
    while (start <= rangeEnd) {
      const k = kBucketKey(start, 'week')
      if (!kSeen.has(k)) { kSeen.add(k); kMonthKeys.push(k); kMonthLabels.push(kFormatLabel(start, 'week')) }
      start.setDate(start.getDate() + 7)
    }
  } else {
    const start = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1)
    while (start <= rangeEnd) {
      const k = kBucketKey(start, 'month')
      if (!kSeen.has(k)) { kSeen.add(k); kMonthKeys.push(k); kMonthLabels.push(kFormatLabel(start, 'month')) }
      start.setMonth(start.getMonth() + 1)
    }
  }

  const kasTs = await db.koperasiKasTransaksi.findMany({
    where: { tanggalTransaksi: { gte: rangeStart, lte: rangeEnd } },
    select: { tanggalTransaksi: true, tipe: true, jumlah: true },
  })
  const buckets: Record<string, { pemasukan: number; pengeluaran: number }> = {}
  for (const k of kMonthKeys) buckets[k] = { pemasukan: 0, pengeluaran: 0 }
  for (const t of kasTs) {
    const k = kBucketKey(t.tanggalTransaksi, kGranularity)
    if (buckets[k]) {
      if (t.tipe === 'masuk') buckets[k].pemasukan += toNumber(t.jumlah)
      else buckets[k].pengeluaran += toNumber(t.jumlah)
    }
  }
  const arusKasTrend = kMonthKeys.map((k, i) => ({
    month: kMonthLabels[i],
    pemasukan: Math.round(buckets[k].pemasukan),
    pengeluaran: Math.round(buckets[k].pengeluaran),
  }))

  // ===== KOMPOSISI SIMPANAN (by jenis: pokok, wajib, sukarela) =====
  const simpananByJenis = await db.koperasiSimpananSaldo.groupBy({
    by: ['jenisSimpanan'],
    _sum: { saldo: true },
  })
  const komposisiSimpanan = {
    pokok: 0,
    wajib: 0,
    sukarela: 0,
  }
  for (const s of simpananByJenis) {
    if (s.jenisSimpanan === 'pokok') komposisiSimpanan.pokok = toNumber(s._sum.saldo)
    if (s.jenisSimpanan === 'wajib') komposisiSimpanan.wajib = toNumber(s._sum.saldo)
    if (s.jenisSimpanan === 'sukarela') komposisiSimpanan.sukarela = toNumber(s._sum.saldo)
  }

  // ===== TRANSACTION LOG (from koperasiKasTransaksi with filters) =====
  // Determine log time range from logWaktu filter (or custom logDari/logSampai)
  let logStart: Date | null = null
  let logEnd: Date | null = null
  if (logWaktu === 'custom' && logDari && logSampai) {
    logStart = new Date(logDari); logStart.setHours(0, 0, 0, 0)
    logEnd = new Date(logSampai); logEnd.setHours(23, 59, 59, 999)
  } else if (logWaktu === '7 Hari Terakhir') {
    logStart = new Date(now); logStart.setDate(logStart.getDate() - 7)
  } else if (logWaktu === '30 Hari Terakhir') {
    logStart = new Date(now); logStart.setDate(logStart.getDate() - 30)
  } else if (logWaktu === '90 Hari Terakhir') {
    logStart = new Date(now); logStart.setDate(logStart.getDate() - 90)
  } else if (logWaktu === '1 Tahun Terakhir') {
    logStart = new Date(now); logStart.setFullYear(logStart.getFullYear() - 1)
  }

  const logWhere: any = {}
  if (logStart && logEnd) {
    logWhere.tanggalTransaksi = { gte: logStart, lte: logEnd }
  } else if (logStart) {
    logWhere.tanggalTransaksi = { gte: logStart }
  }
  if (logJenis !== 'Semua Jenis') {
    // jenis maps to sumber: simpanan, penarikan, pinjaman, angsuran, denda
    logWhere.sumber = logJenis.toLowerCase()
  }
  // status filter - all kas transactions are effectively "selesai" once recorded; we'll treat "Semua Status" as no filter
  // For status, we can map: masuk=selesai, keluar=selesai. We'll keep it simple.

  // Fetch kas transactions
  let kasLogs = await db.koperasiKasTransaksi.findMany({
    where: logWhere,
    orderBy: { tanggalTransaksi: 'desc' },
    take: 200,
    include: { createdBy: { select: { name: true } } },
  })

  // Build anggota lookup for names (kas transactions don't directly link to anggota, so we infer from simpanan tx)
  // For richer anggota info, fetch simpanan + pinjaman + angsuran tx within range and merge
  const logDateRange = logStart && logEnd
    ? { gte: logStart, lte: logEnd }
    : logStart
      ? { gte: logStart }
      : undefined
  const [simpananTx, penarikanTx, pinjamanTx, angsuranTx] = await Promise.all([
    db.koperasiSimpananTransaksi.findMany({
      where: logDateRange ? { tanggalTransaksi: logDateRange } : {},
      include: { anggota: { select: { nama: true, nomorAnggota: true } } },
      take: 200,
    }),
    db.koperasiPenarikanSukarela.findMany({
      where: logDateRange ? { tanggalPengajuan: logDateRange } : {},
      include: { anggota: { select: { nama: true, nomorAnggota: true } } },
      take: 200,
    }),
    db.koperasiPinjaman.findMany({
      where: logDateRange ? { tanggalPengajuan: logDateRange } : {},
      include: { anggota: { select: { nama: true, nomorAnggota: true } } },
      take: 200,
    }),
    db.koperasiPinjamanAngsuran.findMany({
      where: logDateRange ? { tanggalBayar: logDateRange } : {},
      include: { pinjaman: { include: { anggota: { select: { nama: true, nomorAnggota: true } } } } },
      take: 200,
    }),
  ])

  type LogRow = {
    id: string
    tanggal: Date
    anggota: string
    kode: string | null
    keterangan: string
    nominal: number
    jenis: string // Simpanan, Penarikan, Pinjaman, Angsuran, Denda
    status: string // Selesai
    tipe: 'masuk' | 'keluar'
  }
  const rows: LogRow[] = []
  for (const t of simpananTx) {
    const sumberFilter = logJenis !== 'Semua Jenis' && logJenis.toLowerCase() !== 'simpanan'
    if (sumberFilter) continue
    if (logSearch) {
      const q = logSearch.toLowerCase()
      if (!t.anggota?.nama?.toLowerCase().includes(q) && !t.nomorTransaksi?.toLowerCase().includes(q) && !(t.anggota?.nomorAnggota || '').toLowerCase().includes(q)) continue
    }
    rows.push({
      id: t.id,
      tanggal: t.tanggalTransaksi,
      anggota: t.anggota?.nama || '-',
      kode: t.anggota?.nomorAnggota || null,
      keterangan: `${t.tipe === 'setor' ? 'Setor' : 'Tarik'} Simpanan ${t.jenisSimpanan} · ${t.nomorTransaksi}`,
      nominal: toNumber(t.jumlah),
      jenis: 'Simpanan',
      status: 'Selesai',
      tipe: t.tipe === 'setor' ? 'masuk' : 'keluar',
    })
  }
  for (const t of penarikanTx) {
    if (logJenis !== 'Semua Jenis' && logJenis.toLowerCase() !== 'penarikan') continue
    if (logSearch) {
      const q = logSearch.toLowerCase()
      if (!t.anggota?.nama?.toLowerCase().includes(q) && !(t.anggota?.nomorAnggota || '').toLowerCase().includes(q)) continue
    }
    rows.push({
      id: t.id,
      tanggal: t.tanggalPengajuan,
      anggota: t.anggota?.nama || '-',
      kode: t.anggota?.nomorAnggota || null,
      keterangan: `Pengajuan Penarikan Sukarela · ${t.nomorPengajuan}`,
      nominal: toNumber(t.jumlah),
      jenis: 'Penarikan',
      status: t.status === 'dicairkan' ? 'Selesai' : t.status === 'disetujui' ? 'Disetujui' : t.status === 'ditolak' ? 'Ditolak' : 'Menunggu',
      tipe: 'keluar',
    })
  }
  for (const t of pinjamanTx) {
    if (logJenis !== 'Semua Jenis' && logJenis.toLowerCase() !== 'pinjaman') continue
    if (logSearch) {
      const q = logSearch.toLowerCase()
      if (!t.anggota?.nama?.toLowerCase().includes(q) && !t.nomorPinjaman.toLowerCase().includes(q)) continue
    }
    rows.push({
      id: t.id,
      tanggal: t.tanggalPengajuan,
      anggota: t.anggota?.nama || '-',
      kode: t.anggota?.nomorAnggota || null,
      keterangan: `${t.status === 'diajukan' ? 'Pengajuan' : t.status === 'berjalan' ? 'Pencairan' : t.status === 'lunas' ? 'Pelunasan' : 'Pinjaman'} · ${t.nomorPinjaman}`,
      nominal: toNumber(t.jumlahPinjaman),
      jenis: 'Pinjaman',
      status: t.status === 'berjalan' ? 'Berjalan' : t.status === 'lunas' ? 'Lunas' : t.status === 'disetujui' ? 'Disetujui' : t.status === 'ditolak' ? 'Ditolak' : 'Diajukan',
      tipe: t.tanggalPencairan ? 'keluar' : 'masuk', // diajukan = no flow, berjalan = keluar (cairkan)
    })
  }
  for (const t of angsuranTx) {
    if (logJenis !== 'Semua Jenis' && logJenis.toLowerCase() !== 'angsuran') continue
    if (logSearch) {
      const q = logSearch.toLowerCase()
      if (!t.pinjaman?.anggota?.nama?.toLowerCase().includes(q) && !t.pinjaman?.nomorPinjaman.toLowerCase().includes(q)) continue
    }
    rows.push({
      id: t.id,
      tanggal: t.tanggalBayar,
      anggota: t.pinjaman?.anggota?.nama || '-',
      kode: t.pinjaman?.anggota?.nomorAnggota || null,
      keterangan: `Angsuran ke-${t.angsuranKe} · ${t.pinjaman?.nomorPinjaman}${t.dendaBayar > 0 ? ` (+Denda ${t.dendaBayar})` : ''}`,
      nominal: toNumber(t.jumlahBayar) + toNumber(t.dendaBayar),
      jenis: 'Angsuran',
      status: 'Selesai',
      tipe: 'masuk',
    })
  }

  // Filter by status if not "Semua Status"
  let filteredRows = rows
  if (logStatus !== 'Semua Status') {
    filteredRows = rows.filter((r) => r.status.toLowerCase() === logStatus.toLowerCase())
  }
  filteredRows.sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime())

  const logTotal = filteredRows.length
  const totalPemasukan = filteredRows.filter((r) => r.tipe === 'masuk').reduce((s, r) => s + r.nominal, 0)
  const totalPengeluaran = filteredRows.filter((r) => r.tipe === 'keluar').reduce((s, r) => s + r.nominal, 0)

  return NextResponse.json({
    metrics: {
      totalKas,
      totalSimpanan,
      sisaPinjaman,
      pemasukanDenda,
      totalAnggota,
    },
    arusKasTrend,
    komposisiSimpanan,
    transactionLog: {
      rows: filteredRows.slice(0, 100),
      total: logTotal,
      totalPemasukan,
      totalPengeluaran,
    },
    period: {
      periode,
      dari: rangeStart.toISOString(),
      sampai: rangeEnd.toISOString(),
    },
  })
}
