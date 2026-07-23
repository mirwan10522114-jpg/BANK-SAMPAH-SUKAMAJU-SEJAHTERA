import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'

// GET /api/public/stats — public stats for landing page
export async function GET() {
  const [nasabahCount, savingTx, sedekahTx, edukasiCount, kegiatanCount] = await Promise.all([
    db.user.count({ where: { OR: [{ roles: { contains: 'nasabah' } }, { roles: { contains: 'koperasi' } }] } }),
    db.savingTransaction.findMany({ where: { qcStatus: { in: ['passed', 'adjusted'] } }, select: { totalWeight: true } }),
    db.sedekahTransaction.findMany({ where: { qcStatus: { in: ['passed', 'adjusted'] } }, select: { totalWeightBersih: true } }),
    db.article.count({ where: { publishedAt: { not: null } } }),
    db.kegiatan.count({ where: { publishedAt: { not: null } } }),
  ])

  const totalSampah = savingTx.reduce((s, t) => s + toNumber(t.totalWeight), 0) +
                      sedekahTx.reduce((s, t) => s + toNumber(t.totalWeightBersih), 0)

  return NextResponse.json({
    nasabahCount,
    totalSampah: Math.round(totalSampah * 100) / 100,
    edukasiCount,
    kegiatanCount,
  })
}
