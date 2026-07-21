import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/payment/status?orderId=TKO-...
// Returns the current payment & Midtrans fields stored on the order.
// Useful for polling order status after Snap popup closes (the actual
// status update happens asynchronously via the Midtrans webhook).
//
// Returns also `secondsUntilExpiry` & `expiredAt` untuk countdown timer
// di frontend. Expiry dihitung dari createdAt + 5 menit (sesuai Midtrans
// Snap setting di src/lib/midtrans.ts).
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const orderId = url.searchParams.get('orderId')?.trim() || ''

  if (!orderId) {
    return NextResponse.json(
      { error: 'orderId wajib' },
      { status: 400 }
    )
  }

  // `let` karena bisa di-reassign setelah poll Midtrans API
  let order = await db.tokoOrder.findFirst({
    where: {
      OR: [{ orderNumber: orderId }, { midtransOrderId: orderId }],
    },
    select: {
      orderNumber: true,
      paymentStatus: true,
      orderStatus: true,
      midtransOrderId: true,
      midtransTransactionId: true,
      midtransPaymentType: true,
      midtransVaNumber: true,
      midtransIssuer: true,
      midtransPdfUrl: true,
      midtransStatusCode: true,
      midtransGrossAmount: true,
      paidAt: true,
      midtransTransactionTime: true,
      midtransSettlementTime: true,
      midtransLastWebhookAt: true,
      midtransRawCallback: true,
      midtransSnapToken: true,
      totalBayar: true,
      subtotalProduk: true,
      ongkir: true,
      buyerName: true,
      buyerPhone: true,
      buyerEmail: true,
      updatedAt: true,
      createdAt: true,
      id: true, // dipakai untuk update via poll Midtrans
    },
  })

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // ============================================================
  // POLL STATUS DARI MIDTRANS API (fallback kalau webhook gagal)
  // ------------------------------------------------------------
  // Midtrans sandbox sering tidak bisa kirim webhook ke preview
  // environment (tidak publicly accessible). Jadi kalau status di DB
  // masih "menunggu", kita cek status terbaru langsung ke Midtrans API.
  // Jika Midtrans bilang settlement/capture → update DB ke "dibayar".
  // ============================================================
  if (
    order.paymentStatus === 'menunggu' &&
    order.midtransOrderId
  ) {
    try {
      const { CoreApi } = await import('midtrans-client')
      const core = new CoreApi({
        isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
        serverKey: process.env.MIDTRANS_SERVER_KEY || '',
        clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
      })
      const midtransStatus = await core.transaction.status(order.midtransOrderId)
      const ts = midtransStatus.transaction_status
      const fraudStatus = midtransStatus.fraud_status

      // Jika Midtrans bilang settlement/capture (sukses) → update DB
      if (
        ts === 'settlement' ||
        (ts === 'capture' && (fraudStatus === 'accept' || !fraudStatus))
      ) {
        const { addProductStock, reduceProductStock, recordBankSampahKas } = await import('@/lib/business')
        const { toNumber } = await import('@/lib/format')

        // Ambil items untuk update stok
        const orderWithItems = await db.tokoOrder.findUnique({
          where: { id: order.id },
          include: { items: true },
        })

        await db.tokoOrder.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'dibayar',
            orderStatus: 'dibayar',
            paidAt: new Date(),
            midtransTransactionId: midtransStatus.transaction_id || null,
            midtransPaymentType: midtransStatus.payment_type || null,
            midtransStatusCode: midtransStatus.status_code || null,
            midtransSettlementTime: midtransStatus.settlement_time
              ? new Date(midtransStatus.settlement_time)
              : null,
            midtransVaNumber:
              midtransStatus.permata_va_number ||
              (Array.isArray(midtransStatus.va_numbers) && midtransStatus.va_numbers[0]?.va_number) ||
              midtransStatus.payment_code ||
              null,
            midtransIssuer:
              midtransStatus.va_numbers?.[0]?.bank ||
              midtransStatus.bank ||
              midtransStatus.store ||
              null,
            midtransPdfUrl: midtransStatus.pdf_url || null,
          },
        })

        // Convert reserved stock to real sale + record kas
        if (orderWithItems) {
          for (const item of orderWithItems.items) {
            const qty = toNumber(item.quantity)
            try {
              await addProductStock(item.productId, qty, 'online_release', 'toko_order', order.id, undefined, `Konfirmasi pesanan ${order.orderNumber}`)
            } catch {}
            try {
              await reduceProductStock(item.productId, qty, 'online_sale', 'toko_order', order.id, undefined, `Penjualan online ${order.orderNumber}`)
            } catch {}
          }
          try {
            await recordBankSampahKas('masuk', 'penjualan_produk', toNumber(order.totalBayar), `Penjualan online ${order.orderNumber}`, undefined, undefined)
          } catch {}
          // Create ProductSale record
          const existingSale = await db.productSale.findFirst({ where: { notes: { contains: order.orderNumber } } })
          if (!existingSale) {
            await db.productSale.create({
              data: {
                buyerName: order.buyerName,
                buyerPhone: order.buyerPhone,
                paymentMethod: 'midtrans',
                paymentStatus: 'paid',
                totalQuantity: orderWithItems.items.reduce((sum, i) => sum + toNumber(i.quantity), 0),
                totalValue: toNumber(order.subtotalProduk),
                channel: 'online',
                notes: `Pesanan online ${order.orderNumber}`,
                transactedAt: new Date(),
                items: {
                  create: orderWithItems.items.map((i) => ({
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
        }

        // Re-fetch order dengan status baru
        const updatedOrder = await db.tokoOrder.findFirst({
          where: { OR: [{ orderNumber: orderId }, { midtransOrderId: orderId }] },
          select: {
            orderNumber: true,
            paymentStatus: true,
            orderStatus: true,
            midtransOrderId: true,
            midtransTransactionId: true,
            midtransPaymentType: true,
            midtransVaNumber: true,
            midtransIssuer: true,
            midtransPdfUrl: true,
            midtransStatusCode: true,
            midtransGrossAmount: true,
            paidAt: true,
            midtransTransactionTime: true,
            midtransSettlementTime: true,
            midtransLastWebhookAt: true,
            midtransRawCallback: true,
            midtransSnapToken: true,
            totalBayar: true,
            subtotalProduk: true,
            ongkir: true,
            buyerName: true,
            buyerPhone: true,
            buyerEmail: true,
            updatedAt: true,
            createdAt: true,
          },
        })
        if (updatedOrder) {
          order = updatedOrder
        }
      } else if (ts === 'expire' || ts === 'cancel' || ts === 'deny') {
        // Update DB ke expired/gagal
        await db.tokoOrder.update({
          where: { id: order.id },
          data: {
            paymentStatus: ts === 'expire' ? 'expired' : 'gagal',
            orderStatus: ts === 'expire' ? 'expired' : 'dibatalkan',
          },
        })
        const updatedOrder = await db.tokoOrder.findFirst({
          where: { OR: [{ orderNumber: orderId }, { midtransOrderId: orderId }] },
          select: {
            orderNumber: true,
            paymentStatus: true,
            orderStatus: true,
            midtransOrderId: true,
            midtransTransactionId: true,
            midtransPaymentType: true,
            midtransVaNumber: true,
            midtransIssuer: true,
            midtransPdfUrl: true,
            midtransStatusCode: true,
            midtransGrossAmount: true,
            paidAt: true,
            midtransTransactionTime: true,
            midtransSettlementTime: true,
            midtransLastWebhookAt: true,
            midtransRawCallback: true,
            midtransSnapToken: true,
            totalBayar: true,
            subtotalProduk: true,
            ongkir: true,
            buyerName: true,
            buyerPhone: true,
            buyerEmail: true,
            updatedAt: true,
            createdAt: true,
          },
        })
        if (updatedOrder) {
          order = updatedOrder
        }
      }
    } catch (e) {
      // Midtrans API error (mis. 404 = transaksi belum ter-charge)
      // Abaikan — biarkan status DB yang dipakai
    }
  }

  // Hitung expiry: Midtrans Snap setting = 24 jam dari updatedAt
  const EXPIRY_HOURS = 24
  const expiredAt = new Date(
    order.updatedAt.getTime() + EXPIRY_HOURS * 60 * 60 * 1000
  )
  const now = new Date()
  const secondsUntilExpiry = Math.max(
    0,
    Math.floor((expiredAt.getTime() - now.getTime()) / 1000)
  )
  const isExpired =
    order.paymentStatus === 'menunggu' && secondsUntilExpiry === 0

  // Jika seharusnya expired tapi status DB belum diupdate, beri flag
  const effectivePaymentStatus = isExpired ? 'expired' : order.paymentStatus

  return NextResponse.json({
    orderNumber: order.orderNumber,
    paymentStatus: effectivePaymentStatus,
    dbPaymentStatus: order.paymentStatus, // status asli di DB (sebelum effective)
    orderStatus: order.orderStatus,
    midtransOrderId: order.midtransOrderId,
    midtransTransactionId: order.midtransTransactionId,
    midtransPaymentType: order.midtransPaymentType,
    midtransVaNumber: order.midtransVaNumber,
    midtransIssuer: order.midtransIssuer,
    midtransPdfUrl: order.midtransPdfUrl,
    midtransStatusCode: order.midtransStatusCode,
    midtransGrossAmount: order.midtransGrossAmount
      ? Number(order.midtransGrossAmount)
      : null,
    paidAt: order.paidAt?.toISOString() ?? null,
    midtransTransactionTime: order.midtransTransactionTime?.toISOString() ?? null,
    midtransSettlementTime: order.midtransSettlementTime?.toISOString() ?? null,
    midtransLastWebhookAt: order.midtransLastWebhookAt?.toISOString() ?? null,
    hasSnapToken: Boolean(order.midtransSnapToken),
    subtotal: Number(order.subtotalProduk),
    ongkir: Number(order.ongkir),
    total: Number(order.totalBayar),
    buyerName: order.buyerName,
    buyerPhone: order.buyerPhone,
    buyerEmail: order.buyerEmail,
    // Expiry info
    expiredAt: expiredAt.toISOString(),
    secondsUntilExpiry,
    isExpired,
    // Last updated (untuk deteksi webhook sudah update atau belum)
    updatedAt: order.updatedAt.toISOString(),
    createdAt: order.createdAt.toISOString(),
  })
}

