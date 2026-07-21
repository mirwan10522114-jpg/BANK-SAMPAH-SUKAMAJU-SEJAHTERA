'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Recycle, LayoutDashboard, Wallet, Scale, ArrowDownToLine, Award,
  PiggyBank, HandCoins, Settings, LogOut, Phone, Calendar, MapPin, Menu, X,
  FileText, CreditCard, CheckCircle2, XCircle, Clock, AlertTriangle,
  Landmark, ShieldCheck, ShieldX, UserCircle, Info,
  HeartHandshake, Bell, BellRing, CalendarClock, CalendarDays, ChevronLeft, Loader2, Filter,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { formatRupiah, formatNumber, formatDate, formatDateTime, toNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts'
import type { AuthUser } from '@/lib/auth'
import { NotificationBell } from '@/components/modules/notification-bell'

type NotificationItem = {
  type: 'warning' | 'danger'
  title: string
  message: string
  icon: typeof Bell
}

const PIE_COLORS = ['#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1']

type View = 'dashboard' | 'saldo' | 'nabung' | 'sedekah' | 'pencairan' | 'poin' | 'simpanan' | 'pinjaman' | 'ajukan_pinjaman' | 'bayar_angsuran'

export function UserDashboard({ user, onLogout, onSettings }: { user: AuthUser; onLogout: () => void; onSettings: () => void }) {
  const [view, setView] = useState<View>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [trenRange, setTrenRange] = useState('6bul')
  const [chartDari, setChartDari] = useState('')
  const [chartSampai, setChartSampai] = useState('')
  const reqId = useRef(0)

  useEffect(() => {
    if (!user?.id) return
    const myId = ++reqId.current
    Promise.resolve().then(() => setLoading(true))
    api.personalDashboard(user.id, {
      chartRange: trenRange,
      chartDari: trenRange === 'custom' ? chartDari : undefined,
      chartSampai: trenRange === 'custom' ? chartSampai : undefined,
    })
      .then((res) => { if (myId === reqId.current) { setData(res); setLoading(false) } })
      .catch((e) => { if (myId === reqId.current) { toast.error('Gagal memuat data: ' + e.message); setLoading(false) } })
    return () => { reqId.current++ }
  }, [user?.id, trenRange, chartDari, chartSampai])

  const navItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard, section: 'main' },
    { id: 'saldo' as View, label: 'Saldo', icon: Wallet, section: 'account' },
    { id: 'nabung' as View, label: 'Transaksi Nabung', icon: Scale, section: 'account' },
    { id: 'sedekah' as View, label: 'Sedekah Saya', icon: HeartHandshake, section: 'account' },
    { id: 'pencairan' as View, label: 'Pencairan', icon: ArrowDownToLine, section: 'account' },
    { id: 'poin' as View, label: 'Histori Poin', icon: Award, section: 'account' },
  ]
  const koperasiItems = [
    { id: 'simpanan' as View, label: 'Simpanan Saya', icon: PiggyBank, section: 'koperasi' },
    { id: 'pinjaman' as View, label: 'Pinjaman Saya', icon: HandCoins, section: 'koperasi' },
    { id: 'ajukan_pinjaman' as View, label: 'Cek Kelayakan Pinjaman', icon: FileText, section: 'koperasi' },
    { id: 'bayar_angsuran' as View, label: 'Info Angsuran', icon: CreditCard, section: 'koperasi' },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5dc]/40">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-emerald-900/20 bg-[#2d5016] text-white">
        <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden text-white" onClick={() => setSidebarOpen((s) => !s)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2.5">
            <img
              src="/logo-bank-sampah.png"
              alt="Logo Bank Sampah"
              className="h-9 w-9 rounded-full object-cover"
            />
            <div className="leading-tight">
              <h1 className="text-sm font-bold sm:text-base">Bank Sampah</h1>
              <p className="hidden text-[10px] text-emerald-100/70 sm:block">Portal Nasabah</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell userId={user.id} />
            <span className="hidden text-sm font-medium text-white/90 sm:block">{user.name}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-sm font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className={cn(
          'fixed inset-y-0 left-0 top-16 z-30 w-60 transform bg-[#2d5016] text-white transition-transform duration-200 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          <nav className="flex h-full flex-col gap-1 overflow-y-auto p-3">
            <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-100/50">Menu Utama</p>
            {navItems.filter(n => n.section === 'main').map((item) => <NavButton key={item.id} item={item} view={view} setView={setView} setSidebarOpen={setSidebarOpen} />)}
            <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-emerald-100/50">Akun Saya</p>
            {navItems.filter(n => n.section === 'account').map((item) => <NavButton key={item.id} item={item} view={view} setView={setView} setSidebarOpen={setSidebarOpen} />)}
            {user.roles.includes('koperasi') && (
              <>
                <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-emerald-100/50">Koperasi Saya</p>
                {koperasiItems.map((item) => <NavButton key={item.id} item={item} view={view} setView={setView} setSidebarOpen={setSidebarOpen} />)}
              </>
            )}
          </nav>
        </aside>

        {sidebarOpen && <div className="fixed inset-0 top-16 z-20 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* Main content */}
        <main className="flex-1 overflow-x-hidden">
          <div className="p-4 lg:p-8">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full rounded-2xl" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
                <Skeleton className="h-64 rounded-xl" />
              </div>
            ) : data ? (
              <>
                {view === 'dashboard' && <DashboardView data={data} user={user} trenRange={trenRange} setTrenRange={setTrenRange} chartDari={chartDari} setChartDari={setChartDari} chartSampai={chartSampai} setChartSampai={setChartSampai} />}
                {view === 'saldo' && <SaldoView data={data} />}
                {view === 'nabung' && <NabungView data={data} />}
                {view === 'sedekah' && <SedekahView data={data} />}
                {view === 'pencairan' && <PencairanView data={data} />}
                {view === 'poin' && <PoinView data={data} />}
                {view === 'simpanan' && <SimpananView user={user} />}
                {view === 'pinjaman' && <PinjamanView user={user} />}
                {view === 'ajukan_pinjaman' && <AjukanPinjamanView data={data} user={user} />}
                {view === 'bayar_angsuran' && <BayarAngsuranView user={user} />}
              </>
            ) : null}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-emerald-900/20 bg-[#2d5016] py-3 text-white">
        <div className="flex flex-col items-center justify-between gap-2 px-4 text-xs sm:flex-row lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-xs font-bold">{user.name.charAt(0).toUpperCase()}</div>
            <div className="leading-tight">
              <p className="font-medium">{user.name}</p>
              <p className="text-[10px] text-emerald-100/60">{user.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onSettings} className="text-xs text-white hover:bg-white/10">
              <Settings className="mr-1.5 h-3.5 w-3.5" /> Pengaturan
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout} className="text-xs text-white hover:bg-white/10">
              <LogOut className="mr-1.5 h-3.5 w-3.5" /> Keluar
            </Button>
          </div>
        </div>
      </footer>
    </div>
  )
}

function NavButton({ item, view, setView, setSidebarOpen }: { item: any; view: View; setView: (v: View) => void; setSidebarOpen: (o: boolean) => void }) {
  const Icon = item.icon
  const active = view === item.id
  return (
    <button
      onClick={() => { setView(item.id); setSidebarOpen(false) }}
      className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition', active ? 'bg-white/15 font-semibold text-white' : 'text-emerald-100/70 hover:bg-white/10')}
    >
      <Icon className="h-4 w-4" /> {item.label}
    </button>
  )
}

// ============================================================
// Notification Banner (used in DashboardView)
// ============================================================
function NotificationBanner({ type, title, message, icon: Icon }: NotificationItem) {
  const isDanger = type === 'danger'
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4 shadow-sm',
        isDanger
          ? 'border-red-200 bg-red-50'
          : 'border-amber-200 bg-amber-50',
      )}
    >
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
        isDanger ? 'bg-red-100' : 'bg-amber-100',
      )}>
        <Icon className={cn('h-4 w-4', isDanger ? 'text-red-600' : 'text-amber-600')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold', isDanger ? 'text-red-900' : 'text-amber-900')}>{title}</p>
        <p className={cn('mt-0.5 text-xs', isDanger ? 'text-red-700/80' : 'text-amber-700/80')}>{message}</p>
      </div>
    </div>
  )
}

// Helper: format "in Y days" or "Y hari yang lalu" for the due date
function relativeDaysLabel(days: number): string {
  if (days === 0) return 'hari ini'
  if (days > 0) return `dalam ${days} hari`
  return `${Math.abs(days)} hari yang lalu`
}

// ============================================================
// Dashboard View (main overview)
// ============================================================
function DashboardView({ data, user, trenRange, setTrenRange, chartDari, setChartDari, chartSampai, setChartSampai }: {
  data: any
  user: AuthUser
  trenRange: string
  setTrenRange: (r: string) => void
  chartDari: string
  setChartDari: (v: string) => void
  chartSampai: string
  setChartSampai: (v: string) => void
}) {
  const { profile, saldo, trenTabungan, komposisiKategori, riwayat, koperasiInfo } = data
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  // Fetch active pinjaman + last simpanan wajib setor to compute due-date notifications
  useEffect(() => {
    if (!koperasiInfo?.anggotaId) return
    let cancelled = false
    const anggotaId = koperasiInfo.anggotaId
    Promise.all([
      api.koperasi.pinjamanList(anggotaId, 'berjalan').catch(() => []),
      api.koperasi.simpananList(anggotaId, { jenisSimpanan: 'wajib', tipe: 'setor' }).catch(() => []),
    ]).then(([loans, wajibTx]) => {
      if (cancelled) return
      const notifs: NotificationItem[] = []

      // --- Angsuran due-date notifications ---
      for (const loan of loans || []) {
        const tglCair = loan.tanggalPencairan ? new Date(loan.tanggalPencairan) : null
        if (!tglCair) continue
        const sudahBayar = Array.isArray(loan.angsurans) ? loan.angsurans.length : 0
        const nextAngsuranKe = sudahBayar + 1
        if (nextAngsuranKe > loan.tenorBulan) continue // already paid off
        const dueDate = new Date(tglCair)
        dueDate.setMonth(dueDate.getMonth() + nextAngsuranKe)
        const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        const dueStr = formatDate(dueDate.toISOString())
        if (daysUntilDue <= 0) {
          notifs.push({
            type: 'danger',
            title: `Angsuran ke-${nextAngsuranKe} SUDAH LEWAT jatuh tempo`,
            message: `Jatuh tempo ${dueStr} (${relativeDaysLabel(daysUntilDue)}). Segera bayar ${formatRupiah(loan.angsuranPerBulan)} untuk menghindari denda. Pembayaran dilakukan melalui admin/teller.`,
            icon: BellRing,
          })
        } else if (daysUntilDue <= 7) {
          notifs.push({
            type: 'warning',
            title: `Angsuran ke-${nextAngsuranKe} jatuh tempo ${relativeDaysLabel(daysUntilDue)}`,
            message: `Jatuh tempo ${dueStr}. Bayar ${formatRupiah(loan.angsuranPerBulan)} sebelum jatuh tempo melalui admin/teller.`,
            icon: CalendarClock,
          })
        }
      }

      // --- Simpanan Wajib due-date notification ---
      // Due date = last payment date + 1 month. Show warning if H-7 or overdue.
      const lastWajib = (wajibTx || [])[0]
      if (lastWajib?.tanggalTransaksi) {
        const lastPaid = new Date(lastWajib.tanggalTransaksi)
        const nextDue = new Date(lastPaid)
        nextDue.setMonth(nextDue.getMonth() + 1)
        const daysUntilDue = Math.ceil((nextDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        const dueStr = formatDate(nextDue.toISOString())
        if (daysUntilDue <= 0) {
          notifs.push({
            type: 'danger',
            title: 'Setoran Simpanan Wajib SUDAH LEWAT jatuh tempo',
            message: `Seharusnya dibayar ${dueStr} (${relativeDaysLabel(daysUntilDue)}). Segera setor simpanan wajib melalui admin/teller.`,
            icon: BellRing,
          })
        } else if (daysUntilDue <= 7) {
          notifs.push({
            type: 'warning',
            title: `Setoran Simpanan Wajib jatuh tempo ${relativeDaysLabel(daysUntilDue)}`,
            message: `Jatuh tempo ${dueStr}. Setor simpanan wajib melalui admin/teller sebelum jatuh tempo.`,
            icon: CalendarClock,
          })
        }
      }
      setNotifications(notifs)
    })
    return () => { cancelled = true }
  }, [koperasiInfo?.anggotaId])

  const statCards = [
    { label: 'Saldo Tersedia', value: formatRupiah(saldo.saldoTersedia), color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Poin Saat Ini', value: `${formatNumber(saldo.poin, 0)} pt`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Ditabung', value: `${formatNumber(saldo.totalDitabung, 1)} kg`, color: 'text-zinc-900', bg: 'bg-zinc-100' },
  ]
  // trenTabungan now comes from the API filtered by the selected range (no client-side slicing)
  const trenFiltered = trenTabungan
  const trenRangeOptions = [
    { value: '1bul', label: '1 Bulan' },
    { value: '3bul', label: '3 Bulan' },
    { value: '6bul', label: '6 Bulan' },
    { value: '1thn', label: '1 Tahun' },
    { value: 'custom', label: 'Custom' },
  ]
  const totalKoperasiSimpanan = (koperasiInfo?.simpananSaldos || []).reduce((s: number, item: any) => s + toNumber(item.saldo), 0)

  return (
    <div className="space-y-5">
      {/* Notifications (jatuh tempo angsuran & simpanan wajib) */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((n, i) => <NotificationBanner key={i} {...n} />)}
        </div>
      )}

      {/* Profile */}
      <Card className="overflow-hidden border-0 bg-white shadow-sm ring-1 ring-zinc-100">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-lg font-bold text-white">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-zinc-900">{profile.name}</h2>
                  <Badge className="border-emerald-200 bg-emerald-100 text-[10px] font-semibold uppercase text-emerald-700">Aktif</Badge>
                  {profile.memberCode && <Badge variant="outline" className="border-emerald-200 bg-white text-xs font-mono text-emerald-700">{profile.memberCode}</Badge>}
                  {koperasiInfo?.nomorAnggota && <Badge variant="outline" className="border-teal-200 bg-teal-50 text-xs font-mono text-teal-700">{koperasiInfo.nomorAnggota}</Badge>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                  {profile.nik && <span className="flex items-center gap-1">NIK: {profile.nik}</span>}
                  {profile.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {profile.phone}</span>}
                  {profile.memberJoinedAt && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Bergabung {formatDate(profile.memberJoinedAt)}</span>}
                  {profile.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {profile.address}</span>}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {statCards.map((c) => (
          <div key={c.label} className="rounded-xl border border-zinc-100 bg-white p-3 shadow-sm sm:p-4">
            <div className={cn('mb-2 flex h-7 w-7 items-center justify-center rounded-lg', c.bg)}>
              <Wallet className={cn('h-4 w-4', c.color)} />
            </div>
            <p className={cn('text-base sm:text-xl font-bold', c.color)}>{c.value}</p>
            <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-0 bg-white p-4 shadow-sm ring-1 ring-zinc-100 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Tren Tabungan</h3>
              <p className="text-[11px] text-zinc-500">Berat sampah (kg) per bulan
                {trenRange === 'custom' && chartDari && chartSampai ? ` · ${chartDari} s/d ${chartSampai}` : trenRange !== 'custom' ? ` · ${trenRangeOptions.find((o) => o.value === trenRange)?.label}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {trenRangeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTrenRange(opt.value)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] font-medium transition',
                    trenRange === opt.value ? 'bg-emerald-500 text-white shadow-sm' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {/* Custom date range inputs */}
          {trenRange === 'custom' && (
            <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg bg-zinc-50 p-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Dari</label>
                <Input type="date" value={chartDari} onChange={(e) => setChartDari(e.target.value)} className="h-9 w-40 border-zinc-200 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Sampai</label>
                <Input type="date" value={chartSampai} onChange={(e) => setChartSampai(e.target.value)} className="h-9 w-40 border-zinc-200 text-sm" />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-amber-600">
                <Filter className="h-3 w-3" />
                <span>Filter diterapkan otomatis</span>
              </div>
            </div>
          )}
          <div className="h-56 w-full">
            {trenFiltered.every((t: any) => t.berat === 0) ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Scale className="h-8 w-8 text-zinc-300" />
                <p className="mt-2 text-xs text-zinc-400">Belum ada data tabungan untuk ditampilkan.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trenFiltered} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} formatter={(v: any) => [`${formatNumber(v, 2)} kg`, 'Berat']} />
                  <Line type="monotone" dataKey="berat" stroke="#4caf50" strokeWidth={2.5} dot={{ r: 4, fill: '#4caf50' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="border-0 bg-white p-4 shadow-sm ring-1 ring-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-900">Total Sampah per Kategori</h3>
          <p className="text-[11px] text-zinc-500">
            Kilogram per kategori
            {trenRange === 'custom' && chartDari && chartSampai ? ` · ${chartDari} s/d ${chartSampai}` : trenRange !== 'custom' ? ` · ${trenRangeOptions.find((o) => o.value === trenRange)?.label}` : ''}
          </p>
          {komposisiKategori.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center"><Scale className="h-8 w-8 text-zinc-300" /><p className="mt-2 text-xs text-zinc-400">Belum ada data.</p></div>
          ) : (
            <div className="mt-3 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={komposisiKategori} layout="vertical" margin={{ left: 20, right: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} formatter={(v: any) => [`${formatNumber(v, 2)} kg`, 'Berat']} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>{komposisiKategori.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Recent transactions */}
      <Card className="border-0 bg-white p-4 shadow-sm ring-1 ring-zinc-100">
        <h3 className="mb-3 text-sm font-semibold text-zinc-900">Transaksi Terakhir</h3>
        <SimpleTable headers={['Tanggal', 'Barang', 'Berat', 'Nilai']} rows={riwayat.tabungan.slice(0, 5).map((r: any) => [formatDate(r.tanggal), r.barang, `${formatNumber(r.berat, 2)} kg`, formatRupiah(r.nilai)])} emptyMsg="Belum ada transaksi." />
      </Card>

      {/* Koperasi summary section */}
      {koperasiInfo && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-teal-600" />
            <h2 className="text-base font-bold text-zinc-900">Dashboard Koperasi</h2>
          </div>

          {/* Koperasi stat cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-500">Simpanan Pokok</p>
              <p className="mt-1 text-lg font-bold text-teal-800">{formatRupiah(koperasiInfo.simpananSaldos?.find((s: any) => s.jenisSimpanan === 'pokok')?.saldo || 0)}</p>
            </div>
            <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-500">Simpanan Wajib</p>
              <p className="mt-1 text-lg font-bold text-teal-800">{formatRupiah(koperasiInfo.simpananSaldos?.find((s: any) => s.jenisSimpanan === 'wajib')?.saldo || 0)}</p>
            </div>
            <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-500">Simpanan Sukarela</p>
              <p className="mt-1 text-lg font-bold text-teal-800">{formatRupiah(koperasiInfo.simpananSaldos?.find((s: any) => s.jenisSimpanan === 'sukarela')?.saldo || 0)}</p>
            </div>
            <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-500">Total Simpanan</p>
              <p className="mt-1 text-lg font-bold text-teal-800">{formatRupiah(totalKoperasiSimpanan)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Saldo View
// ============================================================
function SaldoView({ data }: { data: any }) {
  const { saldo } = data
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-zinc-900">Saldo Saya</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-0 bg-white p-5 shadow-sm ring-1 ring-zinc-100">
          <p className="text-xs text-zinc-500">Saldo Tersedia</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{formatRupiah(saldo.saldoTersedia)}</p>
          <p className="mt-1 text-[11px] text-zinc-400">Siap ditarik kapan saja</p>
        </Card>
        <Card className="border-0 bg-white p-5 shadow-sm ring-1 ring-zinc-100">
          <p className="text-xs text-zinc-500">Poin Saat Ini</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{formatNumber(saldo.poin, 0)} pt</p>
          <p className="mt-1 text-[11px] text-zinc-400">Dapat ditukarkan dengan produk</p>
        </Card>
      </div>
    </div>
  )
}

// ============================================================
// Nabung View
// ============================================================
function NabungView({ data }: { data: any }) {
  const rows = data.riwayat.tabungan
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-zinc-900">Transaksi Nabung Sampah</h2>
      <Card className="border-0 bg-white p-4 shadow-sm ring-1 ring-zinc-100">
        <SimpleTable headers={['Tanggal', 'Barang', 'Berat', 'Nilai']} rows={rows.map((r: any) => [formatDate(r.tanggal), r.barang, `${formatNumber(r.berat, 2)} kg`, formatRupiah(r.nilai)])} emptyMsg="Belum ada riwayat tabungan." />
      </Card>
    </div>
  )
}

// ============================================================
// Sedekah View
// ============================================================
function qcBadgeClass(status: string) {
  switch (status) {
    case 'passed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'adjusted':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'pending':
    default:
      return 'border-zinc-200 bg-zinc-50 text-zinc-600'
  }
}

function qcLabel(status: string) {
  switch (status) {
    case 'passed':
      return 'Lulus QC'
    case 'adjusted':
      return 'Disesuaikan'
    case 'pending':
    default:
      return 'Menunggu QC'
  }
}

function SedekahView({ data }: { data: any }) {
  const rows: any[] = data.riwayat.sedekah || []
  // Aggregate totals across items
  const totalBeratKotor = rows.reduce((s, r) => s + toNumber(r.beratKotor), 0)
  const totalBeratBersih = rows.reduce((s, r) => s + toNumber(r.beratBersih), 0)
  const totalSusut = totalBeratKotor - totalBeratBersih
  // Approximate distinct transactions by distinct tanggal+barang signature
  const totalTransaksi = new Set(rows.map((r) => String(r.tanggal))).size

  const summaryCards = [
    { label: 'Total Berat Kotor', value: `${formatNumber(totalBeratKotor, 2)} kg`, color: 'text-zinc-900', bg: 'bg-zinc-100' },
    { label: 'Total Berat Bersih', value: `${formatNumber(totalBeratBersih, 2)} kg`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Susut', value: `${formatNumber(totalSusut, 2)} kg`, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Jumlah Item', value: `${rows.length}`, color: 'text-teal-700', bg: 'bg-teal-50' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <HeartHandshake className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-bold text-zinc-900">Sedekah Saya</h2>
      </div>

      {rows.length === 0 ? (
        <Card className="border-0 bg-white p-8 shadow-sm ring-1 ring-zinc-100">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <HeartHandshake className="h-12 w-12 text-zinc-300" />
            <p className="mt-3 text-sm font-medium text-zinc-600">Belum ada riwayat sedekah</p>
            <p className="mt-1 text-xs text-zinc-400">Sedekah sampah Anda akan tampil di sini setelah diproses oleh teller.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {summaryCards.map((c) => (
              <div key={c.label} className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
                <div className={cn('mb-2 flex h-7 w-7 items-center justify-center rounded-lg', c.bg)}>
                  <HeartHandshake className={cn('h-4 w-4', c.color)} />
                </div>
                <p className={cn('text-lg font-bold', c.color)}>{c.value}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{c.label}</p>
              </div>
            ))}
          </div>

          <Card className="border-0 bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <h3 className="mb-3 text-sm font-semibold text-zinc-900">Riwayat Sedekah Sampah</h3>
            <SimpleTable
              headers={['Tanggal', 'Kategori', 'Barang', 'Berat Kotor', 'Berat Bersih', 'Susut', 'QC Status']}
              rows={rows.map((r: any) => [
                formatDate(r.tanggal),
                r.kategori,
                r.barang,
                `${formatNumber(r.beratKotor, 2)} kg`,
                `${formatNumber(r.beratBersih, 2)} kg`,
                `${formatNumber(r.susut, 2)} kg`,
                <Badge key="qc" variant="outline" className={cn('text-[10px]', qcBadgeClass(r.qcStatus))}>{qcLabel(r.qcStatus)}</Badge>,
              ])}
              emptyMsg="Belum ada riwayat sedekah."
            />
          </Card>
          <p className="text-[11px] text-zinc-400">
            * Total berat dihitung dari item-level. {totalTransaksi > 0 ? `Tersebar di ${totalTransaksi} transaksi sedekah.` : ''}
          </p>
        </>
      )}
    </div>
  )
}

// ============================================================
// Pencairan View
// ============================================================
function PencairanView({ data }: { data: any }) {
  const rows = data.riwayat.penukaran
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-zinc-900">Riwayat Pencairan</h2>
      <Card className="border-0 bg-white p-4 shadow-sm ring-1 ring-zinc-100">
        <SimpleTable headers={['Tanggal', 'Produk', 'Qty', 'Poin Dipakai']} rows={rows.map((r: any) => [formatDate(r.tanggal), r.produk, formatNumber(toNumber(r.qty), 0), `${r.poin} pt`])} emptyMsg="Belum ada riwayat pencairan." />
      </Card>
    </div>
  )
}

// ============================================================
// Poin View
// ============================================================
function PoinView({ data }: { data: any }) {
  const rows = data.riwayat.poin
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-zinc-900">Histori Poin</h2>
      <Card className="border-0 bg-white p-4 shadow-sm ring-1 ring-zinc-100">
        <SimpleTable headers={['Tanggal', 'Tipe', 'Poin', 'Saldo', 'Deskripsi']} rows={rows.map((r: any) => [formatDate(r.tanggal), r.tipe, `${r.poin > 0 ? '+' : ''}${r.poin}`, formatNumber(r.saldo, 0), r.deskripsi])} emptyMsg="Belum ada histori poin." />
      </Card>
    </div>
  )
}

// ============================================================
// Simpanan View (koperasi)
// ============================================================
function SimpananView({ user }: { user: AuthUser }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  // Card → detail view state
  const [selectedJenis, setSelectedJenis] = useState<string | null>(null)

  useEffect(() => {
    if (!user.anggotaId) return
    api.personalDashboardKoperasi(user.anggotaId)
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user.anggotaId])

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />
  if (!data) return <p className="text-sm text-zinc-500">Data koperasi tidak tersedia.</p>

  const cards = [
    { jenis: 'pokok', label: 'Simpanan Pokok', saldo: data.simpanan.pokok, color: 'text-zinc-900' },
    { jenis: 'wajib', label: 'Simpanan Wajib', saldo: data.simpanan.wajib, color: 'text-zinc-900' },
    { jenis: 'sukarela', label: 'Simpanan Sukarela', saldo: data.simpanan.sukarela, color: 'text-emerald-600' },
  ] as const

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-zinc-900">Simpanan Saya</h2>
        {selectedJenis && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedJenis(null)}
            className="h-9 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Kembali
          </Button>
        )}
      </div>

      {!selectedJenis ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {cards.map((c) => (
              <button
                key={c.jenis}
                type="button"
                onClick={() => setSelectedJenis(c.jenis)}
                className="group block w-full cursor-pointer rounded-xl text-left transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <Card className="border-0 bg-white p-5 shadow-sm ring-1 ring-zinc-100 transition group-hover:ring-emerald-200">
                  <div className="flex items-start justify-between">
                    <p className="text-xs text-zinc-500">{c.label}</p>
                    <PiggyBank className="h-4 w-4 text-zinc-300 transition group-hover:text-emerald-500" />
                  </div>
                  <p className={cn('mt-1 text-xl font-bold', c.color)}>{formatRupiah(c.saldo)}</p>
                  <p className="mt-2 text-[11px] font-medium text-emerald-600/80 opacity-0 transition group-hover:opacity-100">
                    Klik untuk detail transaksi
                  </p>
                </Card>
              </button>
            ))}
          </div>
          <Card className="border-0 bg-emerald-50/60 p-5 ring-1 ring-emerald-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Total Kas Tersimpan</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">{formatRupiah(data.simpanan.totalKasTersimpan)}</p>
          </Card>
        </>
      ) : (
        <SimpananDetailView user={user} jenis={selectedJenis} label={cards.find((c) => c.jenis === selectedJenis)?.label || selectedJenis} />
      )}
    </div>
  )
}

// ============================================================
// Simpanan Detail View (filter + table of transactions per jenis)
// ============================================================
function SimpananDetailView({ user, jenis, label }: { user: AuthUser; jenis: string; label: string }) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Pending (input) state
  const [dariInput, setDariInput] = useState('')
  const [sampaiInput, setSampaiInput] = useState('')
  const [qInput, setQInput] = useState('')
  const [tipeFilter, setTipeFilter] = useState<string>('all') // 'all' | 'setor' | 'tarik'

  // Committed state (sent to API)
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [q, setQ] = useState('')

  const loadList = useCallback(async () => {
    if (!user.anggotaId) return
    setLoading(true)
    try {
      const res = await api.koperasi.simpananList(user.anggotaId, {
        jenisSimpanan: jenis,
        tipe: tipeFilter === 'all' ? '' : tipeFilter,
        dari,
        sampai,
        q,
      })
      setRows(Array.isArray(res) ? res : [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [user.anggotaId, jenis, tipeFilter, dari, sampai, q])

  useEffect(() => {
    loadList()
  }, [loadList])

  const applyFilters = () => {
    setDari(dariInput)
    setSampai(sampaiInput)
    setQ(qInput.trim())
  }

  const resetFilters = () => {
    setDariInput('')
    setSampaiInput('')
    setQInput('')
    setTipeFilter('all')
    setDari('')
    setSampai('')
    setQ('')
  }

  const totalSetor = rows.filter((r) => r.tipe === 'setor').reduce((s, r) => s + toNumber(r.jumlah), 0)
  const totalTarik = rows.filter((r) => r.tipe === 'tarik').reduce((s, r) => s + toNumber(r.jumlah), 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[11px] font-semibold uppercase text-emerald-700">
          {label}
        </Badge>
        <span className="text-xs text-zinc-400">·</span>
        <span className="text-xs text-zinc-500">{rows.length} transaksi</span>
        <span className="text-xs text-zinc-400">·</span>
        <span className="text-xs font-medium text-emerald-700">Setor {formatRupiah(totalSetor)}</span>
        {totalTarik > 0 && (
          <>
            <span className="text-xs text-zinc-400">·</span>
            <span className="text-xs font-medium text-red-600">Tarik {formatRupiah(totalTarik)}</span>
          </>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
        <div className="w-32">
          <Label className="text-xs text-zinc-500">Tipe</Label>
          <Select value={tipeFilter} onValueChange={setTipeFilter}>
            <SelectTrigger className="h-9 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="setor">Setor</SelectItem>
              <SelectItem value="tarik">Tarik</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-zinc-500">Dari</Label>
          <Input
            type="date"
            value={dariInput}
            onChange={(e) => setDariInput(e.target.value)}
            className="h-9 w-36 bg-white"
          />
        </div>
        <div>
          <Label className="text-xs text-zinc-500">Sampai</Label>
          <Input
            type="date"
            value={sampaiInput}
            onChange={(e) => setSampaiInput(e.target.value)}
            className="h-9 w-36 bg-white"
          />
        </div>
        <div className="w-44">
          <Label className="text-xs text-zinc-500">Cari No. Transaksi</Label>
          <Input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyFilters()
            }}
            placeholder="No. transaksi..."
            className="h-9 bg-white"
          />
        </div>
        <Button size="sm" onClick={applyFilters} className="h-9 bg-emerald-600 hover:bg-emerald-700">
          Terapkan
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={resetFilters}
          className="h-9 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          Reset
        </Button>
        {(dari || sampai || q || tipeFilter !== 'all') && (
          <div className="ml-auto text-xs text-emerald-800">
            Aktif: <span className="font-medium">{dari || '…'} — {sampai || '…'}</span>
            {tipeFilter !== 'all' && ` · ${tipeFilter}`}
            {q && ` · "${q}"`}
          </div>
        )}
      </div>

      {/* Table */}
      <Card className="border-0 bg-white p-0 shadow-sm ring-1 ring-zinc-100">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            Memuat transaksi...
          </div>
        ) : (
          <div className="max-h-[480px] overflow-auto rounded-lg border border-zinc-100">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-zinc-50/95 backdrop-blur">
                <TableRow>
                  <TableHead className="text-[10px] uppercase">Tanggal</TableHead>
                  <TableHead className="text-[10px] uppercase">Nomor Transaksi</TableHead>
                  <TableHead className="text-[10px] uppercase">Tipe</TableHead>
                  <TableHead className="text-[10px] uppercase text-right">Jumlah</TableHead>
                  <TableHead className="text-[10px] uppercase text-right">Saldo Setelah</TableHead>
                  <TableHead className="text-[10px] uppercase">Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-zinc-400">
                      Belum ada transaksi {label.toLowerCase()}.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{formatDateTime(r.tanggalTransaksi)}</TableCell>
                      <TableCell className="font-mono text-xs">{r.nomorTransaksi}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px]',
                            r.tipe === 'setor'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-red-200 bg-red-50 text-red-700',
                          )}
                        >
                          {r.tipe === 'setor' ? 'Setor' : 'Tarik'}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn('text-right text-xs font-medium', r.tipe === 'setor' ? 'text-emerald-700' : 'text-red-700')}>
                        {r.tipe === 'setor' ? '+' : '-'} {formatRupiah(r.jumlah)}
                      </TableCell>
                      <TableCell className="text-right text-xs">{formatRupiah(r.saldoSesudah)}</TableCell>
                      <TableCell className="text-xs text-zinc-500">{r.keterangan || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  )
}

// ============================================================
// Pinjaman View (koperasi)
// ============================================================
function PinjamanView({ user }: { user: AuthUser }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [schedulePinjaman, setSchedulePinjaman] = useState<any>(null)

  useEffect(() => {
    if (!user.anggotaId) return
    api.personalDashboardKoperasi(user.anggotaId)
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user.anggotaId])

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />
  if (!data) return <p className="text-sm text-zinc-500">Data koperasi tidak tersedia.</p>

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-zinc-900">Pinjaman Saya</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-0 bg-white p-5 shadow-sm ring-1 ring-zinc-100">
          <p className="text-xs text-zinc-500">Pinjaman Aktif</p>
          <p className="mt-1 text-xl font-bold text-zinc-900">{data.pinjaman.pinjamanAktifCount} Kontrak</p>
        </Card>
        <Card className="border-0 bg-white p-5 shadow-sm ring-1 ring-zinc-100">
          <p className="text-xs text-zinc-500">Sisa Hutang</p>
          <p className="mt-1 text-xl font-bold text-amber-600">{formatRupiah(data.pinjaman.akumulasiSisaHutang)}</p>
        </Card>
      </div>
      <Card className="border-0 bg-white p-4 shadow-sm ring-1 ring-zinc-100">
        <h3 className="mb-3 text-sm font-semibold text-zinc-900">Riwayat Kontrak Pinjaman</h3>
        {data.riwayatKontrak.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <HandCoins className="h-10 w-10 text-zinc-300" />
            <p className="mt-2 text-sm text-zinc-400">Belum pernah mengajukan pinjaman.</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-auto rounded-lg border border-zinc-100">
            <Table>
              <TableHeader className="sticky top-0 bg-zinc-50">
                <TableRow>
                  <TableHead className="text-[10px] uppercase">No</TableHead>
                  <TableHead className="text-[10px] uppercase">Tanggal</TableHead>
                  <TableHead className="text-[10px] uppercase">Jumlah</TableHead>
                  <TableHead className="text-[10px] uppercase">Tenor</TableHead>
                  <TableHead className="text-[10px] uppercase">Sisa</TableHead>
                  <TableHead className="text-[10px] uppercase">Status</TableHead>
                  <TableHead className="text-[10px] uppercase text-center">Jadwal Bayar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.riwayatKontrak.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.nomorPinjaman}</TableCell>
                    <TableCell className="text-xs">{formatDate(p.tanggalPengajuan)}</TableCell>
                    <TableCell className="text-xs font-medium">{formatRupiah(p.jumlahPinjaman)}</TableCell>
                    <TableCell className="text-xs">{p.tenorBulan} bln</TableCell>
                    <TableCell className="text-xs">{formatRupiah(p.sisaPinjaman)}</TableCell>
                    <TableCell><Badge variant="outline" className={cn('text-[10px]', p.status === 'lunas' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : p.status === 'berjalan' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-zinc-200 bg-zinc-50 text-zinc-600')}>{p.status}</Badge></TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 border-emerald-200 px-2 text-[10px] text-emerald-700 hover:bg-emerald-50"
                        onClick={() => setSchedulePinjaman(p)}
                      >
                        <CalendarDays className="h-3 w-3" />
                        Lihat
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Jadwal Bayar Dialog */}
      <JadwalBayarDialog pinjaman={schedulePinjaman} onClose={() => setSchedulePinjaman(null)} />
    </div>
  )
}

// ============================================================
// Jadwal Bayar Dialog (Payment Schedule for a Pinjaman)
// ============================================================
function JadwalBayarDialog({ pinjaman, onClose }: { pinjaman: any | null; onClose: () => void }) {
  if (!pinjaman) return null

  // Build the full schedule from tenor
  const tglCair = pinjaman.tanggalPencairan ? new Date(pinjaman.tanggalPencairan) : null
  const angsuranMap: Record<number, any> = {}
  for (const a of pinjaman.angsurans || []) {
    angsuranMap[a.angsuranKe] = a
  }

  const schedule: any[] = []
  for (let i = 1; i <= pinjaman.tenorBulan; i++) {
    const paid = angsuranMap[i]
    let dueDate: Date | null = null
    if (tglCair) {
      dueDate = new Date(tglCair)
      dueDate.setMonth(dueDate.getMonth() + i)
    }
    const now = new Date()
    const isOverdue = !paid && dueDate && dueDate < now
    schedule.push({
      angsuranKe: i,
      dueDate,
      jumlah: pinjaman.angsuranPerBulan,
      paid,
      isLunas: !!paid,
      isOverdue: !!isOverdue,
      isBelumBayar: !paid && !isOverdue,
    })
  }

  const totalLunas = schedule.filter((s) => s.isLunas).length
  const totalBelumBayar = schedule.filter((s) => s.isBelumBayar).length
  const totalOverdue = schedule.filter((s) => s.isOverdue).length

  return (
    <Dialog open={!!pinjaman} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-900">
            <CalendarDays className="h-5 w-5 text-emerald-600" />
            Jadwal Pembayaran Angsuran
          </DialogTitle>
          <DialogDescription>
            Kontrak <span className="font-mono font-semibold">{pinjaman.nomorPinjaman}</span> · Tenor {pinjaman.tenorBulan} bulan
          </DialogDescription>
        </DialogHeader>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
            <p className="text-[10px] font-medium uppercase text-emerald-700">Lunas</p>
            <p className="mt-0.5 text-lg font-bold text-emerald-700">{totalLunas}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
            <p className="text-[10px] font-medium uppercase text-amber-700">Belum Bayar</p>
            <p className="mt-0.5 text-lg font-bold text-amber-700">{totalBelumBayar}</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
            <p className="text-[10px] font-medium uppercase text-red-700">Lewat Tempo</p>
            <p className="mt-0.5 text-lg font-bold text-red-700">{totalOverdue}</p>
          </div>
        </div>

        {/* Loan info */}
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-xs sm:grid-cols-4">
          <div>
            <p className="text-zinc-500">Jumlah Pinjaman</p>
            <p className="font-semibold text-zinc-900">{formatRupiah(pinjaman.jumlahPinjaman)}</p>
          </div>
          <div>
            <p className="text-zinc-500">Angsuran/Bln</p>
            <p className="font-semibold text-zinc-900">{formatRupiah(pinjaman.angsuranPerBulan)}</p>
          </div>
          <div>
            <p className="text-zinc-500">Sisa Pinjaman</p>
            <p className="font-semibold text-amber-600">{formatRupiah(pinjaman.sisaPinjaman)}</p>
          </div>
          <div>
            <p className="text-zinc-500">Tgl Pencairan</p>
            <p className="font-semibold text-zinc-900">{pinjaman.tanggalPencairan ? formatDate(pinjaman.tanggalPencairan) : '-'}</p>
          </div>
        </div>

        {/* Schedule table */}
        <div className="max-h-[40vh] overflow-auto rounded-lg border border-zinc-100">
          <Table>
            <TableHeader className="sticky top-0 bg-zinc-50">
              <TableRow>
                <TableHead className="text-[10px] uppercase">Ke-</TableHead>
                <TableHead className="text-[10px] uppercase">Jatuh Tempo</TableHead>
                <TableHead className="text-[10px] uppercase">Jumlah</TableHead>
                <TableHead className="text-[10px] uppercase">Tgl Bayar</TableHead>
                <TableHead className="text-[10px] uppercase">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.map((s) => (
                <TableRow key={s.angsuranKe} className={cn(
                  s.isLunas ? 'bg-emerald-50/50' : s.isOverdue ? 'bg-red-50/50' : '',
                )}>
                  <TableCell className="text-xs font-semibold">{s.angsuranKe}</TableCell>
                  <TableCell className="text-xs">{s.dueDate ? formatDate(s.dueDate.toISOString()) : '-'}</TableCell>
                  <TableCell className="text-xs font-medium">{formatRupiah(s.jumlah)}</TableCell>
                  <TableCell className="text-xs">
                    {s.paid ? (
                      <span className="text-emerald-700">{formatDateTime(s.paid.tanggalBayar)}</span>
                    ) : (
                      <span className="text-zinc-400">-</span>
                    )}
                    {s.paid?.dendaBayar > 0 && (
                      <span className="ml-1 text-[10px] text-red-600">(denda {formatRupiah(s.paid.dendaBayar)})</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {s.isLunas ? (
                      <Badge className="bg-emerald-100 text-[9px] font-semibold text-emerald-700 hover:bg-emerald-100">
                        <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" /> Lunas
                      </Badge>
                    ) : s.isOverdue ? (
                      <Badge className="bg-red-100 text-[9px] font-semibold text-red-700 hover:bg-red-100">
                        <XCircle className="mr-0.5 h-2.5 w-2.5" /> Lewat Tempo
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-[9px] font-semibold text-amber-700 hover:bg-amber-100">
                        <Clock className="mr-0.5 h-2.5 w-2.5" /> Belum Bayar
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Progress Pembayaran</span>
            <span className="font-semibold text-zinc-900">{totalLunas}/{pinjaman.tenorBulan} angsuran ({Math.round((totalLunas / pinjaman.tenorBulan) * 100)}%)</span>
          </div>
          <Progress value={(totalLunas / pinjaman.tenorBulan) * 100} className="h-2" />
        </div>

        <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
          <Info className="mr-1 inline h-3 w-3" />
          Pembayaran angsuran dilakukan melalui admin/teller. Hubungi admin untuk pembayaran atau informasi lebih lanjut.
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Ajukan Pinjaman View (koperasi)
// ============================================================
function AjukanPinjamanView({ data, user }: { data: any; user: AuthUser }) {
  const koperasiInfo = data?.koperasiInfo
  const [eligibility, setEligibility] = useState<any>(null)
  const [loadingElig, setLoadingElig] = useState(true)
  const [perbaikanList, setPerbaikanList] = useState<any[]>([])

  useEffect(() => {
    if (!user?.anggotaId) return
    let cancelled = false
    api.koperasi.checkPinjamanEligibility(user.anggotaId)
      .then((res) => { if (!cancelled) { setEligibility(res); setLoadingElig(false) } })
      .catch(() => { if (!cancelled) setLoadingElig(false) })
    api.koperasi.perbaikanList(user.anggotaId, '')
      .then((res) => { if (!cancelled) setPerbaikanList(res || []) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user?.anggotaId])

  // Derive check results from flat API response
  const mm = eligibility?.memberMonths ?? 0
  const minBulan = eligibility?.minimalBulanAnggota ?? 3
  const memberPass = mm >= minBulan
  const checkMemberDuration = {
    pass: memberPass,
    detail: `Lama keanggotaan: ${mm} bulan (minimal ${minBulan} bulan)`,
  }

  const riwayat = eligibility?.riwayatPembayaran ?? 'baru'
  const terlambatCount = eligibility?.totalKeterlambatan ?? 0
  const checkPaymentHistory = {
    pass: riwayat === 'baik' || riwayat === 'baru',
    noHistory: riwayat === 'baru',
    detail: riwayat === 'baru' ? 'Belum ada riwayat pinjaman (peminjam pertama kali)' : riwayat === 'baik' ? 'Semua angsuran dibayar tepat waktu' : `${terlambatCount} kali terlambat bayar angsuran`,
    terlambatCount,
  }
  const checkNoActiveLoan = {
    pass: !eligibility?.adaPinjamanAktif,
    detail: eligibility?.adaPinjamanAktif ? 'Masih ada pinjaman yang sedang berjalan' : 'Tidak ada pinjaman aktif',
  }
  const isEligible = eligibility?.eligible ?? false

  const hasPaymentIssue = riwayat === 'buruk' || eligibility?.pinjamanDiblokir
  const hasPendingPerbaikan = perbaikanList.some((p: any) => p.status === 'menunggu')
  const approvedPerbaikan = perbaikanList.find((p: any) => p.status === 'disetujui')

  if (!koperasiInfo) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-zinc-900">Cek Kelayakan Pinjaman</h2>
        <Card className="border-0 bg-white p-8 shadow-sm ring-1 ring-zinc-100">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <XCircle className="h-12 w-12 text-zinc-300" />
            <p className="mt-3 text-sm font-medium text-zinc-600">Anda belum terdaftar sebagai anggota koperasi.</p>
            <p className="mt-1 text-xs text-zinc-400">Silakan hubungi admin untuk pendaftaran anggota koperasi.</p>
          </div>
        </Card>
      </div>
    )
  }

  if (loadingElig) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-zinc-900">Cek Kelayakan Pinjaman</h2>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  // Calculate progress toward minimum membership
  const memberProgress = minBulan > 0 ? Math.min(100, Math.round((mm / minBulan) * 100)) : 0
  const sisaBulan = Math.max(0, minBulan - mm)

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-zinc-900">Cek Kelayakan Pinjaman</h2>

      {/* ===== PROMINENT ELIGIBILITY STATUS BANNER ===== */}
      <div className={cn(
        'relative overflow-hidden rounded-2xl border-2 p-5',
        isEligible
          ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50'
          : hasPaymentIssue && !hasPendingPerbaikan && !approvedPerbaikan
            ? 'border-red-200 bg-gradient-to-br from-red-50 to-rose-50'
            : 'border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50'
      )}>
        {/* Decorative circle */}
        <div className={cn(
          'pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10',
          isEligible ? 'bg-emerald-500' : hasPaymentIssue ? 'bg-red-500' : 'bg-amber-500'
        )} />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          {/* Status icon + badge */}
          <div className="flex flex-col items-center gap-2 sm:min-w-[100px]">
            {isEligible ? (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-emerald-100/50">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
            ) : hasPaymentIssue && !hasPendingPerbaikan && !approvedPerbaikan ? (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 ring-4 ring-red-100/50">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 ring-4 ring-amber-100/50">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              </div>
            )}
            <Badge className={cn(
              'text-xs font-bold uppercase tracking-wider',
              isEligible
                ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
                : hasPaymentIssue && !hasPendingPerbaikan && !approvedPerbaikan
                  ? 'border-red-300 bg-red-100 text-red-700'
                  : 'border-amber-300 bg-amber-100 text-amber-700'
            )}>
              {isEligible ? '✓ LAYAK' : hasPaymentIssue && !hasPendingPerbaikan && !approvedPerbaikan ? '✗ TIDAK LAYAK' : '⚠ BELUM MEMENUHI SYARAT'}
            </Badge>
          </div>

          {/* Info content */}
          <div className="flex-1 space-y-3">
            <div>
              <p className={cn(
                'text-sm font-bold',
                isEligible ? 'text-emerald-800' : hasPaymentIssue && !hasPendingPerbaikan && !approvedPerbaikan ? 'text-red-800' : 'text-amber-800'
              )}>
                {isEligible
                  ? 'Selamat! Anda memenuhi semua syarat untuk mengajukan pinjaman.'
                  : hasPaymentIssue && !hasPendingPerbaikan && !approvedPerbaikan
                    ? 'Anda belum memenuhi syarat untuk mengajukan pinjaman.'
                    : 'Anda belum memenuhi semua syarat pinjaman.'
                }
              </p>
              {!isEligible && eligibility?.reasons?.length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {eligibility.reasons.map((r: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600">
                      <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-current" />
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Keanggotaan info row */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl bg-white/70 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-1.5">
                <UserCircle className="h-3.5 w-3.5 text-teal-600" />
                <span className="text-[11px] text-zinc-500">No. Anggota</span>
              </div>
              <span className="text-xs font-semibold text-zinc-800">{koperasiInfo?.nomorAnggota || '-'}</span>

              <div className="h-3 w-px bg-zinc-200" />

              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-teal-600" />
                <span className="text-[11px] text-zinc-500">Bergabung</span>
              </div>
              <span className="text-xs font-semibold text-zinc-800">
                {koperasiInfo?.tanggalBergabung ? formatDate(koperasiInfo.tanggalBergabung) : '-'}
              </span>

              <div className="h-3 w-px bg-zinc-200" />

              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-teal-600" />
                <span className="text-[11px] text-zinc-500">Lama Keanggotaan</span>
              </div>
              <span className={cn(
                'text-xs font-bold',
                memberPass ? 'text-emerald-700' : 'text-red-600'
              )}>
                {mm} bulan
              </span>
            </div>

            {/* Progress bar for membership duration */}
            {!memberPass && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">Progress keanggotaan ({minBulan} bulan minimum)</span>
                  <span className={cn('text-xs font-bold', memberProgress >= 100 ? 'text-emerald-600' : 'text-amber-600')}>
                    {memberProgress}%
                  </span>
                </div>
                <Progress value={memberProgress} className="h-2" />
                {sisaBulan > 0 && (
                  <p className="flex items-center gap-1 text-[11px] text-amber-600">
                    <Info className="h-3 w-3" />
                    Kurang <span className="font-bold">{sisaBulan} bulan</span> lagi untuk memenuhi syarat keanggotaan
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Requirements card */}
      <Card className="border-0 bg-white p-5 shadow-sm ring-1 ring-zinc-100">
        <h3 className="text-sm font-semibold text-zinc-900">Detail Syarat Pinjaman Koperasi</h3>
        <p className="mt-1 text-xs text-zinc-500">Cek detail kelengkapan syarat berikut</p>

        <div className="mt-4 space-y-3">
          {/* Check 1: Member 3 months */}
          <div className="flex items-start gap-3 rounded-lg border border-zinc-100 p-3">
            {checkMemberDuration?.pass ? (
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            ) : (
              <ShieldX className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            )}
            <div>
              <p className="text-sm font-medium text-zinc-800">Anggota koperasi minimal 3 bulan</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {checkMemberDuration?.detail || (checkMemberDuration?.pass ? 'Terpenuhi' : 'Belum terpenuhi')}
              </p>
            </div>
          </div>

          {/* Check 2: Payment history */}
          <div className="flex items-start gap-3 rounded-lg border border-zinc-100 p-3">
            {checkPaymentHistory?.pass ? (
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            ) : checkPaymentHistory?.noHistory ? (
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            ) : (
              <ShieldX className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            )}
            <div>
              <p className="text-sm font-medium text-zinc-800">Riwayat pembayaran bagus</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {checkPaymentHistory?.noHistory
                  ? 'Belum ada riwayat pinjaman'
                  : checkPaymentHistory?.detail || (checkPaymentHistory?.pass ? 'Terpenuhi' : 'Tidak terpenuhi')
                }
              </p>
              {hasPaymentIssue && checkPaymentHistory?.terlambatCount > 0 && (
                <p className="mt-1 text-[11px] text-red-600">
                  Anda terlambat bayar angsuran <span className="font-bold">{checkPaymentHistory.terlambatCount} kali</span>.
                </p>
              )}
            </div>
          </div>

          {/* Check 3: No active loan */}
          <div className="flex items-start gap-3 rounded-lg border border-zinc-100 p-3">
            {checkNoActiveLoan?.pass ? (
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            ) : (
              <ShieldX className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            )}
            <div>
              <p className="text-sm font-medium text-zinc-800">Tidak sedang memiliki pinjaman aktif</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {checkNoActiveLoan?.detail || (checkNoActiveLoan?.pass ? 'Terpenuhi' : 'Belum terpenuhi')}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Pending perbaikan request */}
      {hasPendingPerbaikan && (
        <Card className="border-0 border-l-4 border-l-amber-400 bg-amber-50/60 p-5 shadow-sm ring-1 ring-amber-100">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">Pengajuan Perbaikan Sedang Ditinjau</p>
              <p className="mt-1 text-xs text-amber-700/70">
                Pengajuan perbaikan riwayat pembayaran Anda sedang menunggu persetujuan admin.
                Anda tidak bisa mengajukan pinjaman baru sampai pengajuan ini diproses.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Approved perbaikan - show admin notes and syarat */}
      {approvedPerbaikan && (
        <Card className="border-0 border-l-4 border-l-emerald-400 bg-emerald-50/60 p-5 shadow-sm ring-1 ring-emerald-100">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-900">Perbaikan Disetujui</p>
              <p className="mt-1 text-xs text-emerald-700/70">
                {approvedPerbaikan.catatanAdmin && (
                  <span className="block">Catatan admin: {approvedPerbaikan.catatanAdmin}</span>
                )}
                {approvedPerbaikan.syaratTambahan && (
                  <span className="block mt-1">Syarat: {approvedPerbaikan.syaratTambahan}</span>
                )}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Info card — view only, action by admin */}
      <Card className="border-0 p-5 shadow-sm ring-1 ring-blue-100 bg-blue-50/60">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900">Pengajuan pinjaman dilakukan oleh admin</p>
            <p className="mt-1 text-xs text-blue-700/70">
              {isEligible
                ? 'Anda sudah memenuhi syarat pinjaman. Silakan hubungi admin atau kunjungi kantor koperasi untuk mengajukan pinjaman.'
                : hasPaymentIssue && !hasPendingPerbaikan && !approvedPerbaikan
                  ? 'Riwayat pembayaran Anda belum memenuhi syarat. Silakan hubungi admin untuk informasi lebih lanjut.'
                  : 'Anda belum memenuhi semua syarat pinjaman. Silakan hubungi admin untuk informasi lebih lanjut.'
              }
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ============================================================
// Bayar Angsuran View (koperasi)
// ============================================================
function BayarAngsuranView({ user }: { user: AuthUser }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user.anggotaId) return
    api.personalDashboardKoperasi(user.anggotaId)
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user.anggotaId])

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />
  if (!data) return <p className="text-sm text-zinc-500">Data koperasi tidak tersedia.</p>

  const activeLoans = data.riwayatKontrak.filter((p: any) => p.status === 'berjalan')

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-zinc-900">Info Angsuran</h2>

      {activeLoans.length === 0 ? (
        <Card className="border-0 bg-white p-8 shadow-sm ring-1 ring-zinc-100">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CreditCard className="h-12 w-12 text-zinc-300" />
            <p className="mt-3 text-sm font-medium text-zinc-600">Tidak ada pinjaman aktif</p>
            <p className="mt-1 text-xs text-zinc-400">Anda tidak memiliki pinjaman yang sedang berjalan saat ini.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeLoans.map((loan: any) => {
            const nextAngsuranKe = loan.angsuranTerbayar + 1
            const isLastAngsuran = nextAngsuranKe > loan.tenorBulan
            return (
              <Card key={loan.id} className="border-0 bg-white shadow-sm ring-1 ring-zinc-100">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-zinc-900">{loan.nomorPinjaman}</h3>
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-700">Berjalan</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">Diajukan {formatDate(loan.tanggalPengajuan)}</p>

                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Jumlah Pinjaman</p>
                          <p className="mt-0.5 text-sm font-bold text-zinc-900">{formatRupiah(loan.jumlahPinjaman)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Tenor</p>
                          <p className="mt-0.5 text-sm font-bold text-zinc-900">{loan.tenorBulan} bulan</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Angsuran/Bulan</p>
                          <p className="mt-0.5 text-sm font-bold text-zinc-900">{formatRupiah(loan.angsuranPerBulan)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Sisa Pinjaman</p>
                          <p className="mt-0.5 text-sm font-bold text-amber-600">{formatRupiah(loan.sisaPinjaman)}</p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-500">Progres angsuran</span>
                          <span className="font-medium text-zinc-700">{loan.angsuranTerbayar}/{loan.tenorBulan}</span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${loan.progress}%` }}
                          />
                        </div>
                      </div>

                      {!isLastAngsuran && (
                        <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
                          <Info className="h-4 w-4 text-blue-500" />
                          <div className="text-xs text-blue-700">
                            <span className="font-medium">Angsuran ke-{nextAngsuranKe}:</span>{' '}
                            {formatRupiah(loan.angsuranPerBulan)} — Pembayaran dilakukan melalui admin/teller
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Simple Table helper
// ============================================================
function SimpleTable({ headers, rows, emptyMsg }: { headers: string[]; rows: any[][]; emptyMsg: string }) {
  return (
    <div className="max-h-96 overflow-auto rounded-lg border border-zinc-100">
      <Table>
        <TableHeader className="sticky top-0 bg-zinc-50">
          <TableRow>{headers.map((h) => <TableHead key={h} className="text-[10px] uppercase">{h}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow><TableCell colSpan={headers.length} className="py-8 text-center text-sm text-zinc-400">{emptyMsg}</TableCell></TableRow>
          ) : (
            rows.map((r, i) => <TableRow key={i}>{r.map((c, j) => <TableCell key={j} className="text-xs">{c}</TableCell>)}</TableRow>)
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default UserDashboard