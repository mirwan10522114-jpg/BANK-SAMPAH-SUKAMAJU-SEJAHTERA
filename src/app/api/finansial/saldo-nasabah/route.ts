import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseFilterStartDate, parseFilterEndDate, toNumber } from '@/lib/format'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dari = searchParams.get('dari')
  const sampai = searchParams.get('sampai')
  const q = searchParams.get('q') || ''

  const startDate = parseFilterStartDate(dari)
  const endDate = parseFilterEndDate(sampai)

  // 1. Ringkasan Top Cards (Filterable by Date)
  const dateFilterSaving = (startDate || endDate) ? {
    transactedAt: {
      ...(startDate ? { gte: startDate } : {}),
      ...(endDate ? { lte: endDate } : {}),
    }
  } : {}

  const dateFilterWithdrawal = (startDate || endDate) ? {
    createdAt: {
      ...(startDate ? { gte: startDate } : {}),
      ...(endDate ? { lte: endDate } : {}),
    }
  } : {}

  // Tabungan masuk (TransaksiNabung) - Keseluruhan
  const tabunganMasukKeseluruhanAgg = await db.transaksiNabung.aggregate({
    where: {
      qcStatus: { in: ['passed', 'adjusted', 'tidak_perlu'] }
    },
    _sum: { totalValue: true }
  })

  // Penarikan (Withdrawal) - Keseluruhan
  const penarikanKeseluruhanAgg = await db.permintaanPenarikan.aggregate({
    where: {
      status: 'sukses'
    },
    _sum: { amount: true }
  })

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  // Tabungan masuk (TransaksiNabung) - Hari Ini
  const tabunganMasukHariIniAgg = await db.transaksiNabung.aggregate({
    where: {
      qcStatus: { in: ['passed', 'adjusted', 'tidak_perlu'] },
      transactedAt: { gte: startOfToday, lte: endOfToday }
    },
    _sum: { totalValue: true }
  })

  // Penarikan (Withdrawal) - Hari Ini
  const penarikanHariIniAgg = await db.permintaanPenarikan.aggregate({
    where: {
      status: 'sukses',
      createdAt: { gte: startOfToday, lte: endOfToday }
    },
    _sum: { amount: true }
  })

  // Jumlah Nasabah Aktif in this period
  let activeUsersCount = 0
  if (startDate || endDate) {
    const activeSavings = await db.transaksiNabung.groupBy({
      by: ['penggunaId'],
      where: { ...dateFilterSaving, qcStatus: { in: ['passed', 'adjusted', 'tidak_perlu'] } }
    })
    const activeWithdrawals = await db.permintaanPenarikan.groupBy({
      by: ['penggunaId'],
      where: { ...dateFilterWithdrawal, status: 'sukses' }
    })
    const uniqueUsers = new Set([
      ...activeSavings.map(s => s.penggunaId),
      ...activeWithdrawals.map(w => w.penggunaId)
    ])
    activeUsersCount = uniqueUsers.size
  } else {
    // If no date filter, count all penggunas who have saldo > 0
    activeUsersCount = await db.saldo.count({
      where: {
        OR: [
          { saldoTersedia: { gt: 0 } },
          { saldoTertahan: { gt: 0 } }
        ]
      }
    })
  }

  // Total Saldo Nasabah (All-time)
  const totalSaldoAgg = await db.saldo.aggregate({
    _sum: {
      saldoTersedia: true,
      saldoTertahan: true
    }
  })
  const totalSaldoNasabah = toNumber(totalSaldoAgg._sum.saldoTersedia) + toNumber(totalSaldoAgg._sum.saldoTertahan)

  // 2. Daftar Nasabah
  const whereUser: any = { roles: { contains: 'nasabah' } }
  if (q) {
    whereUser.OR = [
      { name: { contains: q } },
      { memberCode: { contains: q } }
    ]
  }

  const penggunas = await db.pengguna.findMany({
    where: whereUser,
    select: {
      id: true,
      name: true,
      memberCode: true,
      isMember: true,
      saldo: {
        select: {
          saldoTersedia: true,
          saldoTertahan: true
        }
      },
      transaksiNabungs: {
        where: { qcStatus: { in: ['passed', 'adjusted', 'tidak_perlu'] } },
        select: { totalValue: true }
      },
      withdrawals: {
        where: { status: 'sukses' },
        select: { amount: true }
      }
    }
  })

  const nasabahList = penggunas.map(u => {
    const totalTabungan = u.transaksiNabungs.reduce((acc, curr) => acc + toNumber(curr.totalValue), 0)
    const totalPenarikan = u.withdrawals.reduce((acc, curr) => acc + toNumber(curr.amount), 0)
    const saldoTersedia = toNumber(u.saldo?.saldoTersedia)
    const saldoTertahan = toNumber(u.saldo?.saldoTertahan)
    const saldoSaatIni = saldoTersedia + saldoTertahan

    return {
      id: u.id,
      name: u.name,
      memberCode: u.memberCode,
      status: 'active', // All nasabah are considered active if they have the role
      totalTabungan,
      totalPenarikan,
      saldoSaatIni
    }
  }).sort((a, b) => b.saldoSaatIni - a.saldoSaatIni)

  return NextResponse.json({
    ringkasan: {
      totalSaldoNasabah,
      tabunganMasukHariIni: toNumber(tabunganMasukHariIniAgg._sum.totalValue),
      totalPenarikanHariIni: toNumber(penarikanHariIniAgg._sum.amount),
      tabunganMasukKeseluruhan: toNumber(tabunganMasukKeseluruhanAgg._sum.totalValue),
      totalPenarikanKeseluruhan: toNumber(penarikanKeseluruhanAgg._sum.amount),
      jumlahNasabahAktif: activeUsersCount
    },
    list: nasabahList
  })
}
