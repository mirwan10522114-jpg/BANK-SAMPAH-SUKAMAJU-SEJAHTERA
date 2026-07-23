import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'
import { toNumber } from '@/lib/format'
import { Prisma } from '@prisma/client'

// Unified sales data (Offline + Online)
export async function GET(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const channel = url.searchParams.get('channel') || 'semua'
  const dari = url.searchParams.get('dari') || ''
  const sampai = url.searchParams.get('sampai') || ''
  const q = url.searchParams.get('q') || ''
  const status = url.searchParams.get('status') || ''

  // Date filter
  const dateFilter: Prisma.DateTimeNullableFilter = {}
  if (dari) dateFilter.gte = new Date(dari)
  if (sampai) dateFilter.lte = new Date(sampai + 'T23:59:59')
  const hasDateFilter = !!(dari || sampai)

  const results: any[] = []

  // Offline sales
  if (channel === 'semua' || channel === 'offline') {
    const offlineWhere: Prisma.ProductSaleWhereInput = { channel: 'offline', paymentStatus: 'paid' }
    if (hasDateFilter) (offlineWhere as any).transactedAt = dateFilter
    if (q) offlineWhere.buyerName = { contains: q }

    const offlineSales = await db.productSale.findMany({
      where: offlineWhere,
      orderBy: { transactedAt: 'desc' },
      include: {
        items: true,
        createdBy: { select: { id: true, name: true } },
      },
      take: 100,
    })

    for (const s of offlineSales) {
      results.push({
        id: s.id,
        channel: 'offline',
        refNumber: s.id.slice(-8).toUpperCase(),
        buyerName: s.buyerName,
        buyerPhone: s.buyerPhone,
        totalQuantity: toNumber(s.totalQuantity),
        totalValue: toNumber(s.totalValue),
        paymentMethod: s.paymentMethod,
        paymentStatus: s.paymentStatus,
        status: s.paymentStatus === 'paid' ? 'selesai' : s.paymentStatus,
        notes: s.notes,
        transactedAt: s.transactedAt,
        createdAt: s.createdAt,
        items: s.items.map((i) => ({
          id: i.id,
          productName: i.productNameSnapshot,
          unit: i.unitSnapshot,
          price: toNumber(i.pricePerUnitSnapshot),
          quantity: toNumber(i.quantity),
          subtotal: toNumber(i.subtotal),
        })),
        createdBy: s.createdBy,
      })
    }
  }

  // Online sales (TokoOrder) — show ALL orders (not just dibayar) so admin can see pending ones too
  if (channel === 'semua' || channel === 'online') {
    const onlineWhere: Prisma.TokoOrderWhereInput = {}
    if (hasDateFilter) (onlineWhere as any).createdAt = dateFilter
    if (q) {
      onlineWhere.OR = [
        { orderNumber: { contains: q } },
        { buyerName: { contains: q } },
      ]
    }
    if (status) onlineWhere.orderStatus = status

    const onlineOrders = await db.tokoOrder.findMany({
      where: onlineWhere,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        createdBy: { select: { id: true, name: true } },
      },
      take: 100,
    })

    for (const o of onlineOrders) {
      results.push({
        id: o.id,
        channel: 'online',
        refNumber: o.orderNumber,
        buyerName: o.buyerName,
        buyerPhone: o.buyerPhone,
        buyerEmail: o.buyerEmail,
        totalQuantity: o.items.reduce((sum, i) => sum + toNumber(i.quantity), 0),
        totalValue: toNumber(o.subtotalProduk),
        ongkir: toNumber(o.ongkir),
        totalBayar: toNumber(o.totalBayar),
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        orderStatus: o.orderStatus,
        status: o.orderStatus,
        notes: o.notes,
        transactedAt: o.paidAt || o.createdAt,
        createdAt: o.createdAt,
        items: o.items.map((i) => ({
          id: i.id,
          productName: i.productNameSnapshot,
          unit: i.unitSnapshot,
          price: toNumber(i.pricePerUnitSnapshot),
          quantity: toNumber(i.quantity),
          subtotal: toNumber(i.subtotal),
        })),
        createdBy: o.createdBy,
      })
    }
  }

  // Sort by date desc
  results.sort((a, b) => {
    const dateA = new Date(a.transactedAt).getTime()
    const dateB = new Date(b.transactedAt).getTime()
    return dateB - dateA
  })

  // Summary stats
  const offlineResults = results.filter((r) => r.channel === 'offline')
  const onlineResults = results.filter((r) => r.channel === 'online')
  const totalOfflineValue = offlineResults.reduce((sum, r) => sum + r.totalValue, 0)
  const totalOnlineValue = onlineResults.reduce((sum, r) => sum + r.totalValue, 0)
  const totalPenjualan = totalOfflineValue + totalOnlineValue

  return NextResponse.json({
    // Frontend expects "orders", not "data"
    orders: results,
    // Frontend expects "stats" with these specific field names
    stats: {
      totalPenjualan,
      totalOnline: totalOnlineValue,
      totalOffline: totalOfflineValue,
      countOnline: onlineResults.length,
      countOffline: offlineResults.length,
      avgPerTransaction: results.length > 0 ? totalPenjualan / results.length : 0,
    },
  })
}