import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'

// =====================================================================
// POST /api/payment/simulate-webhook  — DEV/TEST ONLY
// ---------------------------------------------------------------------
// Builds a valid Midtrans-style callback body with a correct signature_key
// (computed server-side using MIDTRANS_SERVER_KEY) and forwards it to
// the real /api/payment/callback handler. This lets the /simulasi page
// test the full webhook flow without needing the Midtrans dashboard.
//
// ⚠️ NEVER expose this in production. It bypasses the "Midtrans is the
// only caller" assumption. For prod, this route should be disabled.
// =====================================================================

const BodySchema = z.object({
  midtransOrderId: z.string().min(1),
  transactionStatus: z.enum([
    'settlement',
    'capture',
    'pending',
    'expire',
    'cancel',
    'deny',
    'refund',
  ]),
  paymentType: z.string().default('bank_transfer'),
  vaNumber: z.string().optional(),
  issuer: z.string().optional(),
  fraudStatus: z.enum(['accept', 'challenge', 'deny']).default('accept'),
})

export async function POST(req: NextRequest) {
  // Disable in production for safety
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Simulate endpoint disabled in production' },
      { status: 403 }
    )
  }

  const raw = await req.json()
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.issues },
      { status: 400 }
    )
  }
  const body = parsed.data

  const serverKey = process.env.MIDTRANS_SERVER_KEY
  if (!serverKey) {
    return NextResponse.json(
      { error: 'MIDTRANS_SERVER_KEY not configured' },
      { status: 500 }
    )
  }

  // Find the order to get the gross_amount
  // Use db directly to avoid circular imports
  const { db } = await import('@/lib/db')
  const order = await db.tokoOrder.findFirst({
    where: { midtransOrderId: body.midtransOrderId },
    select: { id: true, totalBayar: true, midtransOrderId: true },
  })
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const grossAmountStr = Number(order.totalBayar).toFixed(2)
  const statusCode = body.transactionStatus === 'pending' ? '201' : '200'
  const transactionId = `sim-${body.transactionStatus}-${Date.now()}`

  // Compute valid signature
  const signature = crypto
    .createHash('sha512')
    .update(`${body.midtransOrderId}${statusCode}${grossAmountStr}${serverKey}`)
    .digest('hex')

  // Build Midtrans-style body
  const callbackBody: Record<string, unknown> = {
    transaction_time: new Date().toISOString().replace('T', ' ').slice(0, 19),
    transaction_status: body.transactionStatus,
    transaction_id: transactionId,
    status_code: statusCode,
    signature_key: signature,
    payment_type: body.paymentType,
    order_id: body.midtransOrderId,
    merchant_id: process.env.MIDTRANS_MERCHANT_ID,
    gross_amount: grossAmountStr,
    currency: 'IDR',
    fraud_status: body.fraudStatus,
  }

  // Add payment method specific fields
  if (body.paymentType === 'bank_transfer' && body.vaNumber && body.issuer) {
    callbackBody.va_numbers = [{ bank: body.issuer, va_number: body.vaNumber }]
  }
  if (body.paymentType === 'echannel' && body.vaNumber) {
    callbackBody.bill_key = '1234567890'
    callbackBody.biller_code = '70012'
  }
  if (body.transactionStatus === 'settlement') {
    callbackBody.settlement_time = new Date()
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19)
    callbackBody.pdf_url = `https://app.sandbox.midtrans.com/pdf/sim-${transactionId}.pdf`
  }

  // Forward to the real callback handler
  const base = req.nextUrl.origin
  const webhookRes = await fetch(`${base}/api/payment/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(callbackBody),
  })
  const webhookText = await webhookRes.text()

  return NextResponse.json({
    simulated: true,
    transaction_status: body.transactionStatus,
    transaction_id: transactionId,
    signature_computed: true,
    webhook_status: webhookRes.status,
    webhook_response: webhookText,
  })
}
