import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, reduceInventory } from '@/lib/business'
import { toNumber } from '@/lib/format'

// GET: list sales to mitra (with margin detail: harga beli nasabah vs harga jual mitra)
// Query params:
//   partnerId — filter by mitra
//   dari      — ISO date (gte transactedAt)
//   sampai    — ISO date (lte transactedAt)
//   q         — search by partner name OR item name (case-insensitive contains)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const partnerId = searchParams.get('partnerId')
  const dari = searchParams.get('dari')
  const sampai = searchParams.get('sampai')
  const q = (searchParams.get('q') || '').trim()

  const where: any = {}
  if (partnerId) where.partnerId = partnerId
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
      { partner: { name: { contains: q } } },
      { items: { some: { itemNameSnapshot: { contains: q } } } },
    ]
  }

  const list = await db.salesTransaction.findMany({
    where,
    orderBy: { transactedAt: 'desc' },
    include: {
      partner: true,
      items: {
        include: {
          wasteItem: {
            include: {
              category: true,
              prices: { orderBy: { effectiveFrom: 'desc' }, take: 1 },
            },
          },
        },
      },
      createdBy: true,
    },
    take: 100,
  })

  // Compute margin for each transaction
  const enriched = list.map((tx) => {
    let totalBeliNasabah = 0
    let totalJualMitra = 0
    let totalMargin = 0
    const itemsWithMargin = tx.items.map((item) => {
      const hargaJualMitra = toNumber(item.pricePerUnit)
      const qty = toNumber(item.quantity)
      // Harga beli dari nasabah = harga terbaru dari WastePrice, fallback ke wasteItem.pricePerUnit
      const hargaBeliNasabah = item.wasteItem.prices?.[0]
        ? toNumber(item.wasteItem.prices[0].pricePerUnit)
        : toNumber(item.wasteItem.pricePerUnit)
      const subtotalJual = hargaJualMitra * qty
      const subtotalBeli = hargaBeliNasabah * qty
      const margin = subtotalJual - subtotalBeli
      const marginPerUnit = hargaJualMitra - hargaBeliNasabah
      const marginPersen = subtotalBeli > 0 ? (margin / subtotalBeli) * 100 : 0

      totalBeliNasabah += subtotalBeli
      totalJualMitra += subtotalJual
      totalMargin += margin

      return {
        ...item,
        hargaBeliNasabah,
        hargaJualMitra,
        marginPerUnit,
        subtotalBeli,
        subtotalJual,
        margin,
        marginPersen,
        isProfit: margin >= 0,
      }
    })

    return {
      ...tx,
      items: itemsWithMargin,
      totalBeliNasabah,
      totalJualMitra: toNumber(tx.totalValue),
      totalMargin,
      totalMarginPersen: totalBeliNasabah > 0 ? (totalMargin / totalBeliNasabah) * 100 : 0,
      isProfit: totalMargin >= 0,
    }
  })

  return NextResponse.json(enriched)
}

// POST: create sale to mitra (reduces inventory, records revenue)
// Items must come from existing inventory (stok hasil nabung/sedekah).
// source: 'nabung' | 'sedekah' — determines harga beli (0 for sedekah, harga acuan for nabung)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const actor = await getActingUser(req)
  const { partnerId, items, notes } = body as {
    partnerId: string
    items: { wasteItemId: string; pricePerUnit: number; quantity: number; source?: string }[]
    notes?: string
  }
  if (!partnerId) return NextResponse.json({ error: 'Mitra wajib dipilih' }, { status: 400 })
  if (!items?.length) return NextResponse.json({ error: 'Minimal 1 item' }, { status: 400 })

  // Fetch waste items with latest prices (for harga beli calculation)
  const wasteItems = await db.wasteItem.findMany({
    where: { id: { in: items.map((i) => i.wasteItemId) } },
    include: { category: true, prices: { orderBy: { effectiveFrom: 'desc' }, take: 1 } },
  })

  // Fetch current inventory for validation
  const inventories = await db.inventory.findMany({
    where: { wasteItemId: { in: items.map((i) => i.wasteItemId) } },
  })

  let totalWeight = 0
  let totalValue = 0
  let totalBeliNasabah = 0
  const itemRows = items.map((it) => {
    const wi = wasteItems.find((w) => w.id === it.wasteItemId)!
    if (!wi) throw new Error(`Barang sampah tidak ditemukan: ${it.wasteItemId}`)
    const price = toNumber(it.pricePerUnit)
    const qty = toNumber(it.quantity)
    const source = it.source || 'nabung'

    // Validate stock availability for the chosen source
    const inv = inventories.find((i) => i.wasteItemId === it.wasteItemId && i.source === source)
    const availableStock = inv ? toNumber(inv.stock) : 0
    if (availableStock < qty) {
      throw new Error(`Stok ${wi.name} (sumber: ${source}) tidak cukup. Tersedia: ${availableStock} kg, diminta: ${qty} kg`)
    }

    // Harga beli nasabah: 0 untuk sedekah (donasi), harga acuan untuk nabung
    const hargaAcuan = wi.prices?.[0] ? toNumber(wi.prices[0].pricePerUnit) : toNumber(wi.pricePerUnit)
    const hargaBeliNasabah = source === 'sedekah' ? 0 : hargaAcuan

    const subtotal = price * qty
    const subtotalBeli = hargaBeliNasabah * qty

    totalWeight += qty
    totalValue += subtotal
    totalBeliNasabah += subtotalBeli

    return {
      wasteItemId: wi.id,
      itemCodeSnapshot: wi.code,
      itemNameSnapshot: wi.name,
      categoryNameSnapshot: wi.category.name,
      unitSnapshot: wi.unit,
      pricePerUnit: price,
      quantity: qty,
      subtotal,
      // Store source & harga beli for margin tracking (optional fields if schema supports)
      // Note: SalesTransactionItem doesn't have source/hargaBeliNasabah columns,
      // so we track margin via the GET endpoint which re-computes from WastePrice.
    }
  })

  // Validate all stock first (throw if any insufficient)
  try {
    // Re-check all items before creating
    for (const it of items) {
      const source = it.source || 'nabung'
      const inv = inventories.find((i) => i.wasteItemId === it.wasteItemId && i.source === source)
      const availableStock = inv ? toNumber(inv.stock) : 0
      if (availableStock < toNumber(it.quantity)) {
        return NextResponse.json({
          error: `Stok tidak cukup. ${wasteItems.find(w => w.id === it.wasteItemId)?.name} (sumber: ${source}): tersedia ${availableStock} kg, diminta ${toNumber(it.quantity)} kg`
        }, { status: 400 })
      }
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }

  const tx = await db.salesTransaction.create({
    data: {
      partnerId,
      totalWeight,
      totalValue,
      notes,
      createdById: actor?.id,
      items: { create: itemRows },
    },
    include: { items: true, partner: true },
  })

  // Reduce inventory from the specific source chosen
  for (const it of items) {
    const source = it.source || 'nabung'
    try {
      await reduceInventory(it.wasteItemId, source, toNumber(it.quantity), 'sale', 'sales_transaction', tx.id, actor?.id, `Penjualan ke mitra ${tx.id.slice(-6)}`)
    } catch (e: any) {
      // If specific source fails, try fallback to other source
      const fallbackSource = source === 'nabung' ? 'sedekah' : 'nabung'
      try {
        await reduceInventory(it.wasteItemId, fallbackSource, toNumber(it.quantity), 'sale', 'sales_transaction', tx.id, actor?.id, `Penjualan ke mitra ${tx.id.slice(-6)}`)
      } catch (e2: any) {
        return NextResponse.json({ error: `Stok tidak cukup untuk penjualan: ${e2.message}` }, { status: 400 })
      }
    }
  }

  // Record kas masuk ke Buku Kas Utama institusi (Cash Inward from mitra sale)
  try {
    const { recordBankSampahKas } = await import('@/lib/business')
    await recordBankSampahKas('masuk', 'penjualan_mitra', totalValue, `Penjualan ke mitra ${tx.id.slice(-6)}`, actor?.id, { salesTxId: tx.id })
  } catch (e) {
    console.error('Failed to record bank sampah kas:', e)
  }

  return NextResponse.json({
    ...tx,
    _meta: {
      totalBeliNasabah,
      totalMargin: totalValue - totalBeliNasabah,
      marginPersen: totalBeliNasabah > 0 ? ((totalValue - totalBeliNasabah) / totalBeliNasabah) * 100 : 0,
    },
  }, { status: 201 })
}
