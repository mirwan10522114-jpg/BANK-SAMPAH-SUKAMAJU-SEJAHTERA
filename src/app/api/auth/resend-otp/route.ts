import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendOtpEmail, generateOtp } from '@/backend/lib/email'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

// POST /api/auth/resend-otp
// Kirim ulang OTP ke email pengguna (kalau OTP expired atau tidak terima email)
export async function POST(req: NextRequest) {
  const { penggunaId } = await req.json()

  if (!penggunaId) {
    return NextResponse.json({ error: 'Pengguna ID wajib diisi' }, { status: 400 })
  }

  const pengguna = await db.pengguna.findUnique({
    where: { id: penggunaId },
    select: { id: true, name: true, email: true, phone: true, emailVerifiedAt: true },
  })

  if (!pengguna) {
    return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 })
  }



  // Generate OTP baru
  const otp = generateOtp()
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 menit

  // Update OTP di DB
  await db.pengguna.update({
    where: { id: penggunaId },
    data: {
      otpCode: otp,
      otpExpiresAt,
      otpAttempts: 0, // reset attempts
    },
  })

  // Kirim email OTP via Resend
  const emailResult = await sendOtpEmail({
    to: pengguna.email,
    otp,
    userName: pengguna.name,
  })

  // Kirim OTP via WA Fonnte
  let waSent = false
  if (pengguna.phone) {
    waSent = await sendWhatsAppMessage(
      pengguna.phone,
      `Halo ${pengguna.name},\n\nKode OTP (Kirim Ulang) Anda untuk Bank Sampah Sukamaju Sejahtera adalah: *${otp}*\n\nKode ini berlaku selama 10 menit. Jangan bagikan kode ini kepada siapa pun.`
    )
  }

  if (!emailResult.success && !waSent) {
    return NextResponse.json({
      error: `Gagal mengirim OTP ke Email dan WA. Silakan coba lagi nanti.`,
    }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: `Kode OTP baru telah dikirim ke ${pengguna.email}`,
  })
}
