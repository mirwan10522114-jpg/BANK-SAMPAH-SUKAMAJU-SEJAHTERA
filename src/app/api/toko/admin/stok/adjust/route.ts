import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, addProductStock, reduceProductStock } from '@/lib/business'
import { toNumber } from '@/lib/format'

// POST: Manual stock adjustment
export async function POST(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const productId = body.productId || body.id
  let quantity = body.stokAktual !== undefined ? Number(body.stokAktual) : (body.quantity !== undefined ? Number(body.quantity) : (body.stok !== undefined ? Number(body.stok) : 0))
  let reason = body.reason || 'penyesuaian'
  const notes = body.notes || body.alasan || 'Penyesuaian stok'

  if (!productId) return NextResponse.json({ error: 'Produk wajib diisi' }, { status: 400 })
  if (quantity < 0) return NextResponse.json({ error: 'Jumlah tidak boleh negatif' }, { status: 400 })
  if (!['masuk', 'keluar', 'penyesuaian'].includes(reason)) {
    reason = 'penyesuaian'
  }

  const product = await db.product.findFirst({
    where: {
      OR: [{ id: productId }, { slug: productId }, { name: productId }],
    },
  })
  if (!product) return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })

  if (reason === 'masuk') {
    const updated = await addProductStock(
      productId,
      quantity,
      'adjustment',
      'manual_adjustment',
      'N/A',
      actor.id,
      notes || `Penyesuaian stok masuk +${quantity} oleh ${actor.name}`
    )
    return NextResponse.json({
      message: `Stok ditambah ${quantity}`,
      newStock: toNumber(updated.stock),
    })
  }

  if (reason === 'keluar') {
    try {
      const updated = await reduceProductStock(
        productId,
        quantity,
        'adjustment',
        'manual_adjustment',
        'N/A',
        actor.id,
        notes || `Penyesuaian stok keluar -${quantity} oleh ${actor.name}`
      )
      return NextResponse.json({
        message: `Stok dikurangi ${quantity}`,
        newStock: toNumber(updated.stock),
      })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
  }

  // penyesuaian: set absolute stock value
  const currentStock = toNumber(product.stock)
  const diff = quantity - currentStock

  if (diff > 0) {
    await addProductStock(
      productId,
      diff,
      'adjustment',
      'manual_adjustment',
      'N/A',
      actor.id,
      notes || `Penyesuaian stok dari ${currentStock} ke ${quantity} oleh ${actor.name}`
    )
  } else if (diff < 0) {
    try {
      await reduceProductStock(
        productId,
        Math.abs(diff),
        'adjustment',
        'manual_adjustment',
        'N/A',
        actor.id,
        notes || `Penyesuaian stok dari ${currentStock} ke ${quantity} oleh ${actor.name}`
      )
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
  }

  const finalProduct = await db.product.findUnique({ where: { id: product.id } })

  return NextResponse.json({
    message: `Stok disesuaikan dari ${currentStock} ke ${quantity}`,
    previousStock: currentStock,
    newStock: toNumber(finalProduct!.stock),
    stok: toNumber(finalProduct!.stock),
  })
}