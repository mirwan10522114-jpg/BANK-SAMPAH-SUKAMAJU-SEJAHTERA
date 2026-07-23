// Test all transaction_status scenarios
import crypto from 'crypto'

async function main() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || ''
  const { db } = await import('../src/lib/db')

  const scenarios = [
    { name: 'pending', transactionStatus: 'pending', expectedPayment: 'menunggu' },
    { name: 'expire', transactionStatus: 'expire', expectedPayment: 'expired' },
    { name: 'cancel', transactionStatus: 'cancel', expectedPayment: 'gagal' },
    { name: 'deny', transactionStatus: 'deny', expectedPayment: 'gagal' },
  ]

  for (const scenario of scenarios) {
    console.log(`\n=== Test: ${scenario.name} ===`)

    // Create a fresh order for each scenario
    const orderNumber = `TEST-${scenario.name.toUpperCase()}-${Date.now()}`
    const midtransOrderId = `MIDTRANS-${orderNumber}`
    const grossAmount = 5000
    const grossAmountStr = grossAmount.toFixed(2)
    const statusCode = '201'

    const order = await db.tokoOrder.create({
      data: {
        orderNumber,
        midtransOrderId,
        buyerName: 'Test User',
        buyerPhone: '081234567890',
        buyerAddress: '{}',
        subtotalProduk: grossAmount,
        ongkir: 0,
        totalBayar: grossAmount,
        paymentMethod: 'midtrans',
        paymentStatus: 'menunggu',
        orderStatus: 'menunggu_pembayaran',
      },
    })

    const signature = crypto
      .createHash('sha512')
      .update(`${midtransOrderId}${statusCode}${grossAmountStr}${serverKey}`)
      .digest('hex')

    const body = {
      transaction_status: scenario.transactionStatus,
      transaction_id: `tx-${scenario.name}-${Date.now()}`,
      status_code: statusCode,
      order_id: midtransOrderId,
      gross_amount: grossAmountStr,
      signature_key: signature,
      payment_type: 'bank_transfer',
      transaction_time: new Date().toISOString(),
    }

    const res = await fetch('http://localhost:3000/api/payment/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const text = await res.text()
    console.log(`HTTP ${res.status}: ${text}`)

    const updated = await db.tokoOrder.findUnique({
      where: { id: order.id },
      select: { paymentStatus: true, orderStatus: true },
    })
    console.log(`DB → paymentStatus: ${updated?.paymentStatus}, orderStatus: ${updated?.orderStatus}`)

    const expected = scenario.expectedPayment
    const passed = updated?.paymentStatus === expected
    console.log(`Expected: ${expected} → ${passed ? '✓ PASS' : '✗ FAIL'}`)

    // Cleanup
    await db.tokoOrder.delete({ where: { id: order.id } }).catch(() => {})
  }

  await db.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
