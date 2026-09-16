import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, reduceProductStock, generateTxNo } from '@/lib/business'
import { toNumber } from '@/lib/format'

// GET: list produk sales
// Query params:
//   paymentMethod — 'cash' | 'transfer'
//   dari          — ISO date (gte transactedAt)
//   sampai        — ISO date (lte transactedAt)
//   q             — search by buyerName OR buyerPhone (case-insensitive contains)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const paymentMethod = searchParams.get('paymentMethod')
  const dari = searchParams.get('dari')
  const sampai = searchParams.get('sampai')
  const q = (searchParams.get('q') || '').trim()

  const where: any = {}
  if (paymentMethod) where.paymentMethod = paymentMethod
  if (dari || sampai) {
    where.transactedAt = {}
    if (dari) where.transactedAt.gte = new Date(dari)
    if (sampai) {
      const s = new Date(sampai)
      s.setHours(23, 59, 59, 999)
      where.transactedAt.lte = s
    }
  }
  if (q) {
    where.OR = [
      { buyerName: { contains: q } },
      { buyerPhone: { contains: q } },
    ]
  }
  const list = await db.penjualanProduk.findMany({
    where,
    orderBy: { transactedAt: 'desc' },
    include: { items: { include: { produk: true } }, createdBy: true },
    take: 100,
  })
  return NextResponse.json(list)
}

// POST: create produk sale (reduces produk stock, records revenue)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const actor = await getActingUser(req)
  const { items, buyerName, buyerPhone, buyerUserId, paymentMethod, notes } = body as {
    items: { produkId: string; pricePerUnit: number; quantity: number; hargaProdukId?: string }[]
    buyerName: string
    buyerPhone: string
    buyerUserId?: string
    paymentMethod?: string
    notes?: string
  }
  if (!items?.length) return NextResponse.json({ error: 'Minimal 1 item' }, { status: 400 })
  if (!buyerName || !buyerPhone) return NextResponse.json({ error: 'Nama & telepon pembeli wajib' }, { status: 400 })

  const produks = await db.produk.findMany({ where: { id: { in: items.map((i) => i.produkId) } } })

  let totalQty = 0
  let totalValue = 0
  const itemRows = items.map((it) => {
    const p = produks.find((pr) => pr.id === it.produkId)!
    const price = toNumber(it.pricePerUnit)
    const qty = toNumber(it.quantity)
    const subtotal = price * qty
    totalQty += qty
    totalValue += subtotal
    return {
      produkId: it.produkId,
      hargaProdukId: it.hargaProdukId || null,
      productNameSnapshot: p.name,
      unitSnapshot: p.unit,
      pricePerUnitSnapshot: price,
      quantity: qty,
      subtotal,
    }
  })

  const invoiceNumber = await generateTxNo('TKOFF')
  const tx = await db.penjualanProduk.create({
    data: {
      invoiceNumber,
      buyerUserId: buyerUserId || null,
      buyerName,
      buyerPhone,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: 'paid',
      totalQuantity: totalQty,
      totalValue,
      notes,
      createdById: actor?.id,
      items: { create: itemRows },
    },
    include: { items: true },
  })

  // Reduce produk stock
  for (const it of items) {
    try {
      await reduceProductStock(it.produkId, toNumber(it.quantity), 'sale', 'product_sale', tx.id, actor?.id, `Penjualan produk ${tx.id.slice(-6)}`)
    } catch (e: any) {
      return NextResponse.json({ error: `Stok produk tidak cukup: ${e.message}` }, { status: 400 })
    }
  }

  // Record kas masuk ke Buku Kas Utama institusi (Cash Inward from produk sale)
  try {
    const { recordBankSampahKas } = await import('@/lib/business')
    await recordBankSampahKas('masuk', 'penjualan_produk', totalValue, `Penjualan produk ${tx.id.slice(-6)}`, actor?.id, { penjualanProdukId: tx.id })
  } catch (e) {
    console.error('Failed to record bank sampah kas:', e)
  }

  return NextResponse.json(tx, { status: 201 })
}
