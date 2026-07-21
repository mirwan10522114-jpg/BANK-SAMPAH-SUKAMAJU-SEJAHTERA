import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'

// GET: Single kegiatan by id
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const kegiatan = await db.kegiatan.findUnique({
    where: { id },
    include: { author: { select: { name: true } } },
  })
  if (!kegiatan) return NextResponse.json({ error: 'Kegiatan tidak ditemukan' }, { status: 404 })
  let images: string[] = []
  try { images = JSON.parse(kegiatan.images) } catch { images = [] }
  return NextResponse.json({ ...kegiatan, images })
}

// PUT: Update kegiatan (admin only)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, description, activityDate, location, coverImage, images, publishedAt } = body as any

  const updateData: any = {}
  if (title !== undefined) {
    updateData.title = title.trim()
    updateData.slug = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36)
  }
  if (description !== undefined) updateData.description = description?.trim() || null
  if (activityDate !== undefined) updateData.activityDate = activityDate ? new Date(activityDate) : null
  if (location !== undefined) updateData.location = location?.trim() || null
  if (coverImage !== undefined) updateData.coverImage = coverImage || null
  if (images !== undefined) updateData.images = JSON.stringify(images || [])
  if (publishedAt !== undefined) updateData.publishedAt = publishedAt ? new Date(publishedAt) : null

  const updated = await db.kegiatan.update({ where: { id }, data: updateData })
  return NextResponse.json(updated)
}

// DELETE: Delete kegiatan (admin only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.kegiatan.delete({ where: { id } })
  return NextResponse.json({ success: true, message: 'Kegiatan dihapus' })
}
