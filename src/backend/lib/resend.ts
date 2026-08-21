// =====================================================================
// Resend Email Service — untuk kirim OTP verifikasi email
// ---------------------------------------------------------------------
// Pakai Resend API (https://resend.com) — simple & reliable email API.
// API key dibaca dari env RESEND_API_KEY (tidak hardcode di source).
//
// Free tier: 100 emails/hari, 3000/bulan — cukup untuk testing & MVP.
// =====================================================================

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
// Kirim email OTP via Resend API
// =====================================================================

export async function sendOtpEmail(params: SendOtpEmailParams): Promise<SendOtpEmailResult> {
  const { to, otp, userName } = params

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return {
      success: false,
      error: 'RESEND_API_KEY belum dikonfigurasi di .env',
    }
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Bank Sampah Sukamaju <onboarding@resend.dev>'

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: 'Kode Verifikasi OTP - Bank Sampah Sukamaju',
        html: buildOtpEmailHtml({ userName, otp }),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `Resend API error (HTTP ${response.status})`
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.message) errorMessage = errorJson.message
      } catch {}
      return { success: false, error: errorMessage }
    }

    const data = await response.json()
    return {
      success: true,
      messageId: data.id,
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
// Kirim email konfirmasi pesanan (order confirmation)
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

interface SendOrderEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

function buildOrderEmailHtml(params: SendOrderEmailParams): string {
  const { buyerName, orderNumber, items, subtotal, ongkir, total, paymentMethod, buyerAddress, buyerPhone, kurirNama, notes } = params

  const itemsHtml = items.map((item, i) => `
    <tr style="border-bottom: 1px solid #f0f0f0;">
      <td style="padding:10px 12px;font-size:13px;color:#374151;">${i + 1}</td>
      <td style="padding:10px 12px;font-size:13px;color:#374151;">${item.productName}</td>
      <td style="padding:10px 12px;font-size:13px;color:#374151;text-align:center;">${item.quantity} ${item.unit}</td>
      <td style="padding:10px 12px;font-size:13px;color:#374151;text-align:right;">${formatRupiah(item.pricePerUnit)}</td>
      <td style="padding:10px 12px;font-size:13px;color:#111827;font-weight:600;text-align:right;">${formatRupiah(item.subtotal)}</td>
    </tr>
  `).join('')

  const addressHtml = buyerAddress ? `
    <tr>
      <td style="padding:4px 0;font-size:13px;color:#6b7280;"><strong>Alamat Pengiriman:</strong></td>
    </tr>
    <tr>
      <td style="padding:2px 0 12px 0;font-size:13px;color:#374151;">${buyerAddress}</td>
    </tr>` : ''

  const kurirHtml = kurirNama ? `
    <tr>
      <td style="padding:4px 0;font-size:13px;color:#6b7280;"><strong>Kurir:</strong> <span style="color:#374151;">${kurirNama}</span></td>
    </tr>` : ''

  const notesHtml = notes ? `
    <tr>
      <td style="padding:4px 0;font-size:13px;color:#6b7280;"><strong>Catatan:</strong> <span style="color:#374151;">${notes}</span></td>
    </tr>` : ''

  const ongkirHtml = ongkir > 0 ? `
    <tr style="border-top:1px solid #e5e7eb;">
      <td colspan="4" style="padding:8px 12px;font-size:13px;color:#6b7280;text-align:right;">Ongkos Kirim</td>
      <td style="padding:8px 12px;font-size:13px;color:#374151;text-align:right;">${formatRupiah(ongkir)}</td>
    </tr>` : ''

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Konfirmasi Pesanan - Bank Sampah Sukamaju</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5dc;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5dc;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
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
              <h2 style="margin:0 0 8px 0;color:#2d5016;font-size:18px;">Terima kasih atas pesanan Anda!</h2>
              <p style="margin:0 0 20px 0;font-size:14px;color:#6b7280;">Halo <strong>${buyerName}</strong>, pesanan Anda telah kami terima dan pembayaran telah dikonfirmasi. Berikut adalah detail pesanan Anda:</p>

              <!-- Order Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#6b7280;"><strong>Nomor Pesanan:</strong> <span style="color:#2d5016;font-weight:bold;font-family:monospace;">${orderNumber}</span></td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#6b7280;"><strong>Metode Pembayaran:</strong> <span style="color:#374151;text-transform:capitalize;">${paymentMethod}</span></td>
                </tr>
                ${buyerPhone ? `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;"><strong>No. Telepon:</strong> <span style="color:#374151;">${buyerPhone}</span></td></tr>` : ''}
                ${kurirHtml}
                ${addressHtml}
                ${notesHtml}
              </table>

              <!-- Items Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:16px;">
                <thead>
                  <tr style="background-color:#f9fafb;">
                    <th style="padding:10px 12px;font-size:12px;color:#6b7280;text-align:left;border-bottom:1px solid #e5e7eb;">No</th>
                    <th style="padding:10px 12px;font-size:12px;color:#6b7280;text-align:left;border-bottom:1px solid #e5e7eb;">Produk</th>
                    <th style="padding:10px 12px;font-size:12px;color:#6b7280;text-align:center;border-bottom:1px solid #e5e7eb;">Qty</th>
                    <th style="padding:10px 12px;font-size:12px;color:#6b7280;text-align:right;border-bottom:1px solid #e5e7eb;">Harga</th>
                    <th style="padding:10px 12px;font-size:12px;color:#6b7280;text-align:right;border-bottom:1px solid #e5e7eb;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr style="border-top:1px solid #e5e7eb;">
                    <td colspan="4" style="padding:8px 12px;font-size:13px;color:#6b7280;text-align:right;">Subtotal Produk</td>
                    <td style="padding:8px 12px;font-size:13px;color:#374151;text-align:right;">${formatRupiah(subtotal)}</td>
                  </tr>
                  ${ongkirHtml}
                  <tr style="background-color:#ecfdf5;border-top:2px solid #2d5016;">
                    <td colspan="4" style="padding:10px 12px;font-size:14px;color:#2d5016;font-weight:bold;text-align:right;">Total Pembayaran</td>
                    <td style="padding:10px 12px;font-size:16px;color:#2d5016;font-weight:bold;text-align:right;">${formatRupiah(total)}</td>
                  </tr>
                </tfoot>
              </table>

              <!-- Info Box -->
              <div style="background-color:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin:16px 0;">
                <p style="margin:0;font-size:13px;color:#92400e;">
                  <strong>Informasi:</strong> Pesanan Anda sedang diproses. Anda akan menerima notifikasi lain saat pesanan dikirim. Jika memiliki pertanyaan, hubungi kami melalui WhatsApp atau email yang tertera di website.
                </p>
              </div>

              <p style="margin:20px 0 0 0;font-size:12px;color:#9ca3af;text-align:center;">
                Email ini dikirim otomatis oleh Sistem Informasi Bank Sampah Sukamaju Sejahtera.<br/>
                Mohon tidak membalas email ini.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;color:#9ca3af;">&copy; 2026 Bank Sampah Sukamaju Sejahtera. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendOrderConfirmationEmail(params: SendOrderEmailParams): Promise<SendOrderEmailResult> {
  const { to, buyerName, orderNumber, items, subtotal, ongkir, total, paymentMethod, buyerAddress, buyerPhone, kurirNama, notes } = params

  // If no email provided, skip silently
  if (!to || !to.trim()) {
    return { success: false, error: 'Email pembeli tidak tersedia' }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[Order Email] RESEND_API_KEY not configured, skipping email send')
    return { success: false, error: 'RESEND_API_KEY belum dikonfigurasi' }
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Bank Sampah Sukamaju <onboarding@resend.dev>'

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: `Konfirmasi Pesanan ${orderNumber} - Bank Sampah Sukamaju Sejahtera`,
        html: buildOrderEmailHtml({ buyerName, orderNumber, items, subtotal, ongkir, total, paymentMethod, buyerAddress, buyerPhone, kurirNama, notes }),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `Resend API error (HTTP ${response.status})`
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.message) errorMessage = errorJson.message
      } catch {}
      console.error('[Order Email] Failed to send:', errorMessage)
      return { success: false, error: errorMessage }
    }

    const data = await response.json()
    console.log('[Order Email] Sent successfully:', data.id, 'to:', to)
    return { success: true, messageId: data.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Order Email] Error:', message)
    return { success: false, error: message }
  }
}

// =====================================================================
// Kirim struk transaksi via email (universal — menerima HTML struk)
// =====================================================================

interface SendStrukEmailParams {
  to: string
  subject: string
  strukHtml: string  // Inner HTML struk (same as what printStruk receives)
}

interface SendStrukEmailResult {
  success: boolean
  error?: string
}

function buildStrukEmailWrapper(strukHtml: string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Struk Transaksi - Bank Sampah Sukamaju</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', 'Consolas', monospace;
      background-color: #f5f5dc;
      padding: 20px 0;
    }
    .struk-container {
      width: 80mm;
      max-width: 420px;
      margin: 0 auto;
      background: #fff;
      color: #18181b;
      padding: 4mm;
      font-size: 11px;
      line-height: 1.4;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-radius: 4px;
    }
    table { width: 100%; border-collapse: collapse; }
    .struk-header { border-bottom: 1px dashed #999; text-align: center; padding: 8px 0 10px; }
    .struk-header .icon { font-size: 20px; margin-bottom: 2px; }
    .struk-header h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: #065f46; }
    .struk-header .sub { font-size: 11px; font-weight: 600; color: #047857; }
    .struk-header .desc { font-size: 9px; color: #666; margin-top: 1px; }
    .struk-header .badge { display: inline-block; border: 1px solid #059669; color: #059669; padding: 1px 8px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
    .struk-section { border-bottom: 1px dashed #999; padding: 8px 0; }
    .struk-section .label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: #999; margin-bottom: 4px; }
    .info-row { display: flex; justify-content: space-between; align-items: baseline; gap: 4px; font-size: 11px; margin-bottom: 3px; }
    .info-row:last-child { margin-bottom: 0; }
    .info-row .key { color: #666; flex-shrink: 0; font-size: 10px; }
    .info-row .val { text-align: right; color: #18181b; font-weight: 500; font-size: 11px; }
    .info-row .val.mono { font-family: 'Courier New', monospace; }
    .info-row .val.bold { font-weight: 700; }
    .info-row .val.capitalize { text-transform: capitalize; }
    .items-table { width: 100%; font-size: 10px; }
    .items-table th { font-size: 8px; text-transform: uppercase; color: #999; font-weight: 600; padding: 3px 0; border-bottom: 1px solid #ccc; text-align: left; }
    .items-table th.right { text-align: right; }
    .items-table th.center { text-align: center; }
    .items-table td { padding: 4px 0; border-bottom: 1px dotted #ddd; color: #333; vertical-align: top; }
    .items-table td.right { text-align: right; font-weight: 500; color: #18181b; }
    .items-table td.center { text-align: center; }
    .items-table tr:last-child td { border-bottom: none; }
    .summary-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; }
    .summary-row:last-child { margin-bottom: 0; }
    .summary-row .key { color: #666; font-size: 10px; }
    .summary-row .val { font-weight: 500; color: #18181b; }
    .summary-row.highlight { border-top: 1px solid #999; border-bottom: 1px solid #999; padding: 6px 0; margin-top: 4px; font-size: 13px; font-weight: 700; }
    .summary-row.highlight .key { color: #065f46; font-size: 11px; }
    .summary-row.highlight .val { color: #047857; }
    .notes { font-size: 10px; font-style: italic; color: #666; line-height: 1.4; }
    .struk-footer { padding: 10px 0 6px; text-align: center; }
    .struk-footer .thanks { font-size: 10px; font-weight: 600; color: #666; }
    .struk-footer .sub-thanks { font-size: 9px; color: #999; margin-top: 1px; }
    .signature-area { display: flex; justify-content: space-between; gap: 8px; margin-top: 12px; font-size: 9px; color: #999; }
    .signature-area .sig { flex: 1; text-align: center; }
    .signature-area .sig .line { height: 28px; }
    .signature-area .sig .label { border-top: 1px solid #999; padding-top: 1px; font-weight: 500; color: #666; }
    .steps-list { font-size: 10px; }
    .steps-list .step { display: flex; align-items: center; gap: 4px; margin-bottom: 4px; color: #333; }
    .steps-list .step:last-child { margin-bottom: 0; }
    .steps-list .step .check { color: #10b981; font-size: 10px; }
    .steps-list .step .cross { color: #ef4444; font-size: 10px; }
    .email-info { text-align: center; font-size: 10px; color: #999; padding: 12px 0 0; font-family: Arial, Helvetica, sans-serif; }
  </style>
</head>
<body>
  <div class="struk-container">
    ${strukHtml}
  </div>
  <div class="email-info">
    Email ini dikirim otomatis oleh Sistem Informasi Bank Sampah Sukamaju Sejahtera.<br/>
    Mohon tidak membalas email ini.
  </div>
</body>
</html>`
}

export async function sendStrukEmail(params: SendStrukEmailParams): Promise<SendStrukEmailResult> {
  const { to, subject, strukHtml } = params

  if (!to || !to.trim()) {
    return { success: false, error: 'Email penerima tidak tersedia' }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[Struk Email] RESEND_API_KEY not configured, skipping')
    return { success: false, error: 'RESEND_API_KEY belum dikonfigurasi' }
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Bank Sampah Sukamaju <onboarding@resend.dev>'

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html: buildStrukEmailWrapper(strukHtml),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `Resend API error (HTTP ${response.status})`
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.message) errorMessage = errorJson.message
      } catch {}
      console.error('[Struk Email] Failed:', errorMessage)
      return { success: false, error: errorMessage }
    }

    const data = await response.json()
    console.log('[Struk Email] Sent to:', to, 'id:', data.id)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Struk Email] Error:', message)
    return { success: false, error: message }
  }
}
