'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, BookOpen, X, Loader2, Upload, Image as ImageIcon, Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

// ============================================================
// ManajemenEdukasi — admin CRUD for education articles
// ============================================================
export function ManajemenEdukasi() {
  const [articles, setArticles] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<any>(null)
  const [submitting, setSubmitting] = React.useState(false)

  // Form fields
  const [fTitle, setFTitle] = React.useState('')
  const [fExcerpt, setFExcerpt] = React.useState('')
  const [fContent, setFContent] = React.useState('')
  const [fImage, setFImage] = React.useState('')
  const [uploading, setUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.edukasi.list()
      setArticles(res || [])
    } catch (e: any) {
      toast.error('Gagal memuat artikel', { description: e.message })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const resetForm = () => {
    setFTitle(''); setFExcerpt(''); setFContent(''); setFImage('')
    setEditing(null)
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (a: any) => {
    setEditing(a)
    setFTitle(a.title || '')
    setFExcerpt(a.excerpt || '')
    setFContent(a.content || '')
    setFImage(a.featuredImage || '')
    setDialogOpen(true)
  }

  const handleImageUpload = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipe file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file terlalu besar. Maksimal 2MB.')
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/edukasi/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Gagal upload'); return }
      setFImage(data.url)
      toast.success('Gambar berhasil diupload')
    } catch (e: any) {
      toast.error('Gagal upload: ' + (e.message || 'Unknown'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const submit = async () => {
    if (!fTitle.trim()) { toast.error('Judul wajib diisi'); return }
    if (!fContent.trim()) { toast.error('Konten wajib diisi'); return }

    setSubmitting(true)
    try {
      const payload = {
        title: fTitle.trim(),
        excerpt: fExcerpt.trim() || undefined,
        content: fContent.trim(),
        featuredImage: fImage || undefined,
      }
      if (editing) {
        await api.edukasi.update(editing.id, payload)
        toast.success('Artikel berhasil diperbarui')
      } else {
        await api.edukasi.create(payload)
        toast.success('Artikel berhasil dibuat')
      }
      setDialogOpen(false)
      load()
    } catch (e: any) {
      toast.error('Gagal menyimpan artikel', { description: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (a: any) => {
    if (!confirm(`Hapus artikel "${a.title}"?`)) return
    try {
      await api.edukasi.delete(a.id)
      toast.success('Artikel dihapus')
      load()
    } catch (e: any) {
      toast.error('Gagal menghapus', { description: e.message })
    }
  }

  return (
    <Card className="border-emerald-100">
      <CardHeader className="border-b border-emerald-100/70">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-emerald-900">
              <BookOpen className="h-5 w-5 text-emerald-600" /> Manajemen Edukasi & Konten
            </CardTitle>
            <CardDescription>Kelola artikel edukasi lingkungan untuk halaman publik.</CardDescription>
          </div>
          <Button onClick={openCreate} className="bg-emerald-600 text-white hover:bg-emerald-700">
            <Plus className="mr-1.5 h-4 w-4" /> Tambah Artikel
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50">
              <BookOpen className="size-6 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-emerald-700/70">Belum ada artikel edukasi</p>
            <Button onClick={openCreate} size="sm" className="mt-2 bg-emerald-600 text-white hover:bg-emerald-700">
              <Plus className="mr-1 size-4" /> Buat artikel pertama
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-white p-3 transition hover:shadow-sm">
                {/* Image */}
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-emerald-50">
                  {a.featuredImage ? (
                    <img src={a.featuredImage} alt={a.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="size-6 text-emerald-300" />
                    </div>
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-zinc-900">{a.title}</h3>
                    <div className="flex shrink-0 gap-1">
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => openEdit(a)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(a)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  {a.excerpt && <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{a.excerpt}</p>}
                  <div className="mt-1 flex items-center gap-3 text-[10px] text-zinc-400">
                    {a.publishedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" /> {formatDate(a.publishedAt)}
                      </span>
                    )}
                    <span>oleh {a.author || 'Admin'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!submitting) setDialogOpen(o) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-900">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              {editing ? 'Edit Artikel' : 'Tambah Artikel Baru'}
            </DialogTitle>
            <DialogDescription>
              {editing ? 'Ubah konten artikel edukasi.' : 'Isi artikel edukasi untuk ditampilkan di halaman publik.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-emerald-800">Judul Artikel <span className="text-rose-500">*</span></Label>
              <Input value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="Judul artikel..." className="border-emerald-200" />
            </div>

            {/* Excerpt */}
            <div className="space-y-1.5">
              <Label className="text-emerald-800">Ringkasan (excerpt)</Label>
              <Textarea value={fExcerpt} onChange={(e) => setFExcerpt(e.target.value)} placeholder="Ringkasan singkat artikel..." rows={2} className="border-emerald-200" />
            </div>

            {/* Featured Image */}
            <div className="space-y-1.5">
              <Label className="text-emerald-800">Gambar Utama</Label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/40">
                  {fImage ? (
                    <>
                      <img src={fImage} alt="Preview" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => setFImage('')} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white">
                        <X className="size-3" />
                      </button>
                    </>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-emerald-300">
                      <ImageIcon className="size-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-3 text-center transition hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-60"
                  >
                    {uploading ? (
                      <><Loader2 className="size-5 animate-spin text-emerald-500" /><span className="text-xs text-emerald-600">Mengupload...</span></>
                    ) : (
                      <><Upload className="size-5 text-emerald-500" /><span className="text-xs font-medium text-emerald-700">{fImage ? 'Ganti Gambar' : 'Upload Gambar'}</span><span className="text-[10px] text-emerald-500/70">JPG, PNG, WebP · Maks 2MB</span></>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              <Label className="text-emerald-800">Konten Artikel <span className="text-rose-500">*</span></Label>
              <Textarea
                value={fContent}
                onChange={(e) => setFContent(e.target.value)}
                placeholder={'Tulis konten artikel...\n\nGunakan # untuk heading\n- untuk bullet point\n\nContoh:\n## Pengertian\nBank sampah adalah...\n\n## Manfaat\n- Mengurangi sampah\n- Menghasilkan uang'}
                rows={10}
                className="border-emerald-200 font-mono text-xs"
              />
              <p className="text-[10px] text-zinc-400">
                Gunakan <code className="rounded bg-zinc-100 px-1">#</code> untuk heading, <code className="rounded bg-zinc-100 px-1">-</code> untuk bullet, baris kosong untuk paragraf baru.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting} className="border-emerald-200 text-emerald-700">
              Batal
            </Button>
            <Button onClick={submit} disabled={submitting} className="bg-emerald-600 text-white hover:bg-emerald-700">
              {submitting ? <><Loader2 className="mr-1.5 size-4 animate-spin" /> Menyimpan...</> : editing ? 'Simpan Perubahan' : 'Publikasikan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
