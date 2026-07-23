import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const setting = await db.koperasiSetting.findFirst()
  return NextResponse.json(setting)
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const existing = await db.koperasiSetting.findFirst()
  let setting
  if (existing) {
    setting = await db.koperasiSetting.update({
      where: { id: existing.id },
      data: {
        namaKoperasi: body.namaKoperasi,
        telepon: body.telepon,
        email: body.email,
        alamat: body.alamat,
        nominalSimpananPokok: body.nominalSimpananPokok,
        nominalSimpananWajib: body.nominalSimpananWajib,
        biayaAdminPinjaman: body.biayaAdminPinjaman,
        minimalBulanAnggota: body.minimalBulanAnggota,
        saldoKasAwal: body.saldoKasAwal,
        dendaTerlambatPerHari: body.dendaTerlambatPerHari,
        sukuBungaPinjaman: body.sukuBungaPinjaman,
      },
    })
  } else {
    setting = await db.koperasiSetting.create({
      data: {
        namaKoperasi: body.namaKoperasi || 'Koperasi',
        telepon: body.telepon,
        email: body.email,
        alamat: body.alamat,
        nominalSimpananPokok: body.nominalSimpananPokok || 0,
        nominalSimpananWajib: body.nominalSimpananWajib || 0,
        biayaAdminPinjaman: body.biayaAdminPinjaman || 0,
        minimalBulanAnggota: body.minimalBulanAnggota || 3,
        saldoKasAwal: body.saldoKasAwal || 0,
        dendaTerlambatPerHari: body.dendaTerlambatPerHari || 0,
        sukuBungaPinjaman: body.sukuBungaPinjaman || 0,
      },
    })
  }
  return NextResponse.json(setting)
}
