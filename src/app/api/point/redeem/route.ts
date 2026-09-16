import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, debitPoints, reduceProductStock } from '@/lib/business'
import { toNumber } from '@/lib/format'
import { z } from 'zod'

// =====================================================================
// POST /api/point/redeem
// Tukar poin dengan produk
// Body: { penggunaId, produkId, quantity }
// =====================================================================

const BodySchema = z.object({
  penggunaId: z.string().min(1),
  produkId: z.string().min(1),
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
  const { penggunaId, produkId, quantity } = parsed.data

  // 1) Cek produk
  const produk = await db.produk.findUnique({ where: { id: produkId } })
  if (!produk) return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
  if (!produk.dijualDenganPoin) return NextResponse.json({ error: 'Produk ini tidak bisa ditukar dengan poin' }, { status: 400 })

  // 2) Cek point rule aktif
  const rule = await db.aturanPoin.findFirst({ where: { isActive: true }, orderBy: { effectiveFrom: 'desc' } })
  const rupiahPerPoint = rule && toNumber(rule.rupiahPerPoint) > 0 ? toNumber(rule.rupiahPerPoint) : 40

  // Tentukan harga poin: jika pointsCost sudah diisi gunakan pointsCost, jika 0 hitung dari price / rupiahPerPoint
  const effectivePointsCost = produk.pointsCost > 0
    ? produk.pointsCost
    : (rupiahPerPoint > 0 && toNumber(produk.price) > 0 ? Math.ceil(toNumber(produk.price) / rupiahPerPoint) : 0)

  if (effectivePointsCost <= 0) {
    return NextResponse.json({ error: 'Produk ini belum memiliki harga poin atau harga produk yang valid' }, { status: 400 })
  }
  if (toNumber(produk.stock) < quantity) {
    return NextResponse.json({ error: `Stok tidak cukup (tersedia: ${produk.stock})` }, { status: 400 })
  }

  // 3) Cek saldo poin nasabah
  const saldo = await db.saldo.findUnique({ where: { penggunaId } })
  const currentPoints = saldo ? toNumber(saldo.points) : 0
  const pointsNeeded = effectivePointsCost * quantity

  if (currentPoints < pointsNeeded) {
    return NextResponse.json({
      error: `Poin tidak mencukupi. Dibutuhkan: ${pointsNeeded} pt, tersedia: ${currentPoints} pt.`,
    }, { status: 400 })
  }

  // 4) Cek minimum redeem jika ada
  if (rule?.minRedeemPoints && rule.minRedeemPoints > 0 && pointsNeeded < rule.minRedeemPoints && currentPoints < rule.minRedeemPoints) {
    return NextResponse.json({
      error: `Minimal saldo poin untuk penukaran adalah ${rule.minRedeemPoints} pt. Saldo Anda: ${currentPoints} pt.`,
    }, { status: 400 })
  }

  // 5) Proses: debit poin + kurangi stok produk + catat penukaranPoin
  try {
    // Debit poin
    await debitPoints(penggunaId, pointsNeeded, 'redeem', 'penukaranPoin', 'manual', `Tukar poin: ${produk.name} × ${quantity}`, actor.id)

    // Kurangi stok produk
    await reduceProductStock(produkId, quantity, 'penukaranPoin', 'point_redemption', penggunaId, actor.id, `Redeem poin: ${produk.name} × ${quantity}`)

    // Catat penukaranPoin
    const penukaranPoin = await db.penukaranPoin.create({
      data: {
        penggunaId,
        produkId,
        productNameSnapshot: produk.name,
        unitSnapshot: produk.unit,
        quantity,
        pointsUsed: pointsNeeded,
        notes: `Ditukar oleh ${actor.name}`,
        processedById: actor.id,
      },
    })

    // Get updated saldo
    const updatedBalance = await db.saldo.findUnique({ where: { penggunaId } })
    const remainingPoints = updatedBalance ? toNumber(updatedBalance.points) : 0

    return NextResponse.json({
      success: true,
      penukaranPoin,
      pointsUsed: pointsNeeded,
      remainingPoints,
      message: `Penukaran berhasil! ${produk.name} × ${quantity} telah diberikan. Poin dipakai: ${pointsNeeded} pt. Sisa poin: ${remainingPoints} pt.`,
    }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Gagal memproses penukaran' }, { status: 500 })
  }
}
