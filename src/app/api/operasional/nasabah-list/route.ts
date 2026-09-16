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
  const penggunas = await db.pengguna.findMany({
    where,
    select: { id: true, name: true, memberCode: true, nik: true, email: true, phone: true, address: true, roles: true, isMember: true, saldo: true, koperasiAnggota: { select: { id: true, nomorAnggota: true, status: true, tanggalBergabung: true, createdAt: true, simpananSaldos: { select: { jenisSimpanan: true, saldo: true } } } } },
    take: 50,
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(penggunas)
}
