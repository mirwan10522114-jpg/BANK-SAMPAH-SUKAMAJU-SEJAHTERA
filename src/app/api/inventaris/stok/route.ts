import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'

// GET: inventaris list with stock (include harga beli per source)
// Harga beli nasabah: 0 untuk sedekah (donasi), harga acuan HargaSampah untuk nabung
export const dynamic = 'force-dynamic'

export async function GET() {
  const inv = await db.inventaris.findMany({
    include: {
      jenisSampah: {
        include: {
          category: true,
          prices: { orderBy: { effectiveFrom: 'desc' }, take: 1 },
        },
      },
    },
    orderBy: { jenisSampah: { name: 'asc' } },
  })
  // group by jenisSampah
  const grouped = new Map<string, any>()
  for (const i of inv) {
    const key = i.jenisSampahId
    if (!grouped.has(key)) {
      const hargaAcuan = i.jenisSampah.prices?.[0]
        ? toNumber(i.jenisSampah.prices[0].pricePerUnit)
        : toNumber(i.jenisSampah.pricePerUnit)
      grouped.set(key, {
        jenisSampahId: key,
        jenisSampah: i.jenisSampah,
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
