import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'

// GET: Public order tracking by orderNumber
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await params
  const url = new URL(req.url)
  const phone = url.searchParams.get('phone') || ''
  const email = url.searchParams.get('email') || ''

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
    // Allow without verification but return limited data
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
    items: order.items.map((i) => ({
      id: i.id,
      productNameSnapshot: i.productNameSnapshot,
      unitSnapshot: i.unitSnapshot,
      pricePerUnitSnapshot: toNumber(i.pricePerUnitSnapshot),
      quantity: toNumber(i.quantity),
      weightGramSnapshot: i.weightGramSnapshot,
      subtotal: toNumber(i.subtotal),
    })),
    statusHistory: order.statusHistory.map((h) => ({
      id: h.id,
      status: h.status,
      keterangan: h.keterangan,
      createdAt: h.createdAt,
    })),
  })
}