import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'

// GET: Public list of published kegiatan (activity documentation)
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const slug = url.searchParams.get('slug')

  if (slug) {
    const kegiatan = await db.kegiatan.findUnique({
      where: { slug },
      include: { author: { select: { name: true } } },
    })
    if (!kegiatan) return NextResponse.json({ error: 'Kegiatan tidak ditemukan' }, { status: 404 })
    // Parse images JSON
    let images: string[] = []
    try { images = JSON.parse(kegiatan.images) } catch { images = [] }
    return NextResponse.json({ ...kegiatan, images })
  }

  const kegiatans = await db.kegiatan.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { activityDate: 'desc' },
    include: { author: { select: { name: true } } },
  })

  return NextResponse.json(kegiatans.map((k) => ({
    id: k.id,
    title: k.title,
    slug: k.slug,
    description: k.description,
    activityDate: k.activityDate,
    location: k.location,
    coverImage: k.coverImage,
    publishedAt: k.publishedAt,
    author: k.author?.name || 'Admin',
    createdAt: k.createdAt,
    images: (() => { try { return JSON.parse(k.images) } catch { return [] } })(),
  })))
}

// POST: Create kegiatan (admin only)
export async function POST(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, description, activityDate, location, coverImage, images, publishedAt } = body as {
    title: string
    description?: string
    activityDate?: string
    location?: string
    coverImage?: string
    images?: string[]
    publishedAt?: string
  }

  if (!title?.trim()) return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 })

  const slug = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36)

  const kegiatan = await db.kegiatan.create({
    data: {
      title: title.trim(),
      slug,
      description: description?.trim() || null,
      activityDate: activityDate ? new Date(activityDate) : null,
      location: location?.trim() || null,
      coverImage: coverImage || null,
      images: JSON.stringify(images || []),
      publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      authorId: actor.id,
    },
  })

  return NextResponse.json(kegiatan, { status: 201 })
}
