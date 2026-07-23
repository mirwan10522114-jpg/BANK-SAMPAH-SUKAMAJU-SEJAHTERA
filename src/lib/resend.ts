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
