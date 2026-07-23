import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { reduceProductStock, recordBankSampahKas } from '@/lib/business'
import { toNumber } from '@/lib/format'
import { getRajaOngkirRates } from '@/lib/rajaongkir'

// Generate order number: TKO-YYYYMMDD-XXXX
async function generateOrderNumber(): Promise<string> {
  const now = new Date()
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const prefix = `TKO-${ymd}-`

  const lastOrder = await db.tokoOrder.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    select: { orderNumber: true },
    orderBy: { orderNumber: 'desc' },
  })

  let seq = 1
  if (lastOrder) {
    const m = lastOrder.orderNumber.replace(prefix, '').match(/^0*(\d+)/)
    if (m) seq = parseInt(m[1], 10) + 1
  }

  return `${prefix}${String(seq).padStart(4, '0')}`
}

// Fallback ongkir calculator using old TokoSetting formula.
// Used when RajaOngkir is not configured / fails / missing fields.
function fallbackOngkirBySetting(
  setting: any,
  totalWeightGram: number,
  jarakKm?: number
): number {
  const ratePerKg = toNumber(setting.ongkirRatePerKg)
  const ratePerKm = toNumber(setting.ongkirRatePerKm)
  const ongkirTetap = toNumber(setting.ongkirTetap)
  const beratMinKg = toNumber(setting.beratMinimumKg) || 1

  if (ratePerKg > 0) {
    return Math.ceil(totalWeightGram / 1000 / beratMinKg) * ratePerKg
  }
  if (ratePerKm > 0 && jarakKm && jarakKm > 0) {
    return jarakKm * ratePerKm
  }
  if (ongkirTetap > 0) {
    return ongkirTetap
  }
  // Last-resort default supaya toko tetap bisa terima order
  return 15000
}

// POST: Create order + generate Midtrans snap token
export async function POST(req: NextRequest) {
  const body = await req.json()

  // Support both flat and nested (buyer/shipping) request formats
  let items: { productId: string; quantity: number }[]
  let buyerName: string
  let buyerPhone: string
  let buyerEmail: string | undefined
  let buyerAddress: string
  let jarakKm: number | undefined

  if (body.buyer && body.shipping) {
    // Nested format from merchandise frontend
    items = body.items
    buyerName = body.buyer.name
    buyerPhone = body.buyer.phone
    buyerEmail = body.buyer.email || undefined
    buyerAddress = JSON.stringify(body.shipping)
  } else {
    // Flat format
    items = body.items
    buyerName = body.buyerName
    buyerPhone = body.buyerPhone
    buyerEmail = body.buyerEmail
    buyerAddress = body.buyerAddress
    jarakKm = body.jarakKm
  }

  if (!items?.length) return NextResponse.json({ error: 'Minimal 1 item' }, { status: 400 })
  if (!buyerName || !buyerPhone) return NextResponse.json({ error: 'Nama & telepon pembeli wajib' }, { status: 400 })
  if (!buyerAddress) return NextResponse.json({ error: 'Alamat pengiriman wajib' }, { status: 400 })

  // Parse and validate buyerAddress
  let addressObj: any
  try {
    addressObj = typeof buyerAddress === 'string' ? JSON.parse(buyerAddress) : buyerAddress
  } catch {
    return NextResponse.json({ error: 'Format alamat tidak valid' }, { status: 400 })
  }

  // Field RajaOngkir: prioritas dari payload shipping (nested format dari frontend),
  // fallback ke flat format lama.
  const roDistrictId: string =
    (addressObj.districtId as string) || (body.shipping?.districtId as string) || ''
  const roDistrictName: string =
    (addressObj.district as string) || (addressObj.districtName as string) || ''
  const roCityName: string =
    (addressObj.city as string) || (addressObj.cityName as string) || ''

  // Check TokoSetting
  const setting = await db.tokoSetting.findFirst()
  if (!setting) {
    return NextResponse.json({ error: 'Pengaturan toko belum dikonfigurasi' }, { status: 400 })
  }
  if (!setting.tokoOnlineAktif) {
    return NextResponse.json({ error: 'Toko online sedang tidak aktif' }, { status: 503 })
  }

  // Fetch products
  const productIds = items.map((i) => i.productId)
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    include: { category: true },
  })

  // Validate products
  for (const item of items) {
    const product = products.find((p) => p.id === item.productId)
    if (!product) return NextResponse.json({ error: `Produk ${item.productId} tidak ditemukan` }, { status: 400 })
    if (!product.dijualOnline) return NextResponse.json({ error: `Produk "${product.name}" tidak dijual online` }, { status: 400 })
    if (!product.isActive) return NextResponse.json({ error: `Produk "${product.name}" tidak aktif` }, { status: 400 })
    if (toNumber(product.stock) < item.quantity) {
      return NextResponse.json({ error: `Stok "${product.name}" tidak mencukupi (tersedia: ${product.stock})` }, { status: 400 })
    }
    if (item.quantity < product.minOrderQty) {
      return NextResponse.json({ error: `Minimal pembelian "${product.name}" adalah ${product.minOrderQty}` }, { status: 400 })
    }
    if (product.maxOrderQty > 0 && item.quantity > product.maxOrderQty) {
      return NextResponse.json({ error: `Maksimal pembelian "${product.name}" adalah ${product.maxOrderQty}` }, { status: 400 })
    }
  }

  // Calculate subtotal and total weight
  let subtotalProduk = 0
  let totalWeightGram = 0
  const orderItems = items.map((item) => {
    const product = products.find((p) => p.id === item.productId)!
    const price = toNumber(product.price)
    const qty = item.quantity
    const subtotal = price * qty
    subtotalProduk += subtotal
    totalWeightGram += (product.weightGram || 0) * qty
    return {
      productId: product.id,
      productNameSnapshot: product.name,
      unitSnapshot: product.unit,
      pricePerUnitSnapshot: price,
      quantity: qty,
      weightGramSnapshot: product.weightGram || 0,
      subtotal,
    }
  })

  // Calculate ongkir via RajaOngkir (with safe fallback to TokoSetting formula).
  // Sama persis dengan yang dipakai /api/shipping/cost → konsistensi estimasi
  // frontend vs totalBayar backend terjamin.
  let ongkir = 0
  let ongkirSource: 'rajaongkir' | 'fallback' = 'fallback'

  if (roDistrictId && roDistrictName && roCityName) {
    try {
      const roResult = await getRajaOngkirRates({
        districtId: roDistrictId,
        districtName: roDistrictName,
        cityName: roCityName,
        totalWeightGram,
      })
      ongkir = roResult.cheapestCost
      ongkirSource = roResult.source
    } catch (e: any) {
      console.warn(
        `[toko/checkout] getRajaOngkirRates failed, fallback to TokoSetting: ${e?.message || e}`
      )
      ongkir = fallbackOngkirBySetting(setting, totalWeightGram)
      ongkirSource = 'fallback'
    }
  } else {
    // Field RajaOngkir tidak lengkap di payload → pakai formula lama.
    // Jangan tolak order cuma karena field baru belum ada — toko tetap jalan.
    ongkir = fallbackOngkirBySetting(setting, totalWeightGram, jarakKm)
    ongkirSource = 'fallback'
  }

  const totalBayar = subtotalProduk + ongkir
  const orderNumber = await generateOrderNumber()

  // Generate midtransOrderId
  const midtransOrderId = `MIDTRANS-${orderNumber}`

  // Create order
  const order = await db.tokoOrder.create({
    data: {
      orderNumber,
      buyerName,
      buyerPhone,
      buyerEmail: buyerEmail || null,
      buyerAddress: JSON.stringify(addressObj),
      subtotalProduk,
      ongkir,
      totalBayar,
      paymentMethod: 'midtrans',
      paymentStatus: 'menunggu',
      orderStatus: 'menunggu_pembayaran',
      midtransOrderId,
      // Catat sumber ongkir di notes untuk audit/debugging
      notes: `ongkir_source=${ongkirSource}`,
      items: { create: orderItems },
    },
    include: { items: true },
  })

  // Reserve stock
  for (const item of items) {
    try {
      await reduceProductStock(item.productId, item.quantity, 'online_reserve', 'toko_order', order.id, undefined, `Reservasi pesanan ${orderNumber}`)
    } catch (e: any) {
      return NextResponse.json({ error: `Gagal reservasi stok: ${e.message}` }, { status: 400 })
    }
  }

  // Create initial status history
  await db.tokoOrderStatusHistory.create({
    data: {
      tokoOrderId: order.id,
      status: 'menunggu_pembayaran',
      keterangan: 'Pesanan dibuat, menunggu pembayaran',
    },
  })

  // Generate Midtrans snap token (or mock)
  let snapToken: string | null = null
  const midtransServerKey = setting.midtransServerKey
  const midtransClientKey = setting.midtransClientKey

  if (midtransServerKey && midtransClientKey) {
    try {
      // Real Midtrans API call
      const midtransBaseUrl = setting.midtransIsProduction
        ? 'https://app.midtrans.com/snap/v1/transactions'
        : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

      const authBuffer = Buffer.from(`${midtransServerKey}:`).toString('base64')

      const midtransRes = await fetch(midtransBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Basic ${authBuffer}`,
        },
        body: JSON.stringify({
          transaction_details: {
            order_id: midtransOrderId,
            gross_amount: totalBayar,
          },
          customer_details: {
            first_name: buyerName,
            email: buyerEmail || '',
            phone: buyerPhone,
            billing_address: {
              address: addressObj.detailAlamat || '',
              city: addressObj.kota || '',
              postal_code: addressObj.kodePos || '',
            },
            shipping_address: {
              address: addressObj.detailAlamat || '',
              city: addressObj.kota || '',
              postal_code: addressObj.kodePos || '',
            },
          },
          callbacks: {
            finish: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/toko/payment/finish`,
            error: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/toko/payment/error`,
            pending: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/toko/payment/pending`,
          },
        }),
      })

      if (midtransRes.ok) {
        const midtransData = await midtransRes.json()
        snapToken = midtransData.token
        await db.tokoOrder.update({
          where: { id: order.id },
          data: { midtransSnapToken: snapToken },
        })
      }
    } catch (e) {
      console.error('Midtrans API error, falling back to manual:', e)
    }
  }

  // If no snap token, fallback to manual payment
  if (!snapToken) {
    await db.tokoOrder.update({
      where: { id: order.id },
      data: { paymentMethod: 'manual' },
    })
    order.paymentMethod = 'manual'
  }

  return NextResponse.json({
    order,
    snapToken,
    paymentMethod: order.paymentMethod,
  }, { status: 201 })
}