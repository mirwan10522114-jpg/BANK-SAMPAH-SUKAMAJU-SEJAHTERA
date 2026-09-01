'use client'

import { useState, useEffect } from 'react'
import {
  Recycle, LayoutDashboard, Database, Scale, HandCoins, Warehouse, Wand2, Menu, X,
  Banknote, ArrowRight, Settings, LogOut, ChevronDown, ShoppingBag, FileBarChart,
  BookOpen, Camera, Megaphone, Send, Mail, AlertTriangle, Loader2, Image as ImageIcon,
  Search, Layers, Sparkles, FolderGit2, Wallet, Calendar, CheckCircle2, Users, BellRing, Filter,
  ClipboardCheck, AlertCircle, ArrowUpRight, Trophy, RefreshCw, Zap, Package, Clock, ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dashboard } from '@/components/modules/dashboard'
import { DashboardKoperasi } from '@/components/modules/dashboard-koperasi'
import { DashboardPenjualanProduk } from '@/components/modules/dashboard-penjualan-produk'
import { MasterData } from '@/components/modules/master-data'
import { Operasional } from '@/components/modules/operasional'
import { Koperasi } from '@/components/modules/koperasi'
import { Inventaris } from '@/components/modules/inventaris'
import { TellerWizard } from '@/components/modules/teller-wizard'
import { FinansialBankSampah } from '@/components/modules/finansial-bank-sampah'
import { PenjualanProduk } from '@/components/modules/penjualan-produk'
import { LaporanLabaRugi } from '@/components/modules/laporan-laba-rugi'
import { ManajemenEdukasi } from '@/components/modules/manajemen-edukasi'
import { ManajemenKegiatan } from '@/components/modules/manajemen-kegiatan'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { api, setActingUser } from '@/lib/api'
import type { AuthUser } from '@/lib/auth'

type Section = 'dashboard' | 'master' | 'operasional' | 'koperasi' | 'inventaris' | 'teller' | 'finansial' | 'penjualan' | 'laporan' | 'edukasi' | 'kegiatan' | 'pengumuman'
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
    id: 'unit-bisnis',
    title: 'Unit Usaha & Koperasi',
    icon: HandCoins,
    desc: 'Simpan pinjam & toko produk',
    items: [
      { id: 'koperasi', label: 'Koperasi Simpan Pinjam', icon: HandCoins, desc: 'Simpanan & pinjaman' },
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

export function AdminPanel({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
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
  const [users, setUsers] = useState<any[]>([])
  const [actingUserId, setActingUserId] = useState<string>('')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showDailyChecklist, setShowDailyChecklist] = useState(false)
  const [dailyData, setDailyData] = useState<any>(null)
  const [dailyLoading, setDailyLoading] = useState(false)

  const loadDailyChecklist = async () => {
    setDailyLoading(true)
    try {
      const res = await fetch('/api/admin/daily-checklist')
      if (res.ok) {
        const d = await res.json()
        setDailyData(d)
      }
    } catch {}
    finally { setDailyLoading(false) }
  }

  useEffect(() => {
    loadDailyChecklist()
    const interval = setInterval(loadDailyChecklist, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    api.nasabah.list('', '').then((u) => {
      setUsers(u)
      const admin = u.find((x) => x.email === user.email) || u.find((x) => x.roles?.includes('admin'))
      if (admin) { setActingUserId(admin.id); setActingUser(admin.id) }
    }).catch(() => {})
  }, [user.email])

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
    <div className="min-h-screen flex flex-col bg-zinc-50/70">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-emerald-200/60 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
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
              <h1 className="text-base font-bold text-emerald-900 sm:text-lg">Bank Sampah</h1>
              <p className="hidden text-xs text-emerald-700/70 sm:block">Panel Admin · Sistem Terpadu</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            {/* Daily Assistant / Checklist Button */}
            <button
              onClick={() => {
                loadDailyChecklist()
                setShowDailyChecklist(true)
              }}
              className={cn(
                'flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-sm border',
                dailyData?.summary?.isAllDone
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-200'
                  : (dailyData?.summary?.pendingTasks ?? 0) > 0
                  ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 text-white border-amber-300 hover:brightness-110 shadow-rose-200 animate-pulse'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
              )}
              title="Klik untuk membuka Asisten Tugas Harian Admin"
            >
              {dailyData?.summary?.isAllDone ? (
                <>
                  <Trophy className="size-4 text-amber-300 animate-bounce" />
                  <span className="hidden sm:inline">Kerja Hari Ini:</span>
                  <span>✓ 100% Selesai!</span>
                </>
              ) : (
                <>
                  <ClipboardCheck className="size-4" />
                  <span className="hidden sm:inline">Tugas Harian:</span>
                  <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[11px]">
                    {dailyData?.summary?.completedTasks ?? 0}/{dailyData?.summary?.totalTasks ?? 4}
                  </span>
                  {(dailyData?.summary?.pendingTasks ?? 0) > 0 && (
                    <span className="hidden md:inline text-[10px] opacity-95">
                      ({dailyData.summary.pendingTasks} perlu tindakan)
                    </span>
                  )}
                </>
              )}
            </button>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu((s) => !s)}
                className="flex items-center gap-2 rounded-lg p-1 transition hover:bg-emerald-50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="hidden h-4 w-4 text-emerald-600 sm:block" />
              </button>

              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                  <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-lg">
                    {/* Profile header (dark green, matching image 1) */}
                    <div className="bg-[#2d5016] p-4 text-white">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-lg font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="leading-tight">
                          <p className="font-semibold">{user.name}</p>
                          <p className="text-xs text-emerald-100/70">{user.email}</p>
                        </div>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="p-2">
                      <button
                        onClick={() => { setShowProfileMenu(false); setSection('master'); setSidebarOpen(false) }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-700 transition hover:bg-emerald-50"
                      >
                        <Settings className="h-4 w-4 text-emerald-600" /> Pengaturan
                      </button>
                      <button
                        onClick={onLogout}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
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
          'fixed inset-y-0 left-0 top-16 z-30 w-80 transform border-r border-emerald-200/60 bg-white transition-transform duration-200 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0',
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
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/90 pl-10 pr-8 text-sm text-zinc-800 placeholder-zinc-400 focus:border-emerald-500 focus:bg-white focus:outline-none transition-colors"
              />
              {searchMenu && (
                <button
                  type="button"
                  onClick={() => setSearchMenu('')}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600"
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
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                        Layanan Utama
                      </p>
                      <div className="h-[1px] flex-1 bg-emerald-200/70" />
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
                                : 'text-zinc-700 hover:bg-emerald-50/90 hover:text-emerald-950 border border-transparent hover:border-emerald-100'
                            )}
                          >
                            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', active ? 'text-white' : 'text-emerald-600')} />
                            <div className="flex-1 min-w-0 leading-tight">
                              <p className={cn('text-sm font-bold truncate', active ? 'text-white' : 'text-zinc-900')}>
                                {item.label}
                              </p>
                              <p className={cn('text-xs truncate mt-0.5', active ? 'text-emerald-50' : 'text-zinc-500')}>
                                {item.id === 'dashboard' && dashboardType ? dashboardDesc : item.desc}
                              </p>
                            </div>
                            {item.id === 'dashboard' && dashboardType && (
                              <span className={cn('mt-0.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase', active ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800')}>
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
                            ? 'bg-emerald-50/90 text-emerald-950 font-semibold border border-emerald-300/80 shadow-xs'
                            : 'text-zinc-700 hover:bg-zinc-100/90 hover:text-zinc-950 border border-transparent'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            'flex h-8.5 w-8.5 items-center justify-center rounded-xl transition-colors shrink-0',
                            isChildActive ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100'
                          )}>
                            <GroupIcon className="h-4.5 w-4.5" />
                          </div>
                          <div className="min-w-0 flex-1 leading-tight">
                            <p className="text-sm font-bold text-zinc-900 truncate">{group.title}</p>
                            <p className="text-xs text-zinc-500 truncate mt-0.5">{group.desc}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-1.5">
                          <span className={cn(
                            'text-[10px] font-bold rounded-md px-2 py-0.5',
                            isChildActive ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'
                          )}>
                            {group.items.length}
                          </span>
                          <ChevronDown
                            className={cn(
                              'size-4 text-zinc-400 transition-transform duration-200',
                              isOpen && 'rotate-180 text-emerald-700'
                            )}
                          />
                        </div>
                      </button>

                      {/* Dropdown Content */}
                      {isOpen && (
                        <div className="ml-5 pl-3.5 my-1.5 space-y-1 border-l-2 border-emerald-300">
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
                                    : 'text-zinc-700 hover:bg-emerald-50 hover:text-emerald-950'
                                )}
                              >
                                <ItemIcon className={cn('mt-0.5 h-4 w-4 shrink-0', active ? 'text-white' : 'text-emerald-600')} />
                                <div className="flex-1 min-w-0 leading-tight">
                                  <p className={cn('text-xs font-bold truncate', active ? 'text-white' : 'text-zinc-800')}>
                                    {item.label}
                                  </p>
                                  <p className={cn('text-[11px] truncate mt-0.5', active ? 'text-emerald-100' : 'text-zinc-500')}>
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
                        className="mt-2 text-xs text-emerald-600 hover:underline font-semibold"
                      >
                        Reset pencarian
                      </button>
                    </div>
                  )
                }

                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-2.5 pt-1.5 pb-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                        Modul & Pengelolaan
                      </p>
                      <div className="h-[1px] flex-1 bg-emerald-200/70" />
                    </div>
                    {dropdownNodes}
                  </div>
                )
              })()}
            </div>

            {/* Quick Tips */}
            <div className="mt-auto rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3">
              <p className="text-xs font-bold text-emerald-900">💡 Tips Singkat</p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-800/90">
                Gunakan <b>Teller Wizard</b> untuk transaksi nasabah satu pintu. Klik <b>Dashboard</b> untuk berganti view.
              </p>
            </div>
          </nav>
        </aside>

        {sidebarOpen && <div className="fixed inset-0 top-16 z-20 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* Main content */}
        <main className="flex-1 overflow-x-hidden">
          <div className="border-b border-emerald-200/60 bg-white/60 px-4 py-3 lg:px-8">
            <div className="flex items-center gap-2 text-sm">
              {section === 'dashboard' && dashboardType ? (
                <>
                  <span className="font-semibold text-emerald-900">{dashboardLabel}</span>
                  <span className="text-emerald-700/50">/</span>
                  <span className="text-emerald-700/70">{dashboardDesc}</span>
                  <button
                    onClick={() => setShowDashboardChooser(true)}
                    className="ml-2 rounded-md border border-emerald-200 bg-white px-2 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50"
                  >
                    Ganti Dashboard
                  </button>
                </>
              ) : (
                <>
                  <activeNav.icon className="h-4 w-4 text-emerald-600" />
                  <span className="font-semibold text-emerald-900">{activeNav.label}</span>
                  <span className="text-emerald-700/50">/</span>
                  <span className="text-emerald-700/70">{activeNav.desc}</span>
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
            {section === 'inventaris' && <Inventaris />}
            {section === 'teller' && <TellerWizard />}
            {section === 'finansial' && <FinansialBankSampah />}
            {section === 'penjualan' && <PenjualanProduk />}
            {section === 'laporan' && <LaporanLabaRugi />}
            {section === 'edukasi' && <ManajemenEdukasi />}
            {section === 'kegiatan' && <ManajemenKegiatan />}
            {section === 'pengumuman' && <PengumumanTagihanView />}
          </div>
        </main>
      </div>

      {/* Dashboard Chooser Modal */}
      <Dialog open={showDashboardChooser} onOpenChange={setShowDashboardChooser}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-zinc-900">Pilih Dashboard</DialogTitle>
            <DialogDescription className="text-center">Pilih dashboard mana yang ingin Anda lihat</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button
              onClick={() => pickDashboard('bank-sampah')}
              className={cn(
                'group rounded-2xl border-2 p-6 text-left transition-all hover:shadow-md',
                dashboardType === 'bank-sampah' ? 'border-emerald-500 bg-emerald-50/50' : 'border-zinc-200 bg-white hover:border-emerald-300'
              )}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                <Recycle className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-zinc-900">Dashboard Bank Sampah</h3>
              <p className="mt-1 text-sm text-zinc-500">Pemantauan operasional setoran sampah, QC, inventaris, dan penjualan.</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-emerald-600 group-hover:gap-2 transition-all">
                Buka Dashboard <ArrowRight className="h-4 w-4" />
              </div>
            </button>

            <button
              onClick={() => pickDashboard('koperasi')}
              className={cn(
                'group rounded-2xl border-2 p-6 text-left transition-all hover:shadow-md',
                dashboardType === 'koperasi' ? 'border-teal-500 bg-teal-50/50' : 'border-zinc-200 bg-white hover:border-teal-300'
              )}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-sm">
                <HandCoins className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-zinc-900">Dashboard Koperasi</h3>
              <p className="mt-1 text-sm text-zinc-500">Pemantauan kas, simpanan, pinjaman, angsuran, dan arus keuangan koperasi.</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-teal-600 group-hover:gap-2 transition-all">
                Buka Dashboard <ArrowRight className="h-4 w-4" />
              </div>
            </button>

            <button
              onClick={() => pickDashboard('penjualan-produk')}
              className={cn(
                'group rounded-2xl border-2 p-6 text-left transition-all hover:shadow-md',
                dashboardType === 'penjualan-produk' ? 'border-purple-500 bg-purple-50/50' : 'border-zinc-200 bg-white hover:border-purple-300'
              )}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-sm">
                <ShoppingBag className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-zinc-900">Dashboard Penjualan Produk</h3>
              <p className="mt-1 text-sm text-zinc-500">Pemantauan penjualan produk olahan offline & online, margin, dan stok.</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-purple-600 group-hover:gap-2 transition-all">
                Buka Dashboard <ArrowRight className="h-4 w-4" />
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Daily Checklist Modal */}
      <DailyChecklistModal
        open={showDailyChecklist}
        onOpenChange={setShowDailyChecklist}
        data={dailyData}
        loading={dailyLoading}
        onRefresh={loadDailyChecklist}
        onNavigate={(sec: string) => {
          setSection(sec as Section)
          setShowDailyChecklist(false)
          setSidebarOpen(false)
        }}
      />

      {/* Sticky footer */}
      <footer className="mt-auto border-t border-emerald-200/60 bg-white py-4">
        <div className="flex flex-col items-center justify-between gap-2 px-4 text-xs text-emerald-700/70 sm:flex-row lg:px-8">
          <p>© {new Date().getFullYear()} Bank Sampah Sukamaju Sejahtera + Koperasi Simpan Pinjam</p>
          <p>Dibangun dengan Next.js 16 · Prisma · shadcn/ui</p>
        </div>
      </footer>
    </div>
  )
}

export default AdminPanel

// ============================================================
// PengumumanTagihanView — Blast Pengumuman + Tagihan Pinjaman + Reminder Simpanan Wajib
// ============================================================
function PengumumanTagihanView() {
  const [tab, setTab] = useState<'pengumuman' | 'tagihan' | 'simpanan_wajib'>('pengumuman')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
          <Megaphone className="size-5 text-emerald-600" /> Pengumuman & Tagihan
        </h1>
        <p className="text-xs text-zinc-500 mt-1">Kirim pengumuman massal, tagihan angsuran pinjaman, & pengingat simpanan wajib ke email nasabah/anggota</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab('pengumuman')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'pengumuman' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
        >
          📢 Blast Pengumuman
        </button>
        <button
          onClick={() => setTab('tagihan')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'tagihan' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
        >
          📌 Tagihan Pinjaman
        </button>
        <button
          onClick={() => setTab('simpanan_wajib')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'simpanan_wajib' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
        >
          💰 Reminder Simpanan Wajib
        </button>
      </div>

      {tab === 'pengumuman' ? (
        <PengumumanBlastForm />
      ) : tab === 'tagihan' ? (
        <TagihanPinjamanView />
      ) : (
        <ReminderSimpananWajibView />
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
  const [bulan, setBulan] = useState(now.getMonth() + 1)
  const [tahun, setTahun] = useState(now.getFullYear())
  const [sending, setSending] = useState<string | null>(null)
  const [pesanKustom, setPesanKustom] = useState('')

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
            {[2024, 2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <span className="text-xs text-zinc-500 ml-1">
            (Iuran Wajib: <strong className="text-teal-800">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(nominalWajib)}/bln</strong>)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleBlastSemua}
            disabled={sending === 'all' || summary.belumBayar === 0}
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
            <p className="text-[10px] text-teal-700 font-medium">Terkumpul Bulan Ini</p>
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
                    <th className="text-center p-3 text-xs font-semibold text-zinc-600">Status</th>
                    <th className="text-center p-3 text-xs font-semibold text-zinc-600">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {anggotas.map((a: any, i: number) => (
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
                          onClick={() => handleReminder(a.id)}
                          disabled={sending === a.id || !a.email}
                          size="sm"
                          className={`h-7 text-[10px] ${
                            a.status === 'belum_bayar'
                              ? 'bg-teal-600 hover:bg-teal-700 text-white font-medium'
                              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                          }`}
                        >
                          {sending === a.id ? <Loader2 className="size-3 animate-spin mr-1" /> : <Mail className="size-3 mr-1" />}
                          {a.status === 'belum_bayar' ? 'Ingatkan' : 'Kirim Lagi'}
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

// ============================================================
// Daily Checklist & Action Center Modal
// ============================================================
function DailyChecklistModal({
  open,
  onOpenChange,
  data,
  loading,
  onRefresh,
  onNavigate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: any
  loading: boolean
  onRefresh: () => void
  onNavigate: (section: string) => void
}) {
  const [runningAction, setRunningAction] = useState<string | null>(null)

  const summary = data?.summary || { totalTasks: 4, completedTasks: 0, pendingTasks: 4, progressPercent: 0, isAllDone: false }
  const tasks = data?.tasks || []

  const handleBlastPinjaman = async () => {
    if (!confirm('Kirim email tagihan angsuran pinjaman ke SEMUA anggota yang jatuh tempo / terlambat?')) return
    setRunningAction('pinjaman')
    try {
      const res = await fetch('/api/koperasi/tagihan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagihSemua: true }),
      })
      const d = await res.json()
      if (d.success) {
        alert(`✅ Tagihan Pinjaman Terkirim: ${d.sentCount} email (${d.failedCount} gagal)`)
        onRefresh()
      } else {
        alert(d.error || 'Gagal mengirim tagihan')
      }
    } catch (e: any) {
      alert('Gagal: ' + e.message)
    } finally {
      setRunningAction(null)
    }
  }

  const handleBlastSimpanan = async () => {
    if (!confirm(`Kirim blast reminder Simpanan Wajib (${data?.namaBulan}) ke SEMUA anggota yang belum setor?`)) return
    setRunningAction('simpanan')
    try {
      const res = await fetch('/api/koperasi/reminder-simpanan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blastSemua: true }),
      })
      const d = await res.json()
      if (d.success) {
        alert(`✅ Reminder Simpanan Wajib Terkirim: ${d.sentCount} email (${d.failedCount} gagal)`)
        onRefresh()
      } else {
        alert(d.error || 'Gagal mengirim pengingat')
      }
    } catch (e: any) {
      alert('Gagal: ' + e.message)
    } finally {
      setRunningAction(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl lg:max-w-3xl p-6">
        <DialogHeader className="pb-2 border-b">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                <Calendar className="size-3.5" /> {data?.dateFormatted || 'Hari Ini'}
              </span>
              <span className="text-xs text-zinc-500 font-medium">· Target Operasional Harian</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              disabled={loading}
              className="h-7 text-xs border-zinc-200"
            >
              <RefreshCw className={cn('size-3.5 mr-1.5', loading && 'animate-spin')} />
              Segarkan
            </Button>
          </div>
          <DialogTitle className="text-xl font-extrabold text-zinc-900 flex items-center gap-2 mt-1">
            <ClipboardCheck className="size-6 text-emerald-600" /> Asisten Checklist & Reminder Harian Admin
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Tuntaskan seluruh reminder penagihan, verifikasi QC, dan cek stok untuk menyelesaikan indikator kerja harian.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Progress Header */}
          <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-teal-50/60 to-white p-4.5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Status Penyelesaian Harian</p>
                <p className="text-lg font-black text-zinc-900 mt-0.5">
                  {summary.isAllDone ? '🎉 100% TUNTAS — KERJA SELESAI!' : `${summary.completedTasks} dari ${summary.totalTasks} Tugas Selesai (${summary.progressPercent}%)`}
                </p>
              </div>
              <div className="text-right">
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-xs',
                  summary.isAllDone ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                )}>
                  {summary.isAllDone ? <ShieldCheck className="size-4" /> : <Clock className="size-4" />}
                  {summary.isAllDone ? 'Tuntas Hari Ini' : `${summary.pendingTasks} Perlu Tindakan`}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3.5 h-3 w-full overflow-hidden rounded-full bg-zinc-200/80 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 transition-all duration-500"
                style={{ width: `${summary.progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-600 mt-2 font-medium">
              {summary.statusText}
            </p>
          </div>

          {/* Celebration Card when All Done */}
          {summary.isAllDone && (
            <div className="rounded-2xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-5 text-white shadow-md">
              <div className="flex items-start gap-3.5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                  <Trophy className="size-7 text-amber-300 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-base font-black flex items-center gap-2">
                    SELURUH TUGAS HARI INI TELAH SELESAI! <Sparkles className="size-4 text-amber-300" />
                  </h4>
                  <p className="text-xs text-emerald-50 mt-1 leading-relaxed">
                    Kerja bagus! Seluruh tagihan pinjaman angsuran, pengingat simpanan wajib, verifikasi QC sampah, dan ketersediaan stok telah tertangani dengan baik. Operasional Bank Sampah & Koperasi Sukamaju Sejahtera berjalan prima hari ini.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Task List Cards */}
          <div className="space-y-3">
            {tasks.map((task: any) => {
              const isPinjaman = task.id === 'pinjaman_reminders'
              const isSimpanan = task.id === 'simpanan_wajib_reminder'
              const isQc = task.id === 'antrian_qc_verification'
              const isStok = task.id === 'stok_produk_monitoring'

              return (
                <div
                  key={task.id}
                  className={cn(
                    'rounded-xl border p-4 transition-all',
                    task.isDone
                      ? 'border-emerald-200/70 bg-emerald-50/25'
                      : 'border-amber-200 bg-amber-50/20 shadow-xs ring-1 ring-amber-200/50'
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-xl font-bold',
                        task.isDone
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-800'
                      )}>
                        {task.isDone ? <CheckCircle2 className="size-5" /> : <AlertCircle className="size-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-zinc-900">{task.title}</h4>
                          <span className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                            task.isDone
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-700'
                          )}>
                            {task.isDone ? '✓ Selesai' : `⚠️ ${task.count} Tindakan`}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600 mt-1">{task.description}</p>

                        {/* Extra Context Badges */}
                        {isPinjaman && !task.isDone && task.details && (
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            {task.details.terlambatCount > 0 && (
                              <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                                Terlambat: {task.details.terlambatCount}
                              </span>
                            )}
                            {task.details.h3Count > 0 && (
                              <span className="rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-800">
                                Jatuh Tempo ≤3 Hari: {task.details.h3Count}
                              </span>
                            )}
                            {task.details.h7Count > 0 && (
                              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                                Jatuh Tempo ≤7 Hari: {task.details.h7Count}
                              </span>
                            )}
                            {task.details.h14Count > 0 && (
                              <span className="rounded-md bg-yellow-100 px-2 py-0.5 text-[11px] font-bold text-yellow-800">
                                Jatuh Tempo ≤14 Hari: {task.details.h14Count}
                              </span>
                            )}
                            {task.details.h30Count > 0 && (
                              <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800">
                                Jatuh Tempo ≤30 Hari: {task.details.h30Count}
                              </span>
                            )}
                          </div>
                        )}

                        {isSimpanan && !task.isDone && (
                          <div className="mt-2 text-xs text-zinc-500">
                            Iuran Simpanan Wajib: <strong className="text-teal-800">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(task.details?.nominalWajib || 0)}/bln</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-center ml-auto">
                      {isPinjaman && (
                        <>
                          <Button
                            size="sm"
                            onClick={handleBlastPinjaman}
                            disabled={runningAction === 'pinjaman'}
                            className={cn(
                              'text-xs h-8 shadow-xs',
                              task.isDone
                                ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200'
                                : 'bg-rose-600 hover:bg-rose-700 text-white'
                            )}
                          >
                            {runningAction === 'pinjaman' ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Zap className="size-3.5 mr-1.5" />}
                            {task.isDone ? 'Kirim Ulang Tagihan' : 'Tagih Semua (Email)'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onNavigate('pengumuman')}
                            className="text-xs h-8 border-zinc-300"
                          >
                            Buka Tagihan <ArrowUpRight className="size-3.5 ml-1" />
                          </Button>
                        </>
                      )}

                      {isSimpanan && (
                        <>
                          <Button
                            size="sm"
                            onClick={handleBlastSimpanan}
                            disabled={runningAction === 'simpanan'}
                            className={cn(
                              'text-xs h-8 shadow-xs',
                              task.isDone
                                ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200'
                                : 'bg-teal-600 hover:bg-teal-700 text-white'
                            )}
                          >
                            {runningAction === 'simpanan' ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Send className="size-3.5 mr-1.5" />}
                            {task.isDone ? 'Kirim Ulang Blast' : 'Blast Reminder Wajib'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onNavigate('pengumuman')}
                            className="text-xs h-8 border-zinc-300"
                          >
                            Buka Simpanan <ArrowUpRight className="size-3.5 ml-1" />
                          </Button>
                        </>
                      )}

                      {isQc && (
                        <Button
                          size="sm"
                          variant={task.isDone ? 'outline' : 'default'}
                          onClick={() => onNavigate('operasional')}
                          className={cn(
                            'text-xs h-8',
                            !task.isDone && 'bg-amber-600 hover:bg-amber-700 text-white'
                          )}
                        >
                          Buka Antrian QC <ArrowUpRight className="size-3.5 ml-1" />
                        </Button>
                      )}

                      {isStok && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onNavigate('inventaris')}
                          className="text-xs h-8 border-zinc-300"
                        >
                          Buka Inventaris <ArrowUpRight className="size-3.5 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
