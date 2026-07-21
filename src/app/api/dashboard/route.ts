import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'

// Executive Dashboard API (Bank Sampah)
// Returns: top metrics, today summary, time series (dynamic based on chartRange),
// composition, leaderboard, balance structure, transaction log

function formatBucketLabel(d: Date, granularity: 'day' | 'week' | 'month'): string {
  if (granularity === 'day') return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
  if (granularity === 'week') return `Ming ${d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}`
  return d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
}

function bucketKey(d: Date, granularity: 'day' | 'week' | 'month'): string {
  if (granularity === 'day') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (granularity === 'week') {
    // round to start of week (Monday)
    const tmp = new Date(d)
    const day = tmp.getDay()
    const diff = tmp.getDate() - day + (day === 0 ? -6 : 1)
    tmp.setDate(diff)
    return `${tmp.getFullYear()}-${String(tmp.getMonth() + 1).padStart(2, '0')}-${String(tmp.getDate()).padStart(2, '0')}`
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Build list of bucket start dates between rangeStart and rangeEnd
function buildBuckets(rangeStart: Date, rangeEnd: Date): { keys: string[]; labels: string[]; granularity: 'day' | 'week' | 'month' } {
  const diffDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24))
  let granularity: 'day' | 'week' | 'month'
  if (diffDays <= 31) granularity = 'day'
  else if (diffDays <= 92) granularity = 'week'
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
    // start from first Monday on or before rangeStart
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
    // monthly
    const start = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1)
    while (start <= rangeEnd) {
      const k = bucketKey(start, 'month')
      if (!seen.has(k)) { seen.add(k); keys.push(k); labels.push(formatBucketLabel(start, 'month')) }
      start.setMonth(start.getMonth() + 1)
    }
  }
  return { keys, labels, granularity }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const logSearch = searchParams.get('q') || ''
  const logTipe = searchParams.get('tipe') || ''
  const logStatusQc = searchParams.get('statusQc') || ''
  const logKategori = searchParams.get('kategori') || ''
  const logBarang = searchParams.get('barang') || ''
  const logRange = searchParams.get('range') || '30'
  const logDari = searchParams.get('logDari') // yyyy-mm-dd (custom log range)
  const logSampai = searchParams.get('logSampai') // yyyy-mm-dd (custom log range)

  // Chart range filter
  const chartRange = searchParams.get('chartRange') || '1thn' // 1bul | 3bul | 6bul | 1thn | custom
  const chartDari = searchParams.get('chartDari') // yyyy-mm-dd
  const chartSampai = searchParams.get('chartSampai') // yyyy-mm-dd

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Compute chart range start/end
  let chartStart: Date
  let chartEnd: Date = now
  if (chartRange === 'custom' && chartDari && chartSampai) {
    chartStart = new Date(chartDari)
    chartStart.setHours(0, 0, 0, 0)
    chartEnd = new Date(chartSampai)
    chartEnd.setHours(23, 59, 59, 999)
  } else if (chartRange === '1bul') {
    chartStart = new Date(now); chartStart.setDate(chartStart.getDate() - 29); chartStart.setHours(0, 0, 0, 0)
  } else if (chartRange === '3bul') {
    chartStart = new Date(now); chartStart.setDate(chartStart.getDate() - 89); chartStart.setHours(0, 0, 0, 0)
  } else if (chartRange === '6bul') {
    chartStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  } else {
    // 1thn (default)
    chartStart = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  }

  // Transaction log range
  let logRangeStart: Date
  let logRangeEnd: Date = now
  if (logRange === 'custom' && logDari && logSampai) {
    logRangeStart = new Date(logDari)
    logRangeStart.setHours(0, 0, 0, 0)
    logRangeEnd = new Date(logSampai)
    logRangeEnd.setHours(23, 59, 59, 999)
  } else {
    const rangeDays = parseInt(logRange, 10) || 30
    logRangeStart = new Date(now)
    logRangeStart.setDate(logRangeStart.getDate() - rangeDays)
  }

  // ===== TOP METRICS (QC-passed only, filtered by chart range) =====
  const [allSaving, allSedekah, nasabahCount] = await Promise.all([
    db.savingTransaction.findMany({
      where: { transactedAt: { gte: chartStart, lte: chartEnd }, qcStatus: { in: ['passed', 'adjusted'] } },
      select: { totalValue: true, totalWeight: true },
    }),
    db.sedekahTransaction.findMany({
      where: { transactedAt: { gte: chartStart, lte: chartEnd }, qcStatus: { in: ['passed', 'adjusted'] } },
      select: { totalWeightBersih: true },
    }),
    db.user.count({ where: { OR: [{ roles: { contains: 'nasabah' } }, { roles: { contains: 'koperasi' } }] } }),
  ])

  const totalNilaiTabungan = allSaving.reduce((s, t) => s + toNumber(t.totalValue), 0)
  const totalSampahDitabung = allSaving.reduce((s, t) => s + toNumber(t.totalWeight), 0)
  const totalSampahDisedekahkan = allSedekah.reduce((s, t) => s + toNumber(t.totalWeightBersih), 0)

  // ===== TODAY SUMMARY (always today, not affected by chart range) =====
  const [todaySaving, todaySedekah, todaySavingNasabah, pendingQcSaving, pendingQcSedekah] = await Promise.all([
    db.savingTransaction.findMany({
      where: { transactedAt: { gte: startOfToday }, qcStatus: { in: ['passed', 'adjusted'] } },
      select: { totalValue: true, totalWeight: true, userId: true },
    }),
    db.sedekahTransaction.findMany({
      where: { transactedAt: { gte: startOfToday }, qcStatus: { in: ['passed', 'adjusted'] } },
      select: { totalWeightBersih: true },
    }),
    db.savingTransaction.findMany({
      where: { transactedAt: { gte: startOfToday }, qcStatus: { in: ['passed', 'adjusted'] } },
      select: { userId: true },
      distinct: ['userId'],
    }),
    db.savingTransaction.count({ where: { qcStatus: 'pending' } }),
    db.sedekahTransaction.count({ where: { qcStatus: 'pending' } }),
  ])

  const todayNabungCount = todaySaving.length
  const todaySedekahCount = todaySedekah.length
  const todayNilaiBersih = todaySaving.reduce((s, t) => s + toNumber(t.totalValue), 0)
  const todayBeratBersih = todaySaving.reduce((s, t) => s + toNumber(t.totalWeight), 0) + todaySedekah.reduce((s, t) => s + toNumber(t.totalWeightBersih), 0)
  const todayNasabahAktif = todaySavingNasabah.length
  const menungguQcGlobal = pendingQcSaving + pendingQcSedekah

  // ===== TIME SERIES (dynamic based on chartRange) =====
  const { keys: tsKeys, labels: tsLabels, granularity } = buildBuckets(chartStart, chartEnd)

  const [savingTs, sedekahTs] = await Promise.all([
    db.savingTransaction.findMany({
      where: { transactedAt: { gte: chartStart, lte: chartEnd }, qcStatus: { in: ['passed', 'adjusted'] } },
      select: { transactedAt: true, totalWeight: true, totalValue: true },
    }),
    db.sedekahTransaction.findMany({
      where: { transactedAt: { gte: chartStart, lte: chartEnd }, qcStatus: { in: ['passed', 'adjusted'] } },
      select: { transactedAt: true, totalWeightBersih: true },
    }),
  ])

  const tsBuckets: Record<string, { tabunganKg: number; sedekahKg: number; nilaiRp: number }> = {}
  for (const k of tsKeys) tsBuckets[k] = { tabunganKg: 0, sedekahKg: 0, nilaiRp: 0 }
  for (const t of savingTs) {
    const k = bucketKey(t.transactedAt, granularity)
    if (tsBuckets[k]) {
      tsBuckets[k].tabunganKg += toNumber(t.totalWeight)
      tsBuckets[k].nilaiRp += toNumber(t.totalValue)
    }
  }
  for (const t of sedekahTs) {
    const k = bucketKey(t.transactedAt, granularity)
    if (tsBuckets[k]) tsBuckets[k].sedekahKg += toNumber(t.totalWeightBersih)
  }
  const timeSeries = tsKeys.map((k, i) => ({
    month: tsLabels[i],
    tabunganBersih: Math.round(tsBuckets[k].tabunganKg * 100) / 100,
    sedekahBersih: Math.round(tsBuckets[k].sedekahKg * 100) / 100,
    nilaiEkonomi: Math.round(tsBuckets[k].nilaiRp),
  }))

  // ===== COMPOSITION BY CATEGORY (filtered by chart range, QC-passed) =====
  const savingItemsForComp = await db.savingTransactionItem.findMany({
    where: { savingTransaction: { transactedAt: { gte: chartStart, lte: chartEnd }, qcStatus: { in: ['passed', 'adjusted'] } } },
    select: { quantity: true, categoryNameSnapshot: true },
  })
  const sedekahItemsForComp = await db.sedekahTransactionItem.findMany({
    where: { sedekahTransaction: { transactedAt: { gte: chartStart, lte: chartEnd }, qcStatus: { in: ['passed', 'adjusted'] } } },
    select: { quantity: true, categoryNameSnapshot: true },
  })
  const compMap: Record<string, number> = {}
  for (const it of [...savingItemsForComp, ...sedekahItemsForComp]) {
    compMap[it.categoryNameSnapshot] = (compMap[it.categoryNameSnapshot] || 0) + toNumber(it.quantity)
  }
  const composition = Object.entries(compMap)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)

  // ===== TOP 10 LEADERBOARD (filtered by chart range, by valid kg) =====
  const savingItemsForLb = await db.savingTransactionItem.findMany({
    where: { savingTransaction: { transactedAt: { gte: chartStart, lte: chartEnd }, qcStatus: { in: ['passed', 'adjusted'] } } },
    select: { quantity: true, savingTransaction: { select: { userId: true, user: { select: { id: true, name: true, memberCode: true } } } } },
  })
  const lbMap: Record<string, { name: string; memberCode: string | null; kg: number }> = {}
  for (const it of savingItemsForLb) {
    const uid = it.savingTransaction.user?.id
    if (!uid) continue
    if (!lbMap[uid]) lbMap[uid] = { name: it.savingTransaction.user?.name || '-', memberCode: it.savingTransaction.user?.memberCode || null, kg: 0 }
    lbMap[uid].kg += toNumber(it.quantity)
  }
  const leaderboard = Object.values(lbMap)
    .map((l) => ({ ...l, kg: Math.round(l.kg * 100) / 100 }))
    .sort((a, b) => b.kg - a.kg)
    .slice(0, 10)

  // ===== BALANCE STRUCTURE (always all-time, not affected by chart range) =====
  const balanceAgg = await db.balance.aggregate({
    _sum: { saldoTertahan: true, saldoTersedia: true },
  })
  const totalAset = toNumber(balanceAgg._sum.saldoTertahan) + toNumber(balanceAgg._sum.saldoTersedia)

  // ===== TRANSACTION LOG (with filters, uses logRange not chartRange) =====
  const savingWhere: any = { transactedAt: { gte: logRangeStart, lte: logRangeEnd } }
  if (logStatusQc) savingWhere.qcStatus = logStatusQc
  if (logSearch) {
    savingWhere.user = { OR: [{ name: { contains: logSearch } }, { memberCode: { contains: logSearch } }] }
  }
  const sedekahWhere: any = { transactedAt: { gte: logRangeStart, lte: logRangeEnd } }
  if (logStatusQc) sedekahWhere.qcStatus = logStatusQc
  if (logSearch) {
    sedekahWhere.OR = [
      { donorName: { contains: logSearch } },
      { user: { name: { contains: logSearch } } },
      { user: { memberCode: { contains: logSearch } } },
    ]
  }

  const [savingLogs, sedekahLogs] = await Promise.all([
    db.savingTransaction.findMany({
      where: savingWhere,
      orderBy: { transactedAt: 'desc' },
      take: 200,
      include: {
        user: { select: { id: true, name: true, memberCode: true } },
        items: { select: { id: true, categoryNameSnapshot: true, itemNameSnapshot: true, quantity: true, wasteItemId: true } },
      },
    }),
    db.sedekahTransaction.findMany({
      where: sedekahWhere,
      orderBy: { transactedAt: 'desc' },
      take: 200,
      include: {
        user: { select: { id: true, name: true, memberCode: true } },
        items: { select: { id: true, categoryNameSnapshot: true, itemNameSnapshot: true, quantity: true, wasteItemId: true } },
      },
    }),
  ])

  type LogRow = {
    id: string
    tipe: 'nabung' | 'sedekah'
    transactedAt: Date
    nasabah: string
    memberCode: string | null
    kategori: string
    barang: string
    beratBersih: number
    nilaiBersih: number
    qcStatus: string
  }
  const logRows: LogRow[] = []
  for (const t of savingLogs) {
    for (const it of t.items) {
      if (logKategori && it.categoryNameSnapshot !== logKategori) continue
      if (logBarang && it.wasteItemId !== logBarang) continue
      logRows.push({
        id: `${t.id}-${it.id}`,
        tipe: 'nabung',
        transactedAt: t.transactedAt,
        nasabah: t.user?.name || '-',
        memberCode: t.user?.memberCode || null,
        kategori: it.categoryNameSnapshot,
        barang: it.itemNameSnapshot,
        beratBersih: Math.round(toNumber(it.quantity) * 1000) / 1000,
        nilaiBersih: 0,
        qcStatus: t.qcStatus,
      })
    }
  }
  for (const t of sedekahLogs) {
    for (const it of t.items) {
      if (logKategori && it.categoryNameSnapshot !== logKategori) continue
      if (logBarang && it.wasteItemId !== logBarang) continue
      logRows.push({
        id: `${t.id}-${it.id}`,
        tipe: 'sedekah',
        transactedAt: t.transactedAt,
        nasabah: t.user?.name || t.donorName || 'Donatur',
        memberCode: t.user?.memberCode || null,
        kategori: it.categoryNameSnapshot,
        barang: it.itemNameSnapshot,
        beratBersih: Math.round(toNumber(it.quantity) * 1000) / 1000,
        nilaiBersih: 0,
        qcStatus: t.qcStatus,
      })
    }
  }
  if (logRows.length > 0) {
    const wasteItemIds = new Set<string>()
    for (const t of savingLogs) for (const it of t.items) wasteItemIds.add(it.wasteItemId)
    const wasteItems = await db.wasteItem.findMany({
      where: { id: { in: Array.from(wasteItemIds) } },
      select: { id: true, pricePerUnit: true, prices: { orderBy: { effectiveFrom: 'desc' }, take: 1 } },
    })
    const priceMap: Record<string, number> = {}
    for (const w of wasteItems) priceMap[w] = w.prices[0] ? toNumber(w.prices[0].pricePerUnit) : toNumber(w.pricePerUnit)
    const savingItemPrice: Record<string, number> = {}
    for (const t of savingLogs) {
      for (const it of t.items) {
        savingItemPrice[t + '-' + it] = priceMap[it.wasteItemId] || 0
      }
    }
    for (const row of logRows) {
      if (row.tipe === 'nabung') row.nilaiBersih = Math.round((row.beratBersih * (savingItemPrice[row] || 0)) * 100) / 100
    }
  }
  logRows.sort((a, b) => b.transactedAt.getTime() - a.transactedAt.getTime())

  const logTotalTx = logRows.length
  const logTotalBerat = Math.round(logRows.reduce((s, r) => s + r.beratBersih, 0) * 100) / 100
  const logTotalNilai = Math.round(logRows.reduce((s, r) => s + r.nilaiBersih, 0))

  // ===== FILTER OPTIONS =====
  const [kategoriOpts, barangOpts] = await Promise.all([
    db.wasteCategory.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    db.wasteItem.findMany({ where: { isActive: true }, select: { id: true, name: true, code: true }, orderBy: { name: 'asc' } }),
  ])

  return NextResponse.json({
    topMetrics: {
      totalNilaiTabungan,
      totalSampahDitabung,
      totalSampahDisedekahkan,
      totalNasabah: nasabahCount,
    },
    todaySummary: {
      nabungSahHariIni: todayNabungCount,
      sedekahSahHariIni: todaySedekahCount,
      nilaiMasukBersih: todayNilaiBersih,
      totalBeratBersih: todayBeratBersih,
      nasabahAktifHariIni: todayNasabahAktif,
      menungguQcGlobal,
    },
    timeSeries,
    chartRangeInfo: { granularity, start: chartStart.toISOString(), end: chartEnd.toISOString() },
    composition,
    leaderboard,
    balanceStructure: {
      totalAset,
      saldoTertahan: toNumber(balanceAgg._sum.saldoTertahan),
      saldoTersedia: toNumber(balanceAgg._sum.saldoTersedia),
    },
    transactionLog: {
      rows: logRows.slice(0, 100),
      total: logTotalTx,
      totalBeratBersih: logTotalBerat,
      totalNilaiBersih: logTotalNilai,
    },
    filters: {
      kategori: kategoriOpts,
      barang: barangOpts,
      range: logRange,
    },
  })
}
