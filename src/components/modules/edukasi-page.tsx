'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft, BookOpen, Calendar, User, Search, Loader2, ImageIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

// ============================================================
// EdukasiPage — public article list + detail reader
// ============================================================
export function EdukasiPage({ onBack }: { onBack: () => void }) {
  const [articles, setArticles] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [selectedSlug, setSelectedSlug] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.edukasi.list()
      setArticles(res || [])
    } catch (e: any) {
      toast.error('Gagal memuat artikel edukasi', { description: e.message })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  // Filtered list
  const filtered = articles.filter((a) => {
    if (!search) return true
    const q = search.toLowerCase()
    return a.title?.toLowerCase().includes(q) || a.excerpt?.toLowerCase().includes(q)
  })

  // Detail view
  if (selectedSlug) {
    return <EdukasiDetail slug={selectedSlug} onBack={() => setSelectedSlug(null)} onHome={onBack} />
  }

  return (
    <div className="min-h-screen bg-[#f5f5dc]/30">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-emerald-900/20 bg-[#2d5016] text-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <img src="/logo-bank-sampah.png" alt="Logo" className="h-9 w-9 rounded-full object-cover" />
            <div className="leading-tight">
              <h1 className="text-sm font-bold sm:text-base">Edukasi & Konten</h1>
              <p className="hidden text-[10px] text-emerald-100/70 sm:block">Bank Sampah Sukamaju Sejahtera</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-emerald-50 to-transparent py-8 sm:py-12">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100">
            <BookOpen className="size-8 text-emerald-600" />
          </div>
          <h1 className="mb-2 text-2xl font-extrabold text-[#2d5016] sm:text-3xl">
            Edukasi & Konten Lingkungan
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-emerald-900/70 sm:text-base">
            Pelajari cara mengelola sampah, daur ulang, dan kontribusi menjaga lingkungan melalui artikel edukatif.
          </p>
        </div>
      </section>

      {/* Search */}
      <div className="mx-auto max-w-5xl px-4">
        <div className="relative mb-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Cari artikel edukasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-emerald-200 pl-10"
          />
        </div>
      </div>

      {/* Articles grid */}
      <div className="mx-auto max-w-5xl px-4 pb-16">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden border-emerald-100">
                <Skeleton className="h-40 w-full rounded-none" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-zinc-100">
              <BookOpen className="size-8 text-zinc-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-zinc-700">
                {search ? 'Tidak ada artikel ditemukan' : 'Belum ada artikel edukasi'}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {search ? 'Coba kata kunci lain.' : 'Artikel akan muncul di sini setelah admin menambahkannya.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a) => (
              <ArticleCard key={a.id} article={a} onClick={() => setSelectedSlug(a.slug)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Article Card
// ============================================================
function ArticleCard({ article, onClick }: { article: any; onClick: () => void }) {
  return (
    <Card
      className="group cursor-pointer overflow-hidden border-emerald-100 transition-all hover:shadow-lg hover:ring-1 hover:ring-emerald-200"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative h-40 overflow-hidden bg-emerald-50">
        {article.featuredImage ? (
          <img
            src={article.featuredImage}
            alt={article.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="size-10 text-emerald-300" />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <Badge className="bg-emerald-600 text-[10px] font-bold text-white hover:bg-emerald-600">
            Edukasi
          </Badge>
        </div>
      </div>
      {/* Content */}
      <CardContent className="p-4">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-zinc-900 group-hover:text-emerald-700">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-500">
            {article.excerpt}
          </p>
        )}
        <div className="mt-3 flex items-center gap-3 text-[10px] text-zinc-400">
          {article.publishedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="size-3" /> {formatDate(article.publishedAt)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <User className="size-3" /> {article.author || 'Admin'}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Article Detail (reader)
// ============================================================
function EdukasiDetail({ slug, onBack, onHome }: { slug: string; onBack: () => void; onHome: () => void }) {
  const [article, setArticle] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [notFound, setNotFound] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    api.edukasi.getBySlug(slug)
      .then((res) => { if (!cancelled) setArticle(res) })
      .catch(() => { if (!cancelled) setNotFound(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5dc]/30">
        <header className="sticky top-0 z-40 border-b border-emerald-900/20 bg-[#2d5016] text-white">
          <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-sm font-bold">Memuat artikel...</h1>
          </div>
        </header>
        <div className="mx-auto max-w-3xl px-4 py-8">
          <Skeleton className="mb-4 h-8 w-3/4" />
          <Skeleton className="mb-6 h-48 w-full rounded-xl" />
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !article) {
    return (
      <div className="min-h-screen bg-[#f5f5dc]/30">
        <header className="sticky top-0 z-40 border-b border-emerald-900/20 bg-[#2d5016] text-white">
          <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-sm font-bold">Artikel tidak ditemukan</h1>
          </div>
        </header>
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-3 px-4 py-20 text-center">
          <BookOpen className="size-12 text-zinc-300" />
          <p className="text-base font-semibold text-zinc-700">Artikel tidak ditemukan</p>
          <Button onClick={onBack} className="bg-emerald-600 text-white hover:bg-emerald-700">
            <ArrowLeft className="mr-1.5 size-4" /> Kembali ke daftar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5dc]/30">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-emerald-900/20 bg-[#2d5016] text-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="truncate text-sm font-bold">Artikel Edukasi</h1>
          <Button variant="ghost" size="sm" className="ml-auto text-white hover:bg-white/10" onClick={onHome}>
            Beranda
          </Button>
        </div>
      </header>

      {/* Article content */}
      <article className="mx-auto max-w-3xl px-4 py-8">
        {/* Meta */}
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
          {article.publishedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5" /> {formatDate(article.publishedAt)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <User className="size-3.5" /> {article.author?.name || 'Admin'}
          </span>
          <Badge className="bg-emerald-100 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100">Edukasi</Badge>
        </div>

        {/* Title */}
        <h1 className="mb-3 text-2xl font-extrabold leading-tight text-[#2d5016] sm:text-3xl">
          {article.title}
        </h1>

        {/* Excerpt */}
        {article.excerpt && (
          <p className="mb-6 text-base leading-relaxed text-emerald-900/70">{article.excerpt}</p>
        )}

        {/* Featured image */}
        {article.featuredImage && (
          <div className="mb-6 overflow-hidden rounded-xl">
            <img src={article.featuredImage} alt={article.title} className="w-full object-cover" />
          </div>
        )}

        {/* Content */}
        <div className="prose prose-emerald max-w-none">
          {article.content?.split('\n').map((para: string, i: number) => {
            if (!para.trim()) return null
            // Headings
            if (para.startsWith('### ')) return <h3 key={i} className="mt-6 mb-2 text-lg font-bold text-[#2d5016]">{para.slice(4)}</h3>
            if (para.startsWith('## ')) return <h2 key={i} className="mt-8 mb-3 text-xl font-bold text-[#2d5016]">{para.slice(3)}</h2>
            if (para.startsWith('# ')) return <h1 key={i} className="mt-8 mb-3 text-2xl font-bold text-[#2d5016]">{para.slice(2)}</h1>
            // Bullet points
            if (para.startsWith('- ')) return <li key={i} className="ml-4 text-sm leading-relaxed text-zinc-700">{para.slice(2)}</li>
            // Numbered
            if (/^\d+\.\s/.test(para)) return <li key={i} className="ml-4 text-sm leading-relaxed text-zinc-700">{para.replace(/^\d+\.\s/, '')}</li>
            // Normal paragraph
            return <p key={i} className="mb-4 text-sm leading-relaxed text-zinc-700 sm:text-base">{para}</p>
          })}
        </div>

        {/* Back button */}
        <div className="mt-8 border-t border-zinc-100 pt-6">
          <Button variant="outline" onClick={onBack} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            <ArrowLeft className="mr-1.5 size-4" /> Kembali ke daftar artikel
          </Button>
        </div>
      </article>
    </div>
  )
}
