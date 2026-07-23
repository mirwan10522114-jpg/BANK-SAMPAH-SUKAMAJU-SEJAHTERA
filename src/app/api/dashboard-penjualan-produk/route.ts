import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'

// Dashboard Penjualan Produk API
// Returns: metric cards, monthly trend, top products, recent transactions
// Supports period filters: periode (bulan_ini/custom/1bul/3bul/6bul/1thn), dari, sampai
// Uses endOfCurrentMonth as rangeEnd (same fix as laporan APIs).

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const periode = searchParams.get('periode') || 'bulan_ini'
  const dari = searchParams.get('dari')
  const sampai = searchParams.get('sampai')

  // ===== Compute period range =====
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

  // ===== Parallel fetch =====
  const [
    offlineSales,
    onlineOrders,
    processingTxInPeriod,
    allProducts,
    wastePricesMap,
  ] = await Promise.all([
    // Offline sales (ProductSale) — paid only
    db.productSale.findMany({
      where: { transactedAt: dateRange, paymentStatus: 'paid' },
      include: { items: true, buyer: true },
      orderBy: { transactedAt: 'desc' },
    }),
    // Online orders (TokoOrder) — paid only
    db.tokoOrder.findMany({
      where: { createdAt: dateRange, paymentStatus: 'dibayar' },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    }),
    // Processing transactions in period (for COGS estimation)
    db.processingTransaction.findMany({
      where: { transactedAt: dateRange },
      include: { inputs: true, outputs: true },
    }),
    // All active products
    db.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, price: true, stock: true, unit: true, productCategoryId: true },
    }),
    // Waste prices for COGS (latest price per waste item)
    db.wastePrice.findMany({
      orderBy: { effectiveFrom: 'desc' },
      include: { wasteItem: true },
    }),
  ])

  // Fetch inventory movements for processing (to determine source: nabung vs sedekah)
  const processingMovements = processingTxInPeriod.length > 0
    ? await db.inventoryMovement.findMany({
        where: {
          reason: 'processing_input',
          direction: 'out',
          sourceRefType: 'processing_transaction',
          sourceRefId: { in: processingTxInPeriod.map(pt => pt.id) },
        },
      })
    : []

  // Build wastePrice lookup (latest price per wasteItemId)
  const wastePriceByItemId = new Map<string, number>()
  for (const wp of wastePricesMap) {
    if (!wastePriceByItemId.has(wp.wasteItemId)) {
      wastePriceByItemId.set(wp.wasteItemId, toNumber(wp.pricePerUnit))
    }
  }
  // Fallback to wasteItem.pricePerUnit
  const wasteItems = await db.wasteItem.findMany({ select: { id: true, pricePerUnit: true } })
  for (const wi of wasteItems) {
    if (!wastePriceByItemId.has(wi.id)) {
      wastePriceByItemId.set(wi.id, toNumber(wi.pricePerUnit))
    }
  }

  // ===== Build product COGS from processing transactions =====
  // Modal bahan = qty bahan baku × harga beli nasabah
  //   - Jika bahan dari sedekah → modal = Rp 0 (donasi, tidak bayar ke nasabah)
  //   - Jika bahan dari nabung → modal = qty × harga acuan (WastePrice)
  // Source bahan (nabung/sedekah) di-trace dari InventoryMovement.
  const productCostPerUnit = new Map<string, number>()
  const productCostSamples = new Map<string, { totalCost: number; totalQty: number }>()

  // Group movements by processing transaction ID
  const movementsByTxId = new Map<string, typeof processingMovements>()
  for (const m of processingMovements) {
    const txId = m.sourceRefId || ''
    if (!movementsByTxId.has(txId)) movementsByTxId.set(txId, [])
    movementsByTxId.get(txId)!.push(m)
  }

  for (const pt of processingTxInPeriod) {
    const movements = movementsByTxId.get(pt.id) || []
    let totalInputCost = 0
    for (const inp of pt.inputs) {
      const price = wastePriceByItemId.get(inp.wasteItemId) || 0
      const qty = toNumber(inp.quantity)
      const matchingMovement = movements.find(m => m.wasteItemId === inp.wasteItemId)
      const source = matchingMovement?.source || 'nabung'
      const itemCost = source === 'sedekah' ? 0 : qty * price
      totalInputCost += itemCost
    }
    const totalOutputQty = pt.outputs.reduce((s, out) => s + toNumber(out.quantity), 0)
    if (totalOutputQty === 0) continue
    for (const out of pt.outputs) {
      const qty = toNumber(out.quantity)
      const allocatedCost = totalInputCost * (qty / totalOutputQty)
      const prev = productCostSamples.get(out.productId) || { totalCost: 0, totalQty: 0 }
      productCostSamples.set(out.productId, {
        totalCost: prev.totalCost + allocatedCost,
        totalQty: prev.totalQty + qty,
      })
    }
  }
  for (const [productId, sample] of productCostSamples.entries()) {
    if (sample.totalQty > 0) {
      productCostPerUnit.set(productId, sample.totalCost / sample.totalQty)
    }
  }

  // ===== Aggregate metrics =====
  let totalOffline = 0
  let totalOnline = 0
  let totalOngkir = 0
  let offlineItemsSold = 0
  let onlineItemsSold = 0
  let offlineCOGS = 0
  let onlineCOGS = 0
  const offlineByProduct = new Map<string, { name: string; qty: number; revenue: number; cogs: number; count: number }>()
  const onlineByProduct = new Map<string, { name: string; qty: number; revenue: number; cogs: number; count: number }>()

  for (const sale of offlineSales) {
    totalOffline += toNumber(sale.totalValue)
    offlineItemsSold += toNumber(sale.totalQuantity)
    for (const item of sale.items) {
      const qty = toNumber(item.quantity)
      const revenue = toNumber(item.subtotal)
      const cogsPerUnit = productCostPerUnit.get(item.productId) || 0
      const cogs = qty * cogsPerUnit
      offlineCOGS += cogs
      const existing = offlineByProduct.get(item.productId) || { name: item.productNameSnapshot, qty: 0, revenue: 0, cogs: 0, count: 0 }
      existing.qty += qty
      existing.revenue += revenue
      existing.cogs += cogs
      existing.count++
      offlineByProduct.set(item.productId, existing)
    }
  }
  for (const order of onlineOrders) {
    totalOnline += toNumber(order.subtotalProduk)
    totalOngkir += toNumber(order.ongkir)
    for (const item of order.items) {
      const qty = toNumber(item.quantity)
      const revenue = toNumber(item.subtotal)
      const cogsPerUnit = productCostPerUnit.get(item.productId) || 0
      const cogs = qty * cogsPerUnit
      onlineCOGS += cogs
      onlineItemsSold += qty
      const existing = onlineByProduct.get(item.productId) || { name: item.productNameSnapshot, qty: 0, revenue: 0, cogs: 0, count: 0 }
      existing.qty += qty
      existing.revenue += revenue
      existing.cogs += cogs
      existing.count++
      onlineByProduct.set(item.productId, existing)
    }
  }

  const totalPenjualan = totalOffline + totalOnline
  const totalCOGS = offlineCOGS + onlineCOGS
  const labaKotor = totalPenjualan - totalCOGS
  const marginKotor = totalPenjualan > 0 ? (labaKotor / totalPenjualan) * 100 : 0
  const countOffline = offlineSales.length
  const countOnline = onlineOrders.length
  const countTotal = countOffline + countOnline
  const totalUnitTerjual = offlineItemsSold + onlineItemsSold
  const avgPerTransaction = countTotal > 0 ? totalPenjualan / countTotal : 0

  // ===== Stock value (current inventory at cost & price) =====
  let stockValueAtPrice = 0
  let stockValueAtCost = 0
  for (const p of allProducts) {
    const stock = toNumber(p.stock)
    const cost = productCostPerUnit.get(p.id) || 0
    stockValueAtCost += stock * cost
    stockValueAtPrice += stock * toNumber(p.price)
  }

  // ===== Trend (monthly: offline, online, total) =====
  // Pre-fill ALL months in the period range (so chart shows 12 bars for 1 year, not just months with data)
  const months = new Map<string, { label: string; offline: number; online: number; total: number }>()
  const trendStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1)
  const trendEnd = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1)
  const cursor = new Date(trendStart)
  while (cursor <= trendEnd) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
    const label = cursor.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
    if (!months.has(key)) months.set(key, { label, offline: 0, online: 0, total: 0 })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  // Fill with actual transaction data
  for (const sale of offlineSales) {
    const d = new Date(sale.transactedAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!months.has(key)) months.set(key, { label: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }), offline: 0, online: 0, total: 0 })
    const v = months.get(key)!
    v.offline += toNumber(sale.totalValue)
    v.total = v.offline + v.online
  }
  for (const order of onlineOrders) {
    const d = new Date(order.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!months.has(key)) months.set(key, { label: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }), offline: 0, online: 0, total: 0 })
    const v = months.get(key)!
    v.online += toNumber(order.subtotalProduk)
    v.total = v.offline + v.online
  }
  const trend = Array.from(months.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, v]) => ({ key, ...v }))

  // ===== By product (consolidated) =====
  const byProductMap = new Map<string, { name: string; qty: number; revenue: number; cogs: number; count: number; offline: number; online: number }>()
  for (const [pid, p] of offlineByProduct.entries()) {
    byProductMap.set(pid, { ...p, offline: p.revenue, online: 0 })
  }
  for (const [pid, p] of onlineByProduct.entries()) {
    const existing = byProductMap.get(pid) || { name: p.name, qty: 0, revenue: 0, cogs: 0, count: 0, offline: 0, online: 0 }
    existing.qty += p.qty
    existing.revenue += p.revenue
    existing.cogs += p.cogs
    existing.count += p.count
    existing.online += p.revenue
    byProductMap.set(pid, existing)
  }
  const byProduct = Array.from(byProductMap.entries())
    .map(([id, v]) => ({
      id,
      name: v.name,
      qty: v.qty,
      revenue: v.revenue,
      cogs: v.cogs,
      laba: v.revenue - v.cogs,
      margin: v.revenue > 0 ? ((v.revenue - v.cogs) / v.revenue) * 100 : 0,
      offline: v.offline,
      online: v.online,
      count: v.count,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  // ===== Recent transactions (offline + online merged, last 10) =====
  type RecentTx = {
    id: string
    channel: 'offline' | 'online'
    refNumber: string
    tanggal: Date
    buyer: string
    items: number
    qty: number
    subtotal: number
    ongkir: number
    total: number
    status: string
  }
  const recentRows: RecentTx[] = []
  for (const s of offlineSales) {
    recentRows.push({
      id: s.id,
      channel: 'offline',
      refNumber: s.id.slice(-8).toUpperCase(),
      tanggal: s.transactedAt,
      buyer: s.buyerName || s.buyer?.name || '-',
      items: s.items.length,
      qty: toNumber(s.totalQuantity),
      subtotal: toNumber(s.totalValue),
      ongkir: 0,
      total: toNumber(s.totalValue),
      status: s.paymentStatus === 'paid' ? 'Selesai' : s.paymentStatus,
    })
  }
  for (const o of onlineOrders) {
    recentRows.push({
      id: o.id,
      channel: 'online',
      refNumber: o.orderNumber,
      tanggal: o.paidAt || o.createdAt,
      buyer: o.buyerName || '-',
      items: o.items.length,
      qty: o.items.reduce((sum, i) => sum + toNumber(i.quantity), 0),
      subtotal: toNumber(o.subtotalProduk),
      ongkir: toNumber(o.ongkir),
      total: toNumber(o.totalBayar),
      status: o.orderStatus,
    })
  }
  recentRows.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
  const recentTransactions = recentRows.slice(0, 10)

  return NextResponse.json({
    metrics: {
      totalPenjualan,
      totalOffline,
      totalOnline,
      countOffline,
      countOnline,
      totalUnitTerjual,
      avgPerTransaction,
      totalOngkir,
      totalCOGS,
      labaKotor,
      marginKotor,
      stockValueAtPrice,
      stockValueAtCost,
    },
    trend,
    byProduct,
    recentTransactions,
    period: {
      periode,
      dari: rangeStart.toISOString(),
      sampai: rangeEnd.toISOString(),
    },
  })
}
