import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'
import { toNumber } from '@/lib/format'

// =====================================================================
// POST /api/point/reset
// Reset poin semua nasabah sesuai aturan (manual trigger atau cron)
// - Hanya berlaku jika resetPeriod != "never"
// - Nasabah dengan poin > rolloverPoints: poin di-reset ke rolloverPoints
// - Nasabah dengan poin ≤ rolloverPoints: poin tetap
// - Catat di RiwayatPoin (type="cash_out", description="Reset poin bulanan")
// =====================================================================
export async function POST(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const isAdmin = actor.roles.includes('admin') || actor.roles.includes('owner')
  if (!isAdmin) return NextResponse.json({ error: 'Hanya admin/owner' }, { status: 403 })

  // 1) Cek rule aktif
  const rule = await db.aturanPoin.findFirst({ where: { isActive: true }, orderBy: { effectiveFrom: 'desc' } })
  if (!rule) return NextResponse.json({ error: 'Aturan poin belum dikonfigurasi' }, { status: 400 })
  if (rule.resetPeriod === 'never') return NextResponse.json({ error: 'Reset period = never. Tidak perlu reset.' }, { status: 400 })

  const rollover = rule.rolloverPoints || 0

  // 2) Ambil semua nasabah yang punya poin > rollover
  const saldos = await db.saldo.findMany({
    where: { points: { gt: rollover } },
    select: { penggunaId: true, points: true },
  })

  let resetCount = 0
  let totalPointsReset = 0

  for (const b of saldos) {
    const currentPoints = b.points
    const pointsToRemove = currentPoints - rollover

    // Update saldo: set poin ke rollover
    await db.saldo.update({
      where: { penggunaId: b.penggunaId },
      data: { points: rollover },
    })

    // Catat di RiwayatPoin
    await db.riwayatPoin.create({
      data: {
        penggunaId: b.penggunaId,
        aturanPoinId: rule.id,
        type: 'cash_out',
        points: -pointsToRemove,
        balanceAfter: rollover,
        sourceType: 'point_reset',
        sourceId: rule.id,
        description: `Reset poin ${rule.resetPeriod} (period ${new Date().toISOString().slice(0, 7)}). ${pointsToRemove} pt direset, ${rollover} pt rollover.`,
        createdById: actor.id,
      },
    })

    resetCount++
    totalPointsReset += pointsToRemove
  }

  return NextResponse.json({
    success: true,
    resetCount,
    totalPointsReset,
    rolloverPoints: rollover,
    message: `Reset poin berhasil. ${resetCount} nasabah di-reset. Total ${totalPointsReset} poin dihapus. Rollover: ${rollover} pt per nasabah.`,
  })
}
