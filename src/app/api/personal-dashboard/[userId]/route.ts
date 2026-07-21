import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'

// Personal Dashboard for Nasabah Bank Sampah
// Returns: profile, balance/points, tren tabungan (6 months), komposisi kategori,
// riwayat tabungan, sedekah, poin, penukaran

export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      balance: true,
      savingTransactions: {
        orderBy: { transactedAt: 'desc' },
        take: 50,
        include: { items: { include: { wasteItem: { include: { category: true } } } } },
      },
      sedekahTransactions: {
        orderBy: { transactedAt: 'desc' },
        take: 50,
        include: { items: { include: { wasteItem: { include: { category: true } } } } },
      },
      pointHistories: { orderBy: { createdAt: 'desc' }, take: 50 },
      redemptions: {
        orderBy: { redeemedAt: 'desc' },
        take: 50,
        include: { product: true },
      },
      koperasiAnggota: {
        select: {
          id: true,
          nomorAnggota: true,
          status: true,
          tanggalBergabung: true,
          simpananSaldos: { select: { jenisSimpanan: true, saldo: true } },
        },
      },
    },
  })

  if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  const balance = user.balance || { saldoTertahan: 0, saldoTersedia: 0, points: 0 }

  // Compute total ditabung (kg)
  const totalDitabung = user.savingTransactions.reduce((s, t) => s + toNumber(t.totalWeight), 0)

  // ===== Chart range filter (dynamic) =====
  // Supports: 1bul | 3bul | 6bul | 1thn | custom
  // Mirrors the executive dashboard API pattern.
  const chartRange = _req.nextUrl.searchParams.get('chartRange') || '6bul'
  const chartDari = _req.nextUrl.searchParams.get('chartDari') // yyyy-mm-dd
  const chartSampai = _req.nextUrl.searchParams.get('chartSampai') // yyyy-mm-dd

  const now = new Date()
  let chartStart: Date
  let chartEnd: Date = now
  let monthCount = 6 // default for 6bul

  if (chartRange === 'custom' && chartDari && chartSampai) {
    chartStart = new Date(chartDari)
    chartStart.setHours(0, 0, 0, 0)
    chartEnd = new Date(chartSampai)
    chartEnd.setHours(23, 59, 59, 999)
    // Compute month span for bucket pre-fill (min 1)
    monthCount = Math.max(1, (chartEnd.getFullYear() - chartStart.getFullYear()) * 12 + (chartEnd.getMonth() - chartStart.getMonth()) + 1)
  } else if (chartRange === '1bul') {
    chartStart = new Date(now.getFullYear(), now.getMonth(), 1)
    monthCount = 1
  } else if (chartRange === '3bul') {
    chartStart = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    monthCount = 3
  } else if (chartRange === '1thn') {
    chartStart = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    monthCount = 12
  } else {
    // 6bul (default)
    chartStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    monthCount = 6
  }

  // Tren tabungan - monthly kg buckets, pre-filled across the chosen range
  const savingInRange = user.savingTransactions.filter(
    (t) => t.transactedAt >= chartStart && t.transactedAt <= chartEnd,
  )
  const monthLabels: string[] = []
  const monthKeys: string[] = []
  // For custom range, start from chartStart's month; otherwise, count back from current month
  if (chartRange === 'custom' && chartDari && chartSampai) {
    for (let i = 0; i < monthCount; i++) {
      const d = new Date(chartStart.getFullYear(), chartStart.getMonth() + i, 1)
      if (d > chartEnd) break
      monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
      monthLabels.push(d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }))
    }
  } else {
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
      monthLabels.push(d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }))
    }
  }
  const buckets: Record<string, number> = {}
  for (const k of monthKeys) buckets[k] = 0
  for (const t of savingInRange) {
    const k = `${t.transactedAt.getFullYear()}-${String(t.transactedAt.getMonth() + 1).padStart(2, '0')}`
    if (buckets[k] !== undefined) buckets[k] += toNumber(t.totalWeight)
  }
  const trenTabungan = monthKeys.map((k, i) => ({
    month: monthLabels[i],
    berat: Math.round(buckets[k] * 100) / 100,
  }))

  // Komposisi kategori (from saving items, filtered by chart range)
  const catMap: Record<string, number> = {}
  for (const t of savingInRange) {
    for (const it of t.items) {
      const cat = it.categoryNameSnapshot || it.wasteItem?.category?.name || 'Lainnya'
      catMap[cat] = (catMap[cat] || 0) + toNumber(it.quantity)
    }
  }
  const komposisiKategori = Object.entries(catMap)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)

  // Riwayat tabungan (flatten items)
  const riwayatTabungan: any[] = []
  for (const t of user.savingTransactions) {
    for (const it of t.items) {
      const price = toNumber(it.pricePerUnitSnapshot)
      riwayatTabungan.push({
        id: it.id,
        tanggal: t.transactedAt,
        barang: `${it.itemCodeSnapshot} · ${it.itemNameSnapshot}`,
        berat: toNumber(it.quantity),
        poin: 0, // computed per item not stored; approximate from subtotal
        nilai: toNumber(it.subtotal),
      })
    }
  }

  // Riwayat sedekah — flatten items, keep QC fields
  const riwayatSedekah: any[] = []
  for (const t of user.sedekahTransactions) {
    const beratKotorTx = toNumber(t.totalWeightKotor)
    const beratBersihTx = t.totalWeightBersih != null ? toNumber(t.totalWeightBersih) : toNumber(t.totalWeight)
    const susutTx = t.persentaseSusut != null ? toNumber(t.persentaseSusut) : 0
    for (const it of t.items) {
      const beratKotor = toNumber(it.quantityBeforeQc) > 0 ? toNumber(it.quantityBeforeQc) : toNumber(it.quantity)
      const beratBersih = it.quantityAfterQc != null ? toNumber(it.quantityAfterQc) : toNumber(it.quantity)
      const susut = toNumber(it.susutQc)
      riwayatSedekah.push({
        id: it.id,
        tanggal: t.transactedAt,
        kategori: it.categoryNameSnapshot || it.wasteItem?.category?.name || '-',
        barang: `${it.itemCodeSnapshot} · ${it.itemNameSnapshot}`,
        beratKotor,
        beratBersih,
        susut,
        qcStatus: t.qcStatus || 'pending',
        // Transaction-level aggregates (useful for total summary)
        _txBeratKotor: beratKotorTx,
        _txBeratBersih: beratBersihTx,
        _txSusut: susutTx,
      })
    }
  }

  // Riwayat poin
  const riwayatPoin = user.pointHistories.map((p) => ({
    id: p.id,
    tanggal: p.createdAt,
    tipe: p.type,
    poin: p.points,
    saldo: p.balanceAfter,
    deskripsi: p.description || '-',
  }))

  // Riwayat penukaran (redemptions)
  const riwayatPenukaran = user.redemptions.map((r) => ({
    id: r.id,
    tanggal: r.redeemedAt,
    produk: r.productNameSnapshot,
    qty: toNumber(r.quantity),
    poin: r.pointsUsed,
  }))

  return NextResponse.json({
    profile: {
      id: user.id,
      name: user.name,
      memberCode: user.memberCode,
      email: user.email,
      phone: user.phone,
      address: user.address,
      nik: user.nik,
      roles: JSON.parse(user.roles || '[]'),
      isMember: user.isMember,
      memberJoinedAt: user.memberJoinedAt,
    },
    saldo: {
      saldoTersedia: toNumber(balance.saldoTersedia),
      saldoTertahan: toNumber(balance.saldoTertahan),
      poin: balance.points,
      totalDitabung: Math.round(totalDitabung * 100) / 100,
    },
    trenTabungan,
    komposisiKategori,
    riwayat: {
      tabungan: riwayatTabungan.slice(0, 20),
      sedekah: riwayatSedekah.slice(0, 20),
      poin: riwayatPoin.slice(0, 20),
      penukaran: riwayatPenukaran.slice(0, 20),
    },
    koperasiInfo: user.koperasiAnggota ? {
      anggotaId: user.koperasiAnggota.id,
      nomorAnggota: user.koperasiAnggota.nomorAnggota,
      status: user.koperasiAnggota.status,
      tanggalBergabung: user.koperasiAnggota.tanggalBergabung,
      simpananSaldos: user.koperasiAnggota.simpananSaldos.map((s: any) => ({
        jenisSimpanan: s.jenisSimpanan,
        saldo: toNumber(s.saldo),
      })),
    } : null,
  })
}
