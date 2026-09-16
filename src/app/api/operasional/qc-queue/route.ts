import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ============================================================
// GET /api/operasional/qc-queue
// List transaksi nabung dan sedekah dengan status = "menunggu_qc" (antrian QC)
// Urut dari yang terlama (FIFO)
// ============================================================
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const statusFilter = searchParams.get('status') || 'menunggu_qc'

  const [savingQueue, sedekahQueue] = await Promise.all([
    db.transaksiNabung.findMany({
      where: { status: statusFilter },
      orderBy: { transactedAt: 'asc' }, // FIFO: terlama dulu
      include: {
        pengguna: { select: { id: true, name: true, memberCode: true, phone: true } },
        items: { include: { jenisSampah: { include: { category: true } } } },
        createdBy: { select: { id: true, name: true } },
      },
      take: 100,
    }),
    db.transaksiSedekah.findMany({
      where: { status: statusFilter },
      orderBy: { transactedAt: 'asc' }, // FIFO: terlama dulu
      include: {
        pengguna: { select: { id: true, name: true, memberCode: true, phone: true } },
        items: { include: { jenisSampah: { include: { category: true } } } },
        createdBy: { select: { id: true, name: true } },
      },
      take: 100,
    }),
  ])

  const normalizedSaving = savingQueue.map((tx) => ({
    ...tx,
    tipe: 'nabung' as const,
  }))

  const normalizedSedekah = sedekahQueue.map((tx) => ({
    ...tx,
    tipe: 'sedekah' as const,
  }))

  // Combine and sort by transactedAt asc (FIFO)
  const queue = [...normalizedSaving, ...normalizedSedekah].sort(
    (a, b) => new Date(a.transactedAt).getTime() - new Date(b.transactedAt).getTime()
  )

  // Hitung summary untuk dashboard badge
  const [totalSavingMenunggu, totalSedekahMenunggu] = await Promise.all([
    db.transaksiNabung.count({ where: { status: 'menunggu_qc' } }),
    db.transaksiSedekah.count({ where: { status: 'menunggu_qc' } }),
  ])

  return NextResponse.json({
    queue,
    summary: {
      totalMenunggu: totalSavingMenunggu + totalSedekahMenunggu,
      totalSavingMenunggu,
      totalSedekahMenunggu,
    },
  })
}
