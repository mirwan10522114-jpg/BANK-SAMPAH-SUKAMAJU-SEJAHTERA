import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'

// GET: inventory list with stock (include harga beli per source)
// Harga beli nasabah: 0 untuk sedekah (donasi), harga acuan WastePrice untuk nabung
export async function GET() {
  const inv = await db.inventory.findMany({
    include: {
      wasteItem: {
        include: {
          category: true,
          prices: { orderBy: { effectiveFrom: 'desc' }, take: 1 },
        },
      },
    },
    orderBy: { wasteItem: { name: 'asc' } },
  })
  // group by wasteItem
  const grouped = new Map<string, any>()
  for (const i of inv) {
    const key = i.wasteItemId
    if (!grouped.has(key)) {
      const hargaAcuan = i.wasteItem.prices?.[0]
        ? toNumber(i.wasteItem.prices[0].pricePerUnit)
        : toNumber(i.wasteItem.pricePerUnit)
      grouped.set(key, {
        wasteItemId: key,
        wasteItem: i.wasteItem,
        totalStock: 0,
        hargaAcuan, // harga beli dari nasabah (untuk source nabung)
        bySource: [],
      })
    }
    const g = grouped.get(key)
    g.totalStock += toNumber(i.stock)
    // Harga beli per source: sedekah = 0 (donasi), lainnya = harga acuan
    const hargaBeli = i.source === 'sedekah' ? 0 : g.hargaAcuan
    g.bySource.push({
      source: i.source,
      stock: toNumber(i.stock),
      id: i.id,
      hargaBeliNasabah: hargaBeli,
    })
  }
  return NextResponse.json(Array.from(grouped.values()))
}
