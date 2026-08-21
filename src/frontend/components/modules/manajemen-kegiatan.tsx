'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, Camera, X, Loader2, Upload, Image as ImageIcon,
  Calendar, MapPin, Images,
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
// ManajemenKegiatan — admin CRUD for activity documentation
// ============================================================
export function ManajemenKegiatan() {
  const [items, setItems] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<any>(null)
  const [submitting, setSubmitting] = React.useState(false)

  // Form fields
  const [fTitle, setFTitle] = React.useState('')
  const [fDesc, setFDesc] = React.useState('')
  const [fDate, setFDate] = React.useState('')
  const [fLocation, setFLocation] = React.useState('')
  const [fCover, setFCover] = React.useState('')
  const [fImages, setFImages] = React.useState<string[]>([])
  const [uploadingCover, setUploadingCover] = React.useState(false)
  const [uploadingImages, setUploadingImages] = React.useState(false)
  const coverInputRef = React.useRef<HTMLInputElement>(null)
  const imagesInputRef = React.useRef<HTMLInputElement>(null)

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

  const resetForm = () => {
    setFTitle(''); setFDesc(''); setFDate(''); setFLocation('')
    setFCover(''); setFImages([])
    setEditing(null)
  }

  const openCreate = () => { resetForm(); setDialogOpen(true) }

  const openEdit = (k: any) => {
    setEditing(k)
    setFTitle(k.title || '')
    setFDesc(k.description || '')
    setFDate(k.activityDate ? new Date(k.activityDate).toISOString().split('T')[0] : '')
    setFLocation(k.location || '')
    setFCover(k.coverImage || '')
    setFImages(Array.isArray(k.images) ? k.images : [])
    setDialogOpen(true)
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipe file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.')
      return null
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Ukuran file terlalu besar. Maksimal 3MB.')
      return null
    }
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/kegiatan/upload', { method: 'POST', body: formData })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'Gagal upload'); return null }
    return data.url
  }

  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true)
    try {
      const url = await uploadImage(file)
      if (url) { setFCover(url); toast.success('Cover berhasil diupload') }
    } finally {
      setUploadingCover(false)
      if (coverInputRef.current) coverInputRef.current.value = ''
    }
  }

  const handleImagesUpload = async (files: FileList) => {
    setUploadingImages(true)
    try {
      const urls: string[] = []
      for (const file of Array.from(files)) {
        const url = await uploadImage(file)
        if (url) urls.push(url)
      }
      if (urls.length > 0) {
        setFImages((prev) => [...prev, ...urls])
        toast.success(`${urls.length} foto berhasil diupload`)
      }
    } finally {
      setUploadingImages(false)
      if (imagesInputRef.current) imagesInputRef.current.value = ''
    }
  }

  const removeImage = (idx: number) => {
    setFImages((prev) => prev.filter((_, i) => i !== idx))
  }

  const submit = async () => {
    if (!fTitle.trim()) { toast.error('Judul wajib diisi'); return }
    setSubmitting(true)
    try {
      const payload = {
        title: fTitle.trim(),
        description: fDesc.trim() || undefined,
        activityDate: fDate || undefined,
        location: fLocation.trim() || undefined,
        coverImage: fCover || undefined,
        images: fImages,
      }
      if (editing) {
        await api.kegiatan.update(editing.id, payload)
        toast.success('Kegiatan berhasil diperbarui')
      } else {
        await api.kegiatan.create(payload)
        toast.success('Kegiatan berhasil dibuat')
      }
      setDialogOpen(false)
      load()
    } catch (e: any) {
      toast.error('Gagal menyimpan kegiatan', { description: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (k: any) => {
    if (!confirm(`Hapus kegiatan "${k.title}"?`)) return
    try {
      await api.kegiatan.delete(k.id)
      toast.success('Kegiatan dihapus')
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
              <Camera className="h-5 w-5 text-emerald-600" /> Dokumentasi Kegiatan
            </CardTitle>
            <CardDescription>Kelola dokumentasi kegiatan & aksi lingkungan bank sampah.</CardDescription>
          </div>
          <Button onClick={openCreate} className="bg-emerald-600 text-white hover:bg-emerald-700">
            <Plus className="mr-1.5 h-4 w-4" /> Tambah Kegiatan
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50">
              <Camera className="size-6 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-emerald-700/70">Belum ada dokumentasi kegiatan</p>
            <Button onClick={openCreate} size="sm" className="mt-2 bg-emerald-600 text-white hover:bg-emerald-700">
              <Plus className="mr-1 size-4" /> Dokumentasikan kegiatan pertama
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((k) => (
              <div key={k.id} className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-white p-3 transition hover:shadow-sm">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-emerald-50">
                  {k.coverImage ? (
                    <img src={k.coverImage} alt={k.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Camera className="size-6 text-emerald-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-zinc-900">{k.title}</h3>
                    <div className="flex shrink-0 gap-1">
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => openEdit(k)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(k)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  {k.description && <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{k.description}</p>}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-zinc-400">
                    {k.activityDate && (
                      <span className="flex items-center gap-0.5">
                        <Calendar className="size-3" /> {formatDate(k.activityDate)}
                      </span>
                    )}
                    {k.location && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="size-3" /> {k.location}
                      </span>
                    )}
                    {Array.isArray(k.images) && k.images.length > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Images className="size-3" /> {k.images.length} foto
                      </span>
                    )}
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
              <Camera className="h-5 w-5 text-emerald-600" />
              {editing ? 'Edit Kegiatan' : 'Tambah Kegiatan'}
            </DialogTitle>
            <DialogDescription>
              {editing ? 'Ubah dokumentasi kegiatan.' : 'Dokumentasikan kegiatan & aksi lingkungan bank sampah.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-emerald-800">Judul Kegiatan <span className="text-rose-500">*</span></Label>
              <Input value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="Judul kegiatan..." className="border-emerald-200" />
            </div>

            {/* Date + Location */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-emerald-800">Tanggal Kegiatan</Label>
                <Input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} className="border-emerald-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-emerald-800">Lokasi</Label>
                <Input value={fLocation} onChange={(e) => setFLocation(e.target.value)} placeholder="Lokasi kegiatan..." className="border-emerald-200" />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-emerald-800">Deskripsi</Label>
              <Textarea value={fDesc} onChange={(e) => setFDesc(e.target.value)} placeholder="Deskripsi kegiatan..." rows={3} className="border-emerald-200" />
            </div>

            {/* Cover Image */}
            <div className="space-y-1.5">
              <Label className="text-emerald-800">Foto Cover</Label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/40">
                  {fCover ? (
                    <>
                      <img src={fCover} alt="Cover" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => setFCover('')} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white">
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
                  <input ref={coverInputRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f) }} className="hidden" />
                  <button type="button" onClick={() => coverInputRef.current?.click()} disabled={uploadingCover}
                    className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-3 text-center transition hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-60">
                    {uploadingCover ? (
                      <><Loader2 className="size-5 animate-spin text-emerald-500" /><span className="text-xs text-emerald-600">Mengupload...</span></>
                    ) : (
                      <><Upload className="size-5 text-emerald-500" /><span className="text-xs font-medium text-emerald-700">{fCover ? 'Ganti Cover' : 'Upload Cover'}</span><span className="text-[10px] text-emerald-500/70">JPG, PNG, WebP · Maks 3MB</span></>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Multiple Photos */}
            <div className="space-y-1.5">
              <Label className="text-emerald-800">Foto Dokumentasi (bisa multiple)</Label>
              <input ref={imagesInputRef} type="file" accept="image/*" multiple onChange={(e) => { if (e.target.files?.length) handleImagesUpload(e.target.files) }} className="hidden" />
              <button type="button" onClick={() => imagesInputRef.current?.click()} disabled={uploadingImages}
                className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-4 text-center transition hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-60">
                {uploadingImages ? (
                  <><Loader2 className="size-6 animate-spin text-emerald-500" /><span className="text-xs text-emerald-600">Mengupload foto...</span></>
                ) : (
                  <><Images className="size-6 text-emerald-500" /><span className="text-xs font-medium text-emerald-700">Upload Multiple Foto</span><span className="text-[10px] text-emerald-500/70">Pilih satu atau beberapa foto sekaligus</span></>
                )}
              </button>
              {fImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {fImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-square overflow-hidden rounded-lg border border-emerald-100">
                      <img src={img} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
                      <button type="button" onClick={() => removeImage(idx)} className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm">
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
