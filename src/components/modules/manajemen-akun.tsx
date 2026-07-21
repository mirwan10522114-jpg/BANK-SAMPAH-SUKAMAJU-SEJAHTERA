'use client'

import * as React from 'react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  ShieldCheck, Pencil, Trash2, Search, Plus, RefreshCw, X, Check, BadgeCheck, UserCircle, Wallet,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

import { api } from '@/lib/api'
import { formatRupiah, formatNumber, toNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

// Role card config
const ROLE_CARDS = [
  { value: 'nasabah', label: 'Nasabah', desc: 'Auto-Create profil Bank Sampah', color: 'blue' },
  { value: 'koperasi', label: 'Koperasi', desc: 'Auto-Create buku Koperasi', color: 'green' },
  { value: 'admin', label: 'Admin', desc: 'Akses penuh Dashboard', color: 'red' },
  { value: 'owner', label: 'Owner', desc: 'Akses level pemilik', color: 'yellow' },
]

const ROLE_BADGE_STYLES: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 border-red-200',
  nasabah: 'bg-blue-100 text-blue-700 border-blue-200',
  koperasi: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  owner: 'bg-amber-100 text-amber-700 border-amber-200',
  teller: 'bg-purple-100 text-purple-700 border-purple-200',
}

export function ManajemenAkunTab() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [roleFilter, setRoleFilter] = useState('Semua Role')
  const [editing, setEditing] = useState<any | null>(null)
  const [isCreate, setIsCreate] = useState(false)
  const [open, setOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const role = roleFilter === 'Semua Role' ? '' : roleFilter.toLowerCase()
      setRows(await api.manajemenAkun.list(q, role))
    } catch (e: any) {
      toast.error('Gagal memuat data: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [q, roleFilter])

  const openEdit = (row: any) => {
    setEditing(row)
    setIsCreate(false)
    setOpen(true)
  }

  const openCreate = () => {
    setEditing(null)
    setIsCreate(true)
    setOpen(true)
  }

  const handleDelete = async (row: any) => {
    if (!confirm(`Hapus user "${row.name}"? Data terkait (saldo, keanggotaan koperasi) akan ditandai keluar.`)) return
    try {
      await api.manajemenAkun.delete(row.id)
      toast.success('User dihapus & data terkait disinkronisasi')
      load()
    } catch (e: any) {
      toast.error('Gagal hapus: ' + e.message)
    }
  }

  return (
    <Card className="border-0 bg-white shadow-sm ring-1 ring-zinc-100">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b border-zinc-100 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            Manajemen User
          </CardTitle>
          <CardDescription className="mt-1 text-xs text-zinc-500">
            Pusat kontrol multi-entitas (Nasabah & Koperasi). Perubahan tersinkronisasi realtime.
          </CardDescription>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 text-white hover:bg-emerald-700">
          <Plus className="mr-1.5 h-4 w-4" /> Tambah User
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari Nama, NIK, ID, Telepon..."
              className="border-zinc-200 pl-9 text-sm"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-9 w-40 border-zinc-200 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Semua Role">Semua Role</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="nasabah">Nasabah</SelectItem>
              <SelectItem value="koperasi">Koperasi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="max-h-[520px] overflow-auto rounded-xl border border-zinc-100">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-zinc-50">
              <TableRow className="border-zinc-100">
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500"># ID</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Nama Lengkap</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">NIK</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Email</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Role & Integrasi</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Status</TableHead>
                <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => <TableCell key={j}><Skeleton className="h-6 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
                        <UserCircle className="h-6 w-6 text-zinc-400" />
                      </div>
                      <p className="text-sm text-zinc-500">Belum ada user terdaftar.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((u, idx) => (
                  <TableRow key={u.id} className="border-zinc-50 hover:bg-zinc-50/50">
                    <TableCell className="text-xs text-zinc-400">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-900">{u.name}</span>
                          {u.memberCode && (
                            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-[10px] font-medium text-blue-700">{u.memberCode}</Badge>
                          )}
                          {u.nomorAnggota && (
                            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] font-medium text-emerald-700">{u.nomorAnggota}</Badge>
                          )}
                        </div>
                        {u.phone && <span className="text-[11px] text-zinc-400">{u.phone}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-600">{u.nik || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-zinc-700">{u.email}</span>
                        {u.isEmailVerified && <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 ? (
                          <span className="text-[11px] text-zinc-400">-</span>
                        ) : (
                          u.roles.map((r: string) => (
                            <Badge key={r} variant="outline" className={cn('text-[10px] capitalize', ROLE_BADGE_STYLES[r] || 'border-zinc-200 bg-zinc-100 text-zinc-600')}>
                              {r}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.isEmailVerified ? (
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] font-medium text-emerald-700">
                          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> Terverifikasi
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] font-medium text-amber-700">
                          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500" /> Belum
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => openEdit(u)} title="Edit & Sinkronisasi">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => handleDelete(u)} title="Hapus" disabled={u.email === 'admin@gmail.com'}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        {!loading && rows.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-zinc-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Total User</p>
              <p className="mt-1 text-lg font-bold text-zinc-900">{rows.length}</p>
            </div>
            <div className="rounded-lg bg-blue-50/60 p-3 ring-1 ring-blue-100">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Nasabah</p>
              <p className="mt-1 text-lg font-bold text-blue-700">{rows.filter((r) => r.roles.includes('nasabah')).length}</p>
            </div>
            <div className="rounded-lg bg-emerald-50/60 p-3 ring-1 ring-emerald-100">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Anggota Koperasi</p>
              <p className="mt-1 text-lg font-bold text-emerald-700">{rows.filter((r) => r.roles.includes('koperasi')).length}</p>
            </div>
            <div className="rounded-lg bg-red-50/60 p-3 ring-1 ring-red-100">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600">Admin/Owner</p>
              <p className="mt-1 text-lg font-bold text-red-700">{rows.filter((r) => r.roles.includes('admin') || r.roles.includes('owner')).length}</p>
            </div>
          </div>
        )}
      </CardContent>

      {/* User Form Modal (Create + Edit with Sync) */}
      {open && (
        <UserFormModal
          user={editing}
          isCreate={isCreate}
          open={open}
          onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setIsCreate(false) } }}
          onUpdated={() => { load(); setEditing(null); setIsCreate(false); setOpen(false) }}
        />
      )}
    </Card>
  )
}

// ============================================================
// User Form Modal (Create + Edit) with Sync
// ============================================================
function UserFormModal({
  user, isCreate, open, onOpenChange, onUpdated,
}: {
  user: any | null
  isCreate: boolean
  open: boolean
  onOpenChange: (o: boolean) => void
  onUpdated: () => void
}) {
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [nik, setNik] = useState(user?.nik || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [password, setPassword] = useState('')
  const [address, setAddress] = useState(user?.address || '')
  const [emailVerified, setEmailVerified] = useState(user?.isEmailVerified ?? true)
  const [roles, setRoles] = useState<string[]>(user?.roles || [])
  const [saving, setSaving] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)

  const toggleRole = (r: string) => {
    setRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r])
  }

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error('Nama dan Email wajib diisi')
      return
    }
    setSaving(true)
    try {
      let res: any
      if (isCreate) {
        res = await api.manajemenAkun.create({
          name, email, nik, phone, address,
          password: password || undefined,
          emailVerified,
          roles,
        })
        toast.success('User ditambahkan & tersinkronisasi')
      } else {
        res = await api.manajemenAkun.update(user.id, {
          name, email, nik, phone, address,
          password: password || undefined,
          emailVerified,
          roles,
        })
        toast.success('User diperbarui & tersinkronisasi')
      }
      setSyncResult(res)
      setTimeout(() => {
        onUpdated()
      }, 1500)
    } catch (e: any) {
      toast.error('Gagal: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const cardColorMap: Record<string, { ring: string; bg: string; text: string; dot: string }> = {
    blue: { ring: 'ring-blue-200', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    green: { ring: 'ring-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    red: { ring: 'ring-red-200', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
    yellow: { ring: 'ring-amber-200', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) { onOpenChange(o); if (!o) setSyncResult(null) } }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-zinc-900">
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', isCreate ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600')}>
              {isCreate ? <Plus className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </div>
            {isCreate ? 'Tambah Pengguna' : 'Edit Pengguna'}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            {isCreate
              ? 'User baru akan otomatis tersinkronisasi ke modul Bank Sampah & Koperasi sesuai role.'
              : 'Perubahan akan disinkronisasi ke modul Bank Sampah & Koperasi.'}
          </DialogDescription>
        </DialogHeader>

        {syncResult && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <Check className="h-4 w-4" /> Sinkronisasi Berhasil
            </p>
            <ul className="mt-1.5 space-y-0.5 text-[11px] text-emerald-700/80">
              {syncResult.syncLog.length > 0 ? syncResult.syncLog.map((s: string, i: number) => <li key={i}>• {s}</li>) : <li>• Tidak ada perubahan struktur role</li>}
            </ul>
          </div>
        )}

        <div className="space-y-4">
          {/* Nama Lengkap */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-700">Nama Lengkap <span className="text-red-500">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="border-zinc-200 text-sm" placeholder="Nama lengkap" />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-700">Alamat Email <span className="text-red-500">*</span></Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="border-zinc-200 text-sm" placeholder="email@contoh.com" />
          </div>

          {/* NIK + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-700">NIK KTP <span className="text-zinc-400">(Optional)</span></Label>
              <Input value={nik} onChange={(e) => setNik(e.target.value)} className="border-zinc-200 text-sm" placeholder="16 digit NIK" maxLength={16} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-700">No Telepon <span className="text-zinc-400">(Optional)</span></Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="border-zinc-200 text-sm" placeholder="08xxxxxxxxxx" />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-700">
              {isCreate ? 'Password' : 'Password Baru'} {isCreate ? <span className="text-red-500">*</span> : <span className="text-zinc-400">(opsional)</span>}
            </Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="border-zinc-200 text-sm" placeholder={isCreate ? 'Password untuk user baru' : 'Kosongkan jika tidak diubah'} />
            {isCreate && <p className="text-[10px] text-zinc-400">Default: "password" jika dikosongkan</p>}
          </div>

          {/* Alamat */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-700">Alamat Domisili</Label>
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} className="border-zinc-200 text-sm" rows={2} placeholder="Alamat lengkap" />
          </div>

          {/* Email verified toggle */}
          <div className="flex items-start justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
            <div>
              <p className="text-xs font-medium text-zinc-700">Email Terverifikasi</p>
              <p className="mt-0.5 text-[11px] text-zinc-500">Matikan untuk mewajibkan user validasi via OTP email.</p>
            </div>
            <Switch checked={emailVerified} onCheckedChange={setEmailVerified} />
          </div>

          {/* Roles */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-zinc-700">Role & Hak Akses <span className="text-red-500">*</span></Label>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_CARDS.map((r) => {
                const checked = roles.includes(r.value)
                const col = cardColorMap[r.color]
                return (
                  <div
                    key={r.value}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleRole(r.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRole(r.value) } }}
                    className={cn(
                      'relative flex cursor-pointer flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition-all',
                      checked ? cn(col.bg, col.ring, 'ring-2') : 'border-zinc-200 bg-white hover:border-zinc-300'
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className={cn('text-sm font-semibold', checked ? col.text : 'text-zinc-700')}>{r.label}</span>
                      <div className={cn('flex h-4 w-4 items-center justify-center rounded border', checked ? cn(col.text, 'border-current bg-current/10') : 'border-zinc-300')}>
                        {checked && <Check className="h-3 w-3" />}
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-500">{r.desc}</span>
                    {checked && <span className={cn('absolute right-2 top-2 h-1.5 w-1.5 rounded-full', col.dot)} />}
                  </div>
                )
              })}
            </div>
            {/* Integration preview */}
            <div className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-2.5 text-[11px] text-zinc-600">
              <p className="flex items-center gap-1.5 font-medium text-zinc-700">
                <Wallet className="h-3.5 w-3.5 text-blue-500" /> Integrasi yang akan disinkronisasi:
              </p>
              <ul className="mt-1 space-y-0.5">
                <li>• {roles.includes('nasabah') ? '✅ Profil Bank Sampah aktif' : '⛔ Profil Bank Sampah tidak aktif'}{!isCreate && user?.memberCode && ` (kode: ${user.memberCode})`}{isCreate && roles.includes('nasabah') && ' (kode akan dibuat otomatis)'}</li>
                <li>• {roles.includes('koperasi') ? '✅ Buku Koperasi aktif' : '⛔ Buku Koperasi tidak aktif'}{!isCreate && user?.nomorAnggota && ` (no: ${user.nomorAnggota})`}{isCreate && roles.includes('koperasi') && ' (no anggota akan dibuat otomatis)'}</li>
              </ul>
            </div>
          </div>

          {/* Current balance/simpanan info (read-only, edit mode only) */}
          {!isCreate && user && (user.saldoTersedia > 0 || user.simpananPokok + user.simpananWajib + user.simpananSukarela > 0) && (
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-100 bg-zinc-50/60 p-3 text-[11px]">
              <div>
                <p className="font-medium text-zinc-500">Saldo Tersedia (BS)</p>
                <p className="font-bold text-zinc-900">{formatRupiah(user.saldoTersedia)}</p>
                <p className="mt-0.5 text-zinc-400">Poin: {formatNumber(toNumber(user.points), 0)}</p>
              </div>
              <div>
                <p className="font-medium text-zinc-500">Simpanan Koperasi</p>
                <p className="font-bold text-zinc-900">{formatRupiah(user.simpananPokok + user.simpananWajib + user.simpananSukarela)}</p>
                <p className="mt-0.5 text-zinc-400">Pokok {formatRupiah(user.simpananPokok)} · Wajib {formatRupiah(user.simpananWajib)} · Sukarela {formatRupiah(user.simpananSukarela)}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 border-t border-zinc-100 pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving} className="text-sm text-zinc-600">
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {saving ? (
              <><RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> Menyinkronisasi...</>
            ) : (
              <>
                {isCreate ? <Plus className="mr-1.5 h-4 w-4" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
                {isCreate ? 'Tambah & Sinkronisasi' : 'Perbarui & Sinkronisasi'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ManajemenAkunTab
