import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { nextMemberCode } from '@/lib/business'
import { sendOtpEmail, generateOtp } from '@/lib/resend'

// POST /api/auth/register
// Step 1: Create user (unverified), generate OTP, kirim OTP via email Resend
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, email, phone, password, address, nik, isNasabah, isKoperasi } = body

  if (!name?.trim() || !email?.trim() || !password?.trim() || !phone?.trim() || !address?.trim() || !nik?.trim()) {
    return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password minimal 8 karakter' }, { status: 400 })
  }

  if (nik.length !== 16) {
    return NextResponse.json({ error: 'NIK harus 16 digit' }, { status: 400 })
  }

  if (!isNasabah && !isKoperasi) {
    return NextResponse.json({ error: 'Pilih minimal satu jenis keanggotaan' }, { status: 400 })
  }

  // Check email uniqueness
  const existingEmail = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (existingEmail) {
    return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 })
  }

  // Check NIK uniqueness
  const existingNik = await db.user.findUnique({ where: { nik } })
  if (existingNik) {
    return NextResponse.json({ error: 'NIK sudah terdaftar' }, { status: 400 })
  }

  // Determine roles based on checkbox selection
  const roles: string[] = []
  if (isNasabah) roles.push('nasabah')
  if (isKoperasi) roles.push('koperasi')

  const hasNasabah = roles.includes('nasabah')
  const hasKoperasi = roles.includes('koperasi')

  // Generate member code if nasabah
  let memberCode: string | null = null
  if (hasNasabah) {
    memberCode = await nextMemberCode('BS')
  }

  // Generate OTP sebelum create user
  const otp = generateOtp()
  // OTP berlaku 10 menit
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000)

  // Create user dengan OTP tersimpan di DB
  const user = await db.user.create({
    data: {
      memberCode,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      nik,
      roles: JSON.stringify(roles),
      phone,
      address,
      isMember: hasNasabah,
      memberJoinedAt: hasNasabah ? new Date() : null,
      password,
      otpCode: otp,
      otpExpiresAt,
      otpAttempts: 0,
    },
  })

  // Create balance if nasabah
  if (hasNasabah) {
    await db.balance.create({ data: { userId: user.id } })
  }

  // Create anggota koperasi if koperasi
  let nomorAnggota: string | null = null
  if (hasKoperasi) {
    const existingMax = await db.koperasiAnggota.findFirst({ orderBy: { nomorAnggota: 'desc' } })
    let nextNum = 1
    if (existingMax) {
      const m = existingMax.nomorAnggota.match(/(\d+)/)
      if (m) nextNum = parseInt(m[1], 10) + 1
    }
    nomorAnggota = `KP${String(nextNum).padStart(3, '0')}`
    const agt = await db.koperasiAnggota.create({
      data: {
        nomorAnggota,
        nama: name.trim(),
        noKtp: nik,
        noTelepon: phone,
        alamat: address,
        status: 'aktif',
        tanggalBergabung: new Date(),
        userId: user.id,
      },
    })
    for (const jenis of ['pokok', 'wajib', 'sukarela'] as const) {
      await db.koperasiSimpananSaldo.create({
        data: { koperasiAnggotaId: agt.id, jenisSimpanan: jenis, saldo: 0 },
      })
    }
  }

  // ============================================================
  // Kirim OTP via email Resend (REAL, bukan simulasi)
  // ============================================================
  const emailResult = await sendOtpEmail({
    to: user.email,
    otp,
    userName: user.name,
  })

  if (!emailResult.success) {
    // Email gagal dikirim — tetap return sukses tapi kasih warning
    // User bisa request resend OTP nanti
    console.error('[register] Gagal kirim email OTP:', emailResult.error)
    return NextResponse.json({
      userId: user.id,
      emailSent: false,
      message: 'Akun dibuat, tapi email OTP gagal dikirim. Klik "Kirim Ulang OTP" untuk coba lagi.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        memberCode,
        nomorAnggota,
      },
    }, { status: 201 })
  }

  // Email berhasil dikirim — JANGAN return OTP ke frontend (keamanan)
  return NextResponse.json({
    userId: user.id,
    emailSent: true,
    message: `Akun dibuat. Kode OTP telah dikirim ke ${user.email}. Cek inbox (atau folder spam).`,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      memberCode,
      nomorAnggota,
    },
  }, { status: 201 })
}
