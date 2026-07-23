import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, addProductStock, reduceProductStock, recordBankSampahKas } from '@/lib/business'
import { toNumber } from '@/lib/format'

// Valid state machine transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  menunggu_pembayaran: ['dibayar', 'diproses', 'dibatalkan'],
  dibayar: ['diproses', 'dibatalkan'],
  diproses: ['dikirim'],
  dikirim: ['diterima'],
  dibatalkan: [],
  expired: [],
  diterima: [],
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status, kurirNama, noResi, keterangan } = body as {
    status: string
    kurirNama?: string
    noResi?: string
    keterangan?: string
  }

  if (!status) return NextResponse.json({ error: 'Status wajib diisi' }, { status: 400 })

  const order = await db.tokoOrder.findUnique({
    where: { id },
    include: { items: true },
  })

  if (!order) return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })

  // Validate transition
  const allowed = VALID_TRANSITIONS[order.orderStatus] || []
  if (!allowed.includes(status)) {
    return NextResponse.json({
      error: `Transisi tidak valid dari "${order.orderStatus}" ke "${status}". Transisi yang diizinkan: ${allowed.join(', ') || 'tidak ada'}`,
    }, { status: 400 })
  }

  // Validate required fields for specific transitions
  if (status === 'dikirim') {
    if (!kurirNama) return NextResponse.json({ error: 'Nama kurir wajib diisi' }, { status: 400 })
    if (!noResi) return NextResponse.json({ error: 'Nomor resi wajib diisi' }, { status: 400 })
  }

  // Build update data
  const updateData: any = { orderStatus: status }
  if (status === 'dikirim') {
    updateData.kurirNama = kurirNama
    updateData.noResi = noResi
    updateData.shippedAt = new Date()
  }
  if (status === 'diterima') {
    updateData.receivedAt = new Date()
  }
  if (status === 'dibatalkan') {
    if (order.paymentStatus === 'menunggu') {
      updateData.paymentStatus = 'dibatalkan'
    }
    // Release reserved stock
    if (order.paymentStatus === 'menunggu') {
      for (const item of order.items) {
        const qty = toNumber(item.quantity)
        await addProductStock(item.productId, qty, 'online_release', 'toko_order', order.id, actor.id, `Pembatalan admin: ${keterangan || ''}`)
      }
    }
  }

  // Handle payment confirmation when admin moves to "dibayar" from "menunggu_pembayaran"
  // This is the case where admin confirms payment received but doesn't start processing yet
  if (status === 'dibayar' && order.paymentStatus !== 'dibayar' && order.orderStatus === 'menunggu_pembayaran') {
    updateData.paymentStatus = 'dibayar'
    updateData.paidAt = new Date()

    // Convert reserved stock to real sale
    for (const item of order.items) {
      const qty = toNumber(item.quantity)
      await addProductStock(item.productId, qty, 'online_release', 'toko_order', order.id, actor.id, `Konfirmasi manual pesanan ${order.orderNumber}`)
      await reduceProductStock(item.productId, qty, 'online_sale', 'toko_order', order.id, actor.id, `Penjualan online ${order.orderNumber}`)
    }

    // Record kas masuk
    try {
      await recordBankSampahKas('masuk', 'penjualan_produk', toNumber(order.totalBayar), `Penjualan online ${order.orderNumber}`, actor.id, undefined)
    } catch (e) {
      console.error('Failed to record kas:', e)
    }

    // Create ProductSale for unified reporting
    const existingSale = await db.productSale.findFirst({ where: { notes: { contains: order.orderNumber } } })
    if (!existingSale) {
      await db.productSale.create({
        data: {
          buyerName: order.buyerName,
          buyerPhone: order.buyerPhone,
          paymentMethod: order.paymentMethod,
          paymentStatus: 'paid',
          totalQuantity: order.items.reduce((sum, i) => sum + toNumber(i.quantity), 0),
          totalValue: toNumber(order.subtotalProduk),
          channel: 'online',
          notes: `Pesanan online ${order.orderNumber} (manual)`,
          createdById: actor.id,
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
    }
  }

  // Handle payment confirmation when admin moves to "diproses" from "menunggu_pembayaran"
  // This covers: manual payment confirm + auto-proses in one step
  if (status === 'diproses' && order.paymentStatus !== 'dibayar' && order.orderStatus === 'menunggu_pembayaran') {
    updateData.paymentStatus = 'dibayar'
    updateData.paidAt = new Date()

    // Convert reserved stock to real sale
    for (const item of order.items) {
      const qty = toNumber(item.quantity)
      await addProductStock(item.productId, qty, 'online_release', 'toko_order', order.id, actor.id, `Konfirmasi manual pesanan ${order.orderNumber}`)
      await reduceProductStock(item.productId, qty, 'online_sale', 'toko_order', order.id, actor.id, `Penjualan online ${order.orderNumber}`)
    }

    // Record kas masuk
    try {
      await recordBankSampahKas('masuk', 'penjualan_produk', toNumber(order.totalBayar), `Penjualan online ${order.orderNumber}`, actor.id, undefined)
    } catch (e) {
      console.error('Failed to record kas:', e)
    }

    // Create ProductSale for unified reporting
    const existingSale = await db.productSale.findFirst({ where: { notes: { contains: order.orderNumber } } })
    if (!existingSale) {
      await db.productSale.create({
        data: {
          buyerName: order.buyerName,
          buyerPhone: order.buyerPhone,
          paymentMethod: order.paymentMethod,
          paymentStatus: 'paid',
          totalQuantity: order.items.reduce((sum, i) => sum + toNumber(i.quantity), 0),
          totalValue: toNumber(order.subtotalProduk),
          channel: 'online',
          notes: `Pesanan online ${order.orderNumber} (manual)`,
          createdById: actor.id,
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
    }
  }

  const updated = await db.tokoOrder.update({
    where: { id },
    data: updateData,
  })

  // Create status history
  await db.tokoOrderStatusHistory.create({
    data: {
      tokoOrderId: order.id,
      status,
      keterangan: keterangan || `Status diubah ke "${status}" oleh admin`,
      createdById: actor.id,
    },
  })

  return NextResponse.json(updated)
}