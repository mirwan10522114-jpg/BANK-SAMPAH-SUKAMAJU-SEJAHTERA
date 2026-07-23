// Test Midtrans Snap token creation with real sandbox credentials
import { createSnapToken, verifyMidtransSignature } from '../src/lib/midtrans'

async function main() {
  console.log('Test 1: Create Snap Token')
  const result = await createSnapToken({
    orderId: `TEST-SNAP-${Date.now()}`,
    grossAmount: 100000, // Rp 100.000
    customerDetails: {
      first_name: 'Test Buyer',
      email: 'test@example.com',
      phone: '081234567890',
    },
    itemDetails: [
      {
        id: 'ITEM-001',
        name: 'Paving Block Daur Ulang',
        price: 85000,
        quantity: 1,
        category: 'Daur Ulang Plastik',
      },
      {
        id: 'SHIPPING',
        name: 'Ongkir (POS Reguler)',
        price: 15000,
        quantity: 1,
        category: 'Shipping',
      },
    ],
  })
  console.log('Token:', result.token)
  console.log('Redirect URL:', result.redirectUrl)

  console.log('\nTest 2: Verify Signature (valid)')
  // Test signature: SHA512(order_id + status_code + gross_amount + serverKey)
  // For order_id=TEST-SIG-001, status_code=200, gross_amount=100000.00
  // Use real server key
  const crypto = await import('crypto')
  const orderId = 'TEST-SIG-001'
  const statusCode = '200'
  const grossAmount = '100000.00'
  const serverKey = process.env.MIDTRANS_SERVER_KEY || ''
  const expectedSig = crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex')
  const isValid = verifyMidtransSignature({
    orderId,
    statusCode,
    grossAmount,
    signatureKey: expectedSig,
  })
  console.log('Valid signature check:', isValid)

  console.log('\nTest 3: Verify Signature (invalid)')
  const isInvalid = verifyMidtransSignature({
    orderId,
    statusCode,
    grossAmount,
    signatureKey: 'invalid-signature-xxx',
  })
  console.log('Invalid signature check (should be false):', isInvalid)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Test failed:', e)
    process.exit(1)
  })
