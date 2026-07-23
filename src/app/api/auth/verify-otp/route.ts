import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/auth/verify-otp
// Verifies the OTP code (REAL — cek OTP yang tersimpan di DB)
// Marks user as email-verified jika OTP cocok & belum expired
export async function POST(req: NextRequest) {
  const { userId, otp } = await req.json()

  if (!userId || !otp) {
    return NextResponse.json({ error: 'User ID dan OTP wajib diisi' }, { status: 400 })
  }

  if (otp.length !== 6) {
    return NextResponse.json({ error: 'OTP harus 6 digit' }, { status: 400 })
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      balance: true,
      koperasiAnggota: { select: { id: true, nomorAnggota: true, status: true } },
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
  }

  // ============================================================
  // Validasi OTP dari DB (bukan accept any code)
  // ============================================================

  // Cek apakah user sudah verifikasi sebelumnya
  if (user.emailVerifiedAt) {
    return NextResponse.json({ error: 'Email sudah terverifikasi sebelumnya' }, { status: 400 })
  }

  // Cek apakah OTP ada di DB
  if (!user.otpCode || !user.otpExpiresAt) {
    return NextResponse.json({
      error: 'OTP belum dibuat. Silakan daftar ulang atau kirim ulang OTP.'
    }, { status: 400 })
  }

  // Cek apakah OTP sudah expired (10 menit)
  if (new Date() > user.otpExpiresAt) {
    return NextResponse.json({
      error: 'Kode OTP sudah kedaluwarsa. Silakan kirim ulang OTP.'
    }, { status: 400 })
  }

  // Cek apakah sudah terlalu banyak percobaan salah (max 5)
  if (user.otpAttempts >= 5) {
    // Reset OTP untuk keamanan
    await db.user.update({
      where: { id: userId },
      data: {
        otpCode: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      },
    })
    return NextResponse.json({
      error: 'Terlalu banyak percobaan salah. OTP telah direset. Silakan kirim ulang OTP.'
    }, { status: 400 })
  }

  // Cek apakah OTP cocok
  if (user.otpCode !== otp) {
    // Increment attempt counter
    await db.user.update({
      where: { id: userId },
      data: { otpAttempts: user.otpAttempts + 1 },
    })
    const remainingAttempts = 5 - (user.otpAttempts + 1)
    return NextResponse.json({
      error: `Kode OTP salah. Sisa percobaan: ${remainingAttempts} kali.`
    }, { status: 400 })
  }

  // OTP cocok — mark email as verified & clear OTP
  const updated = await db.user.update({
    where: { id: userId },
    data: {
      emailVerifiedAt: new Date(),
      otpCode: null,
      otpExpiresAt: null,
      otpAttempts: 0,
    },
  })

  const roles = JSON.parse(updated.roles || '[]')
  const token = `mock-${updated.id}-${Date.now()}`

  return NextResponse.json({
    token,
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      memberCode: updated.memberCode,
      anggotaId: user.koperasiAnggota?.id || null,
      nomorAnggota: user.koperasiAnggota?.nomorAnggota || null,
      roles,
      isMember: updated.isMember,
      phone: updated.phone,
      address: updated.address,
      nik: updated.nik,
    },
  })
}
