'use client'

import { useState, useEffect } from 'react'
import {
  Recycle, LayoutDashboard, Database, Scale, HandCoins, Warehouse, Wand2, Menu, X,
  Banknote, ArrowRight, Settings, LogOut, ChevronDown, ShoppingBag, FileBarChart,
  BookOpen, Camera, Megaphone, Send, Mail, AlertTriangle, Loader2, Image as ImageIcon,
  Search, Layers, Sparkles, FolderGit2, Wallet, Calendar, CheckCircle2, Users, BellRing, Filter,
  ClipboardCheck, AlertCircle, ArrowUpRight, Trophy, RefreshCw, Zap, Package, Clock, ShieldCheck,
  Heart, Gift, Store, PiggyBank, UserPlus, CheckCheck, Landmark,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dashboard } from '@/components/modules/dashboard'
import { DashboardKoperasi } from '@/components/modules/dashboard-koperasi'
import { DashboardPenjualanProduk } from '@/components/modules/dashboard-penjualan-produk'
import { MasterData } from '@/components/modules/master-data'
import { Operasional } from '@/components/modules/operasional'
import { Koperasi } from '@/components/modules/koperasi'
import { Inventaris } from '@/components/modules/inventaris'
import { WhatsappBlastTab } from '@/components/modules/whatsapp-blast'
import { TellerWizard } from '@/components/modules/teller-wizard'
import { FinansialBankSampah } from '@/components/modules/finansial-bank-sampah'
import { FinansialKoperasi } from '@/components/modules/finansial-koperasi'
import { PenjualanProduk } from '@/components/modules/penjualan-produk'
import { LaporanLabaRugi } from '@/components/modules/laporan-laba-rugi'
import { LaporanPenyetoran } from '@/components/modules/laporan-penyetoran'
import { ManajemenEdukasi } from '@/components/modules/manajemen-edukasi'
import { ManajemenKegiatan } from '@/components/modules/manajemen-kegiatan'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { api, setActingUser } from '@/lib/api'
import type { AuthUser } from '@/lib/auth'
import { ModeToggle } from '@/components/mode-toggle'

type Section = 'dashboard' | 'master' | 'operasional' | 'koperasi' | 'finansial-koperasi' | 'inventaris' | 'teller' | 'finansial' | 'penjualan' | 'laporan' | 'laporan-penyetoran' | 'edukasi' | 'kegiatan' | 'pengumuman'
type DashboardType = 'bank-sampah' | 'koperasi' | 'penjualan-produk' | null

export type NavItem = {
  id: Section
  label: string
  icon: any
  desc: string
}

export type DropdownGroup = {
  id: string
  title: string
  icon: any
  desc: string
  items: NavItem[]
}

const PRIMARY_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Ringkasan & statistik' },
  { id: 'teller', label: 'Teller Wizard', icon: Wand2, desc: 'Layanan satu pintu' },
]

const DROPDOWN_GROUPS: DropdownGroup[] = [
  {
    id: 'bank-sampah',
    title: 'Bank Sampah',
    icon: Scale,
    desc: 'Operasional, kas & gudang',
    items: [
      { id: 'operasional', label: 'Operasional Sampah', icon: Scale, desc: 'Nabung & sedekah sampah' },
      { id: 'finansial', label: 'Finansial Sampah', icon: Banknote, desc: 'Penarikan saldo & kas' },
      { id: 'inventaris', label: 'Inventaris & Mitra', icon: Warehouse, desc: 'Gudang & jual ke mitra' },
    ],
  },
  {
    id: 'koperasi-group',
    title: 'Koperasi Simpan Pinjam',
    icon: HandCoins,
    desc: 'Simpanan & pinjaman',
    items: [
      { id: 'koperasi', label: 'Koperasi Simpan Pinjam', icon: HandCoins, desc: 'Kelola simpanan & pinjaman' },
      { id: 'finansial-koperasi', label: 'Finansial Koperasi', icon: Landmark, desc: 'Penarikan & kas koperasi' },
    ],
  },
  {
    id: 'unit-usaha-group',
    title: 'Unit Usaha / Penjualan',
    icon: ShoppingBag,
    desc: 'Kasir & toko online',
    items: [
      { id: 'penjualan', label: 'Penjualan Produk', icon: ShoppingBag, desc: 'Kasir POS & toko online' },
    ],
  },
  {
    id: 'laporan-keuangan',
    title: 'Laporan & Keuangan',
    icon: FileBarChart,
    desc: 'Laporan laba rugi terpadu',
    items: [
      { id: 'laporan', label: 'Laporan Laba Rugi', icon: FileBarChart, desc: 'Laporan laba rugi terpadu' },
      { id: 'laporan-penyetoran', label: 'Laporan Penyetoran', icon: Recycle, desc: 'Laporan volume penyetoran sampah' },
    ],
  },
  {
    id: 'informasi-publikasi',
    title: 'Informasi & Publikasi',
    icon: Megaphone,
    desc: 'Pengumuman, edukasi & foto',
    items: [
      { id: 'pengumuman', label: 'Pengumuman & Tagihan', icon: Megaphone, desc: 'Blast email & tagihan' },
      { id: 'edukasi', label: 'Edukasi Lingkungan', icon: BookOpen, desc: 'Artikel & konten edukasi' },
      { id: 'kegiatan', label: 'Dokumentasi Kegiatan', icon: Camera, desc: 'Foto & dokumentasi warga' },
    ],
  },
  {
    id: 'pengaturan-sistem',
    title: 'Sistem & Pengaturan',
    icon: Database,
    desc: 'Master data & konfigurasi',
    items: [
      { id: 'master', label: 'Master Data & Sistem', icon: Database, desc: 'Nasabah, barang & mitra' },
    ],
  },
]

const NAV: NavItem[] = [...PRIMARY_NAV, ...DROPDOWN_GROUPS.flatMap((g) => g.items)]

function getAdminReadIds(adminId: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(`admin-notif-read-${adminId || 'default'}`)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(arr)
  } catch {
    return new Set()
  }
}

function saveAdminReadIds(adminId: string, ids: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`admin-notif-read-${adminId || 'default'}`, JSON.stringify([...ids]))
  } catch {}
}

function getNotifVisual(type: string) {
  switch (type) {
    case 'nabung':
      return { icon: Scale, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' }
    case 'sedekah':
      return { icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50 border-rose-200' }
    case 'penarikan':
      return { icon: Wallet, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' }
    case 'penukaran':
      return { icon: Gift, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' }
    case 'toko':
      return { icon: ShoppingBag, color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-200' }
    case 'pos':
      return { icon: Store, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' }
    case 'simpanan':
      return { icon: PiggyBank, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-200' }
    case 'pinjaman':
      return { icon: HandCoins, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' }
    case 'register':
      return { icon: UserPlus, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' }
    default:
      return { icon: BellRing, color: 'text-zinc-600', bg: 'bg-zinc-50 border-zinc-200' }
  }
}

function NotificationBell({ adminId = 'admin' }: { adminId?: string }) {
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'transaksi' | 'user_baru'>('all')
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [selectedNotif, setSelectedNotif] = useState<any | null>(null)

  useEffect(() => {
    setReadIds(getAdminReadIds(adminId))
  }, [adminId])

  const loadNotifs = () => {
    setLoading(true)
    api.adminNotifications
      .list()
      .then((data) => {
        if (Array.isArray(data)) setNotifs(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadNotifs()
    const interval = setInterval(loadNotifs, 30000)
    return () => clearInterval(interval)
  }, [])

  const unreadCount = notifs.filter((n) => !readIds.has(n.id) && !n.isRead).length

  const handleMarkAsRead = async (id?: string) => {
    if (id) {
      const next = new Set(readIds)
      next.add(id)
      setReadIds(next)
      saveAdminReadIds(adminId, next)
      api.adminNotifications.markAsRead(id).catch(() => {})
    } else {
      const next = new Set(readIds)
      notifs.forEach((n) => next.add(n.id))
      setReadIds(next)
      saveAdminReadIds(adminId, next)
      api.adminNotifications.markAsRead().catch(() => {})
    }
  }

  const handleItemClick = (n: any) => {
    handleMarkAsRead(n.id)
    setSelectedNotif(n)
  }

  const filteredNotifs = notifs.filter((n) => {
    if (filter === 'transaksi') return n.category === 'transaksi'
    if (filter === 'user_baru') return n.category === 'user_baru'
    return true
  })

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200">
            <BellRing className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[360px] sm:w-[410px] p-0 shadow-xl border border-zinc-200">
          <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-zinc-900 text-sm">Notifikasi Aktivitas</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                  {unreadCount} baru
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => handleMarkAsRead()}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
              >
                <CheckCheck className="size-3.5" />
                Tandai semua dibaca
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-zinc-100 px-3 py-1.5 bg-white text-xs gap-1">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'px-2.5 py-1 rounded-md font-medium transition',
                filter === 'all'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'text-zinc-500 hover:bg-zinc-100'
              )}
            >
              Semua ({notifs.length})
            </button>
            <button
              onClick={() => setFilter('transaksi')}
              className={cn(
                'px-2.5 py-1 rounded-md font-medium transition',
                filter === 'transaksi'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'text-zinc-500 hover:bg-zinc-100'
              )}
            >
              Transaksi ({notifs.filter((n) => n.category === 'transaksi').length})
            </button>
            <button
              onClick={() => setFilter('user_baru')}
              className={cn(
                'px-2.5 py-1 rounded-md font-medium transition',
                filter === 'user_baru'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'text-zinc-500 hover:bg-zinc-100'
              )}
            >
              Pengguna Baru ({notifs.filter((n) => n.category === 'user_baru').length})
            </button>
          </div>

          <div className="flex max-h-[380px] flex-col overflow-y-auto divide-y divide-zinc-100">
            {loading && notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
                <Loader2 className="size-6 animate-spin text-emerald-500 mb-2" />
                <p className="text-xs">Memuat notifikasi...</p>
              </div>
            ) : filteredNotifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-zinc-500">
                <BellRing className="mb-2 h-8 w-8 text-zinc-200" />
                <p className="text-sm font-medium text-zinc-600">Tidak ada notifikasi</p>
                <p className="text-xs text-zinc-400">Hanya transaksi berhasil & pendaftar baru yang ditampilkan.</p>
              </div>
            ) : (
              filteredNotifs.map((n) => {
                const isRead = readIds.has(n.id) || n.isRead
                const { icon: Icon, color, bg } = getNotifVisual(n.type)
                return (
                  <div
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={cn(
                      'flex items-start gap-3 p-3.5 transition cursor-pointer',
                      !isRead ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'bg-white hover:bg-zinc-5'
                    )}
                  >
                    <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', bg)}>
                      <Icon className={cn('h-4 w-4', color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1 mb-0.5">
                        <span className={cn('text-xs font-semibold truncate', !isRead ? 'text-zinc-900 font-bold' : 'text-zinc-700')}>
                          {n.title}
                        </span>
                        {!isRead && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed text-zinc-600 line-clamp-2">
                        {n.message}
                      </p>
                      <div className="flex items-center justify-between mt-1.5 pt-0.5">
                        <span className="text-[10px] text-zinc-400">
                          {new Date(n.timestamp || n.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {n.amount ? (
                          <span className="text-[10px] font-bold text-emerald-700">
                            Rp {Number(n.amount).toLocaleString('id-ID')}
                          </span>
                        ) : n.category === 'user_baru' ? (
                          <span className="text-[9px] font-medium bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                            Pengguna Baru
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Dialog Detail Notifikasi */}
      <Dialog open={!!selectedNotif} onOpenChange={(v) => !v && setSelectedNotif(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {selectedNotif && (() => {
                const { icon: Icon, color, bg } = getNotifVisual(selectedNotif.type)
                return (
                  <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg border', bg)}>
                    <Icon className={cn('h-4 w-4', color)} />
                  </div>
                )
              })()}
              <span>{selectedNotif?.title}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              {selectedNotif &&
                new Date(selectedNotif.timestamp || selectedNotif.createdAt).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
            </DialogDescription>
          </DialogHeader>

          {selectedNotif && (
            <div className="space-y-3 pt-2 text-sm">
              <div className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-3">
                <p className="text-xs leading-relaxed text-zinc-800">
                  {selectedNotif.message}
                </p>
              </div>

              {selectedNotif.meta && (
                <div className="rounded-lg border border-zinc-200/80 p-3 space-y-1.5 text-xs">
                  <div className="font-semibold text-zinc-700 mb-1">Rincian Informasi:</div>
                  {selectedNotif.meta.kodeTransaksi && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Kode Transaksi:</span>
                      <span className="font-mono font-medium text-zinc-800">{selectedNotif.meta.kodeTransaksi}</span>
                    </div>
                  )}
                  {selectedNotif.meta.totalWeight !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Total Berat:</span>
                      <span className="font-medium text-zinc-800">{selectedNotif.meta.totalWeight} kg</span>
                    </div>
                  )}
                  {selectedNotif.meta.totalValue !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Total Nilai Tabungan:</span>
                      <span className="font-bold text-emerald-700">Rp {Number(selectedNotif.meta.totalValue).toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {selectedNotif.meta.pointsAwarded !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Poin Diperoleh:</span>
                      <span className="font-bold text-emerald-700">+{selectedNotif.meta.pointsAwarded} Poin</span>
                    </div>
                  )}
                  {selectedNotif.meta.orderNumber && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Nomor Pesanan:</span>
                      <span className="font-mono font-medium text-zinc-800">{selectedNotif.meta.orderNumber}</span>
                    </div>
                  )}
                  {selectedNotif.meta.memberCode && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Kode Anggota:</span>
                      <span className="font-mono font-medium text-zinc-800">{selectedNotif.meta.memberCode}</span>
                    </div>
                  )}
                  {selectedNotif.meta.email && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Email:</span>
                      <span className="font-medium text-zinc-800">{selectedNotif.meta.email}</span>
                    </div>
                  )}
                </div>
              )}

              <Button onClick={() => setSelectedNotif(null)} className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
                Tutup
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export function AdminPanel({ pengguna, onLogout }: { pengguna: AuthUser; onLogout: () => void }) {
  const [section, setSection] = useState<Section>('dashboard')
  const [dashboardType, setDashboardType] = useState<DashboardType>('bank-sampah')
  const [showDashboardChooser, setShowDashboardChooser] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchMenu, setSearchMenu] = useState('')
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'bank-sampah': true,
    'unit-bisnis': false,
    'laporan-keuangan': false,
    'informasi-publikasi': false,
    'pengaturan-sistem': false,
  })
  const [penggunas, setUsers] = useState<any[]>([])
  const [actingUserId, setActingUserId] = useState<string>('')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [pengumumanTab, setPengumumanTab] = useState<'pengumuman' | 'tagihan' | 'simpanan_pokok' | 'simpanan_wajib' | 'wa_blast'>('pengumuman')

  useEffect(() => {
    api.nasabah.list('', '').then((u) => {
      setUsers(u)
      const admin = u.find((x) => x.email === pengguna.email) || u.find((x) => x.roles?.includes('admin'))
      if (admin) { setActingUserId(admin.id); setActingUser(admin.id) }
    }).catch(() => {})
  }, [pengguna.email])

  // Auto expand group if active section is inside it
  useEffect(() => {
    const activeGrp = DROPDOWN_GROUPS.find((g) => g.items.some((it) => it.id === section))
    if (activeGrp) {
      setOpenGroups((prev) => ({ ...prev, [activeGrp.id]: true }))
    }
  }, [section])

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  const switchUser = (id: string) => {
    setActingUserId(id)
    setActingUser(id)
  }

  const handleNavClick = (id: Section) => {
    if (id === 'dashboard') {
      setShowDashboardChooser(true)
    } else {
      setSection(id)
      setSidebarOpen(false)
    }
  }

  const pickDashboard = (type: DashboardType) => {
    setDashboardType(type)
    setSection('dashboard')
    setShowDashboardChooser(false)
    setSidebarOpen(false)
  }

  const activeNav = NAV.find((n) => n.id === section)!
  const dashboardLabel = dashboardType === 'bank-sampah' ? 'Dashboard Bank Sampah' : dashboardType === 'koperasi' ? 'Dashboard Koperasi' : 'Dashboard Penjualan Produk'
  const dashboardDesc = dashboardType === 'bank-sampah' ? 'Operasional & transaksi setoran sampah' : dashboardType === 'koperasi' ? 'Simpanan, pinjaman, arus kas koperasi' : 'Penjualan produk offline & online, margin, stok'

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50/70 dark:bg-black text-foreground transition-colors">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-emerald-200/60 dark:border-white/[0.06] bg-white/90 dark:bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-black/80">
        <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen((s) => !s)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Logo Bank Sampah"
              className="h-10 w-10 rounded-full object-cover shadow-sm"
            />
            <div className="leading-tight">
              <h1 className="text-base font-bold text-emerald-900 dark:text-emerald-400 sm:text-lg">Bank Sampah</h1>
              <p className="hidden text-xs text-emerald-700/70 dark:text-emerald-400/70 sm:block">Panel Admin · Sistem Terpadu</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            {/* Theme Toggle */}
            <ModeToggle />

            {/* Notifications */}
            <NotificationBell adminId={pengguna.id} />

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu((s) => !s)}
                className="flex items-center gap-2 rounded-lg p-1 transition hover:bg-emerald-50 dark:hover:bg-white/[0.05]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white">
                  {pengguna.name.charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="hidden h-4 w-4 text-emerald-600 dark:text-emerald-400 sm:block" />
              </button>

              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                  <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-xl border border-zinc-100 dark:border-white/[0.08] bg-white dark:bg-[#050505] shadow-lg">
                    {/* Profile header (subtle forest tone in dark mode) */}
                    <div className="bg-[#13280b] p-4 text-white">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-lg font-bold">
                          {pengguna.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="leading-tight">
                          <p className="font-semibold">{pengguna.name}</p>
                          <p className="text-xs text-emerald-100/70">{pengguna.email}</p>
                        </div>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="p-2">
                      <button
                        onClick={() => { setShowProfileMenu(false); setSection('master'); setSidebarOpen(false) }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-700 dark:text-zinc-200 transition hover:bg-emerald-50 dark:hover:bg-white/[0.05]"
                      >
                        <Settings className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Pengaturan
                      </button>
                      <button
                        onClick={onLogout}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <LogOut className="h-4 w-4" /> Keluar
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className={cn(
          'fixed inset-y-0 left-0 top-16 z-30 w-80 transform border-r border-emerald-200/60 dark:border-white/[0.06] bg-white dark:bg-black transition-transform duration-200 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          <nav className="flex h-full flex-col overflow-y-auto p-3.5">
            {/* Search Menu Input */}
            <div className="relative mb-2.5 px-0.5">
              <Search className="absolute left-3.5 top-3 size-4 text-zinc-400" />
              <input
                type="text"
                value={searchMenu}
                onChange={(e) => setSearchMenu(e.target.value)}
                placeholder="Cari menu admin..."
                className="h-10 w-full rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/90 dark:bg-[#050505] pl-10 pr-8 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-emerald-500 focus:bg-white dark:focus:bg-[#080808] focus:outline-none transition-colors"
              />
              {searchMenu && (
                <button
                  type="button"
                  onClick={() => setSearchMenu('')}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="space-y-4 pb-4">
              {/* 1. PRIMARY STANDALONE MENUS (Dashboard & Teller Wizard) */}
              {(() => {
                const q = searchMenu.toLowerCase().trim()
                const matchingPrimary = PRIMARY_NAV.filter((item) => {
                  if (!q) return true
                  return item.label.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q)
                })

                if (matchingPrimary.length === 0 && q) return null

                return (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 px-2.5 pt-1 pb-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-400">
                        Layanan Utama
                      </p>
                      <div className="h-[1px] flex-1 bg-emerald-200/70 dark:bg-zinc-800" />
                    </div>

                    <div className="space-y-1.5">
                      {matchingPrimary.map((item) => {
                        const Icon = item.icon
                        const active = section === item.id
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleNavClick(item.id)}
                            className={cn(
                              'group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all',
                              active
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md font-medium'
                                : 'text-zinc-700 dark:text-zinc-300 hover:bg-emerald-50/90 dark:hover:bg-zinc-900 hover:text-emerald-950 dark:hover:text-emerald-300 border border-transparent hover:border-emerald-100 dark:hover:border-zinc-800'
                            )}
                          >
                            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', active ? 'text-white' : 'text-emerald-600 dark:text-emerald-400')} />
                            <div className="flex-1 min-w-0 leading-tight">
                              <p className={cn('text-sm font-bold truncate', active ? 'text-white' : 'text-zinc-900 dark:text-zinc-100')}>
                                {item.label}
                              </p>
                              <p className={cn('text-xs truncate mt-0.5', active ? 'text-emerald-50' : 'text-zinc-500 dark:text-zinc-400')}>
                                {item.id === 'dashboard' && dashboardType ? dashboardDesc : item.desc}
                              </p>
                            </div>
                            {item.id === 'dashboard' && dashboardType && (
                              <span className={cn('mt-0.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase', active ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300')}>
                                {dashboardType === 'bank-sampah' ? 'BS' : dashboardType === 'koperasi' ? 'KOP' : 'PROD'}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* 2. DROPDOWN ACCORDION GROUPS */}
              {(() => {
                const q = searchMenu.toLowerCase().trim()
                let totalShown = 0

                const dropdownNodes = DROPDOWN_GROUPS.map((group) => {
                  const matchingChildren = group.items.filter((item) => {
                    if (!q) return true
                    return item.label.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q) || group.title.toLowerCase().includes(q)
                  })

                  if (matchingChildren.length === 0) return null
                  totalShown += matchingChildren.length

                  const isChildActive = group.items.some((it) => it.id === section)
                  const isOpen = q ? true : !!openGroups[group.id]
                  const GroupIcon = group.icon

                  return (
                    <div key={group.id} className="space-y-1">
                      {/* Group Header Button (Dropdown toggle) */}
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        className={cn(
                          'group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all',
                          isChildActive
                            ? 'bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-300 font-semibold border border-emerald-300/80 dark:border-emerald-700/60 shadow-xs'
                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/90 dark:hover:bg-zinc-900 hover:text-zinc-950 dark:hover:text-zinc-100 border border-transparent'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            'flex h-8.5 w-8.5 items-center justify-center rounded-xl transition-colors shrink-0',
                            isChildActive ? 'bg-emerald-600 text-white' : 'bg-emerald-50 dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-zinc-800'
                          )}>
                            <GroupIcon className="h-4.5 w-4.5" />
                          </div>
                          <div className="min-w-0 flex-1 leading-tight">
                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{group.title}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{group.desc}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-1.5">
                          <span className={cn(
                            'text-[10px] font-bold rounded-md px-2 py-0.5',
                            isChildActive ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                          )}>
                            {group.items.length}
                          </span>
                          <ChevronDown
                            className={cn(
                              'size-4 text-zinc-400 transition-transform duration-200',
                              isOpen && 'rotate-180 text-emerald-700 dark:text-emerald-400'
                            )}
                          />
                        </div>
                      </button>

                      {/* Dropdown Content */}
                      {isOpen && (
                        <div className="ml-5 pl-3.5 my-1.5 space-y-1 border-l-2 border-emerald-300 dark:border-emerald-700/60">
                          {matchingChildren.map((item) => {
                            const ItemIcon = item.icon
                            const active = section === item.id
                            return (
                              <button
                                key={item.id}
                                onClick={() => handleNavClick(item.id)}
                                className={cn(
                                  'group flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all',
                                  active
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs font-medium'
                                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-zinc-900 hover:text-emerald-950 dark:hover:text-emerald-300'
                                )}
                              >
                                <ItemIcon className={cn('mt-0.5 h-4 w-4 shrink-0', active ? 'text-white' : 'text-emerald-600 dark:text-emerald-400')} />
                                <div className="flex-1 min-w-0 leading-tight">
                                  <p className={cn('text-xs font-bold truncate', active ? 'text-white' : 'text-zinc-800 dark:text-zinc-200')}>
                                    {item.label}
                                  </p>
                                  <p className={cn('text-[11px] truncate mt-0.5', active ? 'text-emerald-100' : 'text-zinc-500 dark:text-zinc-400')}>
                                    {item.desc}
                                  </p>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })

                if (q && totalShown === 0 && PRIMARY_NAV.filter(it => it.label.toLowerCase().includes(q) || it.desc.toLowerCase().includes(q)).length === 0) {
                  return (
                    <div className="py-8 text-center text-sm text-zinc-400">
                      <p>Menu &quot;{searchMenu}&quot; tidak ditemukan</p>
                      <button
                        onClick={() => setSearchMenu('')}
                        className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                      >
                        Reset pencarian
                      </button>
                    </div>
                  )
                }

                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-2.5 pt-1.5 pb-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-400">
                        Modul & Pengelolaan
                      </p>
                      <div className="h-[1px] flex-1 bg-emerald-200/70 dark:bg-zinc-800" />
                    </div>
                    {dropdownNodes}
                  </div>
                )
              })()}
            </div>

            {/* Quick Tips */}
            <div className="mt-auto rounded-xl border border-emerald-200/80 dark:border-white/[0.06] bg-emerald-50/70 dark:bg-[#050505] p-3">
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-400">💡 Tips Singkat</p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-800/90 dark:text-zinc-400">
                Gunakan <b>Teller Wizard</b> untuk transaksi nasabah satu pintu. Klik <b>Dashboard</b> untuk berganti view.
              </p>
            </div>
          </nav>
        </aside>

        {sidebarOpen && <div className="fixed inset-0 top-16 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* Main content */}
        <main className="flex-1 overflow-x-hidden">
          <div className="border-b border-emerald-200/60 dark:border-white/[0.06] bg-white/60 dark:bg-black/80 px-4 py-3 lg:px-8">
            <div className="flex items-center gap-2 text-sm">
              {section === 'dashboard' && dashboardType ? (
                <>
                  <span className="font-semibold text-emerald-900 dark:text-emerald-400">{dashboardLabel}</span>
                  <span className="text-emerald-700/50 dark:text-emerald-400/40">/</span>
                  <span className="text-emerald-700/70 dark:text-zinc-400">{dashboardDesc}</span>
                  <button
                    onClick={() => setShowDashboardChooser(true)}
                    className="ml-2 rounded-md border border-emerald-200 dark:border-white/[0.08] bg-white dark:bg-[#080808] px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-[#121212]"
                  >
                    Ganti Dashboard
                  </button>
                </>
              ) : (
                <>
                  <activeNav.icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold text-emerald-900 dark:text-emerald-400">{activeNav.label}</span>
                  <span className="text-emerald-700/50 dark:text-emerald-400/40">/</span>
                  <span className="text-emerald-700/70 dark:text-zinc-400">{activeNav.desc}</span>
                </>
              )}
            </div>
          </div>
          <div className="p-4 lg:p-8">
            {section === 'dashboard' && dashboardType === 'bank-sampah' && <Dashboard onNavigate={setSection} />}
            {section === 'dashboard' && dashboardType === 'koperasi' && <DashboardKoperasi />}
            {section === 'dashboard' && dashboardType === 'penjualan-produk' && <DashboardPenjualanProduk />}
            {section === 'master' && <MasterData />}
            {section === 'operasional' && <Operasional />}
            {section === 'koperasi' && <Koperasi />}
            {section === 'finansial-koperasi' && <FinansialKoperasi />}
            {section === 'inventaris' && <Inventaris />}
            {section === 'teller' && <TellerWizard />}
            {section === 'finansial' && <FinansialBankSampah />}
            {section === 'penjualan' && <PenjualanProduk />}
            {section === 'laporan' && <LaporanLabaRugi />}
            {section === 'laporan-penyetoran' && <LaporanPenyetoran />}
            {section === 'edukasi' && <ManajemenEdukasi />}
            {section === 'kegiatan' && <ManajemenKegiatan />}
            {section === 'pengumuman' && (
              <PengumumanTagihanView
                initialTab={pengumumanTab}
                onTabChange={(t) => setPengumumanTab(t)}
              />
            )}
          </div>
        </main>
      </div>

      {/* Dashboard Chooser Modal */}
      <Dialog open={showDashboardChooser} onOpenChange={setShowDashboardChooser}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl bg-white dark:bg-[#050505] border-zinc-200 dark:border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-zinc-900 dark:text-zinc-100">Pilih Dashboard</DialogTitle>
            <DialogDescription className="text-center dark:text-zinc-400">Pilih dashboard mana yang ingin Anda lihat</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button
              onClick={() => pickDashboard('bank-sampah')}
              className={cn(
                'group rounded-2xl border-2 p-6 text-left transition-all hover:shadow-md',
                dashboardType === 'bank-sampah' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#040404] hover:border-emerald-300 dark:hover:border-emerald-700'
              )}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                <Recycle className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">Dashboard Bank Sampah</h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Pemantauan operasional setoran sampah, QC, inventaris, dan penjualan.</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400 group-hover:gap-2 transition-all">
                Buka Dashboard <ArrowRight className="h-4 w-4" />
              </div>
            </button>

            <button
              onClick={() => pickDashboard('koperasi')}
              className={cn(
                'group rounded-2xl border-2 p-6 text-left transition-all hover:shadow-md',
                dashboardType === 'koperasi' ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20' : 'border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#040404] hover:border-teal-300 dark:hover:border-teal-700'
              )}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-sm">
                <HandCoins className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">Dashboard Koperasi</h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Pemantauan kas, simpanan, pinjaman, angsuran, dan arus keuangan koperasi.</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-teal-600 dark:text-teal-400 group-hover:gap-2 transition-all">
                Buka Dashboard <ArrowRight className="h-4 w-4" />
              </div>
            </button>

            <button
              onClick={() => pickDashboard('penjualan-produk')}
              className={cn(
                'group rounded-2xl border-2 p-6 text-left transition-all hover:shadow-md',
                dashboardType === 'penjualan-produk' ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20' : 'border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#040404] hover:border-purple-300 dark:hover:border-purple-700'
              )}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-sm">
                <ShoppingBag className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">Dashboard Penjualan Produk</h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Pemantauan penjualan produk olahan offline & online, margin, dan stok.</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-purple-600 dark:text-purple-400 group-hover:gap-2 transition-all">
                Buka Dashboard <ArrowRight className="h-4 w-4" />
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>


      {/* Sticky footer */}
      <footer className="mt-auto border-t border-emerald-200/60 dark:border-white/[0.06] bg-white dark:bg-black py-4">
        <div className="flex flex-col items-center justify-between gap-2 px-4 text-xs text-emerald-700/70 dark:text-zinc-500 sm:flex-row lg:px-8">
          <p>© {new Date().getFullYear()} Bank Sampah Sukamaju Sejahtera + Koperasi Simpan Pinjam</p>
          <p>Dibangun dengan Next.js 16 · Prisma · shadcn/ui</p>
        </div>
      </footer>
    </div>
  )
}

export default AdminPanel

// ============================================================
// PengumumanTagihanView - Blast Pengumuman + Tagihan Pinjaman + Reminder Simpanan Wajib + WA Blast
// ============================================================
function PengumumanTagihanView({
  initialTab = 'pengumuman',
  onTabChange,
}: {
  initialTab?: 'pengumuman' | 'tagihan' | 'simpanan_pokok' | 'simpanan_wajib' | 'wa_blast'
  onTabChange?: (tab: 'pengumuman' | 'tagihan' | 'simpanan_pokok' | 'simpanan_wajib' | 'wa_blast') => void
} = {}) {
  const [tab, setTab] = useState<'pengumuman' | 'tagihan' | 'simpanan_pokok' | 'simpanan_wajib' | 'wa_blast'>(initialTab)

  useEffect(() => {
    if (initialTab) setTab(initialTab)
  }, [initialTab])

  const switchTab = (t: 'pengumuman' | 'tagihan' | 'simpanan_pokok' | 'simpanan_wajib' | 'wa_blast') => {
    setTab(t)
    onTabChange?.(t)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
          <Megaphone className="size-5 text-emerald-600" /> Pengumuman & Tagihan
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Kirim pengumuman massal, tagihan angsuran pinjaman, & pengingat simpanan (pokok & wajib) ke email nasabah/anggota
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b overflow-x-auto">
        <button
          onClick={() => switchTab('pengumuman')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === 'pengumuman' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
        >
          📢 Blast Pengumuman
        </button>
        <button
          onClick={() => switchTab('tagihan')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === 'tagihan' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
        >
          📌 Tagihan Pinjaman
        </button>
        <button
          onClick={() => switchTab('simpanan_pokok')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === 'simpanan_pokok' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
        >
          🏦 Reminder Simpanan Pokok
        </button>
        <button
          onClick={() => switchTab('simpanan_wajib')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === 'simpanan_wajib' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
        >
          🔔 Reminder Simpanan Wajib
        </button>
        <button
          onClick={() => switchTab('wa_blast')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${tab === 'wa_blast' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
        >
          💬 WA Blast
        </button>
      </div>

      {tab === 'pengumuman' ? (
        <PengumumanBlastForm />
      ) : tab === 'tagihan' ? (
        <TagihanPinjamanView />
      ) : tab === 'simpanan_pokok' ? (
        <ReminderSimpananPokokView />
      ) : tab === 'simpanan_wajib' ? (
        <ReminderSimpananWajibView />
      ) : (
        <WhatsappBlastTab />
      )}
    </div>
  )
}

// ============================================================
// Pengumuman Blast Form
// ============================================================
function PengumumanBlastForm() {
  const [judul, setJudul] = useState('')
  const [pesan, setPesan] = useState('')
  const [gambarUrl, setGambarUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleUpload = async (e: any) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/pengumuman/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) {
        setGambarUrl(data.url)
      } else {
        alert(data.error || 'Gagal upload')
      }
    } catch (e: any) {
      alert('Gagal upload: ' + e.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSend = async () => {
    if (!judul.trim() || !pesan.trim()) {
      alert('Judul dan pesan wajib diisi')
      return
    }
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/pengumuman/blast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ judul, pesan, gambarUrl }),
      })
      const data = await res.json()
      if (data.success) {
        setResult(data)
        setJudul('')
        setPesan('')
        setGambarUrl('')
      } else {
        alert(data.error || 'Gagal kirim')
      }
    } catch (e: any) {
      alert('Gagal: ' + e.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-zinc-200">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="size-4 text-emerald-600" /> Buat Pengumuman
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div>
            <label className="text-xs font-semibold text-zinc-700">Judul Pengumuman *</label>
            <input
              type="text"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="cth: Jadwal Libur Lebaran"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-700">Pesan *</label>
            <textarea
              value={pesan}
              onChange={(e) => setPesan(e.target.value)}
              placeholder="Tulis pesan pengumuman di sini..."
              rows={8}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-[10px] text-zinc-400">Tip: Gunakan baris baru untuk paragraf. Teks akan ditampilkan apa adanya.</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-700">Gambar (opsional)</label>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                disabled={uploading}
                className="text-xs"
              />
              {uploading && <Loader2 className="size-4 animate-spin text-emerald-600" />}
              {gambarUrl && (
                <div className="relative">
                  <img src={gambarUrl} alt="preview" className="h-20 rounded border" />
                  <button
                    onClick={() => setGambarUrl('')}
                    className="absolute -right-2 -top-2 rounded-full bg-rose-500 p-0.5 text-white"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSend}
              disabled={sending || !judul.trim() || !pesan.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {sending ? <><Loader2 className="size-4 mr-2 animate-spin" /> Mengirim...</> : <><Send className="size-4 mr-2" /> Kirim ke Semua Email</>}
            </Button>
          </div>
          {result && (
            <div className={`rounded-lg p-4 ${result.failedCount > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
              <p className="text-sm font-semibold text-emerald-800">
                ✅ Terkirim: {result.sentCount} email
              </p>
              {result.failedCount > 0 && (
                <p className="text-sm text-amber-700 mt-1">⚠ Gagal: {result.failedCount} email</p>
              )}
              <p className="text-xs text-zinc-500 mt-1">Total penerima: {result.total}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Tagihan Pinjaman View
// ============================================================
function TagihanPinjamanView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'terlambat' | 'h0' | 'h3' | 'h7' | 'h14' | 'h30' | 'normal'>('all')
  const [sending, setSending] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/koperasi/tagihan?filter=${filter}`)
      const d = await res.json()
      setData(d)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filter])

  const handleTagih = async (pinjamanId: string) => {
    setSending(pinjamanId)
    try {
      const res = await fetch('/api/koperasi/tagihan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinjamanId }),
      })
      const d = await res.json()
      if (d.success) {
        alert(`✅ Tagihan terkirim ke ${d.results[0]?.email || 'email anggota'}`)
        load()
      } else {
        alert(d.error || 'Gagal kirim tagihan')
      }
    } catch (e: any) {
      alert('Gagal: ' + e.message)
    } finally {
      setSending(null)
    }
  }

  const handleTagihSemua = async () => {
    const targetLabel = filter === 'terlambat'
      ? 'anggota yang TERLAMBAT / LEWAT JATUH TEMPO'
      : filter === 'h3'
      ? 'anggota dengan jatuh tempo ≤3 HARI'
      : filter === 'h7'
      ? 'anggota dengan jatuh tempo ≤7 HARI'
      : filter === 'h14'
      ? 'anggota dengan jatuh tempo ≤14 HARI'
      : filter === 'h30'
      ? 'anggota dengan jatuh tempo ≤30 HARI'
      : 'SEMUA anggota pinjaman berjalan'

    if (!confirm(`Kirim email tagihan ke ${targetLabel}?`)) return
    setSending('all')
    try {
      const res = await fetch('/api/koperasi/tagihan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagihSemua: true }),
      })
      const d = await res.json()
      if (d.success) {
        alert(`✅ Tagihan Pinjaman Terkirim: ${d.sentCount} email | Gagal: ${d.failedCount}`)
        load()
      } else {
        alert(d.error || 'Gagal mengirim tagihan')
      }
    } catch (e: any) {
      alert('Gagal: ' + e.message)
    } finally {
      setSending(null)
    }
  }

  if (loading && !data) return <div className="py-10 text-center"><Loader2 className="size-6 mx-auto animate-spin text-emerald-600" /></div>

  const pinjamans = data?.pinjamans || []
  const summary = data?.summary || { total: 0, terlambat: 0, terlambatNominal: 0, h0: 0, h3: 0, h7: 0, h14: 0, h30: 0, normal: 0 }

  const filterOptions = [
    { v: 'all', l: 'Semua', count: summary.total },
    { v: 'terlambat', l: '🚨 Terlambat (Lewat Jatuh Tempo)', count: summary.terlambat, isHighlight: summary.terlambat > 0 },
    { v: 'h0', l: '⚡ Jatuh Tempo Hari Ini (H-0)', count: summary.h0, isHighlight: summary.h0 > 0 },
    { v: 'h3', l: '⚠️ H-3 (≤ 3 Hari)', count: summary.h3 },
    { v: 'h7', l: '⏰ H-7 (≤ 7 Hari)', count: summary.h7 },
    { v: 'h14', l: '📅 H-14 (≤ 14 Hari)', count: summary.h14 },
    { v: 'h30', l: '📌 H-30 (≤ 30 Hari)', count: summary.h30 },
    { v: 'normal', l: '✓ Normal (> 30 Hari)', count: summary.normal },
  ] as const

  return (
    <div className="space-y-4">
      {/* 5 Summary Stat Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-gradient-to-br from-zinc-50 to-zinc-100 border-zinc-200 shadow-2xs">
          <CardContent className="p-3.5">
            <p className="text-[11px] text-zinc-600 font-semibold uppercase tracking-wider">Total Pinjaman Aktif</p>
            <p className="mt-1 text-2xl font-black text-zinc-900">{summary.total}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Semua pinjaman berjalan</p>
          </CardContent>
        </Card>

        <Card className={cn(
          'shadow-2xs transition-all',
          summary.terlambat > 0
            ? 'bg-gradient-to-br from-rose-50 via-red-50 to-rose-100 border-rose-300 ring-1 ring-rose-300/60'
            : 'bg-gradient-to-br from-zinc-50 to-zinc-100 border-zinc-200'
        )}>
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-rose-800 font-bold uppercase tracking-wider">🚨 Lewat Jatuh Tempo</p>
              {summary.terlambat > 0 && <span className="flex size-2 rounded-full bg-rose-600 animate-ping" />}
            </div>
            <p className="mt-1 text-2xl font-black text-rose-700">
              {summary.terlambat} <span className="text-xs font-medium text-rose-600">Pinjaman</span>
            </p>
            <p className="text-[11px] font-bold text-rose-800 mt-0.5">
              Tunggakan: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(summary.terlambatNominal || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 shadow-2xs">
          <CardContent className="p-3.5">
            <p className="text-[11px] text-orange-800 font-semibold uppercase tracking-wider">⚡ Mendesak (≤ 3 Hari)</p>
            <p className="mt-1 text-2xl font-black text-orange-700">
              {summary.h3} <span className="text-xs font-medium text-orange-600">Pinjaman</span>
            </p>
            <p className="text-[11px] text-orange-700/80 mt-0.5">
              Hari ini: {summary.h0} · H-1 s/d H-3: {Math.max(0, summary.h3 - summary.h0)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-2xs">
          <CardContent className="p-3.5">
            <p className="text-[11px] text-blue-800 font-semibold uppercase tracking-wider">📌 Pengingat (H-7 ~ H-30)</p>
            <p className="mt-1 text-2xl font-black text-blue-700">
              {Math.max(0, summary.h30 - summary.h3)} <span className="text-xs font-medium text-blue-600">Pinjaman</span>
            </p>
            <p className="text-[11px] text-blue-700/80 mt-0.5">
              H-7: {summary.h7} · H-14: {summary.h14} · H-30: {summary.h30}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 shadow-2xs">
          <CardContent className="p-3.5">
            <p className="text-[11px] text-emerald-800 font-semibold uppercase tracking-wider">✓ Aman (&gt; 30 Hari)</p>
            <p className="mt-1 text-2xl font-black text-emerald-700">
              {summary.normal} <span className="text-xs font-medium text-emerald-600">Pinjaman</span>
            </p>
            <p className="text-[11px] text-emerald-700/80 mt-0.5">Jatuh tempo masih lama</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar & Tagih Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700">
            <Filter className="size-4 text-emerald-600" />
            <span>Filter Jatuh Tempo:</span>
          </div>

          <div className="relative min-w-[260px] sm:min-w-[320px]">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className={cn(
                'w-full appearance-none rounded-lg border py-2 pl-3 pr-9 text-xs font-bold transition-all focus:outline-none focus:ring-2 cursor-pointer shadow-2xs',
                filter === 'terlambat'
                  ? 'border-rose-300 bg-rose-50 text-rose-800 focus:ring-rose-400'
                  : filter === 'h0' || filter === 'h3'
                  ? 'border-orange-300 bg-orange-50 text-orange-800 focus:ring-orange-400'
                  : 'border-zinc-300 bg-zinc-50 text-zinc-800 focus:border-emerald-600 focus:ring-emerald-500'
              )}
            >
              {filterOptions.map((f) => (
                <option key={f.v} value={f.v}>
                  {f.l} ({f.count})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          </div>

          {filter !== 'all' && (
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-2xs',
              filter === 'terlambat'
                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                : filter === 'h0' || filter === 'h3'
                ? 'bg-orange-100 text-orange-800 border border-orange-200'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            )}>
              Aktif: {filterOptions.find(f => f.v === filter)?.count} pinjaman
            </span>
          )}
        </div>

        <div>
          <Button
            onClick={handleTagihSemua}
            disabled={sending === 'all' || pinjamans.length === 0}
            className="bg-rose-600 hover:bg-rose-700 text-white shadow-xs font-bold text-xs h-9 w-full sm:w-auto"
            size="sm"
          >
            {sending === 'all' ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Mail className="size-4 mr-1.5" />}
            Tagih Sesuai Filter ({pinjamans.length})
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="border-zinc-200 shadow-2xs overflow-hidden">
        <CardContent className="p-0">
          {pinjamans.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-400">
              <HandCoins className="size-12 mx-auto mb-2 opacity-30 text-emerald-600" />
              <p className="font-semibold text-zinc-600">Tidak ada data pinjaman pada filter ini</p>
              <p className="text-xs text-zinc-400 mt-1">Coba pilih filter lain di atas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50/90 border-b border-zinc-200 text-zinc-600">
                  <tr>
                    <th className="text-left p-3.5 text-xs font-bold">No. Pinjaman</th>
                    <th className="text-left p-3.5 text-xs font-bold">Anggota & Kontak</th>
                    <th className="text-right p-3.5 text-xs font-bold">Angsuran/Bln</th>
                    <th className="text-right p-3.5 text-xs font-bold">Sisa Pokok</th>
                    <th className="text-center p-3.5 text-xs font-bold">Angsuran Ke</th>
                    <th className="text-left p-3.5 text-xs font-bold">Jatuh Tempo</th>
                    <th className="text-center p-3.5 text-xs font-bold">Status Jatuh Tempo</th>
                    <th className="text-center p-3.5 text-xs font-bold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/80">
                  {pinjamans.map((p: any, i: number) => {
                    const isOverdue = p.isOverdue || p.selisihHari < 0
                    const isDueToday = p.isDueToday || p.selisihHari === 0

                    return (
                      <tr
                        key={p.id || i}
                        className={cn(
                          'transition-colors hover:bg-zinc-50/80',
                          isOverdue && 'bg-rose-50/40 border-l-4 border-l-rose-500',
                          isDueToday && 'bg-amber-50/40 border-l-4 border-l-amber-500'
                        )}
                      >
                        {/* No Pinjaman */}
                        <td className="p-3.5 font-mono text-xs font-bold text-zinc-800">
                          {p.nomorPinjaman}
                          <div className="text-[10px] text-zinc-400 font-normal">ID: {p.nomorAnggota}</div>
                        </td>

                        {/* Nama & Kontak */}
                        <td className="p-3.5 text-xs">
                          <p className="font-bold text-zinc-900">{p.nama}</p>
                          <p className="text-[11px] text-zinc-500">{p.email || '-'}</p>
                          {p.phone && <p className="text-[10px] text-zinc-400">📱 {p.phone}</p>}
                        </td>

                        {/* Angsuran per bulan */}
                        <td className="p-3.5 text-right text-xs font-bold text-amber-800">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p.angsuranPerBulan)}
                        </td>

                        {/* Sisa Pinjaman */}
                        <td className="p-3.5 text-right text-xs font-medium text-zinc-700">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p.sisaPinjaman)}
                        </td>

                        {/* Angsuran Ke */}
                        <td className="p-3.5 text-center text-xs">
                          <span className="font-bold text-zinc-800">{p.angsuranKe}</span>
                          <span className="text-zinc-400">/{p.tenorBulan} bln</span>
                        </td>

                        {/* Jatuh Tempo */}
                        <td className="p-3.5 text-xs">
                          <p className={cn('font-bold', isOverdue ? 'text-rose-700' : 'text-zinc-800')}>
                            {new Date(p.jatuhTempo).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          {isOverdue && (
                            <span className="text-[10px] font-extrabold text-rose-600 flex items-center gap-1 mt-0.5">
                              🚨 Lewat {p.daysOverdue} hari
                            </span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="p-3.5 text-center">
                          {isOverdue ? (
                            <div className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800 shadow-2xs border border-rose-200">
                              <AlertTriangle className="size-3.5 text-rose-600 shrink-0" />
                              <span>Terlambat {p.daysOverdue} Hari</span>
                            </div>
                          ) : isDueToday ? (
                            <div className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-800 border border-red-200 animate-pulse">
                              <Zap className="size-3.5 text-red-600 shrink-0" />
                              <span>Jatuh Tempo Hari Ini</span>
                            </div>
                          ) : p.urgency === 'h3' ? (
                            <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-800 border border-orange-200">
                              ⚠️ H-{p.selisihHari} ({p.selisihHari} hari lagi)
                            </span>
                          ) : p.urgency === 'h7' ? (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200">
                              ⏰ H-{p.selisihHari} ({p.selisihHari} hari lagi)
                            </span>
                          ) : p.urgency === 'h14' ? (
                            <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-bold text-yellow-800 border border-yellow-200">
                              📅 H-{p.selisihHari} ({p.selisihHari} hari lagi)
                            </span>
                          ) : p.urgency === 'h30' ? (
                            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800 border border-blue-200">
                              📌 H-{p.selisihHari} ({p.selisihHari} hari lagi)
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                              ✓ Aman ({p.selisihHari} hari lagi)
                            </span>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="p-3.5 text-center">
                          <Button
                            onClick={() => handleTagih(p.id)}
                            disabled={sending === p.id || !p.email}
                            size="sm"
                            className={cn(
                              'h-8 text-xs font-bold shadow-xs',
                              isOverdue
                                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                : isDueToday || p.urgency === 'h3'
                                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                                : 'bg-teal-600 hover:bg-teal-700 text-white'
                            )}
                          >
                            {sending === p.id ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <Mail className="size-3.5 mr-1" />}
                            {isOverdue ? 'Tagih Terlambat' : 'Kirim Tagihan'}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Reminder Simpanan Wajib View
// ============================================================
function ReminderSimpananWajibView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'belum_bayar' | 'sudah_bayar'>('all')
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const [bulan, setBulan] = useState(currentMonth)
  const [tahun, setTahun] = useState(currentYear)
  const [sending, setSending] = useState<string | null>(null)
  const [pesanKustom, setPesanKustom] = useState('')
  const [selectedAnggotaJadwal, setSelectedAnggotaJadwal] = useState<any | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/koperasi/reminder-simpanan?bulan=${bulan}&tahun=${tahun}&filter=${filter}`)
      const d = await res.json()
      setData(d)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [bulan, tahun, filter])

  const isFuture = data?.isFuture || false
  const isCurrent = data?.isCurrent || (bulan === currentMonth && tahun === currentYear)

  const handleReminder = async (anggotaId: string) => {
    setSending(anggotaId)
    try {
      const res = await fetch('/api/koperasi/reminder-simpanan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anggotaId, bulan, tahun, pesanKustom }),
      })
      const d = await res.json()
      if (d.success) {
        alert(`✅ Pengingat Simpanan Wajib terkirim ke email anggota!`)
      } else {
        alert(d.error || 'Gagal mengirim pengingat')
      }
    } catch (e: any) {
      alert('Gagal: ' + e.message)
    } finally {
      setSending(null)
    }
  }

  const handleBlastSemua = async () => {
    if (isFuture) {
      alert('Periode ini di masa depan dan belum jatuh tempo. Tidak dapat mengirim blast reminder.')
      return
    }
    if (!confirm(`Kirim email pengingat Simpanan Wajib (${data?.namaBulan || ''}) ke SEMUA anggota yang belum setor?`)) return
    setSending('all')
    try {
      const res = await fetch('/api/koperasi/reminder-simpanan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blastSemua: true, bulan, tahun, pesanKustom }),
      })
      const d = await res.json()
      if (d.success) {
        alert(`✅ Terkirim: ${d.sentCount} email | Gagal: ${d.failedCount}`)
      } else {
        alert(d.error || 'Gagal mengirim blast reminder')
      }
    } catch (e: any) {
      alert('Gagal: ' + e.message)
    } finally {
      setSending(null)
    }
  }

  const anggotas = data?.anggotas || []
  const summary = data?.summary || { totalAnggota: 0, belumBayar: 0, sudahBayar: 0, totalTerkumpul: 0, potensiTerkumpul: 0 }
  const nominalWajib = data?.nominalWajib || 0

  // Pilihan tahun dinamis: 2 tahun ke belakang s/d tahun berjalan
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear]

  return (
    <div className="space-y-4">
      {/* Filter Periode & Ringkasan */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-100 bg-teal-50/40 p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
            <Calendar className="size-4 text-teal-600" /> Periode Iuran:
          </span>
          <select
            value={bulan}
            onChange={(e) => setBulan(parseInt(e.target.value))}
            className="rounded-lg border border-teal-200 bg-white px-2.5 py-1 text-xs font-semibold text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((m, idx) => (
              <option key={idx + 1} value={idx + 1}>{m}</option>
            ))}
          </select>
          <select
            value={tahun}
            onChange={(e) => setTahun(parseInt(e.target.value))}
            className="rounded-lg border border-teal-200 bg-white px-2.5 py-1 text-xs font-semibold text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Tombol Cepat Kembali ke Bulan Berjalan */}
          {(!isCurrent) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setBulan(currentMonth)
                setTahun(currentYear)
              }}
              className="h-7 px-2 text-[11px] font-semibold border-teal-300 text-teal-800 bg-white hover:bg-teal-100"
            >
              📅 Bulan Ini
            </Button>
          )}

          {/* Badge Indikator Status Periode */}
          {isCurrent ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              ✓ Bulan Berjalan
            </span>
          ) : isFuture ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
              ⚠️ Masa Depan (Belum Jatuh Tempo)
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
              📜 Arsip Periode
            </span>
          )}

          <span className="text-xs text-zinc-500 ml-1">
            (Iuran Wajib: <strong className="text-teal-800">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(nominalWajib)}/bln</strong>)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={load}
            disabled={loading}
            variant="outline"
            className="border-teal-300 text-teal-800 bg-white hover:bg-teal-50 shadow-2xs"
            size="sm"
          >
            <RefreshCw className={cn("size-3.5 mr-1.5", loading && "animate-spin")} />
            Segarkan
          </Button>
          <Button
            onClick={handleBlastSemua}
            disabled={sending === 'all' || summary.belumBayar === 0 || isFuture}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm"
            size="sm"
          >
            {sending === 'all' ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <BellRing className="size-4 mr-1.5" />}
            Blast Reminder ({summary.belumBayar} Belum Setor)
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="bg-gradient-to-br from-zinc-50 to-zinc-100 border-zinc-200">
          <CardContent className="p-4">
            <p className="text-[10px] text-zinc-600 font-medium">Total Anggota Koperasi</p>
            <p className="mt-1 text-xl font-bold text-zinc-800">{summary.totalAnggota} <span className="text-xs font-normal text-zinc-500">orang</span></p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-50 to-red-50 border-rose-200">
          <CardContent className="p-4">
            <p className="text-[10px] text-rose-700 font-medium">Belum Setor ({data?.namaBulan})</p>
            <p className="mt-1 text-xl font-bold text-rose-700">{summary.belumBayar} <span className="text-xs font-normal text-rose-500">orang</span></p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardContent className="p-4">
            <p className="text-[10px] text-emerald-700 font-medium">Sudah Lunas ({data?.namaBulan})</p>
            <p className="mt-1 text-xl font-bold text-emerald-700">{summary.sudahBayar} <span className="text-xs font-normal text-emerald-500">orang</span></p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
          <CardContent className="p-4">
            <p className="text-[10px] text-teal-700 font-medium">Terkumpul Periode Ini</p>
            <p className="mt-1 text-xl font-bold text-teal-800">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(summary.totalTerkumpul)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-700">Filter Status:</span>
          {([
            { v: 'all', l: 'Semua' },
            { v: 'belum_bayar', l: `Belum Setor (${summary.belumBayar})` },
            { v: 'sudah_bayar', l: `Sudah Lunas (${summary.sudahBayar})` },
          ] as const).map((f) => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${filter === f.v ? 'bg-teal-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
            >
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="border-zinc-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center"><Loader2 className="size-6 mx-auto animate-spin text-teal-600" /></div>
          ) : anggotas.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-400">
              <Users className="size-10 mx-auto mb-2 opacity-30" />
              Tidak ada data anggota
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-zinc-600">No. Anggota</th>
                    <th className="text-left p-3 text-xs font-semibold text-zinc-600">Nama Anggota</th>
                    <th className="text-left p-3 text-xs font-semibold text-zinc-600">Kontak</th>
                    <th className="text-right p-3 text-xs font-semibold text-zinc-600">Setor {data?.namaBulan}</th>
                    <th className="text-right p-3 text-xs font-semibold text-zinc-600">Total Saldo Wajib</th>
                    <th className="text-center p-3 text-xs font-semibold text-zinc-600">Jadwal & Status</th>
                    <th className="text-center p-3 text-xs font-semibold text-zinc-600">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {anggotas.map((a: any, i: number) => {
                    const canRemind = a.status === 'belum_bayar' && !!a.email && !isFuture
                    const canResend = a.status === 'sudah_bayar' && !!a.email && !isFuture

                    return (
                      <tr key={i} className="border-b hover:bg-zinc-50">
                        <td className="p-3 font-mono text-xs font-medium text-zinc-700">{a.nomorAnggota}</td>
                        <td className="p-3 text-xs font-semibold text-zinc-900">{a.nama}</td>
                        <td className="p-3 text-xs text-zinc-500">
                          <div>{a.email || '-'}</div>
                          {a.phone && <div className="text-[11px] text-zinc-400">{a.phone}</div>}
                        </td>
                        <td className="p-3 text-right text-xs font-semibold text-teal-700">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(a.totalSetorBulanIni)}
                          {a.kekurangan > 0 && (
                            <div className="text-[10px] text-rose-500 font-normal">Kurang: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(a.kekurangan)}</div>
                          )}
                        </td>
                        <td className="p-3 text-right text-xs font-medium text-zinc-700">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(a.saldoWajibTotal)}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedAnggotaJadwal(a)}
                              className="h-7 px-2.5 text-[11px] font-bold border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100 hover:text-teal-900 shadow-2xs flex items-center gap-1.5 transition-all"
                            >
                              <Calendar className="size-3.5 text-teal-600" />
                              Lihat Jadwal
                            </Button>
                            <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                              a.status === 'sudah_bayar'
                                ? 'bg-emerald-100 text-emerald-800'
                                : a.status === 'belum_jatuh_tempo'
                                ? 'bg-amber-100 text-amber-800'
                                : a.status === 'belum_bergabung'
                                ? 'bg-zinc-100 text-zinc-600'
                                : 'bg-rose-100 text-rose-700'
                            }`}>
                              {a.status === 'sudah_bayar' ? '✓ Lunas Bln Ini' : a.status === 'belum_jatuh_tempo' ? 'Belum Tempo' : '✗ Belum Setor'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {canRemind ? (
                            <Button
                              onClick={() => handleReminder(a.id)}
                              disabled={sending === a.id}
                              size="sm"
                              className="h-7 text-[10px] bg-teal-600 hover:bg-teal-700 text-white font-medium"
                            >
                              {sending === a.id ? <Loader2 className="size-3 animate-spin mr-1" /> : <Mail className="size-3 mr-1" />}
                              Ingatkan
                            </Button>
                          ) : canResend ? (
                            <Button
                              onClick={() => handleReminder(a.id)}
                              disabled={sending === a.id}
                              size="sm"
                              className="h-7 text-[10px] bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-normal"
                            >
                              {sending === a.id ? <Loader2 className="size-3 animate-spin mr-1" /> : <Mail className="size-3 mr-1" />}
                              Kirim Lagi
                            </Button>
                          ) : (
                            <span className="text-[11px] text-zinc-400 italic">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Dialog Jadwal Iuran Simpanan Wajib */}
      {selectedAnggotaJadwal && (
        <Dialog open={!!selectedAnggotaJadwal} onOpenChange={(o) => { if (!o) setSelectedAnggotaJadwal(null) }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-teal-950 flex items-center gap-2">
                <Calendar className="size-5 text-teal-600" />
                Jadwal Iuran Simpanan Wajib — {selectedAnggotaJadwal.nama}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500">
                No. Anggota: <strong className="text-teal-900 font-mono">{selectedAnggotaJadwal.nomorAnggota}</strong> · 
                Tgl Bergabung: {selectedAnggotaJadwal.tanggalBergabung ? new Date(selectedAnggotaJadwal.tanggalBergabung).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : '-'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Ringkasan Saldo & Cakupan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-3 text-center">
                  <p className="text-[10px] text-teal-600 font-semibold uppercase">Total Saldo Simpanan Wajib</p>
                  <p className="text-base font-bold text-teal-900 mt-0.5">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(selectedAnggotaJadwal.saldoWajibTotal)}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-center">
                  <p className="text-[10px] text-emerald-600 font-semibold uppercase">Bulan Ter-Cover</p>
                  <p className="text-base font-bold text-emerald-900 mt-0.5">
                    {selectedAnggotaJadwal.totalMonthsCovered} Bulan Lunas
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center">
                  <p className="text-[10px] text-zinc-600 font-semibold uppercase">Lunas Sampai Dengan</p>
                  <p className="text-base font-bold text-zinc-900 mt-0.5">
                    {selectedAnggotaJadwal.lunasSampaiBulan || 'Belum ada'}
                  </p>
                </div>
              </div>

              {/* Tabel Jadwal Bulanan */}
              <div className="rounded-xl border border-zinc-200 overflow-hidden">
                <div className="bg-zinc-100/80 px-3.5 py-2 border-b border-zinc-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-800">Daftar Status Iuran per Bulan</span>
                  <span className="text-[11px] text-zinc-500">Iuran: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(selectedAnggotaJadwal.nominalWajib)}/bulan</span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-zinc-100">
                  {selectedAnggotaJadwal.jadwal?.map((j: any, idx: number) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center justify-between px-4 py-2.5 text-xs transition-colors",
                        j.isSelectedPeriod ? "bg-teal-50/70 font-semibold" : idx % 2 === 0 ? "bg-white" : "bg-zinc-50/50",
                        j.isPaid ? "hover:bg-emerald-50/40" : "hover:bg-rose-50/30"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-zinc-400 text-[11px] w-5 text-right">{j.monthIndex}.</span>
                        <span className={cn("font-medium", j.isSelectedPeriod ? "text-teal-950 font-bold" : "text-zinc-800")}>
                          {j.label}
                        </span>
                        {j.isSelectedPeriod && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-200/70 text-teal-800">
                            Periode Ini
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-zinc-600 font-medium">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(j.nominal)}
                        </span>
                        {j.isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCheck className="size-3 text-emerald-700" /> Sudah Lunas
                          </span>
                        ) : j.status === 'tertunggak' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <AlertCircle className="size-3 text-rose-700" /> Belum Bayar
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                            <Clock className="size-3 text-zinc-500" /> Belum Jatuh Tempo
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Panduan */}
              <div className="rounded-lg bg-amber-50/70 border border-amber-200 p-2.5 text-[11px] text-amber-900 flex items-start gap-2">
                <AlertCircle className="size-4 shrink-0 text-amber-700 mt-0.5" />
                <span>
                  Simpanan Wajib menerapkan sistem pembayaran akumulasi seperti angsuran bulanan. Penyetoran multi-bulan (misal Rp 30.000) otomatis melunasi bulan berjalan dan bulan-bulan berikutnya secara berurutan.
                </span>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAnggotaJadwal(null)}
                  className="border-zinc-300 text-zinc-700 font-semibold"
                >
                  Tutup
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ============================================================
// Reminder Simpanan Pokok View (Tagihan & Blast Simpanan Pokok)
// ============================================================
function ReminderSimpananPokokView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'belum_bayar' | 'sudah_bayar' | 'all'>('belum_bayar')
  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')
  const [sending, setSending] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/koperasi/reminder-pokok?filter=${filter}&q=${encodeURIComponent(q)}`)
      const d = await res.json()
      setData(d)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [filter, q])

  const summary = data?.summary || { totalAnggota: 0, belumBayar: 0, sudahBayar: 0, totalTerkumpul: 0, potensiTerkumpul: 0 }
  const nominalPokok = data?.nominalPokok || 50000
  const anggotas = data?.anggotas || []

  const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  const handleReminder = async (anggotaId: string, nama: string) => {
    if (!confirm(`Kirim email pengingat Simpanan Pokok ke ${nama}?`)) return
    setSending(anggotaId)
    try {
      const res = await fetch('/api/koperasi/reminder-pokok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anggotaId }),
      })
      const d = await res.json()
      if (d.success) {
        alert(`✅ Pengingat Simpanan Pokok berhasil dikirim ke email ${nama}!`)
      } else {
        alert(d.error || 'Gagal mengirim pengingat')
      }
    } catch (e: any) {
      alert('Gagal: ' + e.message)
    } finally {
      setSending(null)
    }
  }

  const handleBlastSemua = async () => {
    const count = summary.belumBayar
    if (count === 0) {
      alert('Semua anggota telah melunasi Simpanan Pokok.')
      return
    }
    if (!confirm(`Kirim email pengingat Simpanan Pokok secara MASSAL (BLAST) ke ${count} anggota yang belum setor?`)) return
    setSending('all')
    try {
      const res = await fetch('/api/koperasi/reminder-pokok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blastSemua: true }),
      })
      const d = await res.json()
      if (d.success) {
        alert(`✅ Selesai! Terkirim: ${d.sentCount} email${d.failedCount > 0 ? ` | Gagal: ${d.failedCount}` : ''}`)
        load()
      } else {
        alert(d.error || 'Gagal mengirim blast')
      }
    } catch (e: any) {
      alert('Gagal: ' + e.message)
    } finally {
      setSending(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Header & Blast Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
        <div className="space-y-0.5">
          <h2 className="text-sm font-bold text-amber-950 flex items-center gap-2">
            <Landmark className="size-4 text-amber-700" />
            Kewajiban Simpanan Pokok (Biaya Registrasi / Deposit)
          </h2>
          <p className="text-xs text-amber-800">
            Besaran Simpanan Pokok: <strong className="text-amber-950">{fmt(nominalPokok)}</strong> (wajib lunas 1x di awal agar anggota dapat bertransaksi simpanan lain & pinjaman).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleBlastSemua}
            disabled={sending === 'all' || summary.belumBayar === 0}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs h-9 text-xs"
            size="sm"
          >
            {sending === 'all' ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <BellRing className="size-3.5 mr-1.5" />}
            Blast Tagihan ({summary.belumBayar} Belum Setor)
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="bg-gradient-to-br from-zinc-50 to-zinc-100 border-zinc-200 shadow-xs">
          <CardContent className="p-4">
            <p className="text-[10px] text-zinc-600 font-medium">Total Anggota Koperasi</p>
            <p className="mt-1 text-xl font-bold text-zinc-800">{summary.totalAnggota} <span className="text-xs font-normal text-zinc-500">orang</span></p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-50 to-red-50 border-rose-200 shadow-xs">
          <CardContent className="p-4">
            <p className="text-[10px] text-rose-700 font-bold uppercase tracking-wider">Belum Setor Pokok</p>
            <p className="mt-1 text-xl font-black text-rose-700">{summary.belumBayar} <span className="text-xs font-normal text-rose-500">orang</span></p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 shadow-xs">
          <CardContent className="p-4">
            <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Sudah Lunas Pokok</p>
            <p className="mt-1 text-xl font-black text-emerald-700">{summary.sudahBayar} <span className="text-xs font-normal text-emerald-500">orang</span></p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-xs">
          <CardContent className="p-4">
            <p className="text-[10px] text-amber-800 font-medium">Total Pokok Terkumpul</p>
            <p className="mt-1 text-xl font-bold text-amber-900">{fmt(summary.totalTerkumpul)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-700">Filter:</span>
          {([
            { v: 'belum_bayar', l: `Belum Setor (${summary.belumBayar})` },
            { v: 'sudah_bayar', l: `Sudah Lunas (${summary.sudahBayar})` },
            { v: 'all', l: `Semua (${summary.totalAnggota})` },
          ] as const).map((f) => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              className={`px-3 py-1.5 text-xs rounded-full font-semibold transition-colors ${filter === f.v ? 'bg-amber-600 text-white shadow-xs' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
            >
              {f.l}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-56 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
            <Input
              value={qInput}
              onChange={(e) => {
                setQInput(e.target.value)
                setQ(e.target.value)
              }}
              placeholder="Cari nama, nomor, email..."
              className="h-8 pl-8 text-xs bg-white"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <Card className="border-zinc-200 shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center"><Loader2 className="size-6 mx-auto animate-spin text-amber-600" /></div>
          ) : anggotas.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-400">
              <Users className="size-10 mx-auto mb-2 opacity-30" />
              {filter === 'belum_bayar'
                ? 'Luar biasa! Semua anggota sudah menyetorkan Simpanan Pokok.'
                : 'Tidak ada data anggota'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-zinc-600">No. Anggota</th>
                    <th className="text-left p-3 text-xs font-semibold text-zinc-600">Nama Anggota</th>
                    <th className="text-left p-3 text-xs font-semibold text-zinc-600">Kontak Email / HP</th>
                    <th className="text-left p-3 text-xs font-semibold text-zinc-600">Tgl Bergabung</th>
                    <th className="text-right p-3 text-xs font-semibold text-zinc-600">Kewajiban Pokok</th>
                    <th className="text-right p-3 text-xs font-semibold text-zinc-600">Saldo Pokok</th>
                    <th className="text-center p-3 text-xs font-semibold text-zinc-600">Status</th>
                    <th className="text-center p-3 text-xs font-semibold text-zinc-600">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {anggotas.map((a: any, i: number) => (
                    <tr key={i} className="border-b hover:bg-amber-50/20">
                      <td className="p-3 font-mono text-xs font-bold text-emerald-800">{a.nomorAnggota}</td>
                      <td className="p-3 text-xs font-semibold text-zinc-900">{a.nama}</td>
                      <td className="p-3 text-xs text-zinc-500">
                        <div className="font-mono">{a.email || <span className="text-red-400 italic">Tanpa Email</span>}</div>
                        {a.phone && <div className="text-[11px] text-zinc-400">{a.phone}</div>}
                      </td>
                      <td className="p-3 text-xs text-zinc-600">
                        {a.tanggalBergabung ? new Date(a.tanggalBergabung).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="p-3 text-right text-xs font-medium text-zinc-700">
                        {fmt(a.nominalPokok)}
                      </td>
                      <td className="p-3 text-right text-xs font-semibold text-emerald-700">
                        {fmt(a.saldoPokok)}
                        {a.kekurangan > 0 && (
                          <div className="text-[10px] text-rose-500 font-normal">Kurang: {fmt(a.kekurangan)}</div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-0.5 text-xs rounded-full font-bold ${
                          a.status === 'sudah_bayar'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-700'
                        }`}>
                          {a.statusLabel}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          onClick={() => handleReminder(a.id, a.nama)}
                          disabled={sending === a.id || !a.email}
                          size="sm"
                          className={`h-7 text-[10px] ${
                            a.status === 'belum_bayar'
                              ? 'bg-amber-600 hover:bg-amber-700 text-white font-bold'
                              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                          }`}
                        >
                          {sending === a.id ? <Loader2 className="size-3 animate-spin mr-1" /> : <Mail className="size-3 mr-1" />}
                          {a.status === 'belum_bayar' ? 'Tagih Email' : 'Kirim Lagi'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

