'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft, Camera, Calendar, MapPin, Search, Loader2, Images, X, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

// ============================================================
// KegiatanPage — public activity documentation gallery
// ============================================================
export function KegiatanPage({ onBack }: { onBack: () => void }) {
  const [items, setItems] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [selectedIdx, setSelectedIdx] = React.useState<number | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.kegiatan.list()
      setItems(res || [])
    } catch (e: any) {
      toast.error('Gagal memuat kegiatan', { description: e.message })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const filtered = items.filter((k) => {
    if (!search) return true
    const q = search.toLowerCase()
    return k.title?.toLowerCase().includes(q) ||
      k.description?.toLowerCase().includes(q) ||
      k.location?.toLowerCase().includes(q)
  })

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
              <h1 className="text-sm font-bold sm:text-base">Dokumentasi Kegiatan</h1>
              <p className="hidden text-[10px] text-emerald-100/70 sm:block">Bank Sampah Sukamaju Sejahtera</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-emerald-50 to-transparent py-8 sm:py-12">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100">
            <Camera className="size-8 text-emerald-600" />
          </div>
          <h1 className="mb-2 text-2xl font-extrabold text-[#2d5016] sm:text-3xl">
            Dokumentasi Kegiatan
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-emerald-900/70 sm:text-base">
            Galeri aksi nyata bank sampah dalam menjaga lingkungan — kerja bakti, edukasi, dan kegiatan komunitas.
          </p>
        </div>
      </section>

      {/* Search */}
      <div className="mx-auto max-w-5xl px-4">
        <div className="relative mb-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Cari kegiatan, lokasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-emerald-200 pl-10"
          />
        </div>
      </div>

      {/* Gallery grid */}
      <div className="mx-auto max-w-5xl px-4 pb-16">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden border-emerald-100">
                <Skeleton className="h-48 w-full rounded-none" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-zinc-100">
              <Camera className="size-8 text-zinc-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-zinc-700">
                {search ? 'Tidak ada kegiatan ditemukan' : 'Belum ada dokumentasi kegiatan'}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {search ? 'Coba kata kunci lain.' : 'Kegiatan akan muncul di sini setelah admin menambahkannya.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((k, idx) => (
              <KegiatanCard key={k.id} kegiatan={k} onClick={() => setSelectedIdx(idx)} />
            ))}
          </div>
        )}
      </div>

      {/* Detail modal with photo gallery */}
      {selectedIdx !== null && filtered[selectedIdx] && (
        <KegiatanDetail
          kegiatan={filtered[selectedIdx]}
          onClose={() => setSelectedIdx(null)}
          onPrev={() => setSelectedIdx((i) => i !== null && i > 0 ? i - 1 : i)}
          onNext={() => setSelectedIdx((i) => i !== null && i < filtered.length - 1 ? i + 1 : i)}
          hasPrev={selectedIdx > 0}
          hasNext={selectedIdx < filtered.length - 1}
        />
      )}
    </div>
  )
}

// ============================================================
// Kegiatan Card
// ============================================================
function KegiatanCard({ kegiatan, onClick }: { kegiatan: any; onClick: () => void }) {
  const images: string[] = Array.isArray(kegiatan.images) ? kegiatan.images : []
  const coverImg = kegiatan.coverImage || images[0]

  return (
    <Card
      className="group cursor-pointer overflow-hidden border-emerald-100 transition-all hover:shadow-lg hover:ring-1 hover:ring-emerald-200"
      onClick={onClick}
    >
      <div className="relative h-48 overflow-hidden bg-emerald-50">
        {coverImg ? (
          <img
            src={coverImg}
            alt={kegiatan.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Camera className="size-10 text-emerald-300" />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <Badge className="bg-emerald-600 text-[10px] font-bold text-white hover:bg-emerald-600">
            Kegiatan
          </Badge>
        </div>
        {images.length > 0 && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
            <Images className="size-3" /> {images.length}
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-zinc-900 group-hover:text-emerald-700">
          {kegiatan.title}
        </h3>
        {kegiatan.description && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-500">
            {kegiatan.description}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-zinc-400">
          {kegiatan.activityDate && (
            <span className="flex items-center gap-1">
              <Calendar className="size-3" /> {formatDate(kegiatan.activityDate)}
            </span>
          )}
          {kegiatan.location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" /> {kegiatan.location}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Kegiatan Detail (modal with photo gallery)
// ============================================================
function KegiatanDetail({
  kegiatan, onClose, onPrev, onNext, hasPrev, hasNext,
}: {
  kegiatan: any
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
}) {
  const images: string[] = Array.isArray(kegiatan.images) ? kegiatan.images : []
  const coverImg = kegiatan.coverImage
  // Combine cover + images (deduplicated)
  const allImages = coverImg ? [coverImg, ...images.filter((img) => img !== coverImg)] : images
  const [currentImg, setCurrentImg] = React.useState(0)

  return (
    <Dialog open={true} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogTitle className="sr-only">{kegiatan.title}</DialogTitle>

        {/* Photo gallery */}
        {allImages.length > 0 && (
          <div className="relative overflow-hidden rounded-xl bg-zinc-900">
            <img
              src={allImages[currentImg]}
              alt={`${kegiatan.title} - Foto ${currentImg + 1}`}
              className="max-h-[400px] w-full object-contain"
            />
            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setCurrentImg((i) => (i > 0 ? i - 1 : allImages.length - 1))}
                  className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentImg((i) => (i < allImages.length - 1 ? i + 1 : 0))}
                  className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                >
                  <ChevronRight className="size-5" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-0.5 text-xs font-medium text-white">
                  {currentImg + 1} / {allImages.length}
                </div>
              </>
            )}
          </div>
        )}

        {/* Thumbnails */}
        {allImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {allImages.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentImg(idx)}
                className={cn(
                  'size-16 shrink-0 overflow-hidden rounded-lg border-2 transition',
                  idx === currentImg ? 'border-emerald-500' : 'border-transparent opacity-60 hover:opacity-100',
                )}
              >
                <img src={img} alt={`Thumb ${idx + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            {kegiatan.activityDate && (
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" /> {formatDate(kegiatan.activityDate)}
              </span>
            )}
            {kegiatan.location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" /> {kegiatan.location}
              </span>
            )}
            <Badge className="bg-emerald-100 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100">Kegiatan</Badge>
          </div>

          <h2 className="text-xl font-extrabold leading-tight text-[#2d5016]">
            {kegiatan.title}
          </h2>

          {kegiatan.description && (
            <p className="text-sm leading-relaxed text-zinc-700">{kegiatan.description}</p>
          )}
        </div>

        {/* Navigation between kegiatan */}
        <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrev}
            disabled={!hasPrev}
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
          >
            <ChevronLeft className="mr-1 size-4" /> Sebelumnya
          </Button>
          <Button variant="outline" size="sm" onClick={onClose} className="border-zinc-200 text-zinc-600">
            Tutup
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={!hasNext}
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
          >
            Berikutnya <ChevronRight className="ml-1 size-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
