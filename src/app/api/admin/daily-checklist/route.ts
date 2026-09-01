import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber, formatRupiah } from '@/lib/format'
import { getDailyTaskLogs, recordDailyTaskLog, getLocalDateString } from '@/backend/lib/daily-task-log'

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
    const todayDateString = getLocalDateString(today)

    // 0. Ambil Log Tugas Hari Ini dari Database
    const dailyLogs = await getDailyTaskLogs(todayDateString)

    const qcLog = dailyLogs.find((l: any) => (l.taskKey || l.taskkey) === 'antrian_qc_verification')
    const simpananLog = dailyLogs.find((l: any) => (l.taskKey || l.taskkey) === 'simpanan_wajib_reminder')
    const pinjamanLog = dailyLogs.find((l: any) => (l.taskKey || l.taskkey) === 'pinjaman_reminders')

    // 1. ANTRIAN QC SAMPAH (Nabung & Sedekah berstatus menunggu_qc)
    const [pendingSavingQc, pendingSedekahQc] = await Promise.all([
      db.savingTransaction.count({ where: { status: 'menunggu_qc' } }),
      db.sedekahTransaction.count({ where: { status: 'menunggu_qc' } }),
    ])
    const totalPendingQc = pendingSavingQc + pendingSedekahQc
    const isQcDone = totalPendingQc === 0 || !!qcLog

    // SUSUN DAFTAR TUGAS OPERASIONAL ADMIN
    const tasks: any[] = [
      {
        id: 'antrian_qc_verification',
        title: 'Verifikasi Antrian QC Sampah (Nabung & Sedekah)',
        description: totalPendingQc === 0
          ? 'Tidak ada antrian QC sampah tertunda. Semua sampah telah ditimbang & lolos QC.'
          : qcLog
          ? `✓ Antrian QC telah diverifikasi / ditandai selesai hari ini.`
          : `Terdapat ${totalPendingQc} transaksi sampah (${pendingSavingQc} tabungan, ${pendingSedekahQc} sedekah) menunggu verifikasi QC.`,
        category: 'operasional',
        iconName: 'CheckCircle2',
        isDone: isQcDone,
        count: isQcDone ? 0 : totalPendingQc,
        priority: totalPendingQc > 0 ? 'high' : 'low',
        actionLabel: 'Buka Antrian QC',
        targetSection: 'operasional',
        details: {
          pendingSavingQc,
          pendingSedekahQc,
          totalPendingQc,
        },
      },
    ]

    // 2. PINJAMAN KOPERASI (Hanya jika ada yang tepat H-30, H-14, H-7, H-3)
    const pinjamans = await db.koperasiPinjaman.findMany({
      where: { status: 'berjalan' },
      include: {
        anggota: { include: { user: { select: { name: true, email: true, phone: true } } } },
        angsurans: { orderBy: { angsuranKe: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const loansNeedingAction: any[] = []
    for (const p of pinjamans) {
      const paidCount = p.angsurans?.length || 0
      const nextAngsuranKe = paidCount + 1
      if (nextAngsuranKe > p.tenorBulan || toNumber(p.sisaPinjaman) <= 0) continue

      const baseDate = new Date(p.tanggalPencairan || p.tanggalPengajuan)
      const jatuhTempo = new Date(baseDate)
      jatuhTempo.setMonth(jatuhTempo.getMonth() + nextAngsuranKe)
      
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const jatuhTempoStart = new Date(jatuhTempo.getFullYear(), jatuhTempo.getMonth(), jatuhTempo.getDate())
      const selisihHari = Math.floor((jatuhTempoStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24))

      let categoryUrgency: 'h3' | 'h7' | 'h14' | 'h30' | 'aman' = 'aman'
      let urgencyLabel = ''

      if (selisihHari === 3) {
        categoryUrgency = 'h3'
        urgencyLabel = `Jatuh tempo H-3 hari`
      } else if (selisihHari === 7) {
        categoryUrgency = 'h7'
        urgencyLabel = `Jatuh tempo H-7 hari`
      } else if (selisihHari === 14) {
        categoryUrgency = 'h14'
        urgencyLabel = `Jatuh tempo H-14 hari`
      } else if (selisihHari === 30) {
        categoryUrgency = 'h30'
        urgencyLabel = `Jatuh tempo H-30 hari`
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

    const isPinjamanDone = loansNeedingAction.length === 0 || !!pinjamanLog
    tasks.push({
      id: 'pinjaman_reminders',
      title: 'Penagihan Pinjaman Anggota (H-30, H-14, H-7, H-3)',
      description: loansNeedingAction.length === 0
        ? 'Semua jadwal angsuran pinjaman dalam kondisi aman / tidak ada yang jatuh tempo tepat di H-30, H-14, H-7, atau H-3 hari ini.'
        : pinjamanLog
        ? `✓ Sudah ditagih hari ini (${pinjamanLog.sentCount} email terkirim pada ${new Date(pinjamanLog.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB). Selesai untuk hari ini!`
        : `Ada ${loansNeedingAction.length} anggota dengan pinjaman yang jatuh tempo tepat pada H-30, H-14, H-7, atau H-3 hari ini.`,
      category: 'koperasi',
      iconName: 'Banknote',
      isDone: isPinjamanDone,
      count: isPinjamanDone ? 0 : loansNeedingAction.length,
      priority: loansNeedingAction.length === 0 ? 'low' : loansNeedingAction.some((l) => l.categoryUrgency === 'h3') ? 'high' : 'medium',
      actionLabel: loansNeedingAction.length === 0 ? 'Buka Tagihan' : 'Kirim Tagihan Pinjaman',
      targetSection: 'pengumuman',
      targetTab: 'tagihan',
      details: {
        items: loansNeedingAction.slice(0, 8),
        total: loansNeedingAction.length,
        lastBlast: pinjamanLog ? {
          sentCount: pinjamanLog.sentCount,
          time: new Date(pinjamanLog.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        } : null,
      },
    })

    // 3. SIMPANAN WAJIB (Hanya perlu blast jika tanggal 1)
    if (today.getDate() === 1) {
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

      const isSimpananDone = membersUnpaidWajib.length === 0 || !!simpananLog

      tasks.push({
        id: 'simpanan_wajib_reminder',
        title: `Reminder Iuran Simpanan Wajib (${namaBulan})`,
        description: membersUnpaidWajib.length === 0
          ? `Seluruh anggota koperasi telah melunasi simpanan wajib untuk bulan ${namaBulan}.`
          : simpananLog
          ? `✓ Pengingat Simpanan Wajib telah di-blast hari ini (${simpananLog.sentCount} email terkirim pada ${new Date(simpananLog.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB). Selesai untuk hari ini!`
          : `Terdapat ${membersUnpaidWajib.length} anggota yang belum setor simpanan wajib bulan ini. (Khusus Tanggal 1)`,
        category: 'koperasi',
        iconName: 'Wallet',
        isDone: isSimpananDone,
        count: isSimpananDone ? 0 : membersUnpaidWajib.length,
        priority: 'high',
        actionLabel: 'Blast Reminder Simpanan',
        targetSection: 'pengumuman',
        targetTab: 'simpanan_wajib',
        details: {
          totalAnggota: anggotas.length,
          belumBayar: membersUnpaidWajib.length,
          nominalWajib,
          namaBulan,
          sampleMembers: membersUnpaidWajib.slice(0, 5),
          lastBlast: simpananLog ? {
            sentCount: simpananLog.sentCount,
            time: new Date(simpananLog.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          } : null,
        },
      })
    } else {
      tasks.push({
        id: 'simpanan_wajib_reminder',
        title: `Reminder Iuran Simpanan Wajib (${namaBulan})`,
        description: 'Aman. Pengingat Simpanan Wajib hanya perlu dikirim pada tanggal 1 setiap bulannya.',
        category: 'koperasi',
        iconName: 'Wallet',
        isDone: true,
        count: 0,
        priority: 'low',
        actionLabel: 'Buka Simpanan',
        targetSection: 'pengumuman',
        targetTab: 'simpanan_wajib',
        details: null,
      })
    }

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

// ============================================================
// POST /api/admin/daily-checklist
// Menandai tugas harian selesai / merekam tindakan manual
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { taskKey, action = 'manual_complete', notes } = body as { taskKey: string; action?: string; notes?: string }

    if (!taskKey) {
      return NextResponse.json({ error: 'taskKey wajib diisi' }, { status: 400 })
    }

    const todayDateString = getLocalDateString()
    const result = await recordDailyTaskLog({
      taskKey,
      dateString: todayDateString,
      action,
      sentCount: 1,
      failedCount: 0,
      notes: notes || 'Ditandai selesai oleh admin',
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[Daily Checklist POST] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
