'use client'

import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Award, BarChart3, Eye, Handshake, Inbox, Loader2, Package, Pencil, Plus,
  Recycle, Save, Search, Settings, ShieldCheck, ShoppingBag, Tag, Trash2, UserCircle, Users,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

import { api } from '@/lib/api'
import {
  formatDate, formatNumber, formatRupiah, parseRoles, roleLabel, toNumber,
} from '@/lib/format'
import { ManajemenAkunTab } from './manajemen-akun'
import { NasabahDashboardModal, KoperasiDashboardModal } from './personal-dashboard-modal'

// ============================================================
// Constants
// ============================================================
const ROLE_OPTIONS = [
  { value: 'nasabah', label: 'Nasabah' },
  { value: 'koperasi', label: 'Anggota Koperasi' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
]

const MITRA_TYPES = [
  { value: 'pengepul', label: 'Pengepul' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'pengrajin', label: 'Pengrajin' },
  { value: 'lainnya', label: 'Lainnya' },
]

// ============================================================
// Shared building blocks
// ============================================================
type IconType = React.ComponentType<{ className?: string }>

function EmptyState({
  icon: Icon = Inbox,
  message = 'Belum ada data',
}: { icon?: IconType; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600">
        <Icon className="size-6" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
      Aktif
    </Badge>
  ) : (
    <Badge variant="secondary" className="border-zinc-200 bg-zinc-100 text-zinc-600">
      Nonaktif
    </Badge>
  )
}

function ScrollTable({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="max-h-[480px] overflow-auto rounded-md border border-emerald-100 bg-white
      [&::-webkit-scrollbar]:w-2
      [&::-webkit-scrollbar-track]:bg-emerald-50/60
      [&::-webkit-scrollbar-thumb]:rounded-full
      [&::-webkit-scrollbar-thumb]:bg-emerald-200
      [&::-webkit-scrollbar-thumb:hover]:bg-emerald-300"
    >
      <Table>{children}</Table>
    </div>
  )
}

function FieldShell({
  label, hint, children, full = false,
}: { label: string; hint?: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <Label className="mb-1.5">
        {label}
        {hint && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{hint}</span>}
      </Label>
      {children}
    </div>
  )
}

function EmeraldButton({
  loading, children, ...rest
}: { loading?: boolean; children: React.ReactNode } & React.ComponentProps<typeof Button>) {
  return (
    <Button
      disabled={loading}
      className="bg-emerald-600 text-white hover:bg-emerald-700"
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </Button>
  )
}

function CardHead({
  icon: Icon, title, description, action,
}: { icon: IconType; title: string; description: string; action?: React.ReactNode }) {
  return (
    <CardHeader className="border-b border-emerald-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-emerald-900">
            <Icon className="size-4" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {action}
      </div>
    </CardHeader>
  )
}

const inputCls = 'border-emerald-200 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500'
const triggerCls = 'border-emerald-200 focus-visible:ring-emerald-500/30 w-full'

// ============================================================
// 1. Nasabah Tab (read-only — CRUD terpusat di Manajemen Akun)
// ============================================================
function NasabahTab() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [roleFilter, setRoleFilter] = useState('nasabah')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dashboardUserId, setDashboardUserId] = useState<string | null>(null)
  const [dashboardOpen, setDashboardOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.nasabah.list(q, roleFilter)
      const filtered = statusFilter === 'all' ? res : res.filter((u: any) => u.verificationStatus === statusFilter)
      setData(filtered)
    } catch (e: any) {
      toast.error(e?.message || 'Gagal memuat data nasabah')
    } finally {
      setLoading(false)
    }
  }, [q, roleFilter, statusFilter])

  useEffect(() => {
    const t = setTimeout(() => { load() }, 300)
    return () => clearTimeout(t)
  }, [load])

  const openDashboard = (u: any) => {
    setDashboardUserId(u.id)
    setDashboardOpen(true)
  }

  const handleApprove = async (id: string) => {
    if (!confirm('Setujui nasabah ini? Mereka akan bisa login ke aplikasi.')) return
    try {
      const res = await fetch(`/api/master/nasabah/${id}/approve`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal approve')
      toast.success('Berhasil menyetujui nasabah!')
      load()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <Card className="border-emerald-200">
      <CardHead
        icon={Users}
        title="Data Nasabah Bank Sampah"
        description="Daftar nasabah bank sampah. Penambahan, edit, dan hapus data dilakukan di tab Manajemen Akun."
      />
      <CardContent className="pt-4">
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-2.5 text-xs text-amber-800">
          <ShieldCheck className="size-4 shrink-0 text-amber-600" />
          <span>Semua operasi (tambah, edit, hapus, atur role) terpusat di <b>Manajemen Akun</b>. Tab ini bersifat read-only.</span>
        </div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nama, email, kode member, NIK..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={`pl-9 ${inputCls}`}
            />
          </div>
          {/* Role filter hidden, forced to nasabah */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={`sm:w-52 ${triggerCls}`}>
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="verified">Verified (Aktif)</SelectItem>
              <SelectItem value="pending_admin">Pending Admin</SelectItem>
              <SelectItem value="pending_otp">Pending OTP</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={8} />
        ) : data.length === 0 ? (
          <EmptyState icon={Users} message="Belum ada data nasabah" />
        ) : (
          <ScrollTable>
            <TableHeader>
              <TableRow className="bg-emerald-50/60 hover:bg-emerald-50/60">
                <TableHead className="text-emerald-900">Kode Member</TableHead>
                <TableHead className="text-emerald-900">Nama</TableHead>
                <TableHead className="text-emerald-900">Email</TableHead>
                <TableHead className="text-emerald-900">Telepon</TableHead>
                <TableHead className="text-emerald-900">Role</TableHead>
                <TableHead className="text-emerald-900">Verifikasi</TableHead>
                <TableHead className="text-right text-emerald-900">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((u) => {
                const roles = parseRoles(u.roles)
                const isPendingAdmin = u.verificationStatus === 'pending_admin'
                const isPendingOtp = u.verificationStatus === 'pending_otp'
                
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono text-xs text-emerald-800">{u.memberCode || '-'}</TableCell>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>{u.phone || '-'}</TableCell>
                    <TableCell>
                      <span className="text-sm">{roleLabel(roles)}</span>
                    </TableCell>
                    <TableCell>
                      {isPendingAdmin ? (
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Pending Admin</Badge>
                      ) : isPendingOtp ? (
                        <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">Pending OTP</Badge>
                      ) : (
                        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> Aktif
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 border-emerald-200 text-xs text-emerald-700 hover:bg-emerald-50"
                        onClick={() => openDashboard(u)}
                      >
                        <BarChart3 className="size-3.5" /> Lihat Dashboard
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </ScrollTable>
        )}
      </CardContent>

      <NasabahDashboardModal penggunaId={dashboardUserId} open={dashboardOpen} onOpenChange={setDashboardOpen} />
    </Card>
  )
}

// ============================================================
// 2. Kategori Sampah Tab
// ============================================================
function KategoriTab() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({
    name: '', codePrefix: '', description: '', isActive: true,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await api.kategori.list())
    } catch (e: any) {
      toast.error(e?.message || 'Gagal memuat kategori')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', codePrefix: '', description: '', isActive: true })
    setOpen(true)
  }
  const openEdit = (c: any) => {
    setEditing(c)
    setForm({
      name: c.name || '',
      codePrefix: c.codePrefix || '',
      description: c.description || '',
      isActive: c.isActive ?? true,
    })
    setOpen(true)
  }
  const save = async () => {
    if (!form.name) {
      toast.error('Nama kategori wajib diisi')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await api.kategori.update(editing.id, form)
        toast.success('Kategori diperbarui')
      } else {
        await api.kategori.create(form)
        toast.success('Kategori ditambahkan')
      }
      setOpen(false)
      load()
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menyimpan kategori')
    } finally {
      setSaving(false)
    }
  }
  const remove = async (c: any) => {
    if (!confirm(`Hapus kategori "${c.name}"?`)) return
    try {
      await api.kategori.delete(c.id)
      toast.success('Kategori dihapus')
      load()
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menghapus kategori')
    }
  }

  return (
    <Card className="border-emerald-200">
      <CardHead
        icon={Tag}
        title="Kategori Sampah"
        description="Pengelompokan jenis sampah dengan prefix kode untuk penomoran barang."
        action={
          <EmeraldButton onClick={openAdd} className="shrink-0">
            <Plus className="size-4" /> Tambah Kategori
          </EmeraldButton>
        }
      />
      <CardContent className="pt-4">
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : data.length === 0 ? (
          <EmptyState icon={Tag} message="Belum ada kategori sampah" />
        ) : (
          <ScrollTable>
            <TableHeader>
              <TableRow className="bg-emerald-50/60 hover:bg-emerald-50/60">
                <TableHead className="text-emerald-900">Prefix Kode</TableHead>
                <TableHead className="text-emerald-900">Nama</TableHead>
                <TableHead className="text-emerald-900">Deskripsi</TableHead>
                <TableHead className="text-right text-emerald-900">Jumlah Item</TableHead>
                <TableHead className="text-emerald-900">Status</TableHead>
                <TableHead className="text-right text-emerald-900">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Badge variant="outline" className="border-emerald-200 font-mono text-emerald-700">
                      {c.codePrefix || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-emerald-900">{c.name}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {c.description || '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {c._count?.items ?? 0}
                  </TableCell>
                  <TableCell><StatusBadge active={!!c.isActive} /></TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        size="icon" variant="ghost"
                        className="size-8 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => openEdit(c)} aria-label="Edit kategori"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className="size-8 text-red-600 hover:bg-red-50"
                        onClick={() => remove(c)} aria-label="Hapus kategori"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </ScrollTable>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-emerald-900">
              {editing ? 'Edit Kategori' : 'Tambah Kategori'}
            </DialogTitle>
            <DialogDescription>Prefix kode dipakai untuk penomoran barang sampah.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldShell label="Nama Kategori">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Plastik"
                className={inputCls}
              />
            </FieldShell>
            <FieldShell label="Prefix Kode" hint="cth. PL-">
              <Input
                value={form.codePrefix}
                onChange={(e) => setForm({ ...form, codePrefix: e.target.value })}
                placeholder="PL-"
                className={inputCls}
              />
            </FieldShell>
            <FieldShell label="Deskripsi" full>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Keterangan kategori"
                className={inputCls}
              />
            </FieldShell>
            <div className="flex items-center justify-between rounded-md border border-emerald-100 bg-emerald-50/30 p-3 sm:col-span-2">
              <div>
                <Label>Aktif</Label>
                <p className="text-xs text-muted-foreground">Kategori nonaktif tidak muncul di transaksi baru.</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <EmeraldButton loading={saving} onClick={save}>
              {editing ? 'Simpan Perubahan' : 'Tambah'}
            </EmeraldButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ============================================================
// 3. Barang Sampah Tab
// ============================================================
function BarangTab() {
  const [data, setData] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({
    kategoriSampahId: '', code: '', name: '', unit: 'kg', pricePerUnit: 0,
    description: '', isActive: true,
  })

  const loadCats = useCallback(async () => {
    try { setCategories(await api.kategori.list()) } catch { /* silent */ }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await api.barang.list(catFilter === 'all' ? '' : catFilter))
    } catch (e: any) {
      toast.error(e?.message || 'Gagal memuat barang')
    } finally {
      setLoading(false)
    }
  }, [catFilter])

  // Client-side search filter
  const filteredData = searchQ.trim()
    ? data.filter((b) =>
        b.name?.toLowerCase().includes(searchQ.toLowerCase()) ||
        b.code?.toLowerCase().includes(searchQ.toLowerCase())
      )
    : data

  useEffect(() => { loadCats() }, [loadCats])
  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditing(null)
    setForm({
      kategoriSampahId: categories[0]?.id || '', code: '', name: '', unit: 'kg',
      pricePerUnit: 0, description: '', isActive: true,
    })
    setOpen(true)
  }
  const openEdit = (b: any) => {
    setEditing(b)
    setForm({
      kategoriSampahId: b.kategoriSampahId || '',
      code: b.code || '',
      name: b.name || '',
      unit: b.unit || 'kg',
      pricePerUnit: toNumber(b.pricePerUnit),
      description: b.description || '',
      isActive: b.isActive ?? true,
    })
    setOpen(true)
  }
  const save = async () => {
    if (!form.name || !form.code || !form.kategoriSampahId) {
      toast.error('Kategori, kode, dan nama wajib diisi')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await api.barang.update(editing.id, form)
        toast.success('Barang diperbarui')
      } else {
        await api.barang.create(form)
        toast.success('Barang ditambahkan')
      }
      setOpen(false)
      load()
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menyimpan barang')
    } finally {
      setSaving(false)
    }
  }
  const remove = async (b: any) => {
    if (!confirm(`Hapus barang "${b.name}"?`)) return
    try {
      await api.barang.delete(b.id)
      toast.success('Barang dihapus')
      load()
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menghapus barang')
    }
  }

  return (
    <Card className="border-emerald-200">
      <CardHead
        icon={Recycle}
        title="Barang Sampah"
        description="Master item sampah yang dapat ditabung. Setiap barang memiliki harga per satuan."
        action={
          <EmeraldButton onClick={openAdd} className="shrink-0">
            <Plus className="size-4" /> Tambah Barang
          </EmeraldButton>
        }
      />
      <CardContent className="pt-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className={`sm:w-48 ${triggerCls}`}>
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Cari kode / nama..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                className="h-9 w-full border-zinc-200 pl-8 text-sm sm:w-56"
              />
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {filteredData.length} item ditemukan
          </span>
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : filteredData.length === 0 ? (
          <EmptyState icon={Recycle} message="Belum ada barang sampah" />
        ) : (
          <ScrollTable>
            <TableHeader>
              <TableRow className="bg-emerald-50/60 hover:bg-emerald-50/60">
                <TableHead className="text-emerald-900">Kode</TableHead>
                <TableHead className="text-emerald-900">Nama</TableHead>
                <TableHead className="text-emerald-900">Kategori</TableHead>
                <TableHead className="text-emerald-900">Satuan</TableHead>
                <TableHead className="text-right text-emerald-900">Harga / Satuan</TableHead>
                <TableHead className="text-emerald-900">Status</TableHead>
                <TableHead className="text-right text-emerald-900">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs text-emerald-800">{b.code}</TableCell>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-emerald-200 text-emerald-700">
                      {b.category?.name || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell>{b.unit || 'kg'}</TableCell>
                  <TableCell className="text-right font-mono text-emerald-800">
                    {formatRupiah(toNumber(b.pricePerUnit))}
                  </TableCell>
                  <TableCell><StatusBadge active={!!b.isActive} /></TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        size="icon" variant="ghost"
                        className="size-8 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => openEdit(b)} aria-label="Edit barang"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className="size-8 text-red-600 hover:bg-red-50"
                        onClick={() => remove(b)} aria-label="Hapus barang"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </ScrollTable>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-emerald-900">
              {editing ? 'Edit Barang' : 'Tambah Barang'}
            </DialogTitle>
            <DialogDescription>Harga per satuan akan tersimpan sebagai harga berlaku.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldShell label="Kategori" full>
              <Select
                value={form.kategoriSampahId}
                onValueChange={(v) => setForm({ ...form, kategoriSampahId: v })}
              >
                <SelectTrigger className={triggerCls}>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldShell>
            <FieldShell label="Kode Barang">
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="cth. PL-PET01"
                className={inputCls}
              />
            </FieldShell>
            <FieldShell label="Nama Barang">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="cth. Botol PET"
                className={inputCls}
              />
            </FieldShell>
            <FieldShell label="Satuan">
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger className={triggerCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="pcs">pcs</SelectItem>
                  <SelectItem value="liter">liter</SelectItem>
                  <SelectItem value="karung">karung</SelectItem>
                  <SelectItem value="sak">sak</SelectItem>
                </SelectContent>
              </Select>
            </FieldShell>
            <FieldShell label="Harga per Satuan" hint="Rp">
              <Input
                type="number" min={0}
                value={form.pricePerUnit || ''}
                onChange={(e) => setForm({ ...form, pricePerUnit: Number(e.target.value) || 0 })}
                placeholder="0"
                className={inputCls}
              />
            </FieldShell>
            <FieldShell label="Deskripsi" full>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Keterangan barang"
                className={inputCls}
              />
            </FieldShell>
            <div className="flex items-center justify-between rounded-md border border-emerald-100 bg-emerald-50/30 p-3 sm:col-span-2">
              <div>
                <Label>Aktif</Label>
                <p className="text-xs text-muted-foreground">Barang nonaktif tidak dapat ditabung.</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <EmeraldButton loading={saving} onClick={save}>
              {editing ? 'Simpan Perubahan' : 'Tambah'}
            </EmeraldButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ============================================================

// ============================================================
// 5. Anggota Koperasi Tab
// ============================================================
function AnggotaTab() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dashboardAnggotaId, setDashboardAnggotaId] = useState<string | null>(null)
  const [dashboardOpen, setDashboardOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await api.anggota.list())
    } catch (e: any) {
      toast.error(e?.message || 'Gagal memuat anggota')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openDashboard = (a: any) => {
    setDashboardAnggotaId(a.id)
    setDashboardOpen(true)
  }

  return (
    <Card className="border-emerald-200">
      <CardHead
        icon={UserCircle}
        title="Anggota Koperasi"
        description="Daftar anggota koperasi simpan pinjam. Penambahan, edit, dan hapus data dilakukan di tab Manajemen Akun."
      />
      <CardContent className="pt-4">
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-2.5 text-xs text-amber-800">
          <ShieldCheck className="size-4 shrink-0 text-amber-600" />
          <span>Semua operasi (tambah, edit, hapus, atur role koperasi) terpusat di <b>Manajemen Akun</b>. Tab ini bersifat read-only.</span>
        </div>
        {loading ? (
          <TableSkeleton rows={6} cols={8} />
        ) : data.length === 0 ? (
          <EmptyState icon={UserCircle} message="Belum ada anggota koperasi" />
        ) : (
          <ScrollTable>
            <TableHeader>
              <TableRow className="bg-emerald-50/60 hover:bg-emerald-50/60">
                <TableHead className="text-emerald-900">Nomor Anggota</TableHead>
                <TableHead className="text-emerald-900">Nama</TableHead>
                <TableHead className="text-emerald-900">Simpanan Pokok</TableHead>
                <TableHead className="text-emerald-900">No KTP</TableHead>
                <TableHead className="text-emerald-900">Telepon</TableHead>
                <TableHead className="text-emerald-900">Status</TableHead>
                <TableHead className="text-emerald-900">Tgl Bergabung</TableHead>
                <TableHead className="text-right text-emerald-900">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((a) => {
                const pokokSaldo = Number(a.simpananSaldos?.find((s: any) => s.jenisSimpanan === 'pokok')?.saldo ?? 0)
                const isPokokLunas = pokokSaldo > 0

                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs text-emerald-800">{a.nomorAnggota}</TableCell>
                    <TableCell className="font-medium">{a.nama}</TableCell>
                    <TableCell>
                      {isPokokLunas ? (
                        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 font-medium">
                          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Lunas ({formatRupiah(pokokSaldo)})
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-50 font-semibold">
                          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Belum Bayar
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{a.noKtp || '-'}</TableCell>
                    <TableCell>{a.noTelepon || '-'}</TableCell>
                    <TableCell>
                      {a.status === 'aktif' ? (
                        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> Aktif
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="border-zinc-200 bg-zinc-100 text-zinc-500 hover:bg-zinc-100">
                          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-zinc-400" /> Tidak Aktif
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(a.tanggalBergabung)}</TableCell>
                    <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 border-blue-200 text-xs text-blue-700 hover:bg-blue-50"
                      onClick={() => openDashboard(a)}
                    >
                      <BarChart3 className="size-3.5" /> Lihat Dashboard
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
          </ScrollTable>
        )}
      </CardContent>

      <KoperasiDashboardModal anggotaId={dashboardAnggotaId} open={dashboardOpen} onOpenChange={setDashboardOpen} />
    </Card>
  )
}

// ============================================================
// 6. Mitra Tab
// ============================================================
function MitraTab() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({
    name: '', type: 'pengepul', phone: '', email: '', address: '', notes: '', isActive: true,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await api.mitra.list())
    } catch (e: any) {
      toast.error(e?.message || 'Gagal memuat mitra')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', type: 'pengepul', phone: '', email: '', address: '', notes: '', isActive: true })
    setOpen(true)
  }
  const openEdit = (m: any) => {
    setEditing(m)
    setForm({
      name: m.name || '',
      type: m.type || 'pengepul',
      phone: m.phone || '',
      email: m.email || '',
      address: m.address || '',
      notes: m.notes || '',
      isActive: m.isActive ?? true,
    })
    setOpen(true)
  }
  const save = async () => {
    if (!form.name) {
      toast.error('Nama mitra wajib diisi')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await api.mitra.update(editing.id, form)
        toast.success('Mitra diperbarui')
      } else {
        await api.mitra.create(form)
        toast.success('Mitra ditambahkan')
      }
      setOpen(false)
      load()
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menyimpan mitra')
    } finally {
      setSaving(false)
    }
  }
  const remove = async (m: any) => {
    if (!confirm(`Hapus mitra "${m.name}"?`)) return
    try {
      await api.mitra.delete(m.id)
      toast.success('Mitra dihapus')
      load()
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menghapus mitra')
    }
  }

  return (
    <Card className="border-emerald-200">
      <CardHead
        icon={Handshake}
        title="Mitra"
        description="Mitra pengepul / distributor / pengrajin untuk transaksi penjualan sampah."
        action={
          <EmeraldButton onClick={openAdd} className="shrink-0">
            <Plus className="size-4" /> Tambah Mitra
          </EmeraldButton>
        }
      />
      <CardContent className="pt-4">
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : data.length === 0 ? (
          <EmptyState icon={Handshake} message="Belum ada mitra" />
        ) : (
          <ScrollTable>
            <TableHeader>
              <TableRow className="bg-emerald-50/60 hover:bg-emerald-50/60">
                <TableHead className="text-emerald-900">Nama</TableHead>
                <TableHead className="text-emerald-900">Tipe</TableHead>
                <TableHead className="text-emerald-900">Telepon</TableHead>
                <TableHead className="text-emerald-900">Alamat</TableHead>
                <TableHead className="text-emerald-900">Status</TableHead>
                <TableHead className="text-right text-emerald-900">Jumlah Transaksi</TableHead>
                <TableHead className="text-right text-emerald-900">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize border-emerald-200 text-emerald-700">
                      {m.type || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell>{m.phone || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{m.address || '-'}</TableCell>
                  <TableCell><StatusBadge active={!!m.isActive} /></TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {m._count?.transaksiPenjualanMitras ?? 0}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        size="icon" variant="ghost"
                        className="size-8 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => openEdit(m)} aria-label="Edit mitra"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className="size-8 text-red-600 hover:bg-red-50"
                        onClick={() => remove(m)} aria-label="Hapus mitra"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </ScrollTable>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-emerald-900">
              {editing ? 'Edit Mitra' : 'Tambah Mitra'}
            </DialogTitle>
            <DialogDescription>Mitra untuk transaksi penjualan sampah ke pihak luar.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldShell label="Nama Mitra">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="cth. CV Pengepul Maju"
                className={inputCls}
              />
            </FieldShell>
            <FieldShell label="Tipe Mitra">
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className={triggerCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MITRA_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldShell>
            <FieldShell label="Telepon">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="08xx..."
                className={inputCls}
              />
            </FieldShell>
            <FieldShell label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@contoh.com"
                className={inputCls}
              />
            </FieldShell>
            <FieldShell label="Alamat" full>
              <Textarea
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Alamat mitra"
                className={inputCls}
              />
            </FieldShell>
            <FieldShell label="Catatan" full>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Catatan internal"
                className={inputCls}
              />
            </FieldShell>
            <div className="flex items-center justify-between rounded-md border border-emerald-100 bg-emerald-50/30 p-3 sm:col-span-2">
              <div>
                <Label>Aktif</Label>
                <p className="text-xs text-muted-foreground">Mitra nonaktif tidak dapat dipilih di transaksi.</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <EmeraldButton loading={saving} onClick={save}>
              {editing ? 'Simpan Perubahan' : 'Tambah'}
            </EmeraldButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ============================================================
// 7. Produk Tab
// ============================================================
function ProdukTab() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({
    name: '', unit: 'pcs', price: 0, pointsCost: 0, stock: 0, description: '', isActive: true,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await api.produk.list())
    } catch (e: any) {
      toast.error(e?.message || 'Gagal memuat produk')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', unit: 'pcs', price: 0, pointsCost: 0, stock: 0, description: '', isActive: true })
    setOpen(true)
  }
  const openEdit = (p: any) => {
    setEditing(p)
    setForm({
      name: p.name || '',
      unit: p.unit || 'pcs',
      price: toNumber(p.price),
      pointsCost: toNumber(p.pointsCost),
      stock: toNumber(p.stock),
      description: p.description || '',
      isActive: p.isActive ?? true,
    })
    setOpen(true)
  }
  const save = async () => {
    if (!form.name) {
      toast.error('Nama produk wajib diisi')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await api.produk.update(editing.id, form)
        toast.success('Produk diperbarui')
      } else {
        await api.produk.create(form)
        toast.success('Produk ditambahkan')
      }
      setOpen(false)
      load()
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menyimpan produk')
    } finally {
      setSaving(false)
    }
  }
  const remove = async (p: any) => {
    if (!confirm(`Hapus produk "${p.name}"?`)) return
    try {
      await api.produk.delete(p.id)
      toast.success('Produk dihapus')
      load()
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menghapus produk')
    }
  }

  return (
    <Card className="border-emerald-200">
      <CardHead
        icon={ShoppingBag}
        title="Produk"
        description="Produk hasil pengolahan sampah yang dapat dijual atau ditukar dengan poin."
        action={
          <EmeraldButton onClick={openAdd} className="shrink-0">
            <Plus className="size-4" /> Tambah Produk
          </EmeraldButton>
        }
      />
      <CardContent className="pt-4">
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : data.length === 0 ? (
          <EmptyState icon={ShoppingBag} message="Belum ada produk" />
        ) : (
          <ScrollTable>
            <TableHeader>
              <TableRow className="bg-emerald-50/60 hover:bg-emerald-50/60">
                <TableHead className="text-emerald-900">Nama</TableHead>
                <TableHead className="text-emerald-900">Satuan</TableHead>
                <TableHead className="text-right text-emerald-900">Harga</TableHead>
                <TableHead className="text-right text-emerald-900">Poin</TableHead>
                <TableHead className="text-right text-emerald-900">Stok</TableHead>
                <TableHead className="text-emerald-900">Status</TableHead>
                <TableHead className="text-right text-emerald-900">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.unit || 'pcs'}</TableCell>
                  <TableCell className="text-right font-mono text-emerald-800">
                    {formatRupiah(toNumber(p.price))}
                  </TableCell>
                  <TableCell className="text-right font-mono text-amber-700">
                    {formatNumber(toNumber(p.pointsCost), 0)} p
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(toNumber(p.stock), 0)}
                  </TableCell>
                  <TableCell><StatusBadge active={!!p.isActive} /></TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        size="icon" variant="ghost"
                        className="size-8 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => openEdit(p)} aria-label="Edit produk"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className="size-8 text-red-600 hover:bg-red-50"
                        onClick={() => remove(p)} aria-label="Hapus produk"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </ScrollTable>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-emerald-900">
              {editing ? 'Edit Produk' : 'Tambah Produk'}
            </DialogTitle>
            <DialogDescription>Produk hasil pengolahan untuk dijual atau ditukar poin.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldShell label="Nama Produk" full>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="cth. Tas Belanja Plastik Daur Ulang"
                className={inputCls}
              />
            </FieldShell>
            <FieldShell label="Satuan">
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger className={triggerCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcs">pcs</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="pack">pack</SelectItem>
                  <SelectItem value="box">box</SelectItem>
                  <SelectItem value="set">set</SelectItem>
                </SelectContent>
              </Select>
            </FieldShell>
            <FieldShell label="Stok" hint={form.unit}>
              <Input
                type="number" min={0}
                value={form.stock || ''}
                placeholder="0"
                onChange={(e) => setForm({ ...form, stock: Number(e.target.value) || 0 })}
                className={inputCls}
              />
            </FieldShell>
            <FieldShell label="Harga" hint="Rp">
              <Input
                type="number" min={0}
                value={form.price || ''}
                placeholder="0"
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) || 0 })}
                className={inputCls}
              />
            </FieldShell>
            <FieldShell label="Poin / Tukar" hint="points">
              <Input
                type="number" min={0}
                value={form.pointsCost || ''}
                onChange={(e) => setForm({ ...form, pointsCost: Number(e.target.value) || 0 })}
                placeholder="0 = tidak bisa ditukar poin"
                className={inputCls}
              />
            </FieldShell>
            <FieldShell label="Deskripsi" full>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Keterangan produk"
                className={inputCls}
              />
            </FieldShell>
            <div className="flex items-center justify-between rounded-md border border-emerald-100 bg-emerald-50/30 p-3 sm:col-span-2">
              <div>
                <Label>Aktif</Label>
                <p className="text-xs text-muted-foreground">Produk nonaktif tidak dapat dijual atau ditukar.</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <EmeraldButton loading={saving} onClick={save}>
              {editing ? 'Simpan Perubahan' : 'Tambah'}
            </EmeraldButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ============================================================
// 8. Point Rules Tab
// ============================================================
function PointRulesTab() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState<any>({
    rupiahPerPointEarn: 1000, rupiahPerPoint: 40, effectiveFrom: today, notes: '', isActive: true,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await api.aturanPoins.list())
    } catch (e: any) {
      toast.error(e?.message || 'Gagal memuat point rules')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setForm({
      rupiahPerPointEarn: 1000, rupiahPerPoint: 40, effectiveFrom: today, notes: '', isActive: true,
    })
    setOpen(true)
  }
  const save = async () => {
    const earnRp = Number(form.rupiahPerPointEarn)
    if (!earnRp || earnRp <= 0) {
      toast.error('Nilai Rupiah Tabungan per 1 Poin harus > 0 (contoh: 1000)')
      return
    }
    setSaving(true)
    try {
      await api.aturanPoins.create({
        ...form,
        rupiahPerPointEarn: earnRp,
        pointsPerRupiah: 1 / earnRp,
        rupiahPerPoint: Number(form.rupiahPerPoint || 0),
      })
      toast.success('Aturan poin berhasil ditambahkan')
      setOpen(false)
      load()
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menambah aturan poin')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-emerald-200">
      <CardHead
        icon={Award}
        title="Point Rules (Aturan Loyalty Poin)"
        description="Konfigurasi dinamis konversi tabungan rupiah ke loyalty point dan nilai tukar produk. Berat sampah dihitung ke rupiah dulu, baru dikonversi ke poin."
        action={
          <EmeraldButton onClick={openAdd} className="shrink-0">
            <Plus className="size-4" /> Tambah Aturan
          </EmeraldButton>
        }
      />
      <CardContent className="pt-4">
        <div className="mb-4 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900">
          <Award className="size-4 shrink-0 text-emerald-700 mt-0.5" />
          <div className="space-y-1">
            <p>
              <strong>Prinsip Resmi:</strong> Loyalty point dihitung dari <strong>Total Nilai Tabungan (Rp)</strong> dibagi <strong>Nilai Rupiah per 1 Poin</strong>.
            </p>
            <p className="text-emerald-700">
              Berat sampah (kg) tidak dikalikan poin secara langsung karena setiap jenis sampah memiliki harga per kg yang berbeda.
            </p>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : data.length === 0 ? (
          <EmptyState icon={Award} message="Belum ada aturan poin" />
        ) : (
          <ScrollTable>
            <TableHeader>
              <TableRow className="bg-emerald-50/60 hover:bg-emerald-50/60">
                <TableHead className="text-emerald-900">Nilai Tabungan per 1 Poin</TableHead>
                <TableHead className="text-emerald-900">Nilai Tukar Produk / 1 Poin</TableHead>
                <TableHead className="text-emerald-900">Berlaku Dari</TableHead>
                <TableHead className="text-emerald-900">Catatan</TableHead>
                <TableHead className="text-emerald-900">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => {
                const earnRp = r.rupiahPerPointEarn || (toNumber(r.pointsPerRupiah) > 0 ? Math.round(1 / toNumber(r.pointsPerRupiah)) : 1000)
                const redeemRp = toNumber(r.rupiahPerPoint)
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-semibold text-emerald-900">
                      {formatRupiah(earnRp)} = 1 Poin
                      <div className="text-[11px] font-normal text-muted-foreground">
                        ({formatNumber(1 / earnRp, 6)} poin/Rp)
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-emerald-800">
                      {redeemRp > 0 ? `${formatRupiah(redeemRp)} / poin` : 'Belum diatur'}
                    </TableCell>
                    <TableCell>{formatDate(r.effectiveFrom)}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {r.notes || '-'}
                    </TableCell>
                    <TableCell>
                      {r.isActive ? (
                        <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                          Aktif
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="border-zinc-200 bg-zinc-100 text-zinc-600">
                          Nonaktif
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </ScrollTable>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-emerald-900">Tambah Aturan Loyalty Poin</DialogTitle>
            <DialogDescription>
              Tentukan nilai rupiah tabungan untuk mendapatkan 1 poin dan nilai tukar per poin saat penukaran produk.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldShell label="Nilai Tabungan per 1 Poin (Rp)" hint="Contoh: 1000 (Tiap Rp 1.000 = 1 Poin)">
              <Input
                type="number" min={1} step={100}
                value={form.rupiahPerPointEarn || ''}
                onChange={(e) => setForm({ ...form, rupiahPerPointEarn: Number(e.target.value) || 0 })}
                placeholder="1000"
                className={inputCls}
              />
            </FieldShell>
            <FieldShell label="Nilai Tukar 1 Poin Produk (Rp)" hint="Contoh: 40 (1 Poin bernilai Rp 40 barang)">
              <Input
                type="number" min={0} step={5}
                value={form.rupiahPerPoint || ''}
                onChange={(e) => setForm({ ...form, rupiahPerPoint: Number(e.target.value) || 0 })}
                placeholder="40"
                className={inputCls}
              />
            </FieldShell>

            {/* Kotak Simulasi Live */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900 sm:col-span-2">
              <div className="font-semibold text-emerald-950 mb-1">
                ⚡ Simulasi Perhitungan Transaksi:
              </div>
              <ul className="space-y-1 text-emerald-800">
                <li>• Warga menyetor <strong>Plastik (2 kg × Rp 1.000 = Rp 2.000)</strong> + <strong>Besi (1 kg × Rp 5.000 = Rp 5.000)</strong></li>
                <li>• <strong>Total Nilai Tabungan:</strong> Rp 7.000 (Masuk ke saldo warga 100%)</li>
                <li>• <strong>Loyalty Point Diperoleh:</strong> Rp 7.000 ÷ Rp {Number(form.rupiahPerPointEarn || 1000).toLocaleString('id-ID')} = <strong className="text-emerald-950 underline">{Math.floor(7000 / (Number(form.rupiahPerPointEarn) || 1000))} Poin</strong></li>
                {Number(form.rupiahPerPoint) > 0 && (
                  <li>• <strong>Penukaran Produk:</strong> 100 Poin setara subsidi produk senilai <strong>{formatRupiah(100 * Number(form.rupiahPerPoint))}</strong></li>
                )}
              </ul>
            </div>

            <FieldShell label="Berlaku Dari" full>
              <Input
                type="date"
                value={form.effectiveFrom}
                onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                className={inputCls}
              />
            </FieldShell>
            <FieldShell label="Catatan Aturan" full>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Contoh: Kebijakan loyalitas tahun 2026 (Rp 1.000 tabungan = 1 poin)"
                className={inputCls}
              />
            </FieldShell>
            <div className="flex items-center justify-between rounded-md border border-emerald-100 bg-emerald-50/30 p-3 sm:col-span-2">
              <div>
                <Label>Aktifkan Sekarang</Label>
                <p className="text-xs text-muted-foreground">Menonaktifkan aturan lama dan langsung memberlakukan aturan ini.</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <EmeraldButton loading={saving} onClick={save}>Tambah Aturan</EmeraldButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ============================================================
// Main: Master Data
// ============================================================
const TABS = [
  { value: 'manajemen-akun', label: 'Manajemen Akun', icon: ShieldCheck },
  { value: 'nasabah', label: 'Nasabah', icon: Users },
  { value: 'kategori', label: 'Kategori', icon: Tag },
  { value: 'barang', label: 'Barang Sampah', icon: Recycle },
  { value: 'anggota', label: 'Anggota Koperasi', icon: UserCircle },
  { value: 'point-rules', label: 'Point Rules', icon: Award },
] as const

export function MasterData() {
  const [tab, setTab] = useState<string>('manajemen-akun')

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList
          className="flex h-auto w-full flex-wrap justify-start gap-1 overflow-x-auto rounded-lg border border-emerald-100 bg-emerald-50/40 p-1.5"
        >
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md px-3 py-1.5 text-sm text-emerald-900"
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.label.split(' ')[0]}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value="manajemen-akun"><ManajemenAkunTab /></TabsContent>
        <TabsContent value="nasabah"><NasabahTab /></TabsContent>
        <TabsContent value="kategori"><KategoriTab /></TabsContent>
        <TabsContent value="barang"><BarangTab /></TabsContent>
        <TabsContent value="anggota"><AnggotaTab /></TabsContent>
        <TabsContent value="point-rules"><PointRulesTab /></TabsContent>
      </Tabs>
    </div>
  )
}

export default MasterData
