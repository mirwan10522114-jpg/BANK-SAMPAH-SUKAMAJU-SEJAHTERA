import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { addProductStock, reduceProductStock, recordBankSampahKas } from '@/lib/business'
import { toNumber } from '@/lib/format'
import crypto from 'crypto'

// POST: Midtrans notification webhook
export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    transaction_status,
    order_id,
    fraud_status,
    transaction_time,
    status_code,
    gross_amount,
    signature_key,
  } = body as {
    transaction_status: string
    order_id: string
    fraud_status?: string
    transaction_time?: string
    status_code?: string
    gross_amount?: string
    signature_key?: string
  }

  if (!order_id || !transaction_status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Find order by midtransOrderId or orderNumber
  const order = await db.tokoOrder.findFirst({
    where: {
      OR: [
        { midtransOrderId: order_id },
        { orderNumber: order_id },
      ],
    },
    include: { items: true },
  })

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Verify Midtrans signature if server key is available
  const setting = await db.tokoSetting.findFirst()
  if (setting?.midtransServerKey && signature_key) {
    const hash = crypto
      .createHash('sha512')
      .update(`${order_id}${status_code}${gross_amount}${setting.midtransServerKey}`)
      .digest('hex')
    if (hash !== signature_key) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }
  }

  // Process status changes
  let newPaymentStatus: string | null = null
  let newOrderStatus: string | null = null
  let keterangan = ''

  const isSettlement = transaction_status === 'settlement' || transaction_status === 'capture'
  const isPending = transaction_status === 'pending'
  const isFailed = ['expire', 'deny', 'cancel', 'failure', 'rejection'].includes(transaction_status)

  // Handle fraud_status for challenge
  if (transaction_status === 'challenge' && fraud_status === 'accept') {
    // Treat as settlement
    newPaymentStatus = 'dibayar'
    newOrderStatus = 'dibayar'
    keterangan = `Pembayaran diterima (challenge resolved), status: Dibayar - ${transaction_time || ''}`
  } else if (isSettlement) {
    newPaymentStatus = 'dibayar'
    newOrderStatus = 'dibayar'
    keterangan = `Pembayaran berhasil, status: Dibayar - ${transaction_time || ''}`
  } else if (isPending) {
    // Keep current status
    keterangan = `Menunggu pembayaran - ${transaction_time || ''}`
  } else if (isFailed) {
    const mapStatus: Record<string, string> = {
      expire: 'expired',
      deny: 'dibatalkan',
      cancel: 'dibatalkan',
      failure: 'gagal',
      rejection: 'dibatalkan',
    }
    newPaymentStatus = mapStatus[transaction_status] || 'gagal'
    newOrderStatus = 'dibatalkan'
    keterangan = `Pembayaran ${transaction_status} - ${transaction_time || ''}`
  }

  // Update order if status changed
  const updateData: any = {}
  if (newPaymentStatus && newPaymentStatus !== order.paymentStatus) {
    updateData.paymentStatus = newPaymentStatus
  }
  if (newOrderStatus && newOrderStatus !== order.orderStatus) {
    updateData.orderStatus = newOrderStatus
  }

  if (isSettlement || (transaction_status === 'challenge' && fraud_status === 'accept')) {
    updateData.paidAt = new Date()
  }

  if (Object.keys(updateData).length > 0) {
    await db.tokoOrder.update({
      where: { id: order.id },
      data: updateData,
    })
  }

  // Create status history if order status changed
  if (newOrderStatus && newOrderStatus !== order.orderStatus) {
    await db.tokoOrderStatusHistory.create({
      data: {
        tokoOrderId: order.id,
        status: newOrderStatus,
        keterangan,
      },
    })
  } else if (keterangan) {
    // Still log even if no order status change
    await db.tokoOrderStatusHistory.create({
      data: {
        tokoOrderId: order.id,
        status: order.orderStatus,
        keterangan,
      },
    })
  }

  // Handle stock conversion: reserve → real sale on settlement
  if (isSettlement || (transaction_status === 'challenge' && fraud_status === 'accept')) {
    // Convert reserved stock to real sale
    // The reserve already reduced stock, now we need to:
    // 1. Add back the reserved stock (release)
    // 2. Reduce stock again as real sale
    // Actually - the stock was already reduced by online_reserve.
    // On settlement, we convert the movement from "reserve" to "sale"
    // by adding stock back and reducing as "sale"
    for (const item of order.items) {
      const qty = toNumber(item.quantity)
      // Add back (release)
      await addProductStock(item.productId, qty, 'online_release', 'toko_order', order.id, undefined, `Konfirmasi pesanan ${order.orderNumber}`)
      // Reduce as real sale
      await reduceProductStock(item.productId, qty, 'online_sale', 'toko_order', order.id, undefined, `Penjualan online ${order.orderNumber}`)
    }

    // Record kas masuk
    try {
      await recordBankSampahKas('masuk', 'penjualan_produk', toNumber(order.totalBayar), `Penjualan online ${order.orderNumber}`, undefined, undefined)
    } catch (e) {
      console.error('Failed to record kas from online sale:', e)
    }

    // Create ProductSale for unified reporting
    await db.productSale.create({
      data: {
        buyerName: order.buyerName,
        buyerPhone: order.buyerPhone,
        paymentMethod: 'midtrans',
        paymentStatus: 'paid',
        totalQuantity: order.items.reduce((sum, i) => sum + toNumber(i.quantity), 0),
        totalValue: toNumber(order.subtotalProduk),
        channel: 'online',
        notes: `Pesanan online ${order.orderNumber}`,
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

  // Handle stock release on failure/expire
  if (isFailed && order.paymentStatus === 'menunggu') {
    for (const item of order.items) {
      const qty = toNumber(item.quantity)
      await addProductStock(item.productId, qty, 'online_release', 'toko_order', order.id, undefined, `Pembatalan pesanan ${order.orderNumber}`)
    }
  }

  return NextResponse.json({ status: 'ok' })
}