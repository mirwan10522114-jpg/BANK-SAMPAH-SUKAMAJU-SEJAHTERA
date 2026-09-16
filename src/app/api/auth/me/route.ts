import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseRoles } from '@/lib/format'

// GET /api/auth/me — get current pengguna from token
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '') || req.headers.get('x-auth-token')

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Extract pengguna ID from mock token: mock-{penggunaId}-{timestamp}
  const parts = token.split('-')
  if (parts.length < 3 || parts[0] !== 'mock') {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const penggunaId = parts[1]
  const pengguna = await db.pengguna.findUnique({
    where: { id: penggunaId },
    include: {
      koperasiAnggota: { select: { id: true, nomorAnggota: true, status: true } },
    },
  })

  if (!pengguna) {
    return NextResponse.json({ error: 'Pengguna not found' }, { status: 404 })
  }

  const roles = parseRoles(pengguna.roles)

  return NextResponse.json({
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
  })
}
