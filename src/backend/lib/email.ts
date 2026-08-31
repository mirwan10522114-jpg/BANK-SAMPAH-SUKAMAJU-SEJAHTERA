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

// =====================================================================
// Kirim struk transaksi via email (universal)
// =====================================================================

interface SendStrukEmailParams {
  to: string
  subject: string
  strukHtml: string
  attachments?: nodemailer.Attachment[]
}

export async function sendStrukEmail(params: SendStrukEmailParams): Promise<{ success: boolean; error?: string }> {
  const { to, subject, strukHtml } = params

  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) {
    console.warn('[Struk Email] SMTP not configured, skipping')
    return { success: false, error: 'SMTP belum dikonfigurasi' }
  }

  if (!to || !to.trim()) {
    return { success: false, error: 'Email penerima tidak tersedia' }
  }

  const fromName = process.env.SMTP_FROM_NAME || 'Bank Sampah Sukamaju'
  const fromEmail = process.env.SMTP_FROM_EMAIL || user

  // Wrap struk HTML in email template — ECO-FRIENDLY DESIGN
  // Palet: Green theme (#43A047 primary, #E8F5E9 bg, #2E7D32 dark)
  // Style: Card-based, rounded corners, icons, clean whitespace
  const emailHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
      background-color: #E8F5E9;
      padding: 24px 12px;
      color: #212121;
    }
    .struk-container {
      width: 100%;
      max-width: 520px;
      margin: 0 auto;
      background: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(76, 175, 80, 0.15);
      border: 1px solid #C8E6C9;
    }
    table { width: 100%; border-collapse: collapse; }

    /* HEADER — gradient hijau dengan ilustrasi feel */
    .struk-header {
      background: linear-gradient(135deg, #43A047 0%, #2E7D32 100%);
      color: #FFFFFF;
      text-align: center;
      padding: 28px 20px 24px;
      position: relative;
    }
    .struk-header .icon {
      font-size: 36px;
      margin-bottom: 8px;
      display: inline-block;
      width: 56px; height: 56px;
      line-height: 56px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
    }
    .struk-header h2 {
      font-size: 22px; font-weight: 800;
      text-transform: uppercase; letter-spacing: 0.05em;
      color: #FFFFFF; margin: 0;
    }
    .struk-header .sub {
      font-size: 13px; font-weight: 500;
      color: #C8E6C9; margin-top: 4px;
    }
    .struk-header .desc {
      font-size: 11px; color: #A5D6A7;
      margin-top: 4px;
    }
    .struk-header .badge {
      display: inline-block;
      background: #FFFFFF; color: #2E7D32;
      padding: 6px 18px; font-size: 11px; font-weight: 800;
      text-transform: uppercase; letter-spacing: 0.08em;
      margin-top: 12px; border-radius: 20px;
    }

    /* SECTIONS — clean padding */
    .struk-section {
      padding: 16px 20px;
      border-bottom: 1px solid #F1F8E9;
    }
    .struk-section:last-of-type { border-bottom: none; }
    .struk-section .label {
      font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.04em;
      color: #43A047; margin-bottom: 12px;
      display: flex; align-items: center; gap: 6px;
    }
    .struk-section .label::before {
      content: ''; display: inline-block;
      width: 3px; height: 14px; background: #43A047;
      border-radius: 2px;
    }

    /* INFO ROWS — dengan icon feel */
    .info-row {
      display: flex; justify-content: space-between; align-items: baseline;
      gap: 12px; margin-bottom: 8px;
      padding: 4px 0;
    }
    .info-row:last-child { margin-bottom: 0; }
    .info-row .key {
      color: #757575; flex-shrink: 0;
      font-size: 13px; font-weight: 500;
    }
    .info-row .val {
      text-align: right; color: #212121;
      font-weight: 600; font-size: 14px;
      word-break: break-word;
    }
    .info-row .val.mono {
      font-family: 'SF Mono', 'Consolas', 'Courier New', monospace;
      background: #F5F5F5; padding: 3px 10px;
      border-radius: 6px; font-size: 13px;
      color: #2E7D32;
    }
    .info-row .val.bold { font-weight: 800; color: #2E7D32; }
    .info-row .val.capitalize { text-transform: capitalize; }

    /* ITEMS TABLE — header hijau solid */
    .items-table {
      width: 100%; font-size: 12px;
      margin-top: 4px;
      border-radius: 8px; overflow: hidden;
    }
    .items-table thead th {
      background: #43A047;
      font-size: 10px; text-transform: uppercase;
      color: #FFFFFF; font-weight: 700;
      padding: 10px 8px; text-align: left;
      letter-spacing: 0.03em;
    }
    .items-table thead th.right { text-align: right; }
    .items-table thead th.center { text-align: center; }
    .items-table tbody td {
      padding: 10px 8px;
      border-bottom: 1px solid #F1F8E9;
      color: #424242; vertical-align: top;
      font-size: 12px; line-height: 1.5;
    }
    .items-table tbody tr:nth-child(even) td {
      background: #FAFFF5;
    }
    .items-table tbody td.right {
      text-align: right; font-weight: 600;
      color: #212121; font-variant-numeric: tabular-nums;
    }
    .items-table tbody td.center { text-align: center; }
    .items-table tbody td.mono {
      font-family: 'SF Mono', 'Consolas', monospace;
      font-size: 11px;
    }
    .items-table tbody tr:last-child td { border-bottom: none; }
    .items-table tbody tr.total-row td {
      background: #E8F5E9; border-top: 2px solid #43A047;
      font-weight: 800; color: #1B5E20; font-size: 13px;
    }

    /* SUMMARY — card style dengan icon circle */
    .summary-box {
      display: flex; align-items: center; gap: 12px;
      padding: 12px; margin-bottom: 8px;
      background: #F1F8E9; border-radius: 10px;
    }
    .summary-box .icon-circle {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
    }
    .summary-box .info { flex: 1; }
    .summary-box .info .key {
      font-size: 11px; color: #757575; font-weight: 500;
    }
    .summary-box .info .val {
      font-size: 16px; font-weight: 800; color: #212121;
      font-variant-numeric: tabular-nums;
    }
    .summary-box.highlight {
      background: #E8F5E9; border: 2px solid #43A047;
    }
    .summary-box.highlight .icon-circle {
      background: #43A047;
    }
    .summary-box.highlight .info .key {
      color: #2E7D32; font-weight: 700;
    }
    .summary-box.highlight .info .val {
      color: #1B5E20; font-size: 20px;
    }
    .summary-box.poin .icon-circle {
      background: #FFB300;
    }
    .summary-box.poin .info .val {
      color: #E65100;
    }

    /* SUMMARY ROW (untuk fallback simple) */
    .summary-row {
      display: flex; justify-content: space-between;
      align-items: center; padding: 6px 0;
      font-size: 13px; margin-bottom: 3px;
    }
    .summary-row:last-child { margin-bottom: 0; }
    .summary-row .key { color: #757575; font-size: 13px; font-weight: 500; }
    .summary-row .val { font-weight: 600; color: #212121; }
    .summary-row.highlight {
      background: #E8F5E9; border-left: 4px solid #43A047;
      padding: 12px 14px; border-radius: 8px; margin-top: 8px;
    }
    .summary-row.highlight .key { color: #1B5E20; font-weight: 700; }
    .summary-row.highlight .val { color: #2E7D32; font-weight: 800; font-size: 18px; }

    .notes { font-size: 11px; font-style: italic; color: #9E9E9E; line-height: 1.5; margin-top: 8px; }

    /* FOOTER — pesan terima kasih */
    .struk-footer {
      padding: 24px 20px; text-align: center;
      background: #E8F5E9; border-top: 1px solid #C8E6C9;
    }
    .struk-footer .heart { font-size: 24px; margin-bottom: 8px; }
    .struk-footer .thanks {
      font-size: 14px; font-weight: 800; color: #2E7D32;
    }
    .struk-footer .sub-thanks {
      font-size: 12px; color: #757575; margin-top: 6px; line-height: 1.6;
    }
    .signature-area {
      display: flex; justify-content: space-between;
      gap: 12px; margin-top: 16px; font-size: 11px; color: #BDBDBD;
    }
    .signature-area .sig { flex: 1; text-align: center; }
    .signature-area .sig .line { height: 36px; }
    .signature-area .sig .label {
      border-top: 1px solid #E0E0E0; padding-top: 4px;
      font-weight: 500; color: #757575;
    }

    .email-info {
      text-align: center; font-size: 11px;
      color: #9E9E9E; padding: 16px 12px 0;
      max-width: 520px; margin: 0 auto; line-height: 1.6;
    }
    .email-info .brand {
      font-weight: 800; color: #2E7D32; font-size: 13px;
      margin-bottom: 4px; display: block;
    }
  </style>
</head>
<body>
  <div class="struk-container">
    ${strukHtml}
  </div>
  <div class="email-info">
    <span class="brand">♻ BANK SAMPAH SUKAMAJU SEJAHTERA</span>
    Email ini dikirim otomatis oleh sistem.<br/>
    Mohon tidak membalas email ini. Untuk pertanyaan, hubungi admin.
  </div>
</body>
</html>`

  try {
    const transport = getTransporter()
    console.log('[Struk Email] Sending to:', to, '| subject:', subject)
    const info = await transport.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html: emailHtml,
      attachments: params.attachments,
    })
    console.log('[Struk Email] Sent successfully to:', to, '| messageId:', info.messageId)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Struk Email] Error:', message)
    return { success: false, error: message }
  }
}

// =====================================================================
// Kirim email konfirmasi pesanan (untuk order online Midtrans)
// =====================================================================

interface OrderItemEmail {
  productName: string
  quantity: number
  unit: string
  pricePerUnit: number
  subtotal: number
}

interface SendOrderEmailParams {
  to: string
  buyerName: string
  orderNumber: string
  items: OrderItemEmail[]
  subtotal: number
  ongkir: number
  total: number
  paymentMethod: string
  buyerAddress?: string
  buyerPhone?: string
  kurirNama?: string
  notes?: string
}

export async function sendOrderConfirmationEmail(params: SendOrderEmailParams): Promise<{ success: boolean; error?: string }> {
  const { to, buyerName, orderNumber, items, subtotal, ongkir, total, paymentMethod, buyerAddress, buyerPhone, kurirNama, notes } = params

  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) {
    console.warn('[Order Email] SMTP not configured, skipping')
    return { success: false, error: 'SMTP belum dikonfigurasi' }
  }

  if (!to || !to.trim()) {
    return { success: false, error: 'Email pembeli tidak tersedia' }
  }

  const fromName = process.env.SMTP_FROM_NAME || 'Bank Sampah Sukamaju'
  const fromEmail = process.env.SMTP_FROM_EMAIL || user
  const fmtIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  const itemsHtml = items.map((item, i) => `
    <tr style="border-bottom: 1px solid #f0f0f0;">
      <td style="padding:10px 12px;font-size:13px;color:#374151;">${i + 1}</td>
      <td style="padding:10px 12px;font-size:13px;color:#374151;">${item.productName}</td>
      <td style="padding:10px 12px;font-size:13px;color:#374151;text-align:center;">${item.quantity} ${item.unit}</td>
      <td style="padding:10px 12px;font-size:13px;color:#374151;text-align:right;">${fmtIDR(item.pricePerUnit)}</td>
      <td style="padding:10px 12px;font-size:13px;color:#111827;font-weight:600;text-align:right;">${fmtIDR(item.subtotal)}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="id">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Konfirmasi Pesanan</title></head>
<body style="margin:0;padding:0;background-color:#f5f5dc;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5dc;padding:20px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background-color:#2d5016;padding:24px 32px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;">BANK SAMPAH SUKAMAJU</h1>
          <p style="margin:4px 0 0 0;color:#ffc107;font-size:12px;letter-spacing:2px;">SEJAHTERA</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 8px 0;color:#2d5016;font-size:18px;">Terima kasih atas pesanan Anda!</h2>
          <p style="margin:0 0 20px 0;font-size:14px;color:#6b7280;">Halo <strong>${buyerName}</strong>, pesanan Anda telah kami terima dan pembayaran telah dikonfirmasi.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;"><strong>Nomor Pesanan:</strong> <span style="color:#2d5016;font-weight:bold;font-family:monospace;">${orderNumber}</span></td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;"><strong>Metode Pembayaran:</strong> <span style="color:#374151;text-transform:capitalize;">${paymentMethod}</span></td></tr>
            ${buyerPhone ? `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;"><strong>No. Telepon:</strong> <span style="color:#374151;">${buyerPhone}</span></td></tr>` : ''}
            ${kurirNama ? `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;"><strong>Kurir:</strong> <span style="color:#374151;">${kurirNama}</span></td></tr>` : ''}
            ${buyerAddress ? `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;"><strong>Alamat:</strong> <span style="color:#374151;">${buyerAddress}</span></td></tr>` : ''}
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:16px;">
            <thead><tr style="background-color:#f9fafb;">
              <th style="padding:10px 12px;font-size:12px;color:#6b7280;text-align:left;">No</th>
              <th style="padding:10px 12px;font-size:12px;color:#6b7280;text-align:left;">Produk</th>
              <th style="padding:10px 12px;font-size:12px;color:#6b7280;text-align:center;">Qty</th>
              <th style="padding:10px 12px;font-size:12px;color:#6b7280;text-align:right;">Harga</th>
              <th style="padding:10px 12px;font-size:12px;color:#6b7280;text-align:right;">Subtotal</th>
            </tr></thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
              <tr style="border-top:1px solid #e5e7eb;"><td colspan="4" style="padding:8px 12px;font-size:13px;color:#6b7280;text-align:right;">Subtotal Produk</td><td style="padding:8px 12px;font-size:13px;color:#374151;text-align:right;">${fmtIDR(subtotal)}</td></tr>
              ${ongkir > 0 ? `<tr style="border-top:1px solid #e5e7eb;"><td colspan="4" style="padding:8px 12px;font-size:13px;color:#6b7280;text-align:right;">Ongkos Kirim</td><td style="padding:8px 12px;font-size:13px;color:#374151;text-align:right;">${fmtIDR(ongkir)}</td></tr>` : ''}
              <tr style="background-color:#ecfdf5;border-top:2px solid #2d5016;"><td colspan="4" style="padding:10px 12px;font-size:14px;color:#2d5016;font-weight:bold;text-align:right;">Total Pembayaran</td><td style="padding:10px 12px;font-size:16px;color:#2d5016;font-weight:bold;text-align:right;">${fmtIDR(total)}</td></tr>
            </tfoot>
          </table>
          <p style="margin:20px 0 0 0;font-size:12px;color:#9ca3af;text-align:center;">Email ini dikirim otomatis. Mohon tidak membalas email ini.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    const transport = getTransporter()
    console.log('[Order Email] Sending to:', to, '| order:', orderNumber)
    const info = await transport.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: `Konfirmasi Pesanan ${orderNumber} - Bank Sampah Sukamaju Sejahtera`,
      html,
    })
    console.log('[Order Email] Sent to:', to, '| messageId:', info.messageId)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Order Email] Error:', message)
    return { success: false, error: message }
  }
}
