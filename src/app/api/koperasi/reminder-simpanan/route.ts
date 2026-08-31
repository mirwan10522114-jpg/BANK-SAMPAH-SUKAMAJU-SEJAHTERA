import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

// ============================================================
// GET /api/koperasi/reminder-simpanan
// List anggota status pembayaran Simpanan Wajib per bulan
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') || 'all' // all | belum_bayar | sudah_bayar
    const now = new Date()
    const bulan = parseInt(searchParams.get('bulan') || String(now.getMonth() + 1), 10)
    const tahun = parseInt(searchParams.get('tahun') || String(now.getFullYear()), 10)

    const startDate = new Date(tahun, bulan - 1, 1, 0, 0, 0, 0)
    const endDate = new Date(tahun, bulan, 0, 23, 59, 59, 999)

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
            tanggalTransaksi: { gte: startDate, lte: endDate },
          },
        },
        simpananSaldos: true,
      },
      orderBy: { nama: 'asc' },
    })

    const results = anggotas.map((a) => {
      const totalSetorBulanIni = (a.simpananTx || []).reduce((sum, tx) => sum + toNumber(tx.jumlah), 0)
      const sudahBayar = nominalWajib > 0 ? totalSetorBulanIni >= nominalWajib : totalSetorBulanIni > 0
      const kekurangan = Math.max(0, nominalWajib - totalSetorBulanIni)
      const saldoWajibTotal = toNumber(a.simpananSaldos.find((s) => s.jenisSimpanan === 'wajib')?.saldo || 0)

      return {
        id: a.id,
        nomorAnggota: a.nomorAnggota,
        nama: a.nama || a.user?.name || '-',
        email: a.user?.email || '',
        phone: a.user?.phone || a.noTelepon || '',
        totalSetorBulanIni,
        kekurangan,
        nominalWajib,
        saldoWajibTotal,
        status: sudahBayar ? 'sudah_bayar' : 'belum_bayar',
        statusLabel: sudahBayar ? 'Lunas Bulan Ini' : 'Belum Setor',
        lastPaymentDate: a.simpananTx[0]?.tanggalTransaksi ? a.simpananTx[0].tanggalTransaksi.toISOString() : null,
      }
    })

    let filtered = results
    if (filter === 'belum_bayar') {
      filtered = results.filter((r) => r.status === 'belum_bayar')
    } else if (filter === 'sudah_bayar') {
      filtered = results.filter((r) => r.status === 'sudah_bayar')
    }

    const belumBayarCount = results.filter((r) => r.status === 'belum_bayar').length
    const sudahBayarCount = results.filter((r) => r.status === 'sudah_bayar').length
    const totalTerkumpul = results.reduce((s, r) => s + r.totalSetorBulanIni, 0)

    return NextResponse.json({
      bulan,
      tahun,
      namaBulan: `${MONTH_NAMES[bulan - 1]} ${tahun}`,
      nominalWajib,
      anggotas: filtered,
      summary: {
        totalAnggota: results.length,
        belumBayar: belumBayarCount,
        sudahBayar: sudahBayarCount,
        totalTerkumpul,
        potensiTerkumpul: results.length * nominalWajib,
      },
    })
  } catch (error: any) {
    console.error('[Reminder Simpanan] Error:', error)
    return NextResponse.json({ error: `Gagal memuat data simpanan: ${error.message}` }, { status: 500 })
  }
}

// ============================================================
// POST /api/koperasi/reminder-simpanan
// Blast / kirim email reminder Simpanan Wajib ke anggota koperasi
// Body: { anggotaId?: string; blastSemua?: boolean; bulan?: number; tahun?: number; pesanKustom?: string }
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { anggotaId, blastSemua, pesanKustom } = body as {
      anggotaId?: string
      blastSemua?: boolean
      bulan?: number
      tahun?: number
      pesanKustom?: string
    }

    const now = new Date()
    const bulan = body.bulan || (now.getMonth() + 1)
    const tahun = body.tahun || now.getFullYear()
    const namaBulan = `${MONTH_NAMES[bulan - 1]} ${tahun}`

    const startDate = new Date(tahun, bulan - 1, 1, 0, 0, 0, 0)
    const endDate = new Date(tahun, bulan, 0, 23, 59, 59, 999)

    const setting = await db.koperasiSetting.findFirst()
    const nominalWajib = setting ? toNumber(setting.nominalSimpananWajib) : 0

    let targetAnggotas: any[] = []

    if (anggotaId) {
      const a = await db.koperasiAnggota.findUnique({
        where: { id: anggotaId },
        include: {
          user: { select: { email: true, name: true } },
          simpananTx: {
            where: {
              jenisSimpanan: 'wajib',
              tipe: 'setor',
              tanggalTransaksi: { gte: startDate, lte: endDate },
            },
          },
        },
      })
      if (!a) return NextResponse.json({ error: 'Anggota tidak ditemukan' }, { status: 404 })
      targetAnggotas = [a]
    } else if (blastSemua) {
      const allActive = await db.koperasiAnggota.findMany({
        where: { status: 'aktif' },
        include: {
          user: { select: { email: true, name: true } },
          simpananTx: {
            where: {
              jenisSimpanan: 'wajib',
              tipe: 'setor',
              tanggalTransaksi: { gte: startDate, lte: endDate },
            },
          },
        },
      })

      // Hanya kirim ke anggota yang belum bayar lunas bulan ini
      targetAnggotas = allActive.filter((a) => {
        const totalSetor = (a.simpananTx || []).reduce((sum: number, tx: any) => sum + toNumber(tx.jumlah), 0)
        return totalSetor < nominalWajib
      })
    } else {
      return NextResponse.json({ error: 'Parameter anggotaId atau blastSemua wajib diisi' }, { status: 400 })
    }

    const { sendStrukEmail } = await import('@/lib/email')
    const fmtIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

    let sentCount = 0
    let failedCount = 0
    const results: any[] = []

    for (const agt of targetAnggotas) {
      const email = agt.user?.email
      if (!email) {
        failedCount++
        results.push({ nomorAnggota: agt.nomorAnggota, nama: agt.nama, status: 'skip', error: 'Email tidak terdaftar' })
        continue
      }

      const totalSetor = (agt.simpananTx || []).reduce((sum: number, tx: any) => sum + toNumber(tx.jumlah), 0)
      const kekurangan = Math.max(0, nominalWajib - totalSetor)

      let html = `<!DOCTYPE html>
<html lang="id">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Pengingat Simpanan Wajib</title></head>
<body style="margin:0;padding:0;background-color:#f5f5dc;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5dc;padding:20px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background-color:#0d9488;padding:24px 32px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;">💰 PENGINGAT SIMPANAN WAJIB</h1>
          <p style="margin:4px 0 0 0;color:#ffffff;font-size:12px;opacity:0.9;">Periode: ${namaBulan} · Koperasi Sukamaju Sejahtera</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <div style="background:#f0fdfa;border-left:4px solid #0d9488;padding:12px 16px;margin-bottom:20px;border-radius:4px;">
            <p style="margin:0;font-size:14px;color:#0f766e;font-weight:bold;">📢 Kewajiban Iuran Anggota Koperasi Bulanan</p>
          </div>
          <p style="margin:0 0 16px 0;font-size:14px;color:#374151;">Halo <strong>${agt.nama || agt.user?.name}</strong> (${agt.nomorAnggota}),</p>
          <p style="margin:0 0 16px 0;font-size:14px;color:#6b7280;line-height:1.6;">
            Ini adalah pengingat untuk penyetoran <strong>Simpanan Wajib</strong> Koperasi Sukamaju Sejahtera untuk periode <strong>${namaBulan}</strong>.
          </p>
          ${pesanKustom ? `<div style="background:#fefce8;border:1px solid #fef08a;padding:12px 16px;margin-bottom:20px;border-radius:6px;font-size:13px;color:#854d0e;"><strong>Pesan Pengurus:</strong><br>${pesanKustom}</div>` : ''}
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <tr style="background-color:#f9fafb;">
              <td style="padding:10px 16px;font-size:13px;color:#6b7280;"><strong>No. Anggota:</strong></td>
              <td style="padding:10px 16px;font-size:13px;color:#0f766e;font-weight:bold;font-family:monospace;">${agt.nomorAnggota}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#6b7280;"><strong>Nama Anggota:</strong></td>
              <td style="padding:10px 16px;font-size:13px;color:#374151;font-weight:bold;">${agt.nama}</td>
            </tr>
            <tr style="background-color:#f9fafb;">
              <td style="padding:10px 16px;font-size:13px;color:#6b7280;"><strong>Periode Iuran:</strong></td>
              <td style="padding:10px 16px;font-size:13px;color:#374151;">${namaBulan}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#6b7280;"><strong>Nominal Wajib:</strong></td>
              <td style="padding:10px 16px;font-size:13px;color:#0f766e;font-weight:bold;">${fmtIDR(nominalWajib)}</td>
            </tr>
            ${totalSetor > 0 ? `
            <tr style="background-color:#f9fafb;">
              <td style="padding:10px 16px;font-size:13px;color:#6b7280;"><strong>Sudah Disetor:</strong></td>
              <td style="padding:10px 16px;font-size:13px;color:#059669;font-weight:bold;">${fmtIDR(totalSetor)}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#6b7280;"><strong>Sisa Kekurangan:</strong></td>
              <td style="padding:10px 16px;font-size:13px;color:#dc2626;font-weight:bold;">${fmtIDR(kekurangan)}</td>
            </tr>
            ` : ''}
          </table>
          <div style="background:#ecfdf5;border:1px solid #a7f3d0;padding:12px 16px;border-radius:6px;margin:16px 0;">
            <p style="margin:0;font-size:12px;color:#065f46;">
              <strong>📌 Cara Penyetoran:</strong><br>
              Penyetoran simpanan wajib dapat dilakukan secara langsung di loket Teller Bank Sampah / Koperasi Sukamaju Sejahtera atau saat penimbangan sampah bulanan.
            </p>
          </div>
          <p style="margin:20px 0 0 0;font-size:12px;color:#9ca3af;text-align:center;">
            Email ini dikirim otomatis oleh sistem Koperasi Sukamaju Sejahtera.<br>
            Jika Anda sudah melakukan penyetoran, silakan abaikan pesan ini.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

      try {
        await sendStrukEmail({
          to: email,
          subject: `💰 Pengingat Simpanan Wajib (${namaBulan}) — ${agt.nama}`,
          strukHtml: html,
        })
        sentCount++
        results.push({ nomorAnggota: agt.nomorAnggota, nama: agt.nama, email, status: 'sent' })
      } catch (e: any) {
        failedCount++
        results.push({ nomorAnggota: agt.nomorAnggota, nama: agt.nama, email, status: 'failed', error: e.message })
      }
    }

    // Catat ke AdminDailyTaskLog agar checklist harian menandai tugas selesai untuk hari ini
    const todayDateString = now.toISOString().split('T')[0]
    const { recordDailyTaskLog } = await import('@/backend/lib/daily-task-log')
    await recordDailyTaskLog({
      taskKey: 'simpanan_wajib_reminder',
      dateString: todayDateString,
      action: blastSemua ? 'blast_email' : 'single_reminder',
      sentCount: sentCount || 1,
      failedCount,
      notes: `Blast reminder simpanan wajib (${namaBulan})`,
    })

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      total: targetAnggotas.length,
      results,
    })
  } catch (error: any) {
    console.error('[Blast Simpanan Wajib] Error:', error)
    return NextResponse.json({ error: `Gagal mengirim pengingat: ${error.message}` }, { status: 500 })
  }
}
