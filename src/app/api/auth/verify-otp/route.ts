import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/auth/verify-otp
// Verifies the OTP code (mock — any 6-digit code accepted for now)
// Marks user as email-verified
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

  // Mark email as verified
  const updated = await db.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date() },
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
