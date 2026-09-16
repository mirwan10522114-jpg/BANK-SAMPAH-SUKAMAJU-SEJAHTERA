import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'

// GET saldo + point history for a nasabah
export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId: penggunaId } = await params
  const [saldo, balanceHistories, pointHistories, savingTx, sedekahTx, withdrawals, penukaranPoins] = await Promise.all([
    db.saldo.findUnique({ where: { penggunaId } }),
    db.riwayatSaldo.findMany({ where: { penggunaId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    db.riwayatPoin.findMany({ where: { penggunaId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    db.transaksiNabung.findMany({ where: { penggunaId }, orderBy: { transactedAt: 'desc' }, take: 10, include: { items: true } }),
    db.transaksiSedekah.findMany({ where: { penggunaId }, orderBy: { transactedAt: 'desc' }, take: 10 }),
    db.permintaanPenarikan.findMany({ where: { penggunaId }, orderBy: { createdAt: 'desc' }, take: 10 }),
    db.penukaranPoin.findMany({ where: { penggunaId }, orderBy: { redeemedAt: 'desc' }, take: 10 }),
  ])
  return NextResponse.json({
    saldo: saldo || { saldoTertahan: 0, saldoTersedia: 0, points: 0 },
    balanceHistories,
    pointHistories,
    transaksiNabungs: savingTx,
    transaksiSedekahs: sedekahTx,
    withdrawals,
    penukaranPoins,
    totals: {
      totalSetoran: savingTx.reduce((s, t) => s + toNumber(t.totalValue), 0),
      totalBerat: savingTx.reduce((s, t) => s + toNumber(t.totalWeight), 0),
      totalPoin: savingTx.reduce((s, t) => s + t.pointsAwarded, 0),
    },
  })
}
