import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, reduceProductStock, recordBankSampahKas } from '@/lib/business'
import { toNumber } from '@/lib/format'

// POST: Offline POS sale
export async function POST(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { items, buyerName, buyerPhone, paymentMethod, discount, notes } = body as {
    items: { productId: string; quantity: number; price?: number }[]
    buyerName: string
    buyerPhone: string
    paymentMethod?: string
    discount?: number
    notes?: string
  }

  if (!items?.length) return NextResponse.json({ error: 'Minimal 1 item' }, { status: 400 })
  if (!buyerName || !buyerPhone) return NextResponse.json({ error: 'Nama & telepon pembeli wajib' }, { status: 400 })

  // Fetch products
  const productIds = items.map((i) => i.productId)
  const products = await db.product.findMany({ where: { id: { in: productIds } } })

  // Validate products and calculate totals
  let totalQty = 0
  let totalValue = 0
  const itemRows: any[] = []

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId)
    if (!product) return NextResponse.json({ error: `Produk ${item.productId} tidak ditemukan` }, { status: 400 })
    if (!product.dijualOffline) return NextResponse.json({ error: `Produk "${product.name}" tidak dijual offline` }, { status: 400 })
    if (!product.isActive) return NextResponse.json({ error: `Produk "${product.name}" tidak aktif` }, { status: 400 })
    if (toNumber(product.stock) < item.quantity) {
      return NextResponse.json({ error: `Stok "${product.name}" tidak mencukupi (tersedia: ${product.stock})` }, { status: 400 })
    }

    const price = item.price ? toNumber(item.price) : toNumber(product.price)
    const qty = toNumber(item.quantity)
    const subtotal = price * qty
    totalQty += qty
    totalValue += subtotal

    itemRows.push({
      productId: product.id,
      productNameSnapshot: product.name,
      unitSnapshot: product.unit,
      pricePerUnitSnapshot: price,
      quantity: qty,
      subtotal,
    })
  }

  // Apply discount
  const discountAmt = toNumber(discount)
  if (discountAmt > 0) {
    totalValue = Math.max(0, totalValue - discountAmt)
  }

  // Create ProductSale
  const sale = await db.productSale.create({
    data: {
      buyerName,
      buyerPhone,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: 'paid',
      totalQuantity: totalQty,
      totalValue,
      channel: 'offline',
      notes: notes || (discountAmt > 0 ? `Diskon Rp ${discountAmt}` : undefined),
      createdById: actor.id,
      items: { create: itemRows },
    },
    include: { items: true },
  })

  // Reduce product stock
  for (const item of items) {
    try {
      await reduceProductStock(item.productId, toNumber(item.quantity), 'sale', 'product_sale', sale.id, actor.id, `Penjualan offline POS ${sale.id.slice(-6)}`)
    } catch (e: any) {
      return NextResponse.json({ error: `Stok produk tidak cukup: ${e.message}` }, { status: 400 })
    }
  }

  // Record kas masuk
  try {
    await recordBankSampahKas('masuk', 'penjualan_produk', totalValue, `Penjualan offline POS ${sale.id.slice(-6)}`, actor.id, { productSaleId: sale.id })
  } catch (e) {
    console.error('Failed to record bank sampah kas:', e)
  }

  return NextResponse.json(sale, { status: 201 })
}