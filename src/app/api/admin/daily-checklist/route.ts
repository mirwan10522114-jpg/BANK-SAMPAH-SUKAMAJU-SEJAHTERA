import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber, formatRupiah } from '@/lib/format'

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

// ============================================================
// GET /api/admin/daily-checklist
// Mengambil status seluruh tugas & reminder harian operasional admin
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const today = new Date()
    const currentMonth = today.getMonth() + 1
    const currentYear = today.getFullYear()
    const namaBulan = `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`

    // 1. PINJAMAN KOPERASI (Cek tagihan jatuh tempo H-30, H-14, H-7, H-3, & Terlambat)
    const pinjamans = await db.koperasiPinjaman.findMany({
      where: { status: 'berjalan' },
      include: {
        anggota: { include: { user: { select: { name: true, email: true, phone: true } } } },
        angsurans: { orderBy: { angsuranKe: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const loansNeedingAction: any[] = []
    let totalPinjamanBerjalan = 0

    for (const p of pinjamans) {
      const paidCount = p.angsurans?.length || 0
      const nextAngsuranKe = paidCount + 1
      if (nextAngsuranKe > p.tenorBulan || toNumber(p.sisaPinjaman) <= 0) continue

      totalPinjamanBerjalan++

      const baseDate = new Date(p.tanggalPencairan || p.tanggalPengajuan)
      const jatuhTempo = new Date(baseDate)
      jatuhTempo.setMonth(jatuhTempo.getMonth() + nextAngsuranKe)
      const selisihHari = Math.ceil((jatuhTempo.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      let categoryUrgency: 'terlambat' | 'h3' | 'h7' | 'h14' | 'h30' | 'aman' = 'aman'
      let urgencyLabel = ''

      if (selisihHari < 0) {
        categoryUrgency = 'terlambat'
        urgencyLabel = `Terlambat ${Math.abs(selisihHari)} hari`
      } else if (selisihHari <= 3) {
        categoryUrgency = 'h3'
        urgencyLabel = `Jatuh tempo ${selisihHari === 0 ? 'HARI INI' : `H-${selisihHari} hari`}`
      } else if (selisihHari <= 7) {
        categoryUrgency = 'h7'
        urgencyLabel = `Jatuh tempo H-${selisihHari} hari`
      } else if (selisihHari <= 14) {
        categoryUrgency = 'h14'
        urgencyLabel = `Jatuh tempo H-${selisihHari} hari`
      } else if (selisihHari <= 30) {
        categoryUrgency = 'h30'
        urgencyLabel = `Jatuh tempo H-${selisihHari} hari`
      }

      if (categoryUrgency !== 'aman') {
        loansNeedingAction.push({
          id: p.id,
          nomorPinjaman: p.nomorPinjaman,
          nama: p.anggota?.nama || p.anggota?.user?.name || '-',
          email: p.anggota?.user?.email || '',
          angsuranPerBulan: toNumber(p.angsuranPerBulan),
          angsuranKe: nextAngsuranKe,
          tenorBulan: p.tenorBulan,
          jatuhTempo: jatuhTempo.toISOString(),
          selisihHari,
          categoryUrgency,
          urgencyLabel,
        })
      }
    }

    // 2. SIMPANAN WAJIB (Cek anggota yang belum menyetor iuran wajib bulan ini)
    const startDateMonth = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0)
    const endDateMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999)

    const setting = await db.koperasiSetting.findFirst()
    const nominalWajib = setting ? toNumber(setting.nominalSimpananWajib) : 0

    const anggotas = await db.koperasiAnggota.findMany({
      where: { status: 'aktif' },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        simpananTx: {
          where: {
            jenisSimpanan: 'wajib',
            tipe: 'setor',
            tanggalTransaksi: { gte: startDateMonth, lte: endDateMonth },
          },
        },
      },
    })

    const membersUnpaidWajib = anggotas.filter((a) => {
      const totalSetor = (a.simpananTx || []).reduce((sum, tx) => sum + toNumber(tx.jumlah), 0)
      return totalSetor < nominalWajib
    }).map((a) => ({
      id: a.id,
      nomorAnggota: a.nomorAnggota,
      nama: a.nama || a.user?.name || '-',
      email: a.user?.email || '',
    }))

    // 3. ANTRIAN QC SAMPAH (Nabung & Sedekah berstatus menunggu_qc)
    const [pendingSavingQc, pendingSedekahQc] = await Promise.all([
      db.savingTransaction.count({ where: { status: 'menunggu_qc' } }),
      db.sedekahTransaction.count({ where: { status: 'menunggu_qc' } }),
    ])
    const totalPendingQc = pendingSavingQc + pendingSedekahQc

    // 4. STOK PRODUK OLAHAN (Cek apakah ada produk aktif dengan stok 0 / habis)
    const outOfStockProducts = await db.product.findMany({
      where: { stock: { lte: 0 }, isActive: true },
      select: { id: true, name: true, unit: true, price: true },
    })

    // 5. KAS & SALDO
    const kasBankSampah = await db.bankSampahKas.findFirst({ orderBy: { createdAt: 'desc' } })
    const saldoKasBankSampah = kasBankSampah ? toNumber(kasBankSampah.saldoSetelah) : 0

    // SUSUN DAFTAR TUGAS OPERASIONAL ADMIN
    const tasks = [
      {
        id: 'pinjaman_reminders',
        title: 'Penagihan Pinjaman Anggota (H-30, H-14, H-7, H-3 & Terlambat)',
        description: loansNeedingAction.length === 0
          ? 'Semua jadwal angsuran pinjaman dalam kondisi aman / telah ditagih.'
          : `Ada ${loansNeedingAction.length} anggota dengan pinjaman yang perlu diingatkan (jatuh tempo ≤30 hari / terlambat).`,
        category: 'koperasi',
        iconName: 'Banknote',
        isDone: loansNeedingAction.length === 0,
        count: loansNeedingAction.length,
        priority: loansNeedingAction.some((l) => l.categoryUrgency === 'terlambat' || l.categoryUrgency === 'h3') ? 'high' : 'medium',
        actionLabel: 'Kirim Tagihan Pinjaman',
        targetSection: 'pengumuman',
        targetTab: 'tagihan',
        details: {
          items: loansNeedingAction.slice(0, 8),
          total: loansNeedingAction.length,
          terlambatCount: loansNeedingAction.filter((l) => l.categoryUrgency === 'terlambat').length,
          h3Count: loansNeedingAction.filter((l) => l.categoryUrgency === 'h3').length,
          h7Count: loansNeedingAction.filter((l) => l.categoryUrgency === 'h7').length,
          h14Count: loansNeedingAction.filter((l) => l.categoryUrgency === 'h14').length,
          h30Count: loansNeedingAction.filter((l) => l.categoryUrgency === 'h30').length,
        },
      },
      {
        id: 'simpanan_wajib_reminder',
        title: `Reminder Iuran Simpanan Wajib (${namaBulan})`,
        description: membersUnpaidWajib.length === 0
          ? `Seluruh anggota koperasi telah melunasi simpanan wajib untuk bulan ${namaBulan}.`
          : `Terdapat ${membersUnpaidWajib.length} dari ${anggotas.length} anggota yang belum setor simpanan wajib (${formatRupiah(nominalWajib)}/bln).`,
        category: 'koperasi',
        iconName: 'Wallet',
        isDone: membersUnpaidWajib.length === 0,
        count: membersUnpaidWajib.length,
        priority: today.getDate() <= 10 ? 'high' : 'medium',
        actionLabel: 'Blast Reminder Simpanan',
        targetSection: 'pengumuman',
        targetTab: 'simpanan_wajib',
        details: {
          totalAnggota: anggotas.length,
          belumBayar: membersUnpaidWajib.length,
          nominalWajib,
          namaBulan,
          sampleMembers: membersUnpaidWajib.slice(0, 5),
        },
      },
      {
        id: 'antrian_qc_verification',
        title: 'Verifikasi Antrian QC Sampah (Nabung & Sedekah)',
        description: totalPendingQc === 0
          ? 'Tidak ada antrian QC sampah tertunda. Semua sampah telah ditimbang & lolos QC.'
          : `Terdapat ${totalPendingQc} transaksi sampah (${pendingSavingQc} tabungan, ${pendingSedekahQc} sedekah) menunggu verifikasi QC.`,
        category: 'operasional',
        iconName: 'CheckCircle2',
        isDone: totalPendingQc === 0,
        count: totalPendingQc,
        priority: totalPendingQc > 0 ? 'high' : 'low',
        actionLabel: 'Buka Antrian QC',
        targetSection: 'operasional',
        details: {
          pendingSavingQc,
          pendingSedekahQc,
          totalPendingQc,
        },
      },
      {
        id: 'stok_produk_monitoring',
        title: 'Pengecekan Ketersediaan Stok Produk Upcycle',
        description: outOfStockProducts.length === 0
          ? 'Katalog produk memiliki stok yang cukup untuk penjualan offline & online.'
          : `Terdapat ${outOfStockProducts.length} produk dengan stok habis (0 pcs) yang perlu dijadwalkan pengolahan.`,
        category: 'inventaris',
        iconName: 'Package',
        isDone: outOfStockProducts.length === 0,
        count: outOfStockProducts.length,
        priority: outOfStockProducts.length > 0 ? 'medium' : 'low',
        actionLabel: 'Buka Pengolahan & Inventaris',
        targetSection: 'inventaris',
        details: {
          outOfStockProducts,
        },
      },
    ]

    const totalTasks = tasks.length
    const completedTasks = tasks.filter((t) => t.isDone).length
    const pendingTasks = totalTasks - completedTasks
    const progressPercent = Math.round((completedTasks / totalTasks) * 100)
    const isAllDone = completedTasks === totalTasks

    const dateFormatted = today.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    return NextResponse.json({
      dateFormatted,
      namaBulan,
      tasks,
      summary: {
        totalTasks,
        completedTasks,
        pendingTasks,
        progressPercent,
        isAllDone,
        statusText: isAllDone
          ? '🎉 Selesai Bekerja! Semua tugas dan checklist harian telah tuntas dikerjakan.'
          : `${completedTasks} dari ${totalTasks} tugas tuntas (${progressPercent}%). Ada ${pendingTasks} tugas yang perlu ditindaklanjuti.`,
      },
    })
  } catch (error: any) {
    console.error('[Daily Checklist] Error:', error)
    return NextResponse.json({ error: `Gagal memuat daily checklist: ${error.message}` }, { status: 500 })
  }
}
