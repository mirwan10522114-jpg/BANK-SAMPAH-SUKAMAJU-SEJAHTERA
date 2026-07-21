import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { addProductStock, reduceProductStock, recordBankSampahKas } from '@/lib/business'
import { toNumber } from '@/lib/format'

// POST: Confirm payment for an online order (manual confirmation or post-Midtrans callback)
// This is a fallback for when Midtrans webhook is not configured (sandbox/demo mode).
// After payment is confirmed:
//   - paymentStatus → 'dibayar'
//   - orderStatus → 'dibayar' (admin can later advance to 'diproses' when processing starts)
//   - Stock converted from reserve to real sale
//   - Kas masuk recorded
//   - ProductSale created for unified reporting
export async function POST(req: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params

  const order = await db.tokoOrder.findFirst({
    where: { orderNumber },
    include: { items: true },
  })

  if (!order) {
    return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
  }

  // Only allow confirmation if currently menunggu
  if (order.paymentStatus !== 'menunggu') {
    return NextResponse.json({ error: `Pesanan berstatus ${order.paymentStatus}, tidak dapat dikonfirmasi` }, { status: 400 })
  }

  // Update order status
  await db.tokoOrder.update({
    where: { id: order.id },
    data: {
      paymentStatus: 'dibayar',
      orderStatus: 'dibayar',
      paidAt: new Date(),
    },
  })

  // Create status history
  await db.tokoOrderStatusHistory.create({
    data: {
      tokoOrderId: order.id,
      status: 'dibayar',
      keterangan: 'Pembayaran dikonfirmasi oleh pembeli',
    },
  })

  // Convert reserved stock to real sale
  for (const item of order.items) {
    const qty = toNumber(item.quantity)
    // Release reserve
    try {
      await addProductStock(item.productId, qty, 'online_release', 'toko_order', order.id, undefined, `Konfirmasi pesanan ${order.orderNumber}`)
    } catch {}
    // Reduce as real sale
    try {
      await reduceProductStock(item.productId, qty, 'online_sale', 'toko_order', order.id, undefined, `Penjualan online ${order.orderNumber}`)
    } catch {}
  }

  // Record kas masuk
  try {
    await recordBankSampahKas('masuk', 'penjualan_produk', toNumber(order.totalBayar), `Penjualan online ${order.orderNumber}`, undefined, undefined)
  } catch (e) {
    console.error('Failed to record kas from online sale:', e)
  }

  // Create ProductSale for unified reporting (so it appears in admin penjualan list + laporan)
  const existingSale = await db.productSale.findFirst({ where: { notes: { contains: order.orderNumber } } })
  if (!existingSale) {
    await db.productSale.create({
      data: {
        buyerName: order.buyerName,
        buyerPhone: order.buyerPhone,
        paymentMethod: order.paymentMethod || 'midtrans',
        paymentStatus: 'paid',
        totalQuantity: order.items.reduce((sum, i) => sum + toNumber(i.quantity), 0),
        totalValue: toNumber(order.subtotalProduk),
        channel: 'online',
        notes: `Pesanan online ${order.orderNumber}`,
        transactedAt: new Date(),
        items: {
          create: order.items.map((i) => ({
            productId: i.productId,
            productNameSnapshot: i.productNameSnapshot,
            unitSnapshot: i.unitSnapshot,
            pricePerUnitSnapshot: i.pricePerUnitSnapshot,
            quantity: toNumber(i.quantity),
            subtotal: toNumber(i.subtotal),
          })),
        },
      },
    })
  }

  return NextResponse.json({
    success: true,
    message: 'Pembayaran dikonfirmasi, status pesanan: Dibayar',
    orderNumber: order.orderNumber,
    paymentStatus: 'dibayar',
    orderStatus: 'dibayar',
  })
}
