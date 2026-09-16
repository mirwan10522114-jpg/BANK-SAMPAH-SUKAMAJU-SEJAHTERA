import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const riwayat = await db.pergerakanProduk.findMany({
      where: { produkId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        produk: {
          select: { name: true, unit: true }
        }
      }
    })

    return NextResponse.json(riwayat)
  } catch (error: any) {
    console.error('Failed to fetch riwayat stok produk:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
