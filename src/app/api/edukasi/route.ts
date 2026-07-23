import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'

// GET: Public list of published articles (for landing page edukasi section)
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const slug = url.searchParams.get('slug')

  // If slug provided, return single article
  if (slug) {
    const article = await db.article.findUnique({
      where: { slug },
      include: { author: { select: { name: true } } },
    })
    if (!article) return NextResponse.json({ error: 'Artikel tidak ditemukan' }, { status: 404 })
    return NextResponse.json(article)
  }

  // List published articles
  const articles = await db.article.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: 'desc' },
    include: { author: { select: { name: true } } },
  })

  return NextResponse.json(articles.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    featuredImage: a.featuredImage,
    publishedAt: a.publishedAt,
    author: a.author?.name || 'Admin',
    createdAt: a.createdAt,
  })))
}

// POST: Create article (admin only)
export async function POST(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, excerpt, content, featuredImage, publishedAt } = body as {
    title: string
    excerpt?: string
    content: string
    featuredImage?: string
    publishedAt?: string
  }

  if (!title?.trim()) return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 })
  if (!content?.trim()) return NextResponse.json({ error: 'Konten wajib diisi' }, { status: 400 })

  // Generate slug
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Date.now().toString(36)

  const article = await db.article.create({
    data: {
      title: title.trim(),
      slug,
      excerpt: excerpt?.trim() || null,
      content: content.trim(),
      featuredImage: featuredImage || null,
      publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
      authorId: actor.id,
    },
  })

  return NextResponse.json(article, { status: 201 })
}
