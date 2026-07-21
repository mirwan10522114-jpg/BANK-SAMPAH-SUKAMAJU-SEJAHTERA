import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/payment/status?orderId=TKO-...
// Returns the current payment & Midtrans fields stored on the order.
// Useful for polling order status after Snap popup closes (the actual
// status update happens asynchronously via the Midtrans webhook).
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
      totalBayar: true,
      subtotalProduk: true,
      ongkir: true,
    },
  })

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Return as JSON, converting Decimal & Date fields
  return NextResponse.json({
    orderNumber: order.orderNumber,
    paymentStatus: order.paymentStatus,
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
    subtotal: Number(order.subtotalProduk),
    ongkir: Number(order.ongkir),
    total: Number(order.totalBayar),
  })
}
