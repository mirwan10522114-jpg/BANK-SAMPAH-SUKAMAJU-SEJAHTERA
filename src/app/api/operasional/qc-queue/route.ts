import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ============================================================
// GET /api/operasional/qc-queue
// List transaksi nabung dengan status = "menunggu_qc" (antrian QC)
// Urut dari yang terlama (FIFO)
// ============================================================
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const statusFilter = searchParams.get('status') || 'menunggu_qc'

  const queue = await db.savingTransaction.findMany({
    where: { status: statusFilter },
    orderBy: { transactedAt: 'asc' }, // FIFO: terlama dulu
    include: {
      user: { select: { id: true, name: true, memberCode: true, phone: true } },
      items: { include: { wasteItem: { include: { category: true } } } },
      createdBy: { select: { id: true, name: true } },
    },
    take: 100,
  })

  // Hitung summary untuk dashboard badge
  const totalMenunggu = await db.savingTransaction.count({
    where: { status: 'menunggu_qc' },
  })

  return NextResponse.json({
    queue,
    summary: {
      totalMenunggu,
    },
  })
}
