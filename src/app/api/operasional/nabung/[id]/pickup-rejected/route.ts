import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const existing = await db.transaksiNabung.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })
  }

  if (existing.qcStatus !== 'rejected' || existing.rejectedAction !== 'ambil_kembali') {
    return NextResponse.json({ error: 'Transaksi ini tidak menunggu pengambilan nasabah' }, { status: 400 })
  }

  if (existing.isRejectedWastePickedUp) {
    return NextResponse.json({ error: 'Sampah ini sudah ditandai telah diambil' }, { status: 400 })
  }

  const updated = await db.transaksiNabung.update({
    where: { id },
    data: {
      isRejectedWastePickedUp: true
    }
  })

  return NextResponse.json(updated)
}
