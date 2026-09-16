import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber, parseFilterStartDate, parseFilterEndDate } from '@/lib/format'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dari = searchParams.get('dari')
  const sampai = searchParams.get('sampai')

  // Build the period filter for Transactions
  const whereSaving: any = { status: 'selesai' }
  const whereSedekah: any = { status: 'selesai' }

  const startDate = parseFilterStartDate(dari)
  const endDate = parseFilterEndDate(sampai)
  if (startDate || endDate) {
    whereSaving.createdAt = {}
    whereSedekah.createdAt = {}
    if (startDate) {
      whereSaving.createdAt.gte = startDate
      whereSedekah.createdAt.gte = startDate
    }
    if (endDate) {
      whereSaving.createdAt.lte = endDate
      whereSedekah.createdAt.lte = endDate
    }
  }

  // Fetch items from both Saving and Sedekah
  const [savingItems, sedekahItems] = await Promise.all([
    db.itemTransaksiNabung.findMany({
      where: { transaksiNabung: whereSaving },
      include: { jenisSampah: { include: { category: true } } }
    }),
    db.itemTransaksiSedekah.findMany({
      where: { transaksiSedekah: whereSedekah },
      include: { jenisSampah: { include: { category: true } } }
    })
  ])

  // Aggregate by category and item
  const aggregated: Record<string, any> = {}

  let totalWeightAll = 0
  let totalNabungAll = 0
  let totalSedekahAll = 0

  const processItem = (item: any, type: 'nabung' | 'sedekah') => {
    // Only count if there's actually a finalized weight (quantityAfterQc)
    const weight = toNumber(item.quantityAfterQc) || 0
    if (weight <= 0) return

    const categoryName = item.categoryNameSnapshot || item.jenisSampah?.category?.name || 'Lainnya'
    const categoryId = item.jenisSampah?.kategoriSampahId || categoryName
    const itemId = item.jenisSampahId
    const itemName = item.itemNameSnapshot || item.jenisSampah?.name
    const unit = item.unitSnapshot || item.jenisSampah?.unit

    if (!aggregated[categoryName]) {
      aggregated[categoryName] = {
        categoryId,
        categoryName,
        totalWeight: 0,
        totalNabung: 0,
        totalSedekah: 0,
        items: {}
      }
    }

    if (!aggregated[categoryName].items[itemId]) {
      aggregated[categoryName].items[itemId] = {
        itemId,
        itemName,
        unit,
        totalWeight: 0,
        totalNabung: 0,
        totalSedekah: 0
      }
    }

    // Accumulate
    aggregated[categoryName].totalWeight += weight
    aggregated[categoryName].items[itemId].totalWeight += weight

    if (type === 'nabung') {
      aggregated[categoryName].totalNabung += weight
      aggregated[categoryName].items[itemId].totalNabung += weight
      totalNabungAll += weight
    } else {
      aggregated[categoryName].totalSedekah += weight
      aggregated[categoryName].items[itemId].totalSedekah += weight
      totalSedekahAll += weight
    }

    totalWeightAll += weight
  }

  savingItems.forEach(item => processItem(item, 'nabung'))
  sedekahItems.forEach(item => processItem(item, 'sedekah'))

  // Format response to array
  const reportData = Object.values(aggregated).map(cat => ({
    ...cat,
    items: Object.values(cat.items).sort((a: any, b: any) => b.totalWeight - a.totalWeight)
  })).sort((a: any, b: any) => b.totalWeight - a.totalWeight)

  return NextResponse.json({
    summary: {
      totalWeightAll,
      totalNabungAll,
      totalSedekahAll
    },
    data: reportData
  })
}
