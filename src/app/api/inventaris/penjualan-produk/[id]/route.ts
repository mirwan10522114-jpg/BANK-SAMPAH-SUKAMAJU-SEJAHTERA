import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tx = await db.productSale.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, buyer: true, createdBy: true },
  })
  if (!tx) return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })
  return NextResponse.json(tx)
}
