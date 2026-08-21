import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'

// ============================================================
// POST /api/koperasi/tagihan
// Kirim email tagihan pinjaman ke anggota
// Body: { pinjamanId: string }  → tagih 1 pinjaman spesifik
// Body: { tagihSemua: true }    → tagih semua pinjaman yang jatuh tempo
// ============================================================

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { pinjamanId, tagihSemua } = body as { pinjamanId?: string; tagihSemua?: boolean }

  try {
    let pinjamans: any[] = []

    if (pinjamanId) {
      // Tagih 1 pinjaman spesifik
      const p = await db.koperasiPinjaman.findUnique({
        where: { id: pinjamanId },
        include: {
          anggota: { include: { user: { select: { email: true, name: true } } } },
          angsurans: { orderBy: { angsuranKe: 'asc' } },
        },
      })
      if (!p) return NextResponse.json({ error: 'Pinjaman tidak ditemukan' }, { status: 404 })
      pinjamans = [p]
    } else if (tagihSemua) {
      // Tagih semua pinjaman berjalan yang punya angsuran jatuh tempo
      pinjamans = await db.koperasiPinjaman.findMany({
        where: { status: 'berjalan' },
        include: {
          anggota: { include: { user: { select: { email: true, name: true } } } },
          angsurans: { orderBy: { angsuranKe: 'asc' } },
        },
      })
    } else {
      return NextResponse.json({ error: 'Parameter pinjamanId atau tagihSemua wajib' }, { status: 400 })
    }

    const { sendStrukEmail } = await import('@/lib/email')
    const fmtIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

    let sentCount = 0
    let failedCount = 0
    const results: any[] = []

    for (const p of pinjamans) {
      const agt = p.anggota
      if (!agt?.user?.email) {
        failedCount++
        results.push({ nomorPinjaman: p.nomorPinjaman, status: 'skip', error: 'Email tidak tersedia' })
        continue
      }

      // Cari angsuran yang belum dibayar (jatuh tempo)
      const unpaidAngsurans = p.angsurans.filter((a: any) => !a.tanggalBayar)
      if (unpaidAngsurans.length === 0) {
        results.push({ nomorPinjaman: p.nomorPinjaman, status: 'skip', error: 'Tidak ada angsuran jatuh tempo' })
        continue
      }

      // Cek angsuran pertama yang jatuh tempo (paling mendesak)
      const nextAngsuran = unpaidAngsurans[0]
      const today = new Date()
      // Estimasi jatuh tempo: tanggal pengajuan + (angsuranKe × 30 hari)
      const pengajuanDate = new Date(p.tanggalPengajuan)
      const jatuhTempo = new Date(pengajuanDate)
      jatuhTempo.setDate(jatuhTempo.getDate() + (nextAngsuran.angsuranKe * 30))
      const selisihHari = Math.ceil((jatuhTempo.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      let statusTagihan = 'normal'
      let statusLabel = 'Jatuh tempo segera'
      let urgensi = 'info'
      if (selisihHari < 0) {
        statusTagihan = 'terlambat'
        statusLabel = `TERLAMBAT ${Math.abs(selisihHari)} hari`
        urgensi = 'danger'
      } else if (selisihHari <= 7) {
        statusTagihan = 'mendekati'
        statusLabel = `Jatuh tempo dalam ${selisihHari} hari`
        urgensi = 'warning'
      } else {
        statusLabel = `Jatuh tempo dalam ${selisihHari} hari`
      }

      // Build email HTML
      const headerColor = urgensi === 'danger' ? '#dc2626' : urgensi === 'warning' ? '#f59e0b' : '#2d5016'
      const headerBg = urgensi === 'danger' ? '#fef2f2' : urgensi === 'warning' ? '#fffbeb' : '#f0fdf4'

      let html = `<!DOCTYPE html>
<html lang="id">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Tagihan Pinjaman</title></head>
<body style="margin:0;padding:0;background-color:#f5f5dc;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5dc;padding:20px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background-color:${headerColor};padding:24px 32px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;">📌 PENGINGAT TAGIHAN PINJAMAN</h1>
          <p style="margin:4px 0 0 0;color:#ffffff;font-size:12px;opacity:0.9;">Koperasi Sukamaju Sejahtera</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <div style="background:${headerBg};border-left:4px solid ${headerColor};padding:12px 16px;margin-bottom:20px;border-radius:4px;">
            <p style="margin:0;font-size:14px;color:${headerColor};font-weight:bold;">⚠️ ${statusLabel}</p>
          </div>
          <p style="margin:0 0 16px 0;font-size:14px;color:#374151;">Halo <strong>${agt.user.name}</strong>,</p>
          <p style="margin:0 0 16px 0;font-size:14px;color:#6b7280;line-height:1.6;">
            Ini adalah pengingat untuk pembayaran angsuran pinjaman Anda. Mohon segera lakukan pembayaran sebelum jatuh tempo.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <tr style="background-color:#f9fafb;">
              <td style="padding:10px 16px;font-size:13px;color:#6b7280;"><strong>No. Pinjaman:</strong></td>
              <td style="padding:10px 16px;font-size:13px;color:#2d5016;font-weight:bold;font-family:monospace;">${p.nomorPinjaman}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#6b7280;"><strong>Jumlah Pinjaman:</strong></td>
              <td style="padding:10px 16px;font-size:13px;color:#374151;">${fmtIDR(toNumber(p.jumlahPinjaman))}</td>
            </tr>
            <tr style="background-color:#f9fafb;">
              <td style="padding:10px 16px;font-size:13px;color:#6b7280;"><strong>Angsuran/Bulan:</strong></td>
              <td style="padding:10px 16px;font-size:13px;color:#374151;font-weight:bold;">${fmtIDR(toNumber(p.angsuranPerBulan))}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#6b7280;"><strong>Sisa Pinjaman:</strong></td>
              <td style="padding:10px 16px;font-size:13px;color:#374151;">${fmtIDR(toNumber(p.sisaPinjaman))}</td>
            </tr>
            <tr style="background-color:#f9fafb;">
              <td style="padding:10px 16px;font-size:13px;color:#6b7280;"><strong>Angsuran Ke:</strong></td>
              <td style="padding:10px 16px;font-size:13px;color:#374151;">${nextAngsuran.angsuranKe} dari ${p.tenorBulan}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#6b7280;"><strong>Jatuh Tempo:</strong></td>
              <td style="padding:10px 16px;font-size:13px;color:${headerColor};font-weight:bold;">${jatuhTempo.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
            </tr>
            <tr style="background-color:${headerBg};">
              <td style="padding:10px 16px;font-size:13px;color:${headerColor};"><strong>Status:</strong></td>
              <td style="padding:10px 16px;font-size:13px;color:${headerColor};font-weight:bold;text-transform:uppercase;">${statusLabel}</td>
            </tr>
          </table>
          <div style="background:#fef3c7;border:1px solid #f59e0b;padding:12px 16px;border-radius:6px;margin:16px 0;">
            <p style="margin:0;font-size:12px;color:#92400e;">
              <strong>📌 Cara Pembayaran:</strong><br>
              Datang ke kantor Koperasi Sukamaju Sejahtera atau hubungi admin untuk pembayaran angsuran.
              Pembayaran dapat dilakukan tunai atau transfer.
            </p>
          </div>
          <p style="margin:20px 0 0 0;font-size:12px;color:#9ca3af;text-align:center;">
            Email ini dikirim otomatis. Mohon tidak membalas email ini.<br>
            Jika sudah membayar, abaikan email ini.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

      try {
        await sendStrukEmail({
          to: agt.user.email,
          subject: `📌 Tagihan Pinjaman ${p.nomorPinjaman} — ${statusLabel}`,
          strukHtml: html,
        })
        sentCount++
        results.push({ nomorPinjaman: p.nomorPinjaman, nama: agt.user.name, email: agt.user.email, status: 'sent', statusLabel })
      } catch (e: any) {
        failedCount++
        results.push({ nomorPinjaman: p.nomorPinjaman, nama: agt.user.name, status: 'failed', error: e.message })
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      total: pinjamans.length,
      results,
    })
  } catch (error: any) {
    console.error('[Tagihan] Error:', error)
    return NextResponse.json({ error: `Gagal kirim tagihan: ${error.message}` }, { status: 500 })
  }
}

// GET: list pinjaman yang jatuh tempo (untuk display di admin)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const filter = searchParams.get('filter') || 'all' // all | jatuh_tempo | terlambat

  const pinjamans = await db.koperasiPinjaman.findMany({
    where: { status: 'berjalan' },
    include: {
      anggota: { include: { user: { select: { name: true, email: true, phone: true } } } },
      angsurans: { orderBy: { angsuranKe: 'asc' } },
    },
    orderBy: { tanggalPengajuan: 'desc' },
  })

  const today = new Date()
  const results = pinjamans.map((p) => {
    const unpaid = p.angsurans.filter((a) => !a.tanggalBayar)
    const nextAngsuran = unpaid[0]
    if (!nextAngsuran) return null

    const pengajuanDate = new Date(p.tanggalPengajuan)
    const jatuhTempo = new Date(pengajuanDate)
    jatuhTempo.setDate(jatuhTempo.getDate() + (nextAngsuran.angsuranKe * 30))
    const selisihHari = Math.ceil((jatuhTempo.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    let status = 'normal'
    let statusLabel = `${selisihHari} hari lagi`
    if (selisihHari < 0) {
      status = 'terlambat'
      statusLabel = `Terlambat ${Math.abs(selisihHari)} hari`
    } else if (selisihHari <= 7) {
      status = 'mendekati'
      statusLabel = `${selisihHari} hari lagi`
    }

    return {
      id: p.id,
      nomorPinjaman: p.nomorPinjaman,
      nama: p.anggota?.user?.name || '-',
      email: p.anggota?.user?.email || '',
      phone: p.anggota?.user?.phone || '',
      jumlahPinjaman: toNumber(p.jumlahPinjaman),
      angsuranPerBulan: toNumber(p.angsuranPerBulan),
      sisaPinjaman: toNumber(p.sisaPinjaman),
      tenorBulan: p.tenorBulan,
      angsuranKe: nextAngsuran.angsuranKe,
      jatuhTempo: jatuhTempo.toISOString(),
      selisihHari,
      status,
      statusLabel,
    }
  }).filter(Boolean)

  // Filter
  let filtered = results
  if (filter === 'jatuh_tempo') {
    filtered = results.filter((r: any) => r.status === 'mendekati' || r.status === 'normal')
  } else if (filter === 'terlambat') {
    filtered = results.filter((r: any) => r.status === 'terlambat')
  }

  return NextResponse.json({
    pinjamans: filtered,
    summary: {
      total: results.length,
      terlambat: results.filter((r: any) => r.status === 'terlambat').length,
      mendekati: results.filter((r: any) => r.status === 'mendekati').length,
      normal: results.filter((r: any) => r.status === 'normal').length,
    },
  })
}
