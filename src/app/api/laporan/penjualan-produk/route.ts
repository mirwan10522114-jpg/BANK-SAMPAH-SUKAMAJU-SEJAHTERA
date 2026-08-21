import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'

// Laporan Laba Rugi Penjualan Produk
// Revenue sources:
//   1. ProductSale (offline kasir) — totalValue, paymentStatus=paid
//   2. TokoOrder (online) — totalBayar, paymentStatus=dibayar
// COGS (HPP):
//   - For each sale item, COGS = product cost. Since products come from ProcessingTransaction (waste→product),
//     the "cost" is the input waste value. We approximate using the latest WastePrice of input materials.
//   - For simplicity & data availability, we use ProcessingTransaction's input weight × avg waste price as production cost,
//     distributed across output products by quantity ratio.
//   - Alternative: use product.price as proxy for COGS baseline. We'll provide both gross margin (revenue - 0) and
//     estimated COGS from processing inputs.
// Gross Profit = Revenue - COGS
// Operating expenses: ongkir (online), payment fees (estimated)

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

  // ===== Parallel fetch =====
  const [
    offlineSales,
    onlineOrders,
    processingTxInPeriod,
    allProducts,
    wastePricesMap,
  ] = await Promise.all([
    // Offline sales (ProductSale)
    db.productSale.findMany({
      where: { transactedAt: dateRange, paymentStatus: 'paid' },
      include: { items: true, buyer: true },
      orderBy: { transactedAt: 'desc' },
    }),
    // Online orders (TokoOrder) — only paid/completed
    db.tokoOrder.findMany({
      where: {
        createdAt: dateRange,
        paymentStatus: 'dibayar',
      },
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
  // Distribusikan modal ke produk output berdasarkan rasio kuantitas.
  // Source bahan (nabung/sedekah) di-trace dari InventoryMovement.
  const productCostPerUnit = new Map<string, number>() // productId -> avg cost per unit
  const productCostSamples = new Map<string, { totalCost: number; totalQty: number }>()

  // Group movements by processing transaction ID
  const movementsByTxId = new Map<string, typeof processingMovements>()
  for (const m of processingMovements) {
    const txId = m.sourceRefId || ''
    if (!movementsByTxId.has(txId)) movementsByTxId.set(txId, [])
    movementsByTxId.get(txId)!.push(m)
  }

  for (const pt of processingTxInPeriod) {
    // Get movements for this processing transaction
    const movements = movementsByTxId.get(pt.id) || []
    // Calculate total input cost based on source (sedekah = 0, nabung = harga acuan)
    let totalInputCost = 0
    for (const inp of pt.inputs) {
      const price = wastePriceByItemId.get(inp.wasteItemId) || 0
      const qty = toNumber(inp.quantity)
      // Find matching movement to determine source
      // Movement has wasteItemId + source. Match by wasteItemId (first match).
      const matchingMovement = movements.find(m => m.wasteItemId === inp.wasteItemId)
      const source = matchingMovement?.source || 'nabung'
      // Sedekah = modal 0, nabung = qty × harga acuan
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

  // ===== Offline Sales analysis =====
  let offlineRevenue = 0
  let offlineCOGS = 0
  let offlineItemsSold = 0
  const offlineByProduct = new Map<string, { name: string; qty: number; revenue: number; cogs: number; count: number }>()
  for (const sale of offlineSales) {
    offlineRevenue += toNumber(sale.totalValue)
    for (const item of sale.items) {
      const qty = toNumber(item.quantity)
      const revenue = toNumber(item.subtotal)
      const cogsPerUnit = productCostPerUnit.get(item.productId) || 0
      const cogs = qty * cogsPerUnit
      offlineCOGS += cogs
      offlineItemsSold += qty
      const existing = offlineByProduct.get(item.productId) || { name: item.productNameSnapshot, qty: 0, revenue: 0, cogs: 0, count: 0 }
      existing.qty += qty
      existing.revenue += revenue
      existing.cogs += cogs
      existing.count++
      offlineByProduct.set(item.productId, existing)
    }
  }

  // ===== Online Orders analysis =====
  let onlineRevenue = 0
  let onlineCOGS = 0
  let onlineOngkir = 0
  let onlineItemsSold = 0
  const onlineByProduct = new Map<string, { name: string; qty: number; revenue: number; cogs: number; count: number }>()
  for (const order of onlineOrders) {
    onlineRevenue += toNumber(order.subtotalProduk)
    onlineOngkir += toNumber(order.ongkir)
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

  // ===== Consolidated P&L =====
  const totalRevenue = offlineRevenue + onlineRevenue
  const totalCOGS = offlineCOGS + onlineCOGS
  const labaKotor = totalRevenue - totalCOGS
  const bebanOperasional = onlineOngkir // ongkir sebagai beban pengiriman
  const labaRugiBersih = labaKotor - bebanOperasional
  const marginKotor = totalRevenue > 0 ? (labaKotor / totalRevenue) * 100 : 0
  const marginBersih = totalRevenue > 0 ? (labaRugiBersih / totalRevenue) * 100 : 0

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
    .map(([id, v]) => ({ id, ...v, laba: v.revenue - v.cogs, margin: v.revenue > 0 ? ((v.revenue - v.cogs) / v.revenue) * 100 : 0 }))
    .sort((a, b) => b.revenue - a.revenue)

  // ===== Trend (monthly) =====
  const months = new Map<string, { offline: number; online: number; cogs: number; label: string }>()
  for (const sale of offlineSales) {
    const d = new Date(sale.transactedAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
    if (!months.has(key)) months.set(key, { offline: 0, online: 0, cogs: 0, label })
    months.get(key)!.offline += toNumber(sale.totalValue)
  }
  for (const order of onlineOrders) {
    const d = new Date(order.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
    if (!months.has(key)) months.set(key, { offline: 0, online: 0, cogs: 0, label })
    months.get(key)!.online += toNumber(order.subtotalProduk)
  }
  // Distribute COGS by month (approximation by revenue ratio)
  for (const [, v] of months.entries()) {
    const monthRevenue = v.offline + v.online
    v.cogs = totalRevenue > 0 ? totalCOGS * (monthRevenue / totalRevenue) : 0
  }
  const trend = Array.from(months.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, v]) => ({ key, ...v, total: v.offline + v.online, laba: v.offline + v.online - v.cogs }))

  // ===== Stock value (current inventory at cost) =====
  const products = await db.product.findMany({ select: { id: true, name: true, stock: true, price: true } })
  let stockValueAtCost = 0
  let stockValueAtPrice = 0
  for (const p of products) {
    const stock = toNumber(p.stock)
    const cost = productCostPerUnit.get(p.id) || 0
    stockValueAtCost += stock * cost
    stockValueAtPrice += stock * toNumber(p.price)
  }

  return NextResponse.json({
    periode: { start: rangeStart, end: rangeEnd, label: periode },
    ringkasan: {
      totalRevenue,
      totalCOGS,
      labaKotor,
      bebanOperasional,
      labaRugiBersih,
      marginKotor,
      marginBersih,
      offlineRevenue,
      onlineRevenue,
      offlineCOGS,
      onlineCOGS,
      onlineOngkir,
      offlineTransactions: offlineSales.length,
      onlineTransactions: onlineOrders.length,
      offlineItemsSold,
      onlineItemsSold,
      stockValueAtCost,
      stockValueAtPrice,
    },
    pendapatan: {
      offline: offlineRevenue,
      online: onlineRevenue,
    },
    hpp: {
      offline: offlineCOGS,
      online: onlineCOGS,
      total: totalCOGS,
    },
    beban: {
      ongkir: onlineOngkir,
      lainnya: 0,
    },
    byProduct,
    trend,
    cogsMethod: 'modal_bahan_from_inventory_source',
    cogsNote: 'Modal bahan dihitung dari qty bahan baku × harga beli nasabah. Bahan dari sedekah = Rp 0 (donasi). Bahan dari nabung = qty × harga acuan. Source bahan di-trace dari InventoryMovement. Modal didistribusikan ke produk output berdasarkan rasio kuantitas.',
    detailTransaksi: {
      offline: offlineSales.slice(0, 50).map(s => ({
        id: s.id,
        tanggal: s.transactedAt,
        buyer: s.buyerName,
        channel: s.channel,
        total: toNumber(s.totalValue),
        items: s.items.length,
      })),
      online: onlineOrders.slice(0, 50).map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        tanggal: o.createdAt,
        buyer: o.buyerName,
        status: o.orderStatus,
        subtotal: toNumber(o.subtotalProduk),
        ongkir: toNumber(o.ongkir),
        total: toNumber(o.totalBayar),
        items: o.items.length,
      })),
    },
  })
}
