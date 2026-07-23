import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'
import {
  addProductStock,
  reduceProductStock,
  recordBankSampahKas,
} from '@/lib/business'
import { verifyMidtransSignature } from '@/lib/midtrans'
import { logWebhook } from '@/lib/logger'

// =====================================================================
// POST /api/payment/callback
// ---------------------------------------------------------------------
// Midtrans webhook receiver. Steps:
//   1. Parse body (typed, no `any`)
//   2. Verify signature_key = SHA512(order_id + status_code + gross_amount + serverKey)
//   3. Find order by midtransOrderId OR orderNumber
//   4. Idempotency: skip processing if same status already applied
//   5. Map transaction_status → paymentStatus & orderStatus:
//        pending            → Pending
//        settlement         → Lunas
//        capture (accept)   → Lunas
//        capture (challenge)→ Pending
//        deny               → Gagal
//        cancel             → Gagal
//        expire             → Expired
//        refund             → Gagal (with note)
//   6. Update order: status, paymentType, vaNumber, issuer, pdfUrl,
//      transactionId, grossAmount, paidAt, settlementTime, rawCallback
//   7. On settlement: convert reserved stock → real sale + record kas
//   8. On failure/expire: release reserved stock
//   9. Always create TokoOrderStatusHistory row for audit trail
//  10. Return 200 { status: 'ok' } (Midtrans expects 2xx)
// =====================================================================

// Typed callback body — only fields we actually read
interface MidtransCallbackBody {
  transaction_status: string
  status_code?: string
  status_message?: string
  transaction_id?: string
  order_id: string
  merchant_id?: string
  gross_amount?: string
  currency?: string
  payment_type?: string
  transaction_time?: string
  settlement_time?: string
  fraud_status?: string
  signature_key?: string
  approval_code?: string
  // Payment-method-specific fields
  permata_va_number?: string
  va_numbers?: Array<{ bank: string; va_number: string }>
  bill_key?: string
  biller_code?: string
  store?: string
  payment_code?: string
  pdf_url?: string
  finish_redirect_url?: string
  refund_amount?: string
}

// Map Midtrans transaction_status + fraud_status → internal statuses
interface StatusMapping {
  paymentStatus: string
  orderStatus: string
  keterangan: string
  isPaid: boolean
  isFailed: boolean
}

function mapStatus(
  transactionStatus: string,
  fraudStatus?: string
): StatusMapping {
  const ts = transactionStatus.toLowerCase()

  if (ts === 'settlement') {
    return {
      paymentStatus: 'dibayar',
      orderStatus: 'dibayar',
      keterangan: 'Pembayaran berhasil (settlement)',
      isPaid: true,
      isFailed: false,
    }
  }

  if (ts === 'capture') {
    // For credit_card, fraud_status determines whether to accept or challenge
    if (fraudStatus === 'accept' || !fraudStatus) {
      return {
        paymentStatus: 'dibayar',
        orderStatus: 'dibayar',
        keterangan: 'Pembayaran berhasil (capture)',
        isPaid: true,
        isFailed: false,
      }
    }
    if (fraudStatus === 'challenge') {
      return {
        paymentStatus: 'menunggu',
        orderStatus: 'menunggu_pembayaran',
        keterangan: 'Pembayaran di-challenge, menunggu review Midtrans',
        isPaid: false,
        isFailed: false,
      }
    }
    // deny fraud
    return {
      paymentStatus: 'gagal',
      orderStatus: 'dibatalkan',
      keterangan: 'Pembayaran ditolak (fraud deny)',
      isPaid: false,
      isFailed: true,
    }
  }

  if (ts === 'pending') {
    return {
      paymentStatus: 'menunggu',
      orderStatus: 'menunggu_pembayaran',
      keterangan: 'Menunggu pembayaran',
      isPaid: false,
      isFailed: false,
    }
  }

  if (ts === 'expire') {
    return {
      paymentStatus: 'expired',
      orderStatus: 'expired',
      keterangan: 'Pembayaran expired (tidak dibayar dalam waktu yang ditentukan)',
      isPaid: false,
      isFailed: true,
    }
  }

  if (ts === 'cancel' || ts === 'deny') {
    return {
      paymentStatus: 'gagal',
      orderStatus: 'dibatalkan',
      keterangan: `Pembayaran ${ts}`,
      isPaid: false,
      isFailed: true,
    }
  }

  if (ts === 'refund' || ts === 'partial_refund') {
    return {
      paymentStatus: 'gagal',
      orderStatus: 'dibatalkan',
      keterangan: `Pembayaran di-refund (${ts})`,
      isPaid: false,
      isFailed: true,
    }
  }

  // Unknown status — keep order as-is, log for review
  return {
    paymentStatus: 'menunggu',
    orderStatus: 'menunggu_pembayaran',
    keterangan: `Status tidak dikenal: ${transactionStatus}`,
    isPaid: false,
    isFailed: false,
  }
}

// Extract VA / issuer / payment details based on payment_type
interface PaymentDetail {
  vaNumber: string | null
  issuer: string | null
  pdfUrl: string | null
}

function extractPaymentDetail(body: MidtransCallbackBody): PaymentDetail {
  let vaNumber: string | null = null
  let issuer: string | null = null

  if (body.permata_va_number) {
    vaNumber = body.permata_va_number
    issuer = 'permata'
  } else if (Array.isArray(body.va_numbers) && body.va_numbers.length > 0) {
    vaNumber = body.va_numbers[0].va_number
    issuer = body.va_numbers[0].bank
  } else if (body.payment_type === 'echannel') {
    // Mandiri e-channel uses bill_key + biller_code
    if (body.bill_key && body.biller_code) {
      vaNumber = `${body.biller_code} ${body.bill_key}`
      issuer = 'mandiri'
    }
  } else if (body.payment_type === 'cstore') {
    if (body.payment_code) {
      vaNumber = body.payment_code
      issuer = body.store || 'cstore'
    }
  } else if (body.payment_type === 'credit_card' && body.approval_code) {
    vaNumber = body.approval_code
    // No specific issuer field for cards (issuer determined by card number)
  }

  return {
    vaNumber,
    issuer,
    pdfUrl: body.pdf_url ?? null,
  }
}

export async function POST(req: NextRequest) {
  let body: MidtransCallbackBody
  try {
    body = (await req.json()) as MidtransCallbackBody
  } catch {
    logWebhook.error('Invalid JSON body')
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    transaction_status: transactionStatus,
    status_code: statusCode,
    order_id: orderId,
    gross_amount: grossAmount,
    signature_key: signatureKey,
    transaction_id: transactionId,
    payment_type: paymentType,
    transaction_time: transactionTime,
    settlement_time: settlementTime,
    fraud_status: fraudStatus,
  } = body

  logWebhook.info('Webhook received', {
    order_id: orderId,
    transaction_status: transactionStatus,
    payment_type: paymentType,
    status_code: statusCode,
    fraud_status: fraudStatus,
  })
  logWebhook.debug('Webhook raw body', body)

  // 1) Basic validation
  if (!orderId || !transactionStatus) {
    logWebhook.warn('Missing required fields', { orderId, transactionStatus })
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  // 2) Verify signature (only if all 4 fields are present)
  //    Midtrans sends signature_key for most notifications
  if (signatureKey && statusCode && grossAmount) {
    const valid = verifyMidtransSignature({
      orderId,
      statusCode: statusCode,
      grossAmount: grossAmount,
      signatureKey: signatureKey,
    })
    if (!valid) {
      logWebhook.error('Signature verification failed', null, {
        order_id: orderId,
      })
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 }
      )
    }
    logWebhook.info('Signature verified', { order_id: orderId })
  } else {
    logWebhook.warn('Signature not verified — missing fields', {
      order_id: orderId,
      has_signature: Boolean(signatureKey),
      has_status_code: Boolean(statusCode),
      has_gross_amount: Boolean(grossAmount),
    })
  }

  // 3) Find order
  const order = await db.tokoOrder.findFirst({
    where: {
      OR: [{ midtransOrderId: orderId }, { orderNumber: orderId }],
    },
    include: { items: true },
  })
  if (!order) {
    logWebhook.warn('Order not found', { order_id: orderId })
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // 4) Idempotency: if order is already in the target state for this
  //    transaction_status AND we have already received a callback with
  //    the same transaction_id, skip re-processing.
  //    We do this by comparing current midtransTransactionId & paymentStatus.
  const mapping = mapStatus(transactionStatus, fraudStatus)

  if (
    transactionId &&
    order.midtransTransactionId === transactionId &&
    order.paymentStatus === mapping.paymentStatus
  ) {
    logWebhook.info('Idempotent skip — already processed', {
      order_id: orderId,
      transaction_id: transactionId,
      payment_status: mapping.paymentStatus,
    })
    // Still update lastWebhookAt for audit
    await db.tokoOrder.update({
      where: { id: order.id },
      data: { midtransLastWebhookAt: new Date() },
    })
    return NextResponse.json({ status: 'ok', idempotent: true })
  }

  // 5) Extract payment detail (va_number, issuer, pdf_url)
  const paymentDetail = extractPaymentDetail(body)

  // 6) Build update data
  const updateData: Record<string, unknown> = {
    midtransLastWebhookAt: new Date(),
    midtransRawCallback: JSON.stringify(body),
  }

  // Always update payment details & transaction metadata
  if (transactionId) updateData.midtransTransactionId = transactionId
  if (paymentType) updateData.midtransPaymentType = paymentType
  if (paymentDetail.vaNumber !== null) {
    updateData.midtransVaNumber = paymentDetail.vaNumber
  }
  if (paymentDetail.issuer !== null) {
    updateData.midtransIssuer = paymentDetail.issuer
  }
  if (paymentDetail.pdfUrl !== null) {
    updateData.midtransPdfUrl = paymentDetail.pdfUrl
  }
  if (statusCode) updateData.midtransStatusCode = statusCode
  if (grossAmount) updateData.midtransGrossAmount = Number(grossAmount) || 0
  if (transactionTime) {
    updateData.midtransTransactionTime = new Date(transactionTime)
  }
  if (settlementTime && mapping.isPaid) {
    updateData.midtransSettlementTime = new Date(settlementTime)
  }

  // Update payment & order status if changed
  if (mapping.paymentStatus !== order.paymentStatus) {
    updateData.paymentStatus = mapping.paymentStatus
  }
  if (mapping.orderStatus !== order.orderStatus) {
    updateData.orderStatus = mapping.orderStatus
  }

  // Set paidAt on settlement/capture
  if (mapping.isPaid && !order.paidAt) {
    updateData.paidAt = new Date()
  }

  // 7) Apply the update
  await db.tokoOrder.update({
    where: { id: order.id },
    data: updateData,
  })

  logWebhook.info('Order updated', {
    order_id: orderId,
    payment_status: mapping.paymentStatus,
    order_status: mapping.orderStatus,
    transaction_id: transactionId,
    payment_type: paymentType,
    is_paid: mapping.isPaid,
  })

  // 8) Create status history
  await db.tokoOrderStatusHistory.create({
    data: {
      tokoOrderId: order.id,
      status: mapping.orderStatus,
      keterangan: mapping.keterangan,
    },
  })

  // 9) On settlement: convert reserved stock → real sale + record kas
  if (mapping.isPaid) {
    for (const item of order.items) {
      const qty = toNumber(item.quantity)
      // Release the reserve first
      await addProductStock(
        item.productId,
        qty,
        'online_release',
        'toko_order',
        order.id,
        undefined,
        `Konfirmasi pesanan ${order.orderNumber}`
      )
      // Then reduce as real sale
      await reduceProductStock(
        item.productId,
        qty,
        'online_sale',
        'toko_order',
        order.id,
        undefined,
        `Penjualan online ${order.orderNumber}`
      )
    }

    // Record kas masuk
    try {
      await recordBankSampahKas(
        'masuk',
        'penjualan_produk',
        toNumber(order.totalBayar),
        `Penjualan online ${order.orderNumber}`,
        undefined,
        undefined
      )
    } catch (e) {
      logWebhook.error('Failed to record kas from online sale', e, {
        order_id: orderId,
      })
    }

    // Create ProductSale record for unified reporting
    try {
      await db.productSale.create({
        data: {
          buyerName: order.buyerName,
          buyerPhone: order.buyerPhone,
          paymentMethod: 'midtrans',
          paymentStatus: 'paid',
          totalQuantity: order.items.reduce(
            (sum, i) => sum + toNumber(i.quantity),
            0
          ),
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
    } catch (e) {
      logWebhook.error('Failed to create ProductSale record', e, {
        order_id: orderId,
      })
    }
  }

  // 10) On failure/expire: release reserved stock (only if still reserved)
  if (mapping.isFailed && order.paymentStatus === 'menunggu') {
    for (const item of order.items) {
      const qty = toNumber(item.quantity)
      await addProductStock(
        item.productId,
        qty,
        'online_release',
        'toko_order',
        order.id,
        undefined,
        `Pembatalan pesanan ${order.orderNumber}`
      )
    }
  }

  logWebhook.info('Webhook processed', {
    order_id: orderId,
    final_payment_status: mapping.paymentStatus,
    final_order_status: mapping.orderStatus,
  })

  return NextResponse.json({ status: 'ok' })
}
