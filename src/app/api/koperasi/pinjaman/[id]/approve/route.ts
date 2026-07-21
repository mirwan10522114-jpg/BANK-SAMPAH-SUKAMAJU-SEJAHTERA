import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'

// POST: approve pinjaman (status: diajukan -> disetujui)
// Only admin/owner can approve. After approval, pinjaman can be cairkan.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check actor is admin or owner
  const roles = actor.roles || []
  if (!roles.includes('admin') && !roles.includes('owner')) {
    return NextResponse.json({ error: 'Hanya admin/owner yang dapat menyetujui pinjaman' }, { status: 403 })
  }

  try {
    const pinjaman = await db.koperasiPinjaman.findUnique({ where: { id } })
    if (!pinjaman) return NextResponse.json({ error: 'Pinjaman tidak ditemukan' }, { status: 404 })
    if (pinjaman.status !== 'diajukan') {
      return NextResponse.json({ error: `Pinjaman berstatus ${pinjaman.status}, tidak dapat disetujui` }, { status: 400 })
    }

    const updated = await db.koperasiPinjaman.update({
      where: { id },
      data: { status: 'disetujui' },
    })
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
