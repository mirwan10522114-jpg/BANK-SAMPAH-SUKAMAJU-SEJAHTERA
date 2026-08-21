'use client'

import { useState, useEffect } from 'react'
import { Recycle, LayoutDashboard, Database, Scale, HandCoins, Warehouse, Wand2, Menu, X, Banknote, ArrowRight, Settings, LogOut, ChevronDown, ShoppingBag, FileBarChart, BookOpen, Camera, Megaphone, Send, Mail, AlertTriangle, Loader2, Image as ImageIcon } from 'lucide-react'
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

const NAV: { id: Section; label: string; icon: any; desc: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Ringkasan & metrik' },
  { id: 'teller', label: 'Teller Wizard', icon: Wand2, desc: 'Layanan satu pintu' },
  { id: 'operasional', label: 'Operasional Bank Sampah', icon: Scale, desc: 'Nabung & Sedekah Sampah' },
  { id: 'finansial', label: 'Finansial Bank Sampah', icon: Banknote, desc: 'Penarikan & Buku Kas' },
  { id: 'koperasi', label: 'Koperasi Simpan Pinjam', icon: HandCoins, desc: 'Simpanan, Pinjaman, Angsuran' },
  { id: 'inventaris', label: 'Inventaris & Penjualan', icon: Warehouse, desc: 'Gudang, Pengolahan, Penjualan' },
  { id: 'penjualan', label: 'Penjualan Produk', icon: ShoppingBag, desc: 'Toko online & kasir offline' },
  { id: 'laporan', label: 'Laporan Laba Rugi', icon: FileBarChart, desc: 'Laporan Bank Sampah, Koperasi, Penjualan' },
  { id: 'edukasi', label: 'Edukasi & Konten', icon: BookOpen, desc: 'Artikel edukasi lingkungan' },
  { id: 'kegiatan', label: 'Dokumentasi Kegiatan', icon: Camera, desc: 'Foto & dokumentasi kegiatan' },
  { id: 'master', label: 'Master Data', icon: Database, desc: 'Nasabah, Barang, Koperasi' },
  { id: 'pengumuman', label: 'Pengumuman & Tagihan', icon: Megaphone, desc: 'Blast email & tagihan pinjaman' },
]

export function AdminPanel({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [section, setSection] = useState<Section>('dashboard')
  const [dashboardType, setDashboardType] = useState<DashboardType>('bank-sampah')
  const [showDashboardChooser, setShowDashboardChooser] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [actingUserId, setActingUserId] = useState<string>('')
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  useEffect(() => {
    api.nasabah.list('', '').then((u) => {
      setUsers(u)
      const admin = u.find((x) => x.email === user.email) || u.find((x) => x.roles?.includes('admin'))
      if (admin) { setActingUserId(admin.id); setActingUser(admin.id) }
    }).catch(() => {})
  }, [user.email])

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
          <div className="ml-auto flex items-center gap-3">
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
          'fixed inset-y-0 left-0 top-16 z-30 w-72 transform border-r border-emerald-200/60 bg-white transition-transform duration-200 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          <nav className="flex h-full flex-col gap-1 overflow-y-auto p-3">
            <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-600/70">Menu Utama</p>
            {NAV.map((item) => {
              const Icon = item.icon
              const active = section === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={cn(
                    'group flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all',
                    active
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm'
                      : 'text-emerald-900 hover:bg-emerald-50'
                  )}
                >
                  <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', active ? 'text-white' : 'text-emerald-600')} />
                  <div className="flex-1 leading-tight">
                    <p className={cn('text-sm font-semibold', active ? 'text-white' : 'text-emerald-900')}>{item.label}</p>
                    <p className={cn('text-[11px]', active ? 'text-emerald-50/90' : 'text-emerald-700/60')}>
                      {item.id === 'dashboard' && dashboardType ? dashboardDesc : item.desc}
                    </p>
                  </div>
                  {item.id === 'dashboard' && dashboardType && (
                    <span className={cn('mt-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase', active ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700')}>
                      {dashboardType === 'bank-sampah' ? 'BS' : dashboardType === 'koperasi' ? 'KOP' : 'PROD'}
                    </span>
                  )}
                </button>
              )
            })}
            <div className="mt-auto rounded-xl border border-emerald-200/60 bg-emerald-50/60 p-3">
              <p className="text-[11px] font-medium text-emerald-800">💡 Tips</p>
              <p className="mt-1 text-[11px] leading-relaxed text-emerald-700/80">
                Klik <b>Dashboard</b> untuk beralih antara <b>Bank Sampah</b>, <b>Koperasi</b>, dan <b>Penjualan Produk</b>. Gunakan <b>Teller Wizard</b> untuk layanan satu pintu.
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
// PengumumanTagihanView — Blast Pengumuman + Tagihan Pinjaman
// ============================================================
function PengumumanTagihanView() {
  const [tab, setTab] = useState<'pengumuman' | 'tagihan'>('pengumuman')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
          <Megaphone className="size-5 text-emerald-600" /> Pengumuman & Tagihan
        </h1>
        <p className="text-xs text-zinc-500 mt-1">Kirim pengumuman massal & tagihan pinjaman ke email nasabah/anggota</p>
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
      </div>

      {tab === 'pengumuman' ? <PengumumanBlastForm /> : <TagihanPinjamanView />}
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
  const [filter, setFilter] = useState<'all' | 'terlambat' | 'jatuh_tempo'>('all')
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
    if (!confirm('Kirim tagihan ke SEMUA anggota dengan pinjaman berjalan?')) return
    setSending('all')
    try {
      const res = await fetch('/api/koperasi/tagihan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagihSemua: true }),
      })
      const d = await res.json()
      if (d.success) {
        alert(`✅ Terkirim: ${d.sentCount} email | Gagal: ${d.failedCount}`)
      }
    } catch (e: any) {
      alert('Gagal: ' + e.message)
    } finally {
      setSending(null)
    }
  }

  if (loading) return <div className="py-10 text-center"><Loader2 className="size-6 mx-auto animate-spin text-emerald-600" /></div>

  const pinjamans = data?.pinjamans || []
  const summary = data?.summary || { total: 0, terlambat: 0, mendekati: 0, normal: 0 }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="bg-gradient-to-br from-zinc-50 to-zinc-100 border-zinc-200">
          <CardContent className="p-4">
            <p className="text-[10px] text-zinc-600 font-medium">Total Pinjaman Aktif</p>
            <p className="mt-1 text-xl font-bold text-zinc-700">{summary.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-50 to-red-50 border-rose-200">
          <CardContent className="p-4">
            <p className="text-[10px] text-rose-700 font-medium">Terlambat</p>
            <p className="mt-1 text-xl font-bold text-rose-700">{summary.terlambat}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
          <CardContent className="p-4">
            <p className="text-[10px] text-amber-700 font-medium">Jatuh Tempo ≤7 hari</p>
            <p className="mt-1 text-xl font-bold text-amber-700">{summary.mendekati}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardContent className="p-4">
            <p className="text-[10px] text-emerald-700 font-medium">Normal</p>
            <p className="mt-1 text-xl font-bold text-emerald-700">{summary.normal}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Tagih Semua */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-zinc-700">Filter:</span>
        {([
          { v: 'all', l: 'Semua' },
          { v: 'terlambat', l: 'Terlambat' },
          { v: 'jatuh_tempo', l: 'Jatuh Tempo' },
        ] as const).map((f) => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${filter === f.v ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
          >
            {f.l}
          </button>
        ))}
        <div className="ml-auto">
          <Button
            onClick={handleTagihSemua}
            disabled={sending === 'all' || pinjamans.length === 0}
            className="bg-rose-600 hover:bg-rose-700 text-white"
            size="sm"
          >
            {sending === 'all' ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Mail className="size-4 mr-2" />}
            Tagih Semua
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="border-zinc-200">
        <CardContent className="p-0">
          {pinjamans.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-400">
              <HandCoins className="size-10 mx-auto mb-2 opacity-30" />
              Tidak ada pinjaman berjalan
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-zinc-600">No. Pinjaman</th>
                    <th className="text-left p-3 text-xs font-semibold text-zinc-600">Nama</th>
                    <th className="text-right p-3 text-xs font-semibold text-zinc-600">Angsuran/Bln</th>
                    <th className="text-center p-3 text-xs font-semibold text-zinc-600">Angsuran Ke</th>
                    <th className="text-left p-3 text-xs font-semibold text-zinc-600">Jatuh Tempo</th>
                    <th className="text-center p-3 text-xs font-semibold text-zinc-600">Status</th>
                    <th className="text-center p-3 text-xs font-semibold text-zinc-600">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pinjamans.map((p: any, i: number) => (
                    <tr key={i} className="border-b hover:bg-zinc-50">
                      <td className="p-3 font-mono text-xs text-zinc-700">{p.nomorPinjaman}</td>
                      <td className="p-3 text-xs text-zinc-700">{p.nama}</td>
                      <td className="p-3 text-right text-xs font-medium text-amber-700">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p.angsuranPerBulan)}</td>
                      <td className="p-3 text-center text-xs text-zinc-600">{p.angsuranKe}/{p.tenorBulan}</td>
                      <td className="p-3 text-xs text-zinc-700">{new Date(p.jatuhTempo).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          p.status === 'terlambat' ? 'bg-rose-100 text-rose-700'
                          : p.status === 'mendekati' ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {p.statusLabel}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          onClick={() => handleTagih(p.id)}
                          disabled={sending === p.id}
                          size="sm"
                          className={`h-7 text-[10px] ${
                            p.status === 'terlambat' ? 'bg-rose-600 hover:bg-rose-700 text-white'
                            : p.status === 'mendekati' ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {sending === p.id ? <Loader2 className="size-3 animate-spin" /> : <Mail className="size-3" />}
                          Tagih
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
