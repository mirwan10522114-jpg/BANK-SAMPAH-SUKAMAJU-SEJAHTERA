import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const params = await context.params
  const { userId: penggunaId } = params

  if (!penggunaId) {
    return NextResponse.json({ error: 'Pengguna ID is required' }, { status: 400 })
  }

  const pengguna = await db.pengguna.findUnique({
    where: { id: penggunaId },
    select: {
      id: true,
      name: true,
      memberCode: true,
      saldo: true
    }
  })

  if (!pengguna) {
    return NextResponse.json({ error: 'Pengguna not found' }, { status: 404 })
  }

  // Fetch Saving Transactions
  const savings = await db.transaksiNabung.findMany({
    where: {
      penggunaId,
      qcStatus: { in: ['passed', 'adjusted', 'tidak_perlu'] }
    },
    select: {
      id: true,
      kodeTransaksi: true,
      totalValue: true,
      transactedAt: true,
    }
  })

  // Fetch Withdrawals
  const withdrawals = await db.permintaanPenarikan.findMany({
    where: {
      penggunaId,
      status: 'sukses'
    },
    select: {
      id: true,
      amount: true,
      createdAt: true,
      method: true
    }
  })

  // Merge and sort
  const history: any[] = []

  savings.forEach(s => {
    history.push({
      id: s.id,
      tanggal: s.transactedAt,
      jenis: 'Menabung',
      keterangan: `Menabung sampah (Ref: ${s.kodeTransaksi || s.id})`,
      masuk: toNumber(s.totalValue),
      keluar: 0,
    })
  })

  withdrawals.forEach(w => {
    history.push({
      id: w.id,
      tanggal: w.createdAt,
      jenis: 'Penarikan',
      keterangan: `Penarikan saldo (${w.method})`,
      masuk: 0,
      keluar: toNumber(w.amount),
    })
  })

  // Sort by date ASCENDING to calculate running saldo
  history.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime())

  let runningBalance = 0
  let totalTabungan = 0
  let totalPenarikan = 0

  history.forEach(h => {
    runningBalance += h.masuk
    runningBalance -= h.keluar
    h.saldoSetelah = runningBalance

    totalTabungan += h.masuk
    totalPenarikan += h.keluar
  })

  // Sort back to DESCENDING for UI
  history.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())

  return NextResponse.json({
    pengguna: {
      name: pengguna.name,
      memberCode: pengguna.memberCode,
      saldoSaatIni: toNumber(pengguna.saldo?.saldoTersedia) + toNumber(pengguna.saldo?.saldoTertahan),
      totalTabungan,
      totalPenarikan,
      jumlahTransaksi: history.length
    },
    history
  })
}
