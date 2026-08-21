import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, nextMemberCode } from '@/lib/business'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const role = searchParams.get('role')
  const where: any = { isMember: true }
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
      { memberCode: { contains: q } },
      { nik: { contains: q } },
    ]
  }
  if (role) where.roles = { contains: role }
  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { balance: true, koperasiAnggota: true },
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const actor = await getActingUser(req)
  const roles = body.roles || ['nasabah']
  const isKoperasi = roles.includes('koperasi')
  const user = await db.user.create({
    data: {
      memberCode: body.memberCode || (await nextMemberCode('BS')),
      name: body.name,
      email: body.email,
      nik: body.nik || null,
      roles: JSON.stringify(roles),
      phone: body.phone || null,
      address: body.address || null,
      isMember: true,
      memberJoinedAt: new Date(),
      password: 'password',
    },
  })
  await db.balance.create({ data: { userId: user.id } })
  // If koperasi member, create anggota record + saldos
  if (isKoperasi) {
    const counter = await db.koperasiAnggota.count()
    const nomor = `KP${String(counter + 1).padStart(3, '0')}`
    const agt = await db.koperasiAnggota.create({
      data: {
        nomorAnggota: nomor,
        nama: user.name,
        noKtp: user.nik || '',
        noTelepon: user.phone,
        alamat: user.address,
        status: 'aktif',
        tanggalBergabung: new Date(),
        userId: user.id,
      },
    })
    for (const jenis of ['pokok', 'wajib', 'sukarela']) {
      await db.koperasiSimpananSaldo.create({
        data: { koperasiAnggotaId: agt.id, jenisSimpanan: jenis, saldo: 0 },
      })
    }
  }
  return NextResponse.json(user, { status: 201 })
}
