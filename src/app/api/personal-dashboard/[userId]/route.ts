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
      // Add withdrawalRequest history
      withdrawals: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      // Add balance releases history (as user — received by user)
      balanceReleasesAsUser: {
        orderBy: { createdAt: 'desc' },
        take: 50,
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

  // ============================================================
  // FILTER: HANYA TRANSAKSI DENGAN STATUS='selesai' YANG MASUK HITUNGAN
  // ------------------------------------------------------------
  // Transaksi "menunggu_qc" atau "dibatalkan" TIDAK masuk ke:
  // - totalDitabung (kg)
  // - trenTabungan (chart)
  // - komposisiKategori
  // Saldo nasabah hanya bertambah saat status → selesai (lihat nabung API)
  // Tapi riwayat tetap ditampilkan SEMUA (dengan badge status) supaya
  // nasabah tahu ada transaksi pending.
  // ============================================================
  const finalizedSavingTx = user.savingTransactions.filter((t) => t.status === 'selesai')
  const finalizedSedekahTx = user.sedekahTransactions.filter((t) => (t.status || 'selesai') === 'selesai')

  // Compute total ditabung (kg) — HANYA dari transaksi selesai
  const totalDitabung = finalizedSavingTx.reduce((s, t) => s + toNumber(t.totalWeight), 0)

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
  // HANYA dari transaksi final (status=selesai)
  const savingInRange = finalizedSavingTx.filter(
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
  // HANYA dari transaksi final
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

  // ============================================================
  // Riwayat tabungan — tampilkan SEMUA transaksi (termasuk pending QC)
  // dengan badge status supaya nasabah tahu ada transaksi pending.
  // Tapi data saldo/berat di summary hanya dari yang selesai.
  // ============================================================
  const riwayatTabungan: any[] = []
  for (const t of user.savingTransactions) {
    // Ambil item pertama untuk representasi (kalau multi-item, tampilkan total)
    const totalBeratItem = t.items.reduce((s, it) => s + toNumber(it.quantity), 0)
    const totalNilaiItem = t.items.reduce((s, it) => s + toNumber(it.subtotal), 0)
    const firstItem = t.items[0]
    const isMulti = t.items.length > 1
    riwayatTabungan.push({
      id: t.id,
      kode: t.kodeTransaksi || null, // format: NB / DDMMYYYY / 00001
      tanggal: t.transactedAt,
      barang: firstItem ? `${firstItem.itemCodeSnapshot} · ${firstItem.itemNameSnapshot}${isMulti ? ` (+${t.items.length - 1})` : ''}` : '-',
      berat: totalBeratItem, // total berat kotor (sebelum QC) atau berat final
      poin: t.pointsAwarded,
      nilai: t.status === 'selesai' ? toNumber(t.totalValue) : totalNilaiItem, // nilai final kalau selesai, estimasi kalau pending
      status: t.status, // menunggu_qc | selesai | dibatalkan
      qcStatus: t.qcStatus, // pending | tidak_perlu | passed | adjusted | rejected
    })
  }

  // Riwayat sedekah — flatten items, keep QC fields + kode transaksi
  const riwayatSedekah: any[] = []
  for (const t of finalizedSedekahTx.length > 0 ? finalizedSedekahTx : user.sedekahTransactions) {
    const beratKotorTx = toNumber(t.totalWeightKotor)
    const beratBersihTx = t.totalWeightBersih != null ? toNumber(t.totalWeightBersih) : toNumber(t.totalWeight)
    const susutTx = t.persentaseSusut != null ? toNumber(t.persentaseSusut) : 0
    for (const it of t.items) {
      const beratKotor = toNumber(it.quantityBeforeQc) > 0 ? toNumber(it.quantityBeforeQc) : toNumber(it.quantity)
      const beratBersih = it.quantityAfterQc != null ? toNumber(it.quantityAfterQc) : toNumber(it.quantity)
      const susut = toNumber(it.susutQc)
      riwayatSedekah.push({
        id: it.id,
        kode: t.kodeTransaksi || null, // format: SD / DDMMYYYY / 00001
        tanggal: t.transactedAt,
        kategori: it.categoryNameSnapshot || it.wasteItem?.category?.name || '-',
        barang: `${it.itemCodeSnapshot} · ${it.itemNameSnapshot}`,
        beratKotor,
        beratBersih,
        susut,
        qcStatus: t.qcStatus || 'pending',
        status: t.status || 'selesai',
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

  // Riwayat penarikan saldo (withdrawals)
  const riwayatPenarikan = (user as any).withdrawals?.map((w: any) => ({
    id: w.id,
    receiptNo: w.receiptNo,
    tanggal: w.createdAt,
    jumlah: toNumber(w.amount),
    metode: w.method,
    status: w.status,
    keterangan: w.notes,
    processedAt: w.processedAt,
  })) || []

  // Riwayat release saldo (saldo tertahan → tersedia)
  const riwayatRelease = (user as any).balanceReleasesAsUser?.map((r: any) => ({
    id: r.id,
    tanggal: r.createdAt,
    jumlah: toNumber(r.amount),
    status: r.status,
    keterangan: r.keterangan,
  })) || []

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
      tabungan: riwayatTabungan.slice(0, 50),
      sedekah: riwayatSedekah.slice(0, 50),
      poin: riwayatPoin.slice(0, 50),
      penukaran: riwayatPenukaran.slice(0, 50),
      penarikan: riwayatPenarikan,
      releaseSaldo: riwayatRelease,
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
