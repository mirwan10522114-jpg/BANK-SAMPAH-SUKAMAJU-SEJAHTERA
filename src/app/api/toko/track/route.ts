import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'

// GET: Public order tracking (alias for /toko/order/[orderNumber])
// Frontend calls /toko/track?orderNumber=...&phone=...
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const orderNumber = url.searchParams.get('orderNumber') || ''
  const phone = url.searchParams.get('phone') || ''
  const email = url.searchParams.get('email') || ''

  if (!orderNumber) {
    return NextResponse.json({ error: 'Nomor pesanan wajib diisi' }, { status: 400 })
  }

  const order = await db.tokoOrder.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      statusHistory: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!order) {
    return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
  }

  // Security: verify phone or email
  if (phone && order.buyerPhone !== phone) {
    return NextResponse.json({ error: 'Nomor telepon tidak cocok' }, { status: 403 })
  }
  if (email && order.buyerEmail !== email) {
    return NextResponse.json({ error: 'Email tidak cocok' }, { status: 403 })
  }
  if (!phone && !email) {
    return NextResponse.json({
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
    })
  }

  return NextResponse.json({
    id: order.id,
    orderNumber: order.orderNumber,
    buyerName: order.buyerName,
    buyerPhone: order.buyerPhone,
    buyerEmail: order.buyerEmail,
    buyerAddress: order.buyerAddress,
    subtotalProduk: toNumber(order.subtotalProduk),
    ongkir: toNumber(order.ongkir),
    totalBayar: toNumber(order.totalBayar),
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    paidAt: order.paidAt,
    orderStatus: order.orderStatus,
    kurirNama: order.kurirNama,
    noResi: order.noResi,
    shippedAt: order.shippedAt,
    receivedAt: order.receivedAt,
    notes: order.notes,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.items.map((i: any) => ({
      id: i.id,
      productNameSnapshot: i.productNameSnapshot,
      unitSnapshot: i.unitSnapshot,
      pricePerUnitSnapshot: toNumber(i.pricePerUnitSnapshot),
      quantity: toNumber(i.quantity),
      weightGramSnapshot: i.weightGramSnapshot,
      subtotal: toNumber(i.subtotal),
    })),
    statusHistory: order.statusHistory.map((h: any) => ({
      id: h.id,
      status: h.status,
      keterangan: h.keterangan,
      createdAt: h.createdAt,
    })),
  })
}