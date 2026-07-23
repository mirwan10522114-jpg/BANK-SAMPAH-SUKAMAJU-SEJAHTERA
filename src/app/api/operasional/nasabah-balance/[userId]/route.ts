import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'

// GET balance + point history for a nasabah
export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const [balance, balanceHistories, pointHistories, savingTx, sedekahTx, withdrawals, redemptions] = await Promise.all([
    db.balance.findUnique({ where: { userId } }),
    db.balanceHistory.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    db.pointHistory.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    db.savingTransaction.findMany({ where: { userId }, orderBy: { transactedAt: 'desc' }, take: 10, include: { items: true } }),
    db.sedekahTransaction.findMany({ where: { userId }, orderBy: { transactedAt: 'desc' }, take: 10 }),
    db.withdrawalRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 }),
    db.redemption.findMany({ where: { userId }, orderBy: { redeemedAt: 'desc' }, take: 10 }),
  ])
  return NextResponse.json({
    balance: balance || { saldoTertahan: 0, saldoTersedia: 0, points: 0 },
    balanceHistories,
    pointHistories,
    savingTransactions: savingTx,
    sedekahTransactions: sedekahTx,
    withdrawals,
    redemptions,
    totals: {
      totalSetoran: savingTx.reduce((s, t) => s + toNumber(t.totalValue), 0),
      totalBerat: savingTx.reduce((s, t) => s + toNumber(t.totalWeight), 0),
      totalPoin: savingTx.reduce((s, t) => s + t.pointsAwarded, 0),
    },
  })
}
