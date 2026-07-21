import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseRoles } from '@/lib/format'
import { nextMemberCode } from '@/lib/business'

function toNum(v: any): number {
  if (v === null || v === undefined) return 0
  const n = parseFloat(String(v))
  return isNaN(n) ? 0 : n
}

// GET: list all users with integration info (balance, koperasi anggota, member codes)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const roleFilter = searchParams.get('role') || ''

  const where: any = {}
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
      { nik: { contains: q } },
      { phone: { contains: q } },
      { memberCode: { contains: q } },
    ]
  }
  if (roleFilter) where.roles = { contains: roleFilter }

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    include: {
      balance: true,
      koperasiAnggota: { include: { simpananSaldos: true } },
    },
  })

  const rows = users.map((u, idx) => {
    const roles = parseRoles(u.roles)
    return {
      id: u.id,
      no: idx + 1,
      name: u.name,
      email: u.email,
      nik: u.nik,
      phone: u.phone,
      address: u.address,
      memberCode: u.memberCode,
      nomorAnggota: u.koperasiAnggota?.nomorAnggota || null,
      roles,
      isMember: u.isMember,
      memberJoinedAt: u.memberJoinedAt,
      emailVerifiedAt: u.emailVerifiedAt,
      isEmailVerified: !!u.emailVerifiedAt,
      isActive: true,
      balance: u.balance,
      koperasiAnggota: u.koperasiAnggota,
      saldoTertahan: u.balance ? toNum(u.balance.saldoTertahan) : 0,
      saldoTersedia: u.balance ? toNum(u.balance.saldoTersedia) : 0,
      points: u.balance?.points || 0,
      simpananPokok: u.koperasiAnggota?.simpananSaldos?.find((s) => s.jenisSimpanan === 'pokok') ? toNum(u.koperasiAnggota.simpananSaldos.find((s) => s.jenisSimpanan === 'pokok')!.saldo) : 0,
      simpananWajib: u.koperasiAnggota?.simpananSaldos?.find((s) => s.jenisSimpanan === 'wajib') ? toNum(u.koperasiAnggota.simpananSaldos.find((s) => s.jenisSimpanan === 'wajib')!.saldo) : 0,
      simpananSukarela: u.koperasiAnggota?.simpananSaldos?.find((s) => s.jenisSimpanan === 'sukarela') ? toNum(u.koperasiAnggota.simpananSaldos.find((s) => s.jenisSimpanan === 'sukarela')!.saldo) : 0,
      createdAt: u.createdAt,
    }
  })
  return NextResponse.json(rows)
}

// POST: create new user with full sync (same logic as PUT update)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, email, nik, phone, address, password, emailVerified, roles } = body as {
    name: string
    email: string
    nik?: string
    phone?: string
    address?: string
    password?: string
    emailVerified: boolean
    roles: string[]
  }

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Nama dan Email wajib diisi' }, { status: 400 })
  }

  // Check email uniqueness
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 })
  }
  if (nik) {
    const existingNik = await db.user.findUnique({ where: { nik } })
    if (existingNik) {
      return NextResponse.json({ error: 'NIK sudah terdaftar' }, { status: 400 })
    }
  }

  const newRoles = roles || []
  const hasNasabah = newRoles.includes('nasabah')
  const hasKoperasi = newRoles.includes('koperasi')
  const syncLog: string[] = []

  // 1. Build user data
  const userData: any = {
    name,
    email,
    nik: nik || null,
    phone: phone || null,
    address: address || null,
    roles: JSON.stringify(newRoles),
    isMember: hasKoperasi,
    emailVerifiedAt: emailVerified ? new Date() : null,
    password: password && password.trim() ? password : 'password',
  }

  // 2. Nasabah sync — generate member code if nasabah role
  if (hasNasabah) {
    userData.memberCode = await nextMemberCode('BS')
    syncLog.push(`Generated member code BS: ${userData.memberCode}`)
  }
  if (hasKoperasi && !userData.memberJoinedAt) {
    userData.memberJoinedAt = new Date()
  }

  // 3. Create user
  const user = await db.user.create({ data: userData })

  // 4. Create balance record if nasabah
  if (hasNasabah) {
    await db.balance.create({ data: { userId: user.id } })
    syncLog.push('Created balance record')
  }

  // 5. Create anggota koperasi if koperasi role
  if (hasKoperasi) {
    const existingMax = await db.koperasiAnggota.findFirst({ orderBy: { nomorAnggota: 'desc' } })
    let nextNum = 1
    if (existingMax) {
      const m = existingMax.nomorAnggota.match(/(\d+)/)
      if (m) nextNum = parseInt(m[1], 10) + 1
    }
    const nomor = `KP${String(nextNum).padStart(3, '0')}`
    const agt = await db.koperasiAnggota.create({
      data: {
        nomorAnggota: nomor,
        nama: name,
        noKtp: nik || '',
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
    syncLog.push(`Created anggota koperasi: ${nomor} + 3 simpanan saldos`)
  }

  const created = await db.user.findUnique({
    where: { id: user.id },
    include: { balance: true, koperasiAnggota: { include: { simpananSaldos: true } } },
  })

  return NextResponse.json({
    user: created,
    syncLog,
    changes: {
      nasabahAdded: hasNasabah,
      koperasiAdded: hasKoperasi,
    },
  }, { status: 201 })
}
