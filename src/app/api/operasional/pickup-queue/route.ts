import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const list = await db.transaksiNabung.findMany({
    where: {
      qcStatus: 'rejected',
      rejectedAction: 'ambil_kembali',
      isRejectedWastePickedUp: false
    },
    orderBy: { createdAt: 'desc' },
    include: {
      pengguna: { select: { id: true, name: true, memberCode: true, phone: true } },
      items: { include: { jenisSampah: true } },
    }
  })

  return NextResponse.json(list)
}
