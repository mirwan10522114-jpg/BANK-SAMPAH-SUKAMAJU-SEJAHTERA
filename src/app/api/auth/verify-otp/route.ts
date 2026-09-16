import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/auth/verify-otp
// Verifies the OTP code (REAL — cek OTP yang tersimpan di DB)
// Marks pengguna as email-verified jika OTP cocok & belum expired
export async function POST(req: NextRequest) {
  const { penggunaId, otp } = await req.json()

  if (!penggunaId || !otp) {
    return NextResponse.json({ error: 'Pengguna ID dan OTP wajib diisi' }, { status: 400 })
  }

  if (otp.length !== 6) {
    return NextResponse.json({ error: 'OTP harus 6 digit' }, { status: 400 })
  }

  const pengguna = await db.pengguna.findUnique({
    where: { id: penggunaId },
    include: {
      saldo: true,
      koperasiAnggota: { select: { id: true, nomorAnggota: true, status: true } },
    },
  })

  if (!pengguna) {
    return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 })
  }

  // ============================================================
  // Validasi OTP dari DB (bukan accept any code)
  // ============================================================

  // Cek apakah OTP ada di DB
  if (!pengguna.otpCode || !pengguna.otpExpiresAt) {
    return NextResponse.json({
      error: 'OTP belum dibuat. Silakan daftar ulang atau kirim ulang OTP.'
    }, { status: 400 })
  }

  // Cek apakah OTP sudah expired (10 menit)
  if (new Date() > pengguna.otpExpiresAt) {
    return NextResponse.json({
      error: 'Kode OTP sudah kedaluwarsa. Silakan kirim ulang OTP.'
    }, { status: 400 })
  }

  // Cek apakah sudah terlalu banyak percobaan salah (max 5)
  if (pengguna.otpAttempts >= 5) {
    // Reset OTP untuk keamanan
    await db.pengguna.update({
      where: { id: penggunaId },
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
  if (pengguna.otpCode !== otp) {
    // Increment attempt counter
    await db.pengguna.update({
      where: { id: penggunaId },
      data: { otpAttempts: pengguna.otpAttempts + 1 },
    })
    const remainingAttempts = 5 - (pengguna.otpAttempts + 1)
    return NextResponse.json({
      error: `Kode OTP salah. Sisa percobaan: ${remainingAttempts} kali.`
    }, { status: 400 })
  }

  // OTP cocok — mark email as verified, clear OTP & set status to pending_admin
  const updated = await db.pengguna.update({
    where: { id: penggunaId },
    data: {
      emailVerifiedAt: new Date(),
      otpCode: null,
      otpExpiresAt: null,
      otpAttempts: 0,
      verificationStatus: 'pending_admin', // Lanjut ke langkah verifikasi Admin
    },
  })

  const roles = JSON.parse(updated.roles || '[]')
  const koperasiAnggota =
    pengguna.koperasiAnggota ||
    (await db.koperasiAnggota.findFirst({
      where: { penggunaId: pengguna.id },
      select: { id: true, nomorAnggota: true, status: true },
    }))
  const isKoperasi = Boolean(koperasiAnggota) || roles.includes('koperasi')
  let nominalSimpananPokok = 50000

  if (isKoperasi) {
    try {
      const setting = await db.koperasiSetting.findFirst()
      let nominalSimpananWajib = 10000
      if (setting?.nominalSimpananPokok) {
        nominalSimpananPokok = Number(setting.nominalSimpananPokok)
      }
      if (setting?.nominalSimpananWajib) {
        nominalSimpananWajib = Number(setting.nominalSimpananWajib)
      }
      const { sendSimpananPokokReminderEmail } = await import('@/lib/email')
      const emailRes = await sendSimpananPokokReminderEmail({
        to: updated.email,
        userName: updated.name,
        nomorAnggota: koperasiAnggota?.nomorAnggota || 'KP001',
        nominalSimpananPokok,
        nominalSimpananWajib,
      })
      console.log('[Verify OTP] Hasil pengiriman email Simpanan Pokok:', emailRes)
    } catch (err) {
      console.error('[Verify OTP] Gagal mengirim email pengingat simpanan pokok:', err)
    }
  }

  const token = `mock-${updated.id}-${Date.now()}`

  return NextResponse.json({
    token,
    pengguna: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      memberCode: updated.memberCode,
      anggotaId: pengguna.koperasiAnggota?.id || null,
      nomorAnggota: pengguna.koperasiAnggota?.nomorAnggota || null,
      roles,
      isMember: updated.isMember,
      phone: updated.phone,
      address: updated.address,
      nik: updated.nik,
      verificationStatus: updated.verificationStatus,
    },
    mustPaySimpananPokok: isKoperasi,
    nominalSimpananPokok: isKoperasi ? nominalSimpananPokok : 0,
    nomorAnggotaKoperasi: pengguna.koperasiAnggota?.nomorAnggota || null,
  })
}
