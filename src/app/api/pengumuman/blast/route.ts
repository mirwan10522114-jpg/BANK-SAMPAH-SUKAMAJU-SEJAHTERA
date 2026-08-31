import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import path from 'path'
import fs from 'fs'

// ============================================================
// POST /api/pengumuman/blast
// Kirim pengumuman/pengumuman ke semua email terdaftar
// Body: { judul, pesan, gambarUrl? }
// ============================================================

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { judul, pesan, gambarUrl } = body as { judul: string; pesan: string; gambarUrl?: string }

  if (!judul?.trim()) return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 })
  if (!pesan?.trim()) return NextResponse.json({ error: 'Pesan wajib diisi' }, { status: 400 })

  try {
    // Ambil semua user yang punya email & sudah verifikasi
    const users = await db.user.findMany({
      where: {
        email: { not: '' },
        emailVerifiedAt: { not: null },
      },
      select: { email: true, name: true },
    })

    if (users.length === 0) {
      return NextResponse.json({ error: 'Tidak ada user dengan email terverifikasi' }, { status: 400 })
    }

    const { sendStrukEmail } = await import('@/lib/email')
    const fromName = process.env.SMTP_FROM_NAME || 'Bank Sampah Sukamaju'
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER

    // Handle Gambar: Gunakan CID (Content-ID) inline attachment agar selalu tampil di Gmail/Outlook/Apple Mail
    const attachments: any[] = []
    let gambarHtml = ''

    if (gambarUrl && gambarUrl.trim()) {
      const cleanUrl = gambarUrl.trim()
      const cid = 'banner_pengumuman'

      let localFilePath = ''
      if (cleanUrl.startsWith('/uploads/') || cleanUrl.startsWith('uploads/')) {
        const rel = cleanUrl.startsWith('/') ? cleanUrl.slice(1) : cleanUrl
        localFilePath = path.join(process.cwd(), 'public', rel)
      } else if (cleanUrl.startsWith('http://localhost') || cleanUrl.startsWith('http://127.0.0.1')) {
        try {
          const urlObj = new URL(cleanUrl)
          const rel = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname
          localFilePath = path.join(process.cwd(), 'public', rel)
        } catch {}
      }

      if (localFilePath && fs.existsSync(localFilePath)) {
        attachments.push({
          filename: path.basename(localFilePath),
          path: localFilePath,
          cid: cid,
        })
        gambarHtml = `<div style="text-align:center;margin:24px 0;">
          <img src="cid:${cid}" alt="${judul}" style="max-width:100%;max-height:480px;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.12);display:inline-block;" />
        </div>`
      } else if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
        attachments.push({
          path: cleanUrl,
          cid: cid,
        })
        gambarHtml = `<div style="text-align:center;margin:24px 0;">
          <img src="cid:${cid}" alt="${judul}" style="max-width:100%;max-height:480px;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.12);display:inline-block;" />
        </div>`
      }
    }

    const html = `<!DOCTYPE html>
<html lang="id">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${judul}</title></head>
<body style="margin:0;padding:0;background-color:#f5f5dc;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5dc;padding:20px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#2d5016 0%,#4a7c2c 100%);padding:28px 32px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:bold;">${judul}</h1>
          <p style="margin:6px 0 0 0;color:#ffc107;font-size:12px;letter-spacing:2px;">BANK SAMPAH SUKAMAJU SEJAHTERA</p>
        </td></tr>
        <tr><td style="padding:32px;">
          ${gambarHtml}
          <div style="font-size:14px;color:#374151;line-height:1.8;white-space:pre-wrap;">${pesan}</div>
          <div style="margin-top:24px;padding:16px;background:#f0fdf4;border-radius:8px;border:1px solid #d1fae5;">
            <p style="margin:0;font-size:13px;color:#065f46;text-align:center;">
              <strong>📞 Hubungi kami:</strong><br>
              Admin Bank Sampah Sukamaju Sejahtera<br>
              Email: ${fromEmail}
            </p>
          </div>
          <p style="margin:24px 0 0 0;font-size:11px;color:#9ca3af;text-align:center;">
            Email ini dikirim otomatis oleh sistem. Mohon tidak membalas email ini.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    // Kirim email ke semua user (batch)
    let sentCount = 0
    let failedCount = 0
    const failures: string[] = []

    for (const u of users) {
      try {
        await sendStrukEmail({
          to: u.email,
          subject: `📢 ${judul}`,
          strukHtml: html.replace('${nama}', u.name || 'Nasabah'),
          attachments: attachments.length > 0 ? attachments : undefined,
        })
        sentCount++
      } catch (e: any) {
        failedCount++
        failures.push(`${u.email}: ${e.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      total: users.length,
      failures: failures.slice(0, 10),
    })
  } catch (error: any) {
    console.error('[Pengumuman Blast] Error:', error)
    return NextResponse.json({ error: `Gagal kirim pengumuman: ${error.message}` }, { status: 500 })
  }
}
