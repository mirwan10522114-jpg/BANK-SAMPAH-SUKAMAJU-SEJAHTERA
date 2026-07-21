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

  const order = await db.tokoOrder.findFirst({
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
    },
  })

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Hitung expiry: Midtrans Snap setting = 5 menit dari updatedAt
  // (updatedAt = waktu terakhir kali Snap token di-create/regenerate)
  const EXPIRY_MINUTES = 5
  const expiredAt = new Date(
    order.updatedAt.getTime() + EXPIRY_MINUTES * 60 * 1000
  )
  const now = new Date()
  const secondsUntilExpiry = Math.max(
    0,
    Math.floor((expiredAt.getTime() - now.getTime()) / 1000)
  )
  const isExpired =
    order.paymentStatus === 'menunggu' && secondsUntilExpiry === 0

  // Jika seharusnya expired tapi status DB belum diupdate, beri flag
  // supaya frontend bisa tahu & tampilkan tombol "Bayar Ulang"
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

