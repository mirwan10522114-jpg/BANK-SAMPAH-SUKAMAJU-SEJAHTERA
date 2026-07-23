import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'

// GET: Single article by id (admin) or slug (public — handled in list route)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const article = await db.article.findUnique({
    where: { id },
    include: { author: { select: { name: true } } },
  })
  if (!article) return NextResponse.json({ error: 'Artikel tidak ditemukan' }, { status: 404 })
  return NextResponse.json(article)
}

// PUT: Update article (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, excerpt, content, featuredImage, publishedAt } = body as {
    title?: string
    excerpt?: string
    content?: string
    featuredImage?: string
    publishedAt?: string
  }

  const updateData: any = {}
  if (title !== undefined) {
    updateData.title = title.trim()
    // Regenerate slug if title changed
    const newSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Date.now().toString(36)
    updateData.slug = newSlug
  }
  if (excerpt !== undefined) updateData.excerpt = excerpt?.trim() || null
  if (content !== undefined) updateData.content = content.trim()
  if (featuredImage !== undefined) updateData.featuredImage = featuredImage || null
  if (publishedAt !== undefined) updateData.publishedAt = publishedAt ? new Date(publishedAt) : null

  const updated = await db.article.update({ where: { id }, data: updateData })
  return NextResponse.json(updated)
}

// DELETE: Delete article (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.article.delete({ where: { id } })
  return NextResponse.json({ success: true, message: 'Artikel dihapus' })
}
