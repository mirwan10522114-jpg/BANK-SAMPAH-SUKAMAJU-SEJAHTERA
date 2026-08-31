import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'

// Helper: format date bucket label
function formatBucketLabel(d: Date, granularity: 'day' | 'week' | 'month'): string {
  if (granularity === 'day') return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
  if (granularity === 'week') return `Ming ${d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}`
  return d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
}

function bucketKey(d: Date, granularity: 'day' | 'week' | 'month'): string {
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

function buildBuckets(rangeStart: Date, rangeEnd: Date): { keys: string[]; labels: string[]; granularity: 'day' | 'week' | 'month' } {
  const diffDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24))
  let granularity: 'day' | 'week' | 'month'
  if (diffDays <= 35) granularity = 'day'
  else if (diffDays <= 120) granularity = 'week'
  else granularity = 'month'

  const keys: string[] = []
  const labels: string[] = []
  const seen = new Set<string>()
  const cursor = new Date(rangeStart)
  cursor.setHours(0, 0, 0, 0)

  if (granularity === 'day') {
    while (cursor <= rangeEnd) {
      const k = bucketKey(cursor, 'day')
      if (!seen.has(k)) { seen.add(k); keys.push(k); labels.push(formatBucketLabel(cursor, 'day')) }
      cursor.setDate(cursor.getDate() + 1)
    }
  } else if (granularity === 'week') {
    const start = new Date(rangeStart)
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1)
    start.setDate(diff)
    start.setHours(0, 0, 0, 0)
    while (start <= rangeEnd) {
      const k = bucketKey(start, 'week')
      if (!seen.has(k)) { seen.add(k); keys.push(k); labels.push(formatBucketLabel(start, 'week')) }
      start.setDate(start.getDate() + 7)
    }
  } else {
    const start = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1)
    while (start <= rangeEnd) {
      const k = bucketKey(start, 'month')
      if (!seen.has(k)) { seen.add(k); keys.push(k); labels.push(formatBucketLabel(start, 'month')) }
      start.setMonth(start.getMonth() + 1)
    }
  }
  return { keys, labels, granularity }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params

  const chartRange = _req.nextUrl.searchParams.get('chartRange') || '1thn'
  const chartDari = _req.nextUrl.searchParams.get('chartDari')
  const chartSampai = _req.nextUrl.searchParams.get('chartSampai')

  const now = new Date()
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  let chartStart: Date
  let chartEnd: Date = endOfToday
  let periodLabel = '1 Tahun Terakhir'

  if (chartRange === 'custom' && chartDari && chartSampai) {
    chartStart = new Date(chartDari)
    chartStart.setHours(0, 0, 0, 0)
    chartEnd = new Date(chartSampai)
    chartEnd.setHours(23, 59, 59, 999)
    periodLabel = `${chartDari} s/d ${chartSampai}`
  } else if (chartRange === '1bul') {
    chartStart = new Date(now)
    chartStart.setDate(chartStart.getDate() - 29)
    chartStart.setHours(0, 0, 0, 0)
    periodLabel = '1 Bulan Terakhir'
  } else if (chartRange === '3bul') {
    chartStart = new Date(now)
    chartStart.setDate(chartStart.getDate() - 89)
    chartStart.setHours(0, 0, 0, 0)
    periodLabel = '3 Bulan Terakhir'
  } else if (chartRange === '6bul') {
    chartStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    chartStart.setHours(0, 0, 0, 0)
    periodLabel = '6 Bulan Terakhir'
  } else {
    // 1thn (default)
    chartStart = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    chartStart.setHours(0, 0, 0, 0)
    periodLabel = '1 Tahun Terakhir'
  }

  const [user, savingAllTimeAgg, savingInRange, sedekahInRange, allSavingTxs, allSedekahTxs, allCategories, allWasteItems] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      include: {
        balance: true,
        pointHistories: { orderBy: { createdAt: 'desc' }, take: 100 },
        redemptions: { orderBy: { redeemedAt: 'desc' }, take: 100, include: { product: true } },
        withdrawals: { orderBy: { createdAt: 'desc' }, take: 100 },
        balanceReleasesAsUser: { orderBy: { createdAt: 'desc' }, take: 100 },
        koperasiAnggota: {
          select: {
            id: true,
            nomorAnggota: true,
            status: true,
            tanggalBergabung: true,
            simpananSaldos: { select: { jenisSimpanan: true, saldo: true } },
          },
        },
      },
    }),
    db.savingTransaction.aggregate({
      where: { userId, status: 'selesai', qcStatus: { in: ['passed', 'adjusted', 'tidak_perlu'] } },
      _sum: { totalWeight: true, totalValue: true, pointsAwarded: true },
    }),
    db.savingTransaction.findMany({
      where: {
        userId,
        transactedAt: { gte: chartStart, lte: chartEnd },
        status: 'selesai',
        qcStatus: { in: ['passed', 'adjusted', 'tidak_perlu'] },
      },
      orderBy: { transactedAt: 'desc' },
      include: { items: { include: { wasteItem: { include: { category: true } } } } },
    }),
    db.sedekahTransaction.findMany({
      where: {
        userId,
        transactedAt: { gte: chartStart, lte: chartEnd },
        status: 'selesai',
        qcStatus: { in: ['passed', 'adjusted', 'tidak_perlu'] },
      },
      orderBy: { transactedAt: 'desc' },
      include: { items: { include: { wasteItem: { include: { category: true } } } } },
    }),
    db.savingTransaction.findMany({
      where: { userId },
      orderBy: { transactedAt: 'desc' },
      take: 200,
      include: { items: { include: { wasteItem: { include: { category: true } } } } },
    }),
    db.sedekahTransaction.findMany({
      where: { userId },
      orderBy: { transactedAt: 'desc' },
      take: 200,
      include: { items: { include: { wasteItem: { include: { category: true } } } } },
    }),
    db.wasteCategory.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    db.wasteItem.findMany({ where: { isActive: true }, select: { id: true, name: true, code: true, wasteCategoryId: true }, orderBy: { name: 'asc' } }),
  ])

  if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  const balance = user.balance || { saldoTertahan: 0, saldoTersedia: 0, points: 0 }

  const totalDitabungAllTime = toNumber(savingAllTimeAgg._sum.totalWeight)
  const totalDitabungPeriode = savingInRange.reduce((s, t) => s + toNumber(t.totalWeight), 0)
  const totalNilaiPeriode = savingInRange.reduce((s, t) => s + toNumber(t.totalValue), 0)
  const totalPoinPeriode = savingInRange.reduce((s, t) => s + toNumber(t.pointsAwarded), 0)
  const totalSedekahPeriode = sedekahInRange.reduce((s, t) => s + (t.totalWeightBersih != null ? toNumber(t.totalWeightBersih) : toNumber(t.totalWeight)), 0)

  // Tren tabungan bucketed
  const { keys: tsKeys, labels: tsLabels, granularity } = buildBuckets(chartStart, chartEnd)
  const buckets: Record<string, number> = {}
  for (const k of tsKeys) buckets[k] = 0
  for (const t of savingInRange) {
    const k = bucketKey(t.transactedAt, granularity)
    if (buckets[k] !== undefined) buckets[k] += toNumber(t.totalWeight)
  }
  const trenTabungan = tsKeys.map((k, i) => ({
    month: tsLabels[i],
    berat: Math.round(buckets[k] * 100) / 100,
  }))

  // Komposisi kategori (from saving items, filtered by chosen period)
  const catMap: Record<string, number> = {}
  for (const t of savingInRange) {
    for (const it of t.items) {
      const cat = it.categoryNameSnapshot || it.wasteItem?.category?.name || 'Lainnya'
      catMap[cat] = (catMap[cat] || 0) + toNumber(it.quantity)
    }
  }
  const komposisiKategori = Object.entries(catMap)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)

  // Riwayat Tabungan
  const riwayatTabungan = allSavingTxs.map((t) => {
    const totalBeratItem = t.items.reduce((s, it) => s + toNumber(it.quantity), 0)
    const totalNilaiItem = t.items.reduce((s, it) => s + toNumber(it.subtotal), 0)
    const firstItem = t.items[0]
    const isMulti = t.items.length > 1
    const kategoriList = Array.from(new Set(t.items.map((it) => it.categoryNameSnapshot || it.wasteItem?.category?.name || 'Lainnya')))
    const barangList = t.items.map((it) => it.itemNameSnapshot || it.wasteItem?.name || '')
    const itemsDetail = t.items.map((it) => ({
      id: it.id,
      kategori: it.categoryNameSnapshot || it.wasteItem?.category?.name || 'Lainnya',
      barang: it.itemNameSnapshot || it.wasteItem?.name || '-',
      kode: it.itemCodeSnapshot || it.wasteItem?.code || '-',
      berat: toNumber(it.quantity),
      nilai: toNumber(it.subtotal),
    }))

    return {
      id: t.id,
      kode: t.kodeTransaksi || null,
      tanggal: t.transactedAt,
      barang: firstItem ? `${firstItem.itemCodeSnapshot || ''} · ${firstItem.itemNameSnapshot || ''}${isMulti ? ` (+${t.items.length - 1})` : ''}` : '-',
      kategoriList,
      barangList,
      items: itemsDetail,
      berat: totalBeratItem,
      poin: t.pointsAwarded,
      nilai: t.status === 'selesai' ? toNumber(t.totalValue) : totalNilaiItem,
      status: t.status,
      qcStatus: t.qcStatus,
    }
  })

  // Riwayat Sedekah
  const riwayatSedekah: any[] = []
  for (const t of allSedekahTxs) {
    const beratKotorTx = toNumber(t.totalWeightKotor)
    const beratBersihTx = t.totalWeightBersih != null ? toNumber(t.totalWeightBersih) : toNumber(t.totalWeight)
    const susutTx = t.persentaseSusut != null ? toNumber(t.persentaseSusut) : 0
    for (const it of t.items) {
      const beratKotor = toNumber(it.quantityBeforeQc) > 0 ? toNumber(it.quantityBeforeQc) : toNumber(it.quantity)
      const beratBersih = it.quantityAfterQc != null ? toNumber(it.quantityAfterQc) : toNumber(it.quantity)
      const susut = toNumber(it.susutQc)
      riwayatSedekah.push({
        id: it.id,
        txId: t.id,
        kode: t.kodeTransaksi || null,
        tanggal: t.transactedAt,
        kategori: it.categoryNameSnapshot || it.wasteItem?.category?.name || '-',
        barang: `${it.itemCodeSnapshot || ''} · ${it.itemNameSnapshot || ''}`,
        barangNama: it.itemNameSnapshot || it.wasteItem?.name || '-',
        beratKotor,
        beratBersih,
        susut,
        qcStatus: t.qcStatus || 'pending',
        status: t.status || 'selesai',
        _txBeratKotor: beratKotorTx,
        _txBeratBersih: beratBersihTx,
        _txSusut: susutTx,
      })
    }
  }

  const riwayatPoin = user.pointHistories.map((p) => ({
    id: p.id,
    tanggal: p.createdAt,
    tipe: p.type,
    poin: p.points,
    saldo: p.balanceAfter,
    deskripsi: p.description || '-',
  }))

  const riwayatPenukaran = user.redemptions.map((r) => ({
    id: r.id,
    tanggal: r.redeemedAt,
    produk: r.productNameSnapshot,
    qty: toNumber(r.quantity),
    poin: r.pointsUsed,
  }))

  const riwayatPenarikan = user.withdrawals.map((w: any) => ({
    id: w.id,
    receiptNo: w.receiptNo,
    tanggal: w.createdAt,
    jumlah: toNumber(w.amount),
    metode: w.method,
    status: w.status,
    keterangan: w.notes,
    processedAt: w.processedAt,
  }))

  const riwayatRelease = user.balanceReleasesAsUser.map((r: any) => ({
    id: r.id,
    tanggal: r.createdAt,
    jumlah: toNumber(r.amount),
    status: r.status,
    keterangan: r.keterangan,
  }))

  return NextResponse.json({
    periodLabel,
    periodDates: { start: chartStart.toISOString(), end: chartEnd.toISOString() },
    masterData: {
      categories: allCategories,
      wasteItems: allWasteItems,
    },
    profile: {
      id: user.id,
      name: user.name,
      memberCode: user.memberCode,
      email: user.email,
      phone: user.phone,
      address: user.address,
      nik: user.nik,
      roles: JSON.parse(user.roles || '[]'),
      isMember: user.isMember,
      memberJoinedAt: user.memberJoinedAt,
    },
    saldo: {
      saldoTersedia: toNumber(balance.saldoTersedia),
      saldoTertahan: toNumber(balance.saldoTertahan),
      poin: balance.points,
      totalDitabung: Math.round(totalDitabungAllTime * 100) / 100,
      totalDitabungPeriode: Math.round(totalDitabungPeriode * 100) / 100,
      totalNilaiPeriode: Math.round(totalNilaiPeriode),
      totalPoinPeriode,
      totalSedekahPeriode: Math.round(totalSedekahPeriode * 100) / 100,
    },
    trenTabungan,
    komposisiKategori,
    riwayat: {
      tabungan: riwayatTabungan,
      sedekah: riwayatSedekah,
      poin: riwayatPoin,
      penukaran: riwayatPenukaran,
      penarikan: riwayatPenarikan,
      releaseSaldo: riwayatRelease,
    },
    koperasiInfo: user.koperasiAnggota ? {
      anggotaId: user.koperasiAnggota.id,
      nomorAnggota: user.koperasiAnggota.nomorAnggota,
      status: user.koperasiAnggota.status,
      tanggalBergabung: user.koperasiAnggota.tanggalBergabung,
      simpananSaldos: user.koperasiAnggota.simpananSaldos.map((s) => ({
        jenisSimpanan: s.jenisSimpanan,
        saldo: toNumber(s.saldo),
      })),
    } : null,
  })
}
