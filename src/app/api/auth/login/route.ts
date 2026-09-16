import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseRoles } from '@/lib/format'

// POST /api/auth/login
export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email dan password wajib diisi' }, { status: 400 })
  }

  const pengguna = await db.pengguna.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: {
      saldo: true,
      koperasiAnggota: { select: { id: true, nomorAnggota: true, status: true } },
    },
  })

  if (!pengguna) {
    return NextResponse.json({ error: 'Email tidak terdaftar' }, { status: 404 })
  }

  // Cek Verifikasi 2 Langkah (OTP & Admin)
  if (pengguna.verificationStatus === 'pending_otp') {
    // Generate and send a new OTP automatically
    try {
      const { sendOtpEmail, generateOtp } = await import('@/backend/lib/email')
      const otp = generateOtp()
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000)
      
      await db.pengguna.update({
        where: { id: pengguna.id },
        data: { otpCode: otp, otpExpiresAt, otpAttempts: 0 },
      })

      await sendOtpEmail({
        to: pengguna.email,
        otp,
        userName: pengguna.name,
      })
    } catch (e) {
      console.error('Failed to auto-resend OTP during login:', e)
    }

    return NextResponse.json({ 
      error: 'Akun Anda belum verifikasi OTP. Kode OTP baru telah dikirim ke email Anda.',
      requireOtp: true,
      penggunaId: pengguna.id
    }, { status: 401 })
  }

  // pending_admin is allowed to login, but dashboard will show a banner and disable transactions

  // Mock password check (in production, use bcrypt)
  if (pengguna.password !== password) {
    return NextResponse.json({ error: 'Password salah' }, { status: 401 })
  }

  const roles = parseRoles(pengguna.roles)

  const authUser = {
    id: pengguna.id,
    name: pengguna.name,
    email: pengguna.email,
    memberCode: pengguna.memberCode,
    anggotaId: pengguna.koperasiAnggota?.id || null,
    nomorAnggota: pengguna.koperasiAnggota?.nomorAnggota || null,
    roles,
    isMember: pengguna.isMember,
    phone: pengguna.phone,
    address: pengguna.address,
    nik: pengguna.nik,
    verificationStatus: pengguna.verificationStatus,
  }

  const token = `mock-${pengguna.id}-${Date.now()}`

  return NextResponse.json({ token, pengguna: authUser })
}
