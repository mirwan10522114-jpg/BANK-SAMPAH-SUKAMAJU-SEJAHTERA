import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseRoles } from '@/lib/format'

// GET /api/auth/me — get current user from token
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '') || req.headers.get('x-auth-token')

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Extract user ID from mock token: mock-{userId}-{timestamp}
  const parts = token.split('-')
  if (parts.length < 3 || parts[0] !== 'mock') {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const userId = parts[1]
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      koperasiAnggota: { select: { id: true, nomorAnggota: true, status: true } },
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const roles = parseRoles(user.roles)

  return NextResponse.json({
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
  })
}
