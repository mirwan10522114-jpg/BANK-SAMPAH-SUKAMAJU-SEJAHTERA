import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'
import { createSnapToken, type MidtransCustomerDetails, type MidtransItemDetail } from '@/lib/midtrans'
import { logCheckout } from '@/lib/logger'

// =====================================================================
// POST /api/payment/retry
// ---------------------------------------------------------------------
// Regenerates Snap token untuk order yang sudah expired atau masih pending.
// User wajib pakai endpoint ini kalau popup Snap expired — TIDAK boleh
// "konfirmasi manual" yang bypass Midtrans.
//
// Flow:
//   1. Cari order by orderNumber
//   2. Validasi: order harus ada & status payment = menunggu/expired
//   3. Buat midtransOrderId baru (unique) untuk hindari bentrok
//   4. Buat Snap token baru dengan gross_amount = order.totalBayar
//   5. Update order: midtransOrderId baru, midtransSnapToken baru,
//      reset paymentStatus → 'menunggu', orderStatus → 'menunggu_pembayaran'
//   6. Return { snapToken, redirectUrl, midtransOrderId, grossAmount }
//
// Body: { orderNumber: string }
// =====================================================================

const BodySchema = z.object({
  orderNumber: z.string().min(1, 'Order number wajib'),
})

function generateMidtransOrderId(orderNumber: string): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 6)
  return `MID-${orderNumber}-${ts}${rand}`.toUpperCase()
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json()
    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Order number wajib' },
        { status: 400 }
      )
    }
    const { orderNumber } = parsed.data

    const order = await db.tokoOrder.findFirst({
      where: { orderNumber },
      include: { items: true },
    })
    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
    }

    // Validasi status — hanya boleh retry kalau belum dibayar
    if (order.paymentStatus === 'dibayar') {
      return NextResponse.json(
        {
          error: 'Pesanan sudah dibayar, tidak perlu retry pembayaran',
          paymentStatus: order.paymentStatus,
        },
        { status: 400 }
      )
    }

    // Reset status ke menunggu kalau sebelumnya expired/gagal
    const needReset = ['expired', 'gagal', 'dibatalkan'].includes(order.paymentStatus)
    if (needReset) {
      logCheckout.info('Reset order status for retry', {
        orderNumber,
        previousStatus: order.paymentStatus,
      })
    }

    // Generate new midtransOrderId (unique)
    const newMidtransOrderId = generateMidtransOrderId(orderNumber)

    // Build customer details
    let addressObj: { address?: string; city?: string; postalCode?: string; province?: string; district?: string } = {}
    try {
      addressObj = JSON.parse(order.buyerAddress)
    } catch {}

    const customerDetails: MidtransCustomerDetails = {
      first_name: order.buyerName,
      email: order.buyerEmail || undefined,
      phone: order.buyerPhone,
      billing_address: {
        address: addressObj.address || '',
        city: addressObj.city || '',
        postal_code: addressObj.postalCode || '',
        country_code: 'IDN',
      },
      shipping_address: {
        address: addressObj.address || '',
        city: addressObj.city || '',
        postal_code: addressObj.postalCode || '',
        country_code: 'IDN',
      },
    }

    // Build item details from snapshot
    const itemDetails: MidtransItemDetail[] = order.items.map((it, idx) => ({
      id: `ITEM-${idx + 1}`,
      name: it.productNameSnapshot.slice(0, 50),
      price: toNumber(it.pricePerUnitSnapshot),
      quantity: Number(it.quantity) || 1,
      category: 'Product',
    }))
    const ongkir = toNumber(order.ongkir)
    if (ongkir > 0) {
      itemDetails.push({
        id: 'SHIPPING',
        name: 'Ongkir',
        price: ongkir,
        quantity: 1,
        category: 'Shipping',
      })
    }

    // Create new Snap token with same gross_amount
    const grossAmount = toNumber(order.totalBayar)
    const snap = await createSnapToken({
      orderId: newMidtransOrderId,
      grossAmount,
      customerDetails,
      itemDetails,
    })

    // Update order: new midtransOrderId + snapToken + reset status
    await db.tokoOrder.update({
      where: { id: order.id },
      data: {
        midtransOrderId: newMidtransOrderId,
        midtransSnapToken: snap.token,
        paymentStatus: 'menunggu',
        orderStatus: 'menunggu_pembayaran',
        // Reset Midtrans transaction fields (akan diisi ulang oleh webhook)
        midtransTransactionId: null,
        midtransPaymentType: null,
        midtransVaNumber: null,
        midtransIssuer: null,
        midtransPdfUrl: null,
        midtransStatusCode: null,
        midtransGrossAmount: null,
        midtransSettlementTime: null,
        paidAt: null,
      },
    })

    // Add status history
    await db.tokoOrderStatusHistory.create({
      data: {
        tokoOrderId: order.id,
        status: 'menunggu_pembayaran',
        keterangan: `Retry pembayaran — Snap token baru dibuat (${newMidtransOrderId})`,
      },
    })

    logCheckout.info('Payment retried with new Snap token', {
      orderNumber,
      newMidtransOrderId,
      grossAmount,
    })

    return NextResponse.json({
      orderNumber: order.orderNumber,
      midtransOrderId: newMidtransOrderId,
      snapToken: snap.token,
      redirectUrl: snap.redirectUrl,
      grossAmount,
      message: 'Token pembayaran baru berhasil dibuat. Buka popup untuk membayar.',
    })
  } catch (error) {
    logCheckout.error('Payment retry failed', error)
    const message =
      error instanceof Error ? error.message : 'Gagal membuat token pembayaran baru'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
