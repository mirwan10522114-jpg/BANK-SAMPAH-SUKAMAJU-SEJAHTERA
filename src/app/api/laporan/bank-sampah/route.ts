import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'

// Laporan Laba Rugi Bank Sampah
// Source of truth: BankSampahKas (Buku Kas Utama)
// Revenue: penjualan_mitra, penjualan_produk, setoran_awal, penyesuaian (masuk), lainnya (masuk)
// Expense: penarikan_nasabah, biaya_operasional, penyesuaian (keluar), lainnya (keluar)
// Off-P&L (Balance Sheet / Liabilities): saldoTertahan, saldoTersedia (utang ke nasabah)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const periode = searchParams.get('periode') || 'bulan_ini'
  const dari = searchParams.get('dari')
  const sampai = searchParams.get('sampai')

  // Compute period range
  // Note: rangeEnd is set to end of current month to include transactions
  // dated later in the current month (handles seed/test data with future dates)
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
    // bulan_ini (default)
    rangeStart = new Date(now.getFullYear(), now.getMonth(), 1)
  }

  const dateRange = { gte: rangeStart, lte: rangeEnd }

  // ===== P&L from BankSampahKas grouped by sumber + tipe =====
  const [allKasTx, balanceAgg, totalSavingTx, totalSedekahTx, totalSalesMitra, totalProductSale, salesMitraDetail] = await Promise.all([
    db.bankSampahKas.findMany({
      where: { transactedAt: dateRange },
      orderBy: { transactedAt: 'desc' },
    }),
    db.balance.aggregate({ _sum: { saldoTertahan: true, saldoTersedia: true, points: true } }),
    db.savingTransaction.aggregate({
      where: { transactedAt: dateRange, qcStatus: { in: ['passed', 'adjusted'] } },
      _sum: { totalWeight: true, totalValue: true, pointsAwarded: true },
      _count: true,
    }),
    db.sedekahTransaction.aggregate({
      where: { transactedAt: dateRange },
      _sum: { totalWeightBersih: true, totalWeightKotor: true },
      _count: true,
    }),
    db.salesTransaction.aggregate({
      where: { transactedAt: dateRange },
      _sum: { totalWeight: true, totalValue: true },
      _count: true,
    }),
    db.productSale.aggregate({
      where: { transactedAt: dateRange, paymentStatus: 'paid' },
      _sum: { totalValue: true, totalQuantity: true },
      _count: true,
    }),
    // Detailed sales to mitra with items (for margin analysis)
    db.salesTransaction.findMany({
      where: { transactedAt: dateRange },
      include: {
        partner: true,
        items: {
          include: {
            wasteItem: {
              include: {
                category: true,
                prices: { orderBy: { effectiveFrom: 'desc' }, take: 1 },
              },
            },
          },
        },
      },
      orderBy: { transactedAt: 'desc' },
      take: 100,
    }),
  ])

  // Group kas by sumber + tipe
  const bySumber: Record<string, { masuk: number; keluar: number; count: number }> = {}
  for (const tx of allKasTx) {
    const s = tx.sumber || 'lainnya'
    if (!bySumber[s]) bySumber[s] = { masuk: 0, keluar: 0, count: 0 }
    if (tx.tipe === 'masuk') bySumber[s].masuk += toNumber(tx.jumlah)
    else bySumber[s].keluar += toNumber(tx.jumlah)
    bySumber[s].count++
  }

  // P&L Bank Sampah HANYA dari operasional sampah.
  // Penjualan produk olahan DIPISAH ke Laporan Penjualan Produk (tidak masuk pendapatan BS).
  // Nilai penjualan_produk tetap tercatat di BankSampahKas (karena kas nyata masuk),
  // jadi saldo kas tetap akurat — tapi untuk P&L BS, pendapatan produk dikecualikan.
  const pendapatanProdukDipisah = bySumber['penjualan_produk']?.masuk || 0

  const pendapatan = {
    penjualanMitra: bySumber['penjualan_mitra']?.masuk || 0,
    setoranAwal: bySumber['setoran_awal']?.masuk || 0,
    penyesuaianPositif: bySumber['penyesuaian']?.masuk || 0,
    lainnya: bySumber['lainnya']?.masuk || 0,
  }
  const totalPendapatan = Object.values(pendapatan).reduce((a, b) => a + b, 0)

  const pengeluaran = {
    penarikanNasabah: bySumber['penarikan_nasabah']?.keluar || 0,
    biayaOperasional: bySumber['biaya_operasional']?.keluar || 0,
    penyesuaianNegatif: bySumber['penyesuaian']?.keluar || 0,
    lainnya: bySumber['lainnya']?.keluar || 0,
  }
  const totalPengeluaran = Object.values(pengeluaran).reduce((a, b) => a + b, 0)

  // penarikan_nasabah = pelunasan utang (bukan beban operasional)
  const bebanOperasional = totalPengeluaran - pengeluaran.penarikanNasabah
  const labaRugiKas = totalPendapatan - totalPengeluaran
  const labaRugiOperasional = totalPendapatan - bebanOperasional

  // ===== Balance Sheet (snapshot) =====
  const totalSaldoTertahan = toNumber(balanceAgg._sum.saldoTertahan)
  const totalSaldoTersedia = toNumber(balanceAgg._sum.saldoTersedia)
  const totalPoints = toNumber(balanceAgg._sum.points)
  const totalUtangNasabah = totalSaldoTertahan + totalSaldoTersedia

  // ===== Trend (monthly buckets) — exclude penjualan_produk for BS-only trend =====
  const months = new Map<string, { masuk: number; keluar: number; label: string }>()
  for (const tx of allKasTx) {
    if (tx.sumber === 'penjualan_produk') continue // skip product sales, reported separately
    const d = new Date(tx.transactedAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
    if (!months.has(key)) months.set(key, { masuk: 0, keluar: 0, label })
    const m = months.get(key)!
    if (tx.tipe === 'masuk') m.masuk += toNumber(tx.jumlah)
    else m.keluar += toNumber(tx.jumlah)
  }
  const trend = Array.from(months.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, v]) => ({ key, ...v, net: v.masuk - v.keluar }))

  // ===== Saldo kas saat ini (all-time) =====
  const kasMasukAllAgg = await db.bankSampahKas.aggregate({ where: { tipe: 'masuk' }, _sum: { jumlah: true } })
  const kasKeluarAllAgg = await db.bankSampahKas.aggregate({ where: { tipe: 'keluar' }, _sum: { jumlah: true } })
  const saldoKas = toNumber(kasMasukAllAgg._sum.jumlah) - toNumber(kasKeluarAllAgg._sum.jumlah)

  // ===== Margin analysis: penjualan mitra (harga beli nasabah vs harga jual mitra) =====
  let totalBeliNasabah = 0
  let totalJualMitra = 0
  let totalMarginMitra = 0
  const penjualanMitraDetail = salesMitraDetail.map((tx) => {
    let txBeli = 0
    let txJual = 0
    let txMargin = 0
    const itemsWithMargin = tx.items.map((item) => {
      const hargaJualMitra = toNumber(item.pricePerUnit)
      const qty = toNumber(item.quantity)
      const hargaBeliNasabah = item.wasteItem.prices?.[0]
        ? toNumber(item.wasteItem.prices[0].pricePerUnit)
        : toNumber(item.wasteItem.pricePerUnit)
      const subtotalJual = hargaJualMitra * qty
      const subtotalBeli = hargaBeliNasabah * qty
      const margin = subtotalJual - subtotalBeli
      const marginPerUnit = hargaJualMitra - hargaBeliNasabah
      const marginPersen = subtotalBeli > 0 ? (margin / subtotalBeli) * 100 : 0

      txBeli += subtotalBeli
      txJual += subtotalJual
      txMargin += margin

      return {
        id: item.id,
        wasteItemId: item.wasteItemId,
        itemCode: item.itemCodeSnapshot,
        itemName: item.itemNameSnapshot,
        categoryName: item.categoryNameSnapshot,
        unit: item.unitSnapshot,
        qty,
        hargaBeliNasabah,
        hargaJualMitra,
        marginPerUnit,
        subtotalBeli,
        subtotalJual,
        margin,
        marginPersen,
        isProfit: margin >= 0,
      }
    })

    totalBeliNasabah += txBeli
    totalJualMitra += txJual
    totalMarginMitra += txMargin

    return {
      id: tx.id,
      nomor: tx.id.slice(-6).toUpperCase(),
      tanggal: tx.transactedAt,
      partner: tx.partner?.name || '-',
      totalWeight: toNumber(tx.totalWeight),
      totalBeliNasabah: txBeli,
      totalJualMitra: txJual,
      totalMargin: txMargin,
      totalMarginPersen: txBeli > 0 ? (txMargin / txBeli) * 100 : 0,
      isProfit: txMargin >= 0,
      items: itemsWithMargin,
    }
  })

  return NextResponse.json({
    periode: { start: rangeStart, end: rangeEnd, label: periode },
    ringkasan: {
      totalPendapatan,
      totalPengeluaran,
      bebanOperasional,
      penarikanNasabah: pengeluaran.penarikanNasabah,
      labaRugiKas,
      labaRugiOperasional,
      saldoKas,
      totalUtangNasabah,
      totalSaldoTertahan,
      totalSaldoTersedia,
      totalPoints,
      pendapatanProdukDipisah,
    },
    pendapatan,
    pengeluaran,
    operasional: {
      nabung: {
        count: totalSavingTx._count,
        totalWeight: toNumber(totalSavingTx._sum.totalWeight),
        totalValue: toNumber(totalSavingTx._sum.totalValue),
        totalPoints: toNumber(totalSavingTx._sum.pointsAwarded),
      },
      sedekah: {
        count: totalSedekahTx._count,
        totalWeightBersih: toNumber(totalSedekahTx._sum.totalWeightBersih),
        totalWeightKotor: toNumber(totalSedekahTx._sum.totalWeightKotor),
      },
      penjualanMitra: {
        count: totalSalesMitra._count,
        totalWeight: toNumber(totalSalesMitra._sum.totalWeight),
        totalValue: toNumber(totalSalesMitra._sum.totalValue),
        // Margin detail: selisih harga beli nasabah vs harga jual mitra
        totalBeliNasabah,
        totalJualMitra: toNumber(totalSalesMitra._sum.totalValue),
        totalMargin: totalMarginMitra,
        totalMarginPersen: totalBeliNasabah > 0 ? (totalMarginMitra / totalBeliNasabah) * 100 : 0,
        isProfit: totalMarginMitra >= 0,
      },
      penjualanProdukOffline: {
        count: totalProductSale._count,
        totalQuantity: toNumber(totalProductSale._sum.totalQuantity),
        totalValue: toNumber(totalProductSale._sum.totalValue),
      },
    },
    penjualanMitraDetail,
    bySumber,
    trend,
    // Filter penjualan_produk dari tabel transaksi yang ditampilkan.
    // Kas dari penjualan produk memang masuk ke kotak kas BS (sehingga saldoKas mencakupnya),
    // tapi untuk laporan BS, transaksi produk dilaporkan terpisah di tab Penjualan Produk.
    transaksi: allKasTx.filter((t) => t.sumber !== 'penjualan_produk').slice(0, 100),
    transaksiProdukDipisah: allKasTx.filter((t) => t.sumber === 'penjualan_produk').length,
  })
}
