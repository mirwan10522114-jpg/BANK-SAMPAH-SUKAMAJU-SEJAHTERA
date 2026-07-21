import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'

// GET: list perbaikan requests (optional anggotaId filter, optional status filter)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const anggotaId = searchParams.get('anggotaId')
  const status = searchParams.get('status')

  const where: any = {}
  if (anggotaId) where.koperasiAnggotaId = anggotaId
  if (status) where.status = status

  const perbaikan = await db.koperasiPinjamanPerbaikan.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      anggota: true,
      reviewedBy: { select: { id: true, name: true } },
    },
    take: 100,
  })

  return NextResponse.json(perbaikan)
}

// POST: create perbaikan request
export async function POST(req: NextRequest) {
  const body = await req.json()
  const actor = await getActingUser(req)

  const { anggotaId, alasan, janjiPerbaikan } = body as {
    anggotaId: string
    alasan: string
    janjiPerbaikan?: string
  }

  if (!anggotaId) return NextResponse.json({ error: 'anggotaId wajib diisi' }, { status: 400 })
  if (!alasan) return NextResponse.json({ error: 'alasan wajib diisi' }, { status: 400 })

  // Validate anggota exists
  const anggota = await db.koperasiAnggota.findUnique({
    where: { id: anggotaId },
    include: { perbaikanRequests: true },
  })

  if (!anggota) {
    return NextResponse.json({ error: 'Anggota tidak ditemukan' }, { status: 404 })
  }

  // Check not already have 'menunggu' request
  const existingPending = anggota.perbaikanRequests.find((r) => r.status === 'menunggu')
  if (existingPending) {
    return NextResponse.json(
      { error: 'Sudah ada permintaan perbaikan yang sedang menunggu review' },
      { status: 400 }
    )
  }

  const perbaikan = await db.koperasiPinjamanPerbaikan.create({
    data: {
      koperasiAnggotaId: anggotaId,
      alasan,
      janjiPerbaikan: janjiPerbaikan || null,
      status: 'menunggu',
    },
    include: {
      anggota: true,
    },
  })

  return NextResponse.json(perbaikan, { status: 201 })
}