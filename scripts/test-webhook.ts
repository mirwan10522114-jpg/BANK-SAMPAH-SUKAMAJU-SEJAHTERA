// Test Midtrans webhook callback with valid signature
// Simulates what Midtrans would send when a payment settles
import crypto from 'crypto'

async function main() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || ''
  if (!serverKey) {
    console.error('MIDTRANS_SERVER_KEY not set')
    process.exit(1)
  }

  // Use the most recent order created in the previous test
  const { db } = await import('../src/lib/db')
  const order = await db.tokoOrder.findFirst({
    where: { midtransOrderId: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { midtransOrderId: true, orderNumber: true, totalBayar: true, id: true },
  })
  if (!order) {
    console.error('No order found — create one first via /api/payment/create')
    process.exit(1)
  }
  console.log('Using order:', order.orderNumber, 'midtransOrderId:', order.midtransOrderId)

  // Build a settlement callback body
  const grossAmountStr = Number(order.totalBayar).toFixed(2) // "19000.00"
  const statusCode = '200'
  const orderId = order.midtransOrderId!
  const signature = crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmountStr}${serverKey}`)
    .digest('hex')

  const callbackBody = {
    transaction_time: new Date().toISOString().replace('T', ' ').slice(0, 19),
    transaction_status: 'settlement',
    transaction_id: `settlement-test-${Date.now()}`,
    status_message: 'Settlement successful',
    status_code: statusCode,
    signature_key: signature,
    payment_type: 'bank_transfer',
    order_id: orderId,
    merchant_id: 'M414080779',
    gross_amount: grossAmountStr,
    currency: 'IDR',
    fraud_status: 'accept',
    va_numbers: [{ bank: 'bca', va_number: '12345678901' }],
    pdf_url: 'https://app.sandbox.midtrans.com/pdf/test-invoice.pdf',
    settlement_time: new Date().toISOString().replace('T', ' ').slice(0, 19),
  }

  console.log('\nCalling POST /api/payment/callback with body:')
  console.log(JSON.stringify(callbackBody, null, 2))

  const response = await fetch('http://localhost:3000/api/payment/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(callbackBody),
  })
  const text = await response.text()
  console.log(`\nHTTP ${response.status}`)
  console.log('Response:', text)

  // Verify DB update
  console.log('\n--- Verify DB update ---')
  const updated = await db.tokoOrder.findUnique({
    where: { id: order.id },
    select: {
      orderNumber: true,
      paymentStatus: true,
      orderStatus: true,
      paidAt: true,
      midtransTransactionId: true,
      midtransPaymentType: true,
      midtransVaNumber: true,
      midtransIssuer: true,
      midtransPdfUrl: true,
      midtransStatusCode: true,
      midtransGrossAmount: true,
      midtransSettlementTime: true,
      midtransLastWebhookAt: true,
    },
  })
  console.log(JSON.stringify(updated, null, 2))

  // Test idempotency: call again with same transaction_id
  console.log('\n--- Test idempotency: call webhook again ---')
  const response2 = await fetch('http://localhost:3000/api/payment/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(callbackBody),
  })
  const text2 = await response2.text()
  console.log(`HTTP ${response2.status}`)
  console.log('Response:', text2)

  await db.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
