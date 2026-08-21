import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, cairkanPinjaman } from '@/lib/business'

// POST: cairkan pinjaman (status -> berjalan, record kas keluar, set sisa pinjaman)
// Only allows cairkan if status === 'disetujui'. Use the approve endpoint first.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actor = await getActingUser(req)
  try {
    const updated = await cairkanPinjaman(id, actor?.id)
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
