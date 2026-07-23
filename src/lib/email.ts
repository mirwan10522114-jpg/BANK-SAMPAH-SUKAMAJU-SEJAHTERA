// =====================================================================
// Gmail SMTP Email Service — untuk kirim OTP verifikasi email
// ---------------------------------------------------------------------
// Pakai Nodemailer + Gmail SMTP. Bisa kirim ke email SIAPAPUN tanpa
// perlu verify domain (beda dengan Resend free tier).
//
// PRASYARAT:
//   1. Aktifkan 2-Step Verification di Google Account
//      https://myaccount.google.com/security
//   2. Buat App Password di:
//      https://myaccount.google.com/apppasswords
//   3. Isi .env:
//      SMTP_HOST=smtp.gmail.com
//      SMTP_PORT=587
//      SMTP_USER=mirwangenius06@gmail.com  (Gmail Anda)
//      SMTP_PASS=xxxx xxxx xxxx xxxx       (App Password 16 char)
//      SMTP_FROM_NAME=Bank Sampah Sukamaju
//      SMTP_FROM_EMAIL=mirwangenius06@gmail.com
//
// Limit: 500 email/hari (Gmail free tier) — cukup untuk testing & MVP.
// =====================================================================

import nodemailer from 'nodemailer'

interface SendOtpEmailParams {
  to: string
  otp: string
  userName: string
}

interface SendOtpEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

// =====================================================================
// HTML template untuk email OTP
// =====================================================================

function buildOtpEmailHtml(params: { userName: string; otp: string }): string {
  const { userName, otp } = params
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifikasi Email - Bank Sampah Sukamaju</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5dc;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5dc;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#2d5016;padding:24px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;">BANK SAMPAH SUKAMAJU</h1>
              <p style="margin:4px 0 0 0;color:#ffc107;font-size:12px;letter-spacing:2px;">SEJAHTERA</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px 0;color:#2d5016;font-size:18px;">Halo, ${userName}!</h2>
              <p style="margin:0 0 16px 0;color:#374151;font-size:14px;line-height:1.6;">
                Terima kasih sudah mendaftar di Bank Sampah Sukamaju Sejahtera.
                Untuk mengaktifkan akun Anda, silakan masukkan kode verifikasi (OTP) berikut:
              </p>
              <!-- OTP Code -->
              <div style="text-align:center;margin:24px 0;">
                <div style="display:inline-block;background-color:#f5f5dc;border:2px dashed #4caf50;border-radius:8px;padding:16px 32px;">
                  <span style="font-size:32px;font-weight:bold;color:#2d5016;letter-spacing:8px;font-family:'Courier New',monospace;">${otp}</span>
                </div>
              </div>
              <p style="margin:0 0 16px 0;color:#374151;font-size:14px;line-height:1.6;">
                Kode ini berlaku selama <strong>10 menit</strong>. Jangan bagikan kode ini kepada siapapun.
              </p>
              <div style="background-color:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;margin:16px 0;border-radius:4px;">
                <p style="margin:0;color:#92400e;font-size:13px;">
                  <strong>⚠️ Penting:</strong> Jika Anda tidak mendaftar di Bank Sampah Sukamaju,
                  abaikan email ini. Akun tidak akan dibuat tanpa verifikasi OTP.
                </p>
              </div>
              <p style="margin:16px 0 0 0;color:#6b7280;font-size:12px;line-height:1.5;">
                Email ini dikirim otomatis. Jangan balas email ini.<br>
                Jika ada pertanyaan, hubungi admin Bank Sampah Sukamaju.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#2d2d2d;padding:20px 32px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:11px;">
                © 2026 Bank Sampah Sukamaju Sejahtera. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// =====================================================================
// Lazy-init transporter (hanya create saat pertama kali dipakai)
// =====================================================================

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  const user = process.env.SMTP_USER || ''
  const pass = process.env.SMTP_PASS || ''

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports (587 = TLS)
    auth: {
      user,
      pass,
    },
  })

  return transporter
}

// =====================================================================
// Cek apakah SMTP sudah dikonfigurasi
// =====================================================================

export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS)
}

// =====================================================================
// Kirim email OTP via Gmail SMTP
// =====================================================================

export async function sendOtpEmail(params: SendOtpEmailParams): Promise<SendOtpEmailResult> {
  const { to, otp, userName } = params

  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) {
    return {
      success: false,
      error: 'SMTP_USER atau SMTP_PASS belum dikonfigurasi di .env',
    }
  }

  const fromName = process.env.SMTP_FROM_NAME || 'Bank Sampah Sukamaju'
  const fromEmail = process.env.SMTP_FROM_EMAIL || user

  try {
    const transport = getTransporter()
    // Log recipient untuk debugging
    console.log('[email] Sending OTP to:', to, '| from:', fromEmail)
    const info = await transport.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: 'Kode Verifikasi OTP - Bank Sampah Sukamaju',
      html: buildOtpEmailHtml({ userName, otp }),
    })
    console.log('[email] OTP sent successfully to:', to, '| messageId:', info.messageId)

    return {
      success: true,
      messageId: info.messageId,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

// =====================================================================
// Generate random 6-digit OTP
// =====================================================================

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}
