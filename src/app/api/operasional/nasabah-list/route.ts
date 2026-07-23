import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Lightweight list of nasabah for teller selectors
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const where: any = {
    OR: [{ roles: { contains: 'nasabah' } }, { roles: { contains: 'koperasi' } }],
  }
  if (q) {
    where.AND = [{
      OR: [
        { name: { contains: q } },
        { memberCode: { contains: q } },
        { nik: { contains: q } },
        { phone: { contains: q } },
        { address: { contains: q } },
      ],
    }]
  }
  const users = await db.user.findMany({
    where,
    select: { id: true, name: true, memberCode: true, nik: true, phone: true, address: true, roles: true, isMember: true, balance: true, koperasiAnggota: { select: { id: true, nomorAnggota: true, status: true, simpananSaldos: { select: { jenisSimpanan: true, saldo: true } } } } },
    take: 50,
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(users)
}
