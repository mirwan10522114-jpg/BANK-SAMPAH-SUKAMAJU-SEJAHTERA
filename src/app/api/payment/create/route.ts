import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'
import { getRajaOngkirRates } from '@/lib/rajaongkir'
import {
  createSnapToken,
  isMidtransConfigured,
  type MidtransCustomerDetails,
  type MidtransItemDetail,
} from '@/lib/midtrans'
import { logCheckout } from '@/lib/logger'
import { reduceProductStock } from '@/lib/business'

// =====================================================================
// POST /api/payment/create
// ---------------------------------------------------------------------
// Body:
//   items:    Array<{ produkId: string; quantity: number }>
//   buyer:    { name: string; phone: string; email?: string }
//   shipping: {
//     provinceId, province, cityId, city, districtId, district,
//     postalCode, address
//   }
//
// Steps:
//   1. Validate input (zod, no `any`)
//   2. Validate TokoSetting exists & tokoOnlineAktif=true
//   3. Validate produks (exist, active, dijualOnline, stock sufficient)
//   4. Compute subtotal + total weight
//   5. Compute ongkir via RajaOngkir (with fallback to TokoSetting)
//   6. grand_total = subtotal + ongkir
//   7. Create PesananToko in DB with status menunggu
//   8. Create Midtrans Snap token with grand_total as gross_amount
//      (NO enabled_payments restriction → all dashboard methods active)
//   9. Save snapToken to PesananToko
//  10. Return { orderId, snapToken, grossAmount, breakdown }
//
// If Midtrans is not configured, return error so caller can fall back
// to manual payment. If RajaOngkir fails, fallback is automatic.
// =====================================================================

// Zod schemas — strict validation, no `any` leaking
const ItemSchema = z.object({
  produkId: z.string().min(1),
  quantity: z.number().int().positive(),
})

const BuyerSchema = z.object({
  name: z.string().min(1, 'Nama pembeli wajib'),
  // Phone: minimal 6 digit setelah non-digit di-strip (akomodasi +62/08/021)
  // Format Indonesia umumnya 10-15 digit, tapi kita longgarkan untuk testing
  phone: z
    .string()
    .min(1, 'No. HP wajib diisi')
    .refine(
      (val) => val.replace(/\D/g, '').length >= 6,
      'No. HP minimal 6 digit'
    ),
  email: z.string().email('Format email tidak valid').optional(),
})

const ShippingSchema = z.object({
  provinceId: z.string().optional(),
  province: z.string().min(1),
  cityId: z.string().optional(),
  city: z.string().min(1),
  districtId: z.string().min(1),
  district: z.string().min(1),
  postalCode: z.string().min(1),
  address: z.string().min(1),
})

const BodySchema = z.object({
  items: z.array(ItemSchema).min(1, 'Minimal 1 item'),
  buyer: BuyerSchema,
  shipping: ShippingSchema,
})

// Generate order number TKO / DDMMYYYY / XXXX
async function generateOrderNumber(): Promise<string> {
  const now = new Date()
  const ddmmyyyy = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`
  const prefix = `TKO / ${ddmmyyyy} / `
  const oldYmd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const oldPrefix = `TKO-${oldYmd}-`
  const last = await db.pesananToko.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    select: { orderNumber: true },
    orderBy: { orderNumber: 'desc' },
  })
  let seq = 1
  if (last) {
    const m = last.orderNumber.replace(prefix, '').match(/^0*(\d+)/)
    if (m) seq = parseInt(m[1], 10) + 1
  } else {
    const oldLast = await db.pesananToko.findFirst({
      where: { orderNumber: { startsWith: oldPrefix } },
      select: { orderNumber: true },
      orderBy: { orderNumber: 'desc' },
    })
    if (oldLast) {
      const m = oldLast.orderNumber.replace(oldPrefix, '').match(/^0*(\d+)/)
      if (m) seq = parseInt(m[1], 10) + 1
    }
  }
  return `${prefix}${String(seq).padStart(4, '0')}`
}

// Generate unique midtransOrderId with timestamp + random suffix.
// Midtrans rejects order_id yang sudah pernah dipakai (bahkan jika order lama
// sudah expired/cancel) — jadi kita TIDAK boleh reuse order_id. Tambah
// suffix unik supaya setiap Snap token benar-benar baru.
function generateMidtransOrderId(orderNumber: string): string {
  const ts = Date.now().toString(36) // short timestamp
  const rand = Math.random().toString(36).slice(2, 6) // 4 char random
  const cleanOrderNumber = orderNumber.replace(/[^a-zA-Z0-9._~-]/g, '')
  return `MID-${cleanOrderNumber}-${ts}${rand}`.toUpperCase()
}

// Extract origin URL dari request headers.
// Cek urutan: Origin header → Referer header → x-forwarded-host → host.
// Ini supaya callback URL Midtrans selalu benar tergantung dari mana pengguna
// akses website (preview URL berbeda-beda, jadi jangan hardcode domain).
function getOriginFromRequest(req: NextRequest): string {
  // 1. Origin header (paling reliable — dikirim browser untuk CORS requests)
  const origin = req.headers.get('origin')
  if (origin) return origin

  // 2. Referer header (biasanya ada untuk navigation requests)
  const referer = req.headers.get('referer')
  if (referer) {
    try {
      const url = new URL(referer)
      return url.origin
    } catch {}
  }

  // 3. x-forwarded-host (kalau di balik proxy/gateway)
  const forwardedHost = req.headers.get('x-forwarded-host')
  const forwardedProto = req.headers.get('x-forwarded-proto') || 'https'
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }

  // 4. Fallback ke host dari request URL
  const host = req.headers.get('host')
  if (host) {
    const proto = host.includes('localhost') ? 'http' : 'https'
    return `${proto}://${host}`
  }

  // 5. Last resort: pakai NEXT_PUBLIC_BASE_URL dari env
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
}

export async function POST(req: NextRequest) {
  try {
    // 1) Parse & validate body
    const raw = await req.json()
    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      logCheckout.warn('Invalid request body', {
        errors: parsed.error.issues,
      })
      return NextResponse.json(
        {
          error: 'Request tidak valid',
          details: parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 }
      )
    }
    const { items, buyer, shipping } = parsed.data

    // 2) Check TokoSetting
    const setting = await db.tokoSetting.findFirst()
    if (!setting) {
      return NextResponse.json(
        { error: 'Pengaturan toko belum dikonfigurasi' },
        { status: 400 }
      )
    }
    if (!setting.tokoOnlineAktif) {
      return NextResponse.json(
        { error: 'Toko online sedang tidak aktif' },
        { status: 503 }
      )
    }

    // 3) Fetch produks & validate
    const productIds = items.map((i) => i.produkId)
    const produks = await db.produk.findMany({
      where: { id: { in: productIds } },
    })

    for (const item of items) {
      const produk = produks.find((p) => p.id === item.produkId)
      if (!produk) {
        return NextResponse.json(
          { error: `Produk ${item.produkId} tidak ditemukan` },
          { status: 400 }
        )
      }
      if (!produk.dijualOnline) {
        return NextResponse.json(
          { error: `Produk "${produk.name}" tidak dijual online` },
          { status: 400 }
        )
      }
      if (!produk.isActive) {
        return NextResponse.json(
          { error: `Produk "${produk.name}" tidak aktif` },
          { status: 400 }
        )
      }
      if (toNumber(produk.stock) < item.quantity) {
        return NextResponse.json(
          { error: `Stok "${produk.name}" tidak mencukupi (tersedia: ${produk.stock})` },
          { status: 400 }
        )
      }
      if (item.quantity < produk.minOrderQty) {
        return NextResponse.json(
          { error: `Minimal pembelian "${produk.name}" adalah ${produk.minOrderQty}` },
          { status: 400 }
        )
      }
      if (produk.maxOrderQty > 0 && item.quantity > produk.maxOrderQty) {
        return NextResponse.json(
          { error: `Maksimal pembelian "${produk.name}" adalah ${produk.maxOrderQty}` },
          { status: 400 }
        )
      }
    }

    // 4) Compute subtotal + total weight
    let subtotalProduk = 0
    let totalWeightGram = 0
    const orderItems = items.map((item) => {
      const produk = produks.find((p) => p.id === item.produkId)!
      const price = toNumber(produk.price)
      const qty = item.quantity
      const subtotal = price * qty
      subtotalProduk += subtotal
      totalWeightGram += (produk.weightGram || 0) * qty
      return {
        produkId: produk.id,
        productNameSnapshot: produk.name,
        unitSnapshot: produk.unit,
        pricePerUnitSnapshot: price,
        quantity: qty,
        weightGramSnapshot: produk.weightGram || 0,
        subtotal,
      }
    })

    // 5) Compute ongkir via RajaOngkir (with fallback)
    const roResult = await getRajaOngkirRates({
      districtId: shipping.districtId,
      districtName: shipping.district,
      cityName: shipping.city,
      totalWeightGram,
    })
    const ongkir = roResult.cheapestCost

    // 6) grand_total = subtotal + ongkir
    const grandTotal = subtotalProduk + ongkir

    const orderNumber = await generateOrderNumber()
    const midtransOrderId = generateMidtransOrderId(orderNumber)

    logCheckout.info('Order created', {
      orderNumber,
      subtotal: subtotalProduk,
      ongkir,
      ongkir_source: roResult.source,
      grand_total: grandTotal,
      item_count: items.length,
    })

    // 7) Create PesananToko in DB
    const order = await db.pesananToko.create({
      data: {
        orderNumber,
        buyerName: buyer.name,
        buyerPhone: buyer.phone,
        buyerEmail: buyer.email || null,
        buyerAddress: JSON.stringify(shipping),
        subtotalProduk,
        ongkir,
        totalBayar: grandTotal,
        paymentMethod: 'midtrans',
        paymentStatus: 'menunggu',
        orderStatus: 'menunggu_pembayaran',
        midtransOrderId,
        notes: `ongkir_source=${roResult.source}`,
        items: { create: orderItems },
      },
      include: { items: true },
    })
    // 7.5) Reserve produk stock (PENTING!)
    // Stok di-reserve saat order dibuat, agar tidak bisa dibeli orang lain
    // saat pengguna masih dalam proses pembayaran.
    // Jika pembayaran gagal/expire, webhook akan release reserve ini.
    // Jika pembayaran sukses (settlement), webhook akan:
    //   1) Release reserve ini
    //   2) Reduce stock sebagai 'online_sale' final
    for (const item of orderItems) {
      try {
        await reduceProductStock(
          item.produkId,
          item.quantity,
          'online_reserve',
          'toko_order',
          order.id,
          undefined,
          `Reservasi pesanan ${orderNumber}`
        )
      } catch (e: any) {
        // Jika stok tidak mencukupi, hapus order yang baru dibuat
        await db.pesananToko.delete({ where: { id: order.id } })
        return NextResponse.json(
          { error: `Gagal reservasi stok: ${e.message}` },
          { status: 400 }
        )
      }
    }

    // 8) Check Midtrans config before creating Snap token
    if (!isMidtransConfigured()) {
      logCheckout.error(
        'Midtrans tidak dikonfigurasi, order tetap dibuat tanpa snap token',
        null,
        { orderNumber }
      )
      return NextResponse.json(
        {
          error:
            'Midtrans belum dikonfigurasi. Isi MIDTRANS_SERVER_KEY & MIDTRANS_CLIENT_KEY di .env.',
          orderId: order.orderNumber,
        },
        { status: 503 }
      )
    }

    // 9) Create Midtrans Snap token
    //    NO enabled_payments restriction → all dashboard methods active
    const customerDetails: MidtransCustomerDetails = {
      first_name: buyer.name,
      email: buyer.email,
      phone: buyer.phone,
      billing_address: {
        address: shipping.address,
        city: shipping.city,
        postal_code: shipping.postalCode,
        country_code: 'IDN',
      },
      shipping_address: {
        address: shipping.address,
        city: shipping.city,
        postal_code: shipping.postalCode,
        country_code: 'IDN',
      },
    }

    const itemDetails: MidtransItemDetail[] = orderItems.map((it, idx) => ({
      id: `ITEM-${idx + 1}`,
      name: it.productNameSnapshot.slice(0, 50),
      price: toNumber(it.pricePerUnitSnapshot),
      quantity: it.quantity,
      category: 'Produk',
    }))
    // Add shipping as a line item so gross_amount breakdown is clear to pengguna
    if (ongkir > 0) {
      itemDetails.push({
        id: 'SHIPPING',
        name: 'Ongkir',
        price: ongkir,
        quantity: 1,
        category: 'Shipping',
      })
    }

    // Generate callback URLs DINAMIS dari request Origin/Referer header.
    // Pakai route "/" dengan query parameter ?payment_return=ORDER_NUMBER
    // (bukan /payment/return terpisah) karena preview environment hanya
    // support route "/". Halaman utama akan detect parameter ini dan
    // tampilkan PaymentReturnView.
    const origin = getOriginFromRequest(req)
    const returnUrl = `${origin}/?payment_return=${orderNumber}`

    const snap = await createSnapToken({
      orderId: midtransOrderId,
      grossAmount: grandTotal,
      customerDetails,
      // Callback URLs — Midtrans akan redirect pengguna ke URL ini setelah
      // pembayaran selesai / pending / error. Halaman return akan poll
      // status dari DB (yang diupdate via webhook) dan tampilkan hasil.
      finishUrl: returnUrl,
      pendingUrl: returnUrl,
      errorUrl: returnUrl,
      itemDetails,
    })

    // 10) Save snap token to order
    await db.pesananToko.update({
      where: { id: order.id },
      data: { midtransSnapToken: snap.token },
    })

    return NextResponse.json(
      {
        orderId: order.orderNumber,
        midtransOrderId,
        snapToken: snap.token,
        redirectUrl: snap.redirectUrl,
        grossAmount: grandTotal,
        breakdown: {
          subtotal: subtotalProduk,
          ongkir,
          ongkirSource: roResult.source,
          ongkirOptions: roResult.options.slice(0, 5).map((o) => ({
            kurir: o.serviceDisplay,
            cost: o.cost,
            etd: o.etd,
          })),
          grandTotal,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    logCheckout.error('Payment create failed', error)
    const message =
      error instanceof Error ? error.message : 'Gagal membuat pembayaran'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
