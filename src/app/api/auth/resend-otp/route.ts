import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendOtpEmail, generateOtp } from '@/lib/email'

// POST /api/auth/resend-otp
// Kirim ulang OTP ke email user (kalau OTP expired atau tidak terima email)
export async function POST(req: NextRequest) {
  const { userId } = await req.json()

  if (!userId) {
    return NextResponse.json({ error: 'User ID wajib diisi' }, { status: 400 })
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, emailVerifiedAt: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
  }

  if (user.emailVerifiedAt) {
    return NextResponse.json({ error: 'Email sudah terverifikasi' }, { status: 400 })
  }

  // Generate OTP baru
  const otp = generateOtp()
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 menit

  // Update OTP di DB
  await db.user.update({
    where: { id: userId },
    data: {
      otpCode: otp,
      otpExpiresAt,
      otpAttempts: 0, // reset attempts
    },
  })

  // Kirim email OTP via Resend
  const emailResult = await sendOtpEmail({
    to: user.email,
    otp,
    userName: user.name,
  })

  if (!emailResult.success) {
    return NextResponse.json({
      error: `Gagal mengirim email OTP: ${emailResult.error}`,
    }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: `Kode OTP baru telah dikirim ke ${user.email}`,
  })
}
