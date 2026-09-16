import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { nextMemberCode } from '@/lib/business'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      jenisPendaftaran, 
      nik, name, tempatLahir, tanggalLahir, jenisKelamin, 
      alamat, rt, rw, desaKelurahan, kecamatan, 
      phone, email, pekerjaan, fotoKtp, password 
    } = body

    if (
      !jenisPendaftaran || !nik || !name || !email || !password ||
      !tempatLahir || !tanggalLahir || !jenisKelamin || !pekerjaan ||
      !fotoKtp || !alamat || !rt || !rw || !desaKelurahan || !kecamatan || !phone
    ) {
      return NextResponse.json({ error: 'Data wajib tidak lengkap. Semua form harus diisi.' }, { status: 400 })
    }

    if (nik.length !== 16) {
      return NextResponse.json({ error: 'NIK harus 16 digit' }, { status: 400 })
    }

    // Check duplicate email
    const existingEmail = await db.pengguna.findUnique({ where: { email } })
    if (existingEmail) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 })
    }

    // Check duplicate NIK
    const existingNik = await db.pengguna.findUnique({ where: { nik } })
    if (existingNik) {
      return NextResponse.json({ error: 'NIK sudah terdaftar' }, { status: 400 })
    }

    // Roles determination
    const roles: string[] = []
    if (jenisPendaftaran === 'nasabah' || jenisPendaftaran === 'keduanya') roles.push('nasabah')
    if (jenisPendaftaran === 'koperasi' || jenisPendaftaran === 'keduanya') roles.push('koperasi')

    // Create the pending user
    // Generate a random 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

    const newPengguna = await db.pengguna.create({
      data: {
        name,
        email,
        nik,
        phone,
        address: alamat,
        tempatLahir,
        tanggalLahir: tanggalLahir ? new Date(tanggalLahir) : null,
        jenisKelamin,
        rt,
        rw,
        desaKelurahan,
        kecamatan,
        pekerjaan,
        fotoKtp,
        password,
        roles: JSON.stringify(roles),
        verificationStatus: 'pending_otp',
        otpCode,
        otpExpiresAt,
        isMember: roles.includes('koperasi'),
      },
    })

    // Send OTP via email
    try {
      const { sendOtpEmail } = await import('@/backend/lib/email')
      await sendOtpEmail({
        to: email,
        otp: otpCode,
        userName: name
      })
    } catch (e) {
      console.error('Failed to send OTP email on register:', e)
      // we still return success but maybe log the error
    }

    return NextResponse.json({
      message: 'Pendaftaran berhasil. Silakan verifikasi OTP.',
      userId: newPengguna.id,
      penggunaId: newPengguna.id,
      email: newPengguna.email,
    })
  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
