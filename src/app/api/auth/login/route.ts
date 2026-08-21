import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseRoles } from '@/lib/format'

// POST /api/auth/login
export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email dan password wajib diisi' }, { status: 400 })
  }

  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: {
      balance: true,
      koperasiAnggota: { select: { id: true, nomorAnggota: true, status: true } },
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'Email tidak terdaftar' }, { status: 404 })
  }

  // Mock password check (in production, use bcrypt)
  if (user.password !== password) {
    return NextResponse.json({ error: 'Password salah' }, { status: 401 })
  }

  const roles = parseRoles(user.roles)

  const authUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    memberCode: user.memberCode,
    anggotaId: user.koperasiAnggota?.id || null,
    nomorAnggota: user.koperasiAnggota?.nomorAnggota || null,
    roles,
    isMember: user.isMember,
    phone: user.phone,
    address: user.address,
    nik: user.nik,
  }

  const token = `mock-${user.id}-${Date.now()}`

  return NextResponse.json({ token, user: authUser })
}
