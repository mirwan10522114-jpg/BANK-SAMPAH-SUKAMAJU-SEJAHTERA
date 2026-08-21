import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'

// PUT: review perbaikan request (admin action)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const actor = await getActingUser(req)
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { status, catatanAdmin, syaratTambahan } = body as {
    status: 'disetujui' | 'ditolak'
    catatanAdmin?: string
    syaratTambahan?: string
  }

  if (status !== 'disetujui' && status !== 'ditolak') {
    return NextResponse.json({ error: 'Status harus disetujui atau ditolak' }, { status: 400 })
  }

  // Fetch the perbaikan request
  const perbaikan = await db.koperasiPinjamanPerbaikan.findUnique({
    where: { id },
  })

  if (!perbaikan) {
    return NextResponse.json({ error: 'Permintaan perbaikan tidak ditemukan' }, { status: 404 })
  }

  if (perbaikan.status !== 'menunggu') {
    return NextResponse.json(
      { error: `Permintaan sudah di-${perbaikan.status}, tidak bisa diubah lagi` },
      { status: 400 }
    )
  }

  // If disetujui: unblock the anggota's pinjaman
  if (status === 'disetujui') {
    await db.koperasiAnggota.update({
      where: { id: perbaikan.koperasiAnggotaId },
      data: { pinjamanDiblokir: false },
    })
  }

  const updated = await db.koperasiPinjamanPerbaikan.update({
    where: { id },
    data: {
      status,
      catatanAdmin: catatanAdmin || null,
      syaratTambahan: syaratTambahan || null,
      reviewedById: actor.id,
      reviewedAt: new Date(),
    },
    include: {
      anggota: true,
      reviewedBy: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(updated)
}