import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'
import { toNumber } from '@/lib/format'
import { Prisma } from '@prisma/client'

// GET: Admin list all orders
export async function GET(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const status = url.searchParams.get('status') || ''
  const paymentStatus = url.searchParams.get('paymentStatus') || ''
  const dari = url.searchParams.get('dari') || ''
  const sampai = url.searchParams.get('sampai') || ''
  const q = url.searchParams.get('q') || ''

  const where: Prisma.TokoOrderWhereInput = {}

  if (status) where.orderStatus = status
  if (paymentStatus) where.paymentStatus = paymentStatus

  if (dari || sampai) {
    where.createdAt = {}
    if (dari) {
      (where.createdAt as Prisma.DateTimeNullableFilter).gte = new Date(dari)
    }
    if (sampai) {
      (where.createdAt as Prisma.DateTimeNullableFilter).lte = new Date(sampai + 'T23:59:59')
    }
  }

  if (q) {
    where.OR = [
      { orderNumber: { contains: q } },
      { buyerName: { contains: q } },
      { buyerPhone: { contains: q } },
      { buyerEmail: { contains: q } },
    ]
  }

  const orders = await db.tokoOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      items: true,
      statusHistory: {
        orderBy: { createdAt: 'asc' },
      },
      createdBy: {
        select: { id: true, name: true },
      },
    },
    take: 200,
  })

  const result = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    buyerName: o.buyerName,
    buyerPhone: o.buyerPhone,
    buyerEmail: o.buyerEmail,
    subtotalProduk: toNumber(o.subtotalProduk),
    ongkir: toNumber(o.ongkir),
    totalBayar: toNumber(o.totalBayar),
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    paidAt: o.paidAt,
    orderStatus: o.orderStatus,
    kurirNama: o.kurirNama,
    noResi: o.noResi,
    shippedAt: o.shippedAt,
    receivedAt: o.receivedAt,
    notes: o.notes,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    items: o.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productNameSnapshot: i.productNameSnapshot,
      unitSnapshot: i.unitSnapshot,
      pricePerUnitSnapshot: toNumber(i.pricePerUnitSnapshot),
      quantity: toNumber(i.quantity),
      weightGramSnapshot: i.weightGramSnapshot,
      subtotal: toNumber(i.subtotal),
    })),
    statusHistory: o.statusHistory,
    createdBy: o.createdBy,
  }))

  return NextResponse.json(result)
}