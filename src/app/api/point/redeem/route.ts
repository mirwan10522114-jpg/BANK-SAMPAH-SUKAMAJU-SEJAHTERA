import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, debitPoints, reduceProductStock } from '@/lib/business'
import { toNumber } from '@/lib/format'
import { z } from 'zod'

// =====================================================================
// POST /api/point/redeem
// Tukar poin dengan produk
// Body: { userId, productId, quantity }
// =====================================================================

const BodySchema = z.object({
  userId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
})

export async function POST(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const raw = await req.json()
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Data tidak valid', details: parsed.error.issues }, { status: 400 })
  }
  const { userId, productId, quantity } = parsed.data

  // 1) Cek produk
  const product = await db.product.findUnique({ where: { id: productId } })
  if (!product) return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
  if (!product.dijualDenganPoin) return NextResponse.json({ error: 'Produk ini tidak bisa ditukar dengan poin' }, { status: 400 })
  if (product.pointsCost <= 0) return NextResponse.json({ error: 'Produk ini tidak punya harga poin' }, { status: 400 })
  if (toNumber(product.stock) < quantity) return NextResponse.json({ error: `Stok tidak cukup (tersedia: ${product.stock})` }, { status: 400 })

  // 2) Cek point rule aktif
  const rule = await db.pointRule.findFirst({ where: { isActive: true }, orderBy: { effectiveFrom: 'desc' } })
  if (!rule) return NextResponse.json({ error: 'Aturan poin belum dikonfigurasi' }, { status: 400 })

  // 3) Cek saldo poin nasabah
  const balance = await db.balance.findUnique({ where: { userId } })
  const currentPoints = balance ? toNumber(balance.points) : 0
  const pointsNeeded = product.pointsCost * quantity

  if (currentPoints < pointsNeeded) {
    return NextResponse.json({
      error: `Poin tidak mencukupi. Dibutuhkan: ${pointsNeeded} pt, tersedia: ${currentPoints} pt.`,
    }, { status: 400 })
  }

  // 4) Cek minimum redeem
  if (pointsNeeded < rule.minRedeemPoints) {
    return NextResponse.json({
      error: `Minimal penukaran: ${rule.minRedeemPoints} pt. Poin dipakai: ${pointsNeeded} pt.`,
    }, { status: 400 })
  }

  // 5) Proses: debit poin + kurangi stok produk + catat redemption
  try {
    // Debit poin
    await debitPoints(userId, pointsNeeded, 'redeem', 'redemption', 'manual', `Tukar poin: ${product.name} × ${quantity}`, actor.id)

    // Kurangi stok produk
    await reduceProductStock(productId, quantity, 'redemption', 'point_redemption', userId, actor.id, `Redeem poin: ${product.name} × ${quantity}`)

    // Catat redemption
    const redemption = await db.redemption.create({
      data: {
        userId,
        productId,
        productNameSnapshot: product.name,
        unitSnapshot: product.unit,
        quantity,
        pointsUsed: pointsNeeded,
        notes: `Ditukar oleh ${actor.name}`,
        processedById: actor.id,
      },
    })

    // Get updated balance
    const updatedBalance = await db.balance.findUnique({ where: { userId } })
    const remainingPoints = updatedBalance ? toNumber(updatedBalance.points) : 0

    return NextResponse.json({
      success: true,
      redemption,
      pointsUsed: pointsNeeded,
      remainingPoints,
      message: `Penukaran berhasil! ${product.name} × ${quantity} telah diberikan. Poin dipakai: ${pointsNeeded} pt. Sisa poin: ${remainingPoints} pt.`,
    }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Gagal memproses penukaran' }, { status: 500 })
  }
}
