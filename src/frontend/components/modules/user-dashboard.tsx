'use client'

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Recycle, LayoutDashboard, Wallet, Scale, ArrowDownToLine, Award,
  PiggyBank, HandCoins, Settings, LogOut, Phone, Calendar, MapPin, Menu, X,
  FileText, CreditCard, CheckCircle2, XCircle, Clock, AlertTriangle,
  Landmark, ShieldCheck, ShieldX, UserCircle, Info,
  HeartHandshake, Bell, BellRing, CalendarClock, CalendarDays, ChevronLeft, Loader2, Filter,
  Unlock, Gift, Sprout, TrendingUp, ChevronRight, RotateCw, Search, Package,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

type View = 'dashboard' | 'saldo' | 'nabung' | 'sedekah' | 'pencairan' | 'poin' | 'simpanan' | 'pinjaman' | 'ajukan_pinjaman' | 'bayar_angsuran' | 'pengaturan'

export function UserDashboard({ user, onLogout, onSettings }: { user: AuthUser; onLogout: () => void; onSettings: () => void }) {
  const [view, setView] = useState<View>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [trenRange, setTrenRange] = useState('1thn')
  const [chartDari, setChartDari] = useState('')
  const [chartSampai, setChartSampai] = useState('')
  const reqId = useRef(0)

  const loadData = useCallback((isSilent = false) => {
    if (!user?.id) return
    const myId = ++reqId.current
    if (isSilent) setIsRefreshing(true)
    else setLoading(true)
    api.personalDashboard(user.id, {
      chartRange: trenRange,
      chartDari: trenRange === 'custom' ? chartDari : undefined,
      chartSampai: trenRange === 'custom' ? chartSampai : undefined,
    })
      .then((res) => {
        if (myId === reqId.current) {
          setData(res)
          setLoading(false)
          setIsRefreshing(false)
          setLastUpdated(new Date())
        }
      })
      .catch((e) => {
        if (myId === reqId.current) {
          if (!isSilent) toast.error('Gagal memuat data: ' + e.message)
          setLoading(false)
          setIsRefreshing(false)
        }
      })
  }, [user?.id, trenRange, chartDari, chartSampai])

  useEffect(() => {
    loadData()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadData(true)
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [loadData])

  const navItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard, section: 'main' },
    { id: 'saldo' as View, label: 'Saldo', icon: Wallet, section: 'account' },
    { id: 'nabung' as View, label: 'Transaksi Nabung', icon: Scale, section: 'account' },
    { id: 'sedekah' as View, label: 'Sedekah Saya', icon: HeartHandshake, section: 'account' },
    { id: 'pencairan' as View, label: 'Pencairan', icon: ArrowDownToLine, section: 'account' },
    { id: 'poin' as View, label: 'Histori Poin', icon: Award, section: 'account' },
    { id: 'pengaturan' as View, label: 'Pengaturan', icon: Settings, section: 'account' },
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
              src="/logo.png"
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
                {view === 'dashboard' && (
                  <DashboardView
                    data={data}
                    user={user}
                    trenRange={trenRange}
                    setTrenRange={setTrenRange}
                    chartDari={chartDari}
                    setChartDari={setChartDari}
                    chartSampai={chartSampai}
                    setChartSampai={setChartSampai}
                    onRefresh={() => loadData(true)}
                    isRefreshing={isRefreshing}
                    lastUpdated={lastUpdated}
                  />
                )}
                {view === 'saldo' && <SaldoView data={data} />}
                {view === 'nabung' && <NabungView data={data} />}
                {view === 'sedekah' && <SedekahView data={data} />}
                {view === 'pencairan' && <PencairanView data={data} />}
                {view === 'poin' && <PoinView data={data} />}
                {view === 'simpanan' && <SimpananView user={user} />}
                {view === 'pinjaman' && <PinjamanView user={user} />}
                {view === 'ajukan_pinjaman' && <AjukanPinjamanView data={data} user={user} />}
                {view === 'bayar_angsuran' && <BayarAngsuranView user={user} />}
                {view === 'pengaturan' && <PengaturanView user={user} />}
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
            <Button variant="ghost" size="sm" onClick={() => setView('pengaturan')} className="text-xs text-white hover:bg-white/10">
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
function DashboardView({
  data,
  user,
  trenRange,
  setTrenRange,
  chartDari,
  setChartDari,
  chartSampai,
  setChartSampai,
  onRefresh,
  isRefreshing,
  lastUpdated,
}: {
  data: any
  user: AuthUser
  trenRange: string
  setTrenRange: (r: string) => void
  chartDari: string
  setChartDari: (v: string) => void
  chartSampai: string
  setChartSampai: (v: string) => void
  onRefresh?: () => void
  isRefreshing?: boolean
  lastUpdated?: Date
}) {
  const { profile, saldo, trenTabungan, komposisiKategori, riwayat, koperasiInfo, periodLabel } = data
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
    { label: 'Saldo Tersedia', value: formatRupiah(saldo.saldoTersedia), color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Wallet },
    { label: 'Poin Saat Ini', value: `${formatNumber(saldo.poin, 0)} pt`, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Award },
    {
      label: `Tabungan (${periodLabel || 'Periode'})`,
      value: `${formatNumber(saldo.totalDitabungPeriode ?? saldo.totalDitabung, 1)} kg`,
      color: 'text-zinc-900',
      bg: 'bg-amber-50',
      icon: Scale,
      sub: saldo.totalNilaiPeriode ? `Nilai: ${formatRupiah(saldo.totalNilaiPeriode)}` : undefined,
    },
    {
      label: `Sedekah (${periodLabel || 'Periode'})`,
      value: `${formatNumber(saldo.totalSedekahPeriode ?? 0, 1)} kg`,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      icon: HeartHandshake,
    },
  ]
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

      {/* Global Period Filter Card for Nasabah */}
      <Card className="border-0 bg-white shadow-sm ring-1 ring-zinc-200/80">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 mr-2">
                <Calendar className="h-4 w-4 text-emerald-600" />
                <span>Periode:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {trenRangeOptions.map((b) => (
                  <button
                    key={b.value}
                    onClick={() => setTrenRange(b.value)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                      trenRange === b.value ? 'bg-emerald-600 text-white shadow-sm' : 'bg-zinc-50 text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-100'
                    )}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] font-medium text-emerald-700">
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Realtime
              </Badge>
              {onRefresh && (
                <Button variant="outline" size="sm" onClick={onRefresh} className="h-7 gap-1 text-[11px] text-zinc-600 hover:text-emerald-700">
                  <RotateCw className={cn('h-3 w-3', isRefreshing && 'animate-spin text-emerald-600')} />
                  Segarkan
                </Button>
              )}
            </div>
          </div>

          {trenRange === 'custom' && (
            <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-zinc-50 p-3 border border-zinc-100">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Dari</label>
                <Input type="date" value={chartDari} onChange={(e) => setChartDari(e.target.value)} className="h-8 w-36 bg-white border-zinc-200 text-xs" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Sampai</label>
                <Input type="date" value={chartSampai} onChange={(e) => setChartSampai(e.target.value)} className="h-8 w-36 bg-white border-zinc-200 text-xs" />
              </div>
              <p className="text-[11px] text-emerald-600 self-center">Filter diterapkan otomatis</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="rounded-xl border border-zinc-100 bg-white p-3 shadow-sm sm:p-4">
              <div className={cn('mb-2 flex h-7 w-7 items-center justify-center rounded-lg', c.bg)}>
                <Icon className={cn('h-4 w-4', c.color)} />
              </div>
              <p className={cn('text-base sm:text-lg font-bold', c.color)}>{c.value}</p>
              <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{c.label}</p>
              {c.sub && <p className="mt-0.5 text-[10px] text-zinc-500">{c.sub}</p>}
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-0 bg-white p-4 shadow-sm ring-1 ring-zinc-100 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Tren Tabungan</h3>
              <p className="text-[11px] text-zinc-500">
                Berat sampah (kg) · Periode {periodLabel}
              </p>
            </div>
          </div>
          <div className="h-56 w-full">
            {trenFiltered.every((t: any) => t.berat === 0) ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Scale className="h-8 w-8 text-zinc-300" />
                <p className="mt-2 text-xs text-zinc-400">Belum ada data tabungan pada periode {periodLabel}.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trenFiltered} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} formatter={(v: any) => [`${formatNumber(v, 2)} kg`, 'Berat']} />
                  <Line type="monotone" dataKey="berat" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="border-0 bg-white p-4 shadow-sm ring-1 ring-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-900">Total Sampah per Kategori</h3>
          <p className="text-[11px] text-zinc-500">
            Kilogram per kategori ({periodLabel})
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
// Saldo View - ENHANCED WITH MUTASI & TIMELINE FILTERS
// ============================================================
function SaldoView({ data }: { data: any }) {
  const { saldo, riwayat } = data

  const [search, setSearch] = useState('')
  const [filterWaktu, setFilterWaktu] = useState('all')
  const [customDari, setCustomDari] = useState('')
  const [customSampai, setCustomSampai] = useState('')
  const [filterTipe, setFilterTipe] = useState('all')

  // Combine financial movements
  const tabunganList = (riwayat?.tabungan || [])
    .filter((t: any) => t.status === 'selesai')
    .map((t: any) => ({
      id: `nb-${t.id}`,
      tanggal: t.tanggal,
      kode: t.kode || '-',
      deskripsi: `Tabungan Sampah: ${t.barang}`,
      tipe: 'masuk' as const,
      kategori: 'Tabungan Sampah',
      jumlah: toNumber(t.nilai),
      status: 'selesai',
    }))

  const penarikanList = (riwayat?.penarikan || []).map((w: any) => ({
    id: `wd-${w.id}`,
    tanggal: w.tanggal,
    kode: w.receiptNo || '-',
    deskripsi: `Penarikan Saldo (${w.metode || 'Tunai'})`,
    tipe: 'keluar' as const,
    kategori: 'Penarikan Dana',
    jumlah: toNumber(w.jumlah),
    status: w.status,
  }))

  const releaseList = (riwayat?.releaseSaldo || []).map((r: any) => ({
    id: `rl-${r.id}`,
    tanggal: r.tanggal,
    kode: '-',
    deskripsi: `Release Saldo Tertahan: ${r.keterangan || 'Pencairan'}`,
    tipe: 'release' as const,
    kategori: 'Release Saldo',
    jumlah: toNumber(r.jumlah),
    status: r.status,
  }))

  const allMutasi = [...tabunganList, ...penarikanList, ...releaseList]
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())

  const filteredMutasi = allMutasi.filter((m) => {
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!m.kode.toLowerCase().includes(q) && !m.deskripsi.toLowerCase().includes(q) && !m.kategori.toLowerCase().includes(q)) {
        return false
      }
    }
    if (!matchesDateFilter(m.tanggal, filterWaktu, customDari, customSampai)) return false
    if (filterTipe === 'masuk' && m.tipe !== 'masuk') return false
    if (filterTipe === 'keluar' && m.tipe !== 'keluar') return false
    if (filterTipe === 'release' && m.tipe !== 'release') return false
    return true
  })

  const totalMasuk = filteredMutasi.filter((m) => m.tipe === 'masuk').reduce((s, m) => s + m.jumlah, 0)
  const totalKeluar = filteredMutasi.filter((m) => m.tipe === 'keluar' && m.status === 'selesai').reduce((s, m) => s + m.jumlah, 0)

  const waktuOptions = [
    { value: 'all', label: 'Semua Waktu' },
    { value: 'today', label: 'Hari Ini' },
    { value: 'this_month', label: 'Bulan Ini' },
    { value: '1bul', label: '1 Bulan Terakhir' },
    { value: '3bul', label: '3 Bulan Terakhir' },
    { value: '6bul', label: '6 Bulan Terakhir' },
    { value: '1thn', label: '1 Tahun Terakhir' },
    { value: 'custom', label: 'Kustom Tanggal' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
          <Wallet className="size-5 text-emerald-600" /> Saldo & Kas Saya
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">Informasi posisi saldo dan riwayat mutasi transaksi keuangan</p>
      </div>

      {/* Top Balance Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 bg-white p-5 shadow-sm ring-1 ring-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Saldo Tersedia</p>
            <Wallet className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{formatRupiah(saldo.saldoTersedia)}</p>
          <p className="mt-1 text-[11px] text-zinc-500">Siap ditarik atau ditransfer</p>
        </Card>

        <Card className="border-0 bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Saldo Tertahan</p>
            <Clock className="size-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-zinc-900">{formatRupiah(saldo.saldoTertahan)}</p>
          <p className="mt-1 text-[11px] text-zinc-500">Dalam masa holding/verifikasi</p>
        </Card>

        <Card className="border-0 bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Poin Saat Ini</p>
            <Award className="size-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-700">{formatNumber(saldo.poin, 0)} pt</p>
          <p className="mt-1 text-[11px] text-zinc-500">Dapat ditukarkan produk merchandise</p>
        </Card>

        <Card className="border-0 bg-white p-5 shadow-sm ring-1 ring-zinc-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Total Hasil Tabungan</p>
            <TrendingUp className="size-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-700">{formatRupiah(saldo.totalNilaiPeriode ?? saldo.totalNilaiTabungan ?? totalMasuk)}</p>
          <p className="mt-1 text-[11px] text-zinc-500">Akumulasi pendapatan sampah</p>
        </Card>
      </div>

      {/* Mutasi Filter Toolbar */}
      <Card className="border border-zinc-200/80 bg-white shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <Filter className="size-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-900">Filter Mutasi & Riwayat Arus Kas</h3>
                <p className="text-[11px] text-zinc-400">Pantau pergerakan tabungan masuk, penarikan saldo, dan pelepasan dana</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                + Masuk: {formatRupiah(totalMasuk)}
              </span>
              <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                - Keluar: {formatRupiah(totalKeluar)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400 pointer-events-none" />
              <Input
                placeholder="Cari transaksi / keterangan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9.5 w-full pl-9 pr-8 text-xs bg-zinc-50/50 border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <Select value={filterWaktu} onValueChange={setFilterWaktu}>
              <SelectTrigger className="!w-full w-full h-9.5 rounded-xl bg-zinc-50/50 border-zinc-200 text-xs text-zinc-700 hover:bg-white hover:border-zinc-300 transition focus:ring-2 focus:ring-emerald-500/20">
                <div className="flex items-center gap-2 truncate">
                  <Calendar className="size-3.5 text-emerald-600 shrink-0" />
                  <SelectValue placeholder="Periode Waktu" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {waktuOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterTipe} onValueChange={setFilterTipe}>
              <SelectTrigger className="!w-full w-full h-9.5 rounded-xl bg-zinc-50/50 border-zinc-200 text-xs text-zinc-700 hover:bg-white hover:border-zinc-300 transition focus:ring-2 focus:ring-emerald-500/20">
                <div className="flex items-center gap-2 truncate">
                  <Wallet className="size-3.5 text-blue-600 shrink-0" />
                  <SelectValue placeholder="Jenis Mutasi" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Semua Jenis Mutasi</SelectItem>
                <SelectItem value="masuk" className="text-xs">Pemasukan (Nabung)</SelectItem>
                <SelectItem value="keluar" className="text-xs">Pengeluaran (Penarikan)</SelectItem>
                <SelectItem value="release" className="text-xs">Release Saldo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filterWaktu === 'custom' && (
            <div className="flex flex-wrap items-end gap-3 rounded-xl bg-emerald-50/70 p-3.5 border border-emerald-200/80 animate-in fade-in slide-in-from-top-1">
              <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                <label className="text-[11px] font-semibold text-emerald-900">Dari Tanggal</label>
                <Input type="date" value={customDari} onChange={(e) => setCustomDari(e.target.value)} className="h-9 bg-white border-emerald-200 text-xs rounded-lg" />
              </div>
              <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                <label className="text-[11px] font-semibold text-emerald-900">Sampai Tanggal</label>
                <Input type="date" value={customSampai} onChange={(e) => setCustomSampai(e.target.value)} className="h-9 bg-white border-emerald-200 text-xs rounded-lg" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mutasi Table Card */}
      <Card className="border-0 bg-white shadow-sm ring-1 ring-zinc-100 overflow-hidden">
        <div className="p-4 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-900">Riwayat Mutasi Saldo</h3>
        </div>
        <CardContent className="p-0">
          {filteredMutasi.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-400">
              <Wallet className="size-8 mx-auto mb-2 opacity-30" />
              <p>Belum ada riwayat mutasi yang cocok dengan filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-left">
                  <tr>
                    <th className="p-3 text-xs font-semibold text-zinc-600">Tanggal</th>
                    <th className="p-3 text-xs font-semibold text-zinc-600">Kode Transaksi</th>
                    <th className="p-3 text-xs font-semibold text-zinc-600">Keterangan</th>
                    <th className="p-3 text-xs font-semibold text-zinc-600">Kategori</th>
                    <th className="p-3 text-right text-xs font-semibold text-zinc-600">Nominal</th>
                    <th className="p-3 text-center text-xs font-semibold text-zinc-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredMutasi.map((m) => (
                    <tr key={m.id} className="hover:bg-zinc-50/60">
                      <td className="p-3 text-xs font-mono text-zinc-600 whitespace-nowrap">{formatDateTime(m.tanggal)}</td>
                      <td className="p-3 text-xs font-mono font-medium text-emerald-700 whitespace-nowrap">{m.kode}</td>
                      <td className="p-3 text-xs text-zinc-900 font-medium">{m.deskripsi}</td>
                      <td className="p-3 text-xs text-zinc-500 whitespace-nowrap">{m.kategori}</td>
                      <td className={`p-3 text-xs font-bold text-right whitespace-nowrap ${m.tipe === 'masuk' ? 'text-emerald-700' : m.tipe === 'keluar' ? 'text-rose-700' : 'text-blue-700'}`}>
                        {m.tipe === 'masuk' ? `+${formatRupiah(m.jumlah)}` : m.tipe === 'keluar' ? `-${formatRupiah(m.jumlah)}` : formatRupiah(m.jumlah)}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <Badge variant="outline" className={`text-[10px] ${m.status === 'selesai' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-50 text-zinc-600 border-zinc-200'}`}>
                          {m.status}
                        </Badge>
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

// Helper for date matching
function matchesDateFilter(dateStr: string | Date, preset: string, dari?: string, sampai?: string): boolean {
  if (preset === 'all') return true
  const d = new Date(dateStr)
  const now = new Date()

  if (preset === 'today') {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    return d >= today && d < nextDay
  }
  if (preset === 'this_month') {
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return d >= startMonth && d < nextMonth
  }
  if (preset === '1bul') {
    const past = new Date(now)
    past.setDate(past.getDate() - 30)
    past.setHours(0, 0, 0, 0)
    return d >= past && d <= now
  }
  if (preset === '3bul') {
    const past = new Date(now)
    past.setDate(past.getDate() - 90)
    past.setHours(0, 0, 0, 0)
    return d >= past && d <= now
  }
  if (preset === '6bul') {
    const past = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    past.setHours(0, 0, 0, 0)
    return d >= past && d <= now
  }
  if (preset === '1thn') {
    const past = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    past.setHours(0, 0, 0, 0)
    return d >= past && d <= now
  }
  if (preset === 'custom' && dari && sampai) {
    const start = new Date(dari)
    start.setHours(0, 0, 0, 0)
    const end = new Date(sampai)
    end.setHours(23, 59, 59, 999)
    return d >= start && d <= end
  }
  return true
}

// ============================================================
// Nabung View - ENHANCED WITH COMPREHENSIVE FILTER SUITE
// ============================================================
function NabungView({ data }: { data: any }) {
  const rows = data.riwayat?.tabungan || []
  const masterCategories = data.masterData?.categories || []
  const masterItems = data.masterData?.wasteItems || []

  // Extract unique categories & items from rows + masterData
  const availableCategories = Array.from(new Set([
    ...masterCategories.map((c: any) => c.name),
    ...rows.flatMap((r: any) => r.kategoriList || (r.kategori ? [r.kategori] : [])),
  ])).filter(Boolean).sort()

  const availableItems = Array.from(new Set([
    ...masterItems.map((it: any) => it.name),
    ...rows.flatMap((r: any) => r.barangList || (r.barang ? [r.barang] : [])),
  ])).filter(Boolean).sort()

  // Filter States
  const [search, setSearch] = useState('')
  const [filterWaktu, setFilterWaktu] = useState('all')
  const [customDari, setCustomDari] = useState('')
  const [customSampai, setCustomSampai] = useState('')
  const [filterKategori, setFilterKategori] = useState('all')
  const [filterBarang, setFilterBarang] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterQc, setFilterQc] = useState('all')
  const [sortBy, setSortBy] = useState('date_desc')
  const [expanded, setExpanded] = useState<string | null>(null)

  // Reset Filters
  const resetFilters = () => {
    setSearch('')
    setFilterWaktu('all')
    setCustomDari('')
    setCustomSampai('')
    setFilterKategori('all')
    setFilterBarang('all')
    setFilterStatus('all')
    setFilterQc('all')
    setSortBy('date_desc')
  }

  const isFilterActive = search !== '' || filterWaktu !== 'all' || filterKategori !== 'all' || filterBarang !== 'all' || filterStatus !== 'all' || filterQc !== 'all'

  // Filter & Sort Logic
  const filtered = rows.filter((r: any) => {
    // Search query
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchKode = r.kode?.toLowerCase().includes(q)
      const matchBarang = r.barang?.toLowerCase().includes(q)
      const matchKategori = (r.kategoriList || []).some((k: string) => k.toLowerCase().includes(q))
      const matchItemDetail = (r.items || []).some((it: any) => it.barang?.toLowerCase().includes(q) || it.kode?.toLowerCase().includes(q))
      if (!matchKode && !matchBarang && !matchKategori && !matchItemDetail) return false
    }

    // Date filter
    if (!matchesDateFilter(r.tanggal, filterWaktu, customDari, customSampai)) return false

    // Category filter
    if (filterKategori !== 'all') {
      const rowCats = r.kategoriList || (r.kategori ? [r.kategori] : [])
      const itemCats = (r.items || []).map((it: any) => it.kategori)
      const allCats = [...rowCats, ...itemCats]
      if (!allCats.some((c: string) => c.toLowerCase() === filterKategori.toLowerCase())) return false
    }

    // Waste Item filter
    if (filterBarang !== 'all') {
      const rowItems = r.barangList || [r.barang]
      const itemNames = (r.items || []).map((it: any) => it.barang)
      const allNames = [...rowItems, ...itemNames]
      if (!allNames.some((b: string) => b.toLowerCase().includes(filterBarang.toLowerCase()))) return false
    }

    // Status filter
    if (filterStatus !== 'all' && r.status !== filterStatus) return false

    // QC status filter
    if (filterQc !== 'all' && r.qcStatus !== filterQc) return false

    return true
  }).sort((a: any, b: any) => {
    if (sortBy === 'date_desc') return new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    if (sortBy === 'date_asc') return new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
    if (sortBy === 'weight_desc') return toNumber(b.berat) - toNumber(a.berat)
    if (sortBy === 'value_desc') return toNumber(b.nilai) - toNumber(a.nilai)
    if (sortBy === 'points_desc') return toNumber(b.poin) - toNumber(a.poin)
    return 0
  })

  // Recalculate summary from filtered rows
  const filteredNilai = filtered.reduce((s: number, r: any) => s + toNumber(r.nilai), 0)
  const filteredBerat = filtered.reduce((s: number, r: any) => s + toNumber(r.berat), 0)
  const filteredPoin = filtered.reduce((s: number, r: any) => s + toNumber(r.poin), 0)
  const filteredMenunggu = filtered.filter((r: any) => r.status === 'menunggu_qc' || r.qcStatus === 'pending').length

  const waktuOptions = [
    { value: 'all', label: 'Semua Waktu' },
    { value: 'today', label: 'Hari Ini' },
    { value: 'this_month', label: 'Bulan Ini' },
    { value: '1bul', label: '1 Bulan Terakhir' },
    { value: '3bul', label: '3 Bulan Terakhir' },
    { value: '6bul', label: '6 Bulan Terakhir' },
    { value: '1thn', label: '1 Tahun Terakhir' },
    { value: 'custom', label: 'Kustom Tanggal' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <Recycle className="size-5 text-emerald-600" /> Transaksi Nabung Sampah
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">Riwayat & pelacakan detail setoran sampah nasabah</p>
        </div>
        {isFilterActive && (
          <Button variant="outline" size="sm" onClick={resetFilters} className="self-start text-xs text-zinc-600 hover:text-rose-600 gap-1.5 border-zinc-200">
            <X className="size-3.5" /> Reset Semua Filter
          </Button>
        )}
      </div>

      {/* Summary Cards (Dynamic Live Recalculation) */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-emerald-800 font-medium">Total Nilai Tabungan</p>
              <TrendingUp className="size-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-bold text-emerald-700">{formatRupiah(filteredNilai)}</p>
            <p className="mt-0.5 text-[10px] text-emerald-600">{filtered.length} transaksi</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-blue-800 font-medium">Total Berat Sampah</p>
              <Scale className="size-4 text-blue-600" />
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-bold text-blue-700">{formatNumber(filteredBerat, 2)} kg</p>
            <p className="mt-0.5 text-[10px] text-blue-600">Terverifikasi sistem</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-amber-800 font-medium">Total Poin Diperoleh</p>
              <Award className="size-4 text-amber-600" />
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-bold text-amber-700">{formatNumber(filteredPoin, 0)} pt</p>
            <p className="mt-0.5 text-[10px] text-amber-600">Reward partisipasi</p>
          </CardContent>
        </Card>
        <Card className={`bg-gradient-to-br ${filteredMenunggu > 0 ? 'from-purple-50 to-violet-50 border-purple-200 shadow-sm' : 'from-zinc-50 to-zinc-100 border-zinc-200 shadow-sm'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className={`text-xs font-medium ${filteredMenunggu > 0 ? 'text-purple-800' : 'text-zinc-600'}`}>Menunggu QC</p>
              <Clock className={`size-4 ${filteredMenunggu > 0 ? 'text-purple-600 animate-pulse' : 'text-zinc-400'}`} />
            </div>
            <p className={`mt-2 text-xl sm:text-2xl font-bold ${filteredMenunggu > 0 ? 'text-purple-700' : 'text-zinc-600'}`}>{filteredMenunggu}</p>
            <p className="mt-0.5 text-[10px] text-zinc-500">{filteredMenunggu > 0 ? 'Sedang proses timbang & sortir' : 'Semua transaksi selesai'}</p>
          </CardContent>
        </Card>
      </div>

      {/* ===== FILTER TOOLBAR CARD ===== */}
      <Card className="border border-zinc-200/80 bg-white shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <Filter className="size-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-900">Pusat Filter Transaksi & Sampah</h3>
                <p className="text-[11px] text-zinc-400">Saring riwayat berdasarkan waktu, jenis sampah, dan status QC</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[11px] font-medium text-zinc-600 border-zinc-200 bg-zinc-50">
                {filtered.length} dari {rows.length} Data
              </Badge>
              {isFilterActive && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 px-2">
                  <X className="size-3" /> Reset Filter
                </Button>
              )}
            </div>
          </div>

          {/* Row 1: Search, Time, Category, Waste Item */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400 pointer-events-none" />
              <Input
                placeholder="Cari kode trx / sampah..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9.5 w-full pl-9 pr-8 text-xs bg-zinc-50/50 border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Filter Waktu */}
            <Select value={filterWaktu} onValueChange={setFilterWaktu}>
              <SelectTrigger className="!w-full w-full h-9.5 rounded-xl bg-zinc-50/50 border-zinc-200 text-xs text-zinc-700 hover:bg-white hover:border-zinc-300 transition focus:ring-2 focus:ring-emerald-500/20">
                <div className="flex items-center gap-2 truncate">
                  <Calendar className="size-3.5 text-emerald-600 shrink-0" />
                  <SelectValue placeholder="Pilih Periode Waktu" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {waktuOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter Kategori Sampah */}
            <Select value={filterKategori} onValueChange={setFilterKategori}>
              <SelectTrigger className="!w-full w-full h-9.5 rounded-xl bg-zinc-50/50 border-zinc-200 text-xs text-zinc-700 hover:bg-white hover:border-zinc-300 transition focus:ring-2 focus:ring-emerald-500/20">
                <div className="flex items-center gap-2 truncate">
                  <Recycle className="size-3.5 text-emerald-600 shrink-0" />
                  <SelectValue placeholder="Kategori Sampah" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Semua Kategori</SelectItem>
                {availableCategories.map((cat: string) => (
                  <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter Jenis Barang */}
            <Select value={filterBarang} onValueChange={setFilterBarang}>
              <SelectTrigger className="!w-full w-full h-9.5 rounded-xl bg-zinc-50/50 border-zinc-200 text-xs text-zinc-700 hover:bg-white hover:border-zinc-300 transition focus:ring-2 focus:ring-emerald-500/20">
                <div className="flex items-center gap-2 truncate">
                  <Package className="size-3.5 text-blue-600 shrink-0" />
                  <SelectValue placeholder="Jenis Sampah" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Semua Jenis Sampah</SelectItem>
                {availableItems.map((item: string) => (
                  <SelectItem key={item} value={item} className="text-xs">{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: Status Transaksi, Status QC, Sorting */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Status Transaksi */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="!w-full w-full h-9.5 rounded-xl bg-zinc-50/50 border-zinc-200 text-xs text-zinc-700 hover:bg-white hover:border-zinc-300 transition focus:ring-2 focus:ring-emerald-500/20">
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2 className="size-3.5 text-zinc-400 shrink-0" />
                  <SelectValue placeholder="Status Transaksi" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Semua Status Transaksi</SelectItem>
                <SelectItem value="selesai" className="text-xs">Selesai</SelectItem>
                <SelectItem value="menunggu_qc" className="text-xs">Menunggu QC</SelectItem>
                <SelectItem value="dibatalkan" className="text-xs">Dibatalkan</SelectItem>
              </SelectContent>
            </Select>

            {/* Status QC */}
            <Select value={filterQc} onValueChange={setFilterQc}>
              <SelectTrigger className="!w-full w-full h-9.5 rounded-xl bg-zinc-50/50 border-zinc-200 text-xs text-zinc-700 hover:bg-white hover:border-zinc-300 transition focus:ring-2 focus:ring-emerald-500/20">
                <div className="flex items-center gap-2 truncate">
                  <ShieldCheck className="size-3.5 text-teal-600 shrink-0" />
                  <SelectValue placeholder="Status QC" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Semua Status QC</SelectItem>
                <SelectItem value="tidak_perlu" className="text-xs">Bersih (Tanpa QC)</SelectItem>
                <SelectItem value="passed" className="text-xs">Lolos QC</SelectItem>
                <SelectItem value="adjusted" className="text-xs">Disesuaikan</SelectItem>
                <SelectItem value="pending" className="text-xs">Menunggu QC</SelectItem>
                <SelectItem value="rejected" className="text-xs">Ditolak</SelectItem>
              </SelectContent>
            </Select>

            {/* Urutan / Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="!w-full w-full h-9.5 rounded-xl bg-zinc-50/50 border-zinc-200 text-xs text-zinc-700 hover:bg-white hover:border-zinc-300 transition focus:ring-2 focus:ring-emerald-500/20">
                <div className="flex items-center gap-2 truncate">
                  <TrendingUp className="size-3.5 text-amber-600 shrink-0" />
                  <SelectValue placeholder="Urutkan Berdasarkan" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc" className="text-xs">Tanggal (Terbaru)</SelectItem>
                <SelectItem value="date_asc" className="text-xs">Tanggal (Terlama)</SelectItem>
                <SelectItem value="weight_desc" className="text-xs">Berat Terbesar</SelectItem>
                <SelectItem value="value_desc" className="text-xs">Nilai Terbesar</SelectItem>
                <SelectItem value="points_desc" className="text-xs">Poin Terbanyak</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range Pickers (if custom selected) */}
          {filterWaktu === 'custom' && (
            <div className="flex flex-wrap items-end gap-3 rounded-xl bg-emerald-50/70 p-3.5 border border-emerald-200/80 animate-in fade-in slide-in-from-top-1">
              <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                <label className="text-[11px] font-semibold text-emerald-900">Dari Tanggal</label>
                <Input type="date" value={customDari} onChange={(e) => setCustomDari(e.target.value)} className="h-9 bg-white border-emerald-200 text-xs rounded-lg" />
              </div>
              <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                <label className="text-[11px] font-semibold text-emerald-900">Sampai Tanggal</label>
                <Input type="date" value={customSampai} onChange={(e) => setCustomSampai(e.target.value)} className="h-9 bg-white border-emerald-200 text-xs rounded-lg" />
              </div>
              <p className="text-[11px] text-emerald-700 self-center pb-1">Rentang tanggal otomatis diterapkan pada riwayat</p>
            </div>
          )}

          {/* Active Filter Tags */}
          {isFilterActive && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-100">
              <span className="text-[11px] font-medium text-zinc-400 mr-1">Filter aktif:</span>
              {search && (
                <Badge variant="outline" className="text-[11px] py-0.5 px-2 bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 rounded-lg">
                  Cari: "{search}" <X className="size-3 cursor-pointer hover:text-emerald-900" onClick={() => setSearch('')} />
                </Badge>
              )}
              {filterWaktu !== 'all' && (
                <Badge variant="outline" className="text-[11px] py-0.5 px-2 bg-blue-50 text-blue-700 border-blue-200 gap-1.5 rounded-lg">
                  Waktu: {waktuOptions.find((o) => o.value === filterWaktu)?.label} <X className="size-3 cursor-pointer hover:text-blue-900" onClick={() => setFilterWaktu('all')} />
                </Badge>
              )}
              {filterKategori !== 'all' && (
                <Badge variant="outline" className="text-[11px] py-0.5 px-2 bg-amber-50 text-amber-700 border-amber-200 gap-1.5 rounded-lg">
                  Kategori: {filterKategori} <X className="size-3 cursor-pointer hover:text-amber-900" onClick={() => setFilterKategori('all')} />
                </Badge>
              )}
              {filterBarang !== 'all' && (
                <Badge variant="outline" className="text-[11px] py-0.5 px-2 bg-purple-50 text-purple-700 border-purple-200 gap-1.5 rounded-lg">
                  Sampah: {filterBarang} <X className="size-3 cursor-pointer hover:text-purple-900" onClick={() => setFilterBarang('all')} />
                </Badge>
              )}
              {filterStatus !== 'all' && (
                <Badge variant="outline" className="text-[11px] py-0.5 px-2 bg-zinc-100 text-zinc-700 border-zinc-200 gap-1.5 rounded-lg">
                  Status: {filterStatus} <X className="size-3 cursor-pointer hover:text-zinc-900" onClick={() => setFilterStatus('all')} />
                </Badge>
              )}
              {filterQc !== 'all' && (
                <Badge variant="outline" className="text-[11px] py-0.5 px-2 bg-teal-50 text-teal-700 border-teal-200 gap-1.5 rounded-lg">
                  QC: {qcLabel(filterQc)} <X className="size-3 cursor-pointer hover:text-teal-900" onClick={() => setFilterQc('all')} />
                </Badge>
              )}
              <button onClick={resetFilters} className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline font-medium ml-1.5">
                Hapus Semua
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== TABLE CARD ===== */}
      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-400">
              <Recycle className="size-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium text-zinc-600">Tidak ada data transaksi yang cocok</p>
              <p className="text-xs text-zinc-400 mt-1">Coba sesuaikan kata kunci atau filter periode waktu Anda.</p>
              {isFilterActive && (
                <Button variant="outline" size="sm" onClick={resetFilters} className="mt-3 text-xs">
                  Reset Filter
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-left">
                  <tr>
                    <th className="p-3 text-xs font-semibold text-zinc-600">Tanggal</th>
                    <th className="p-3 text-xs font-semibold text-zinc-600">Kode Transaksi</th>
                    <th className="p-3 text-xs font-semibold text-zinc-600">Rincian Sampah</th>
                    <th className="p-3 text-center text-xs font-semibold text-zinc-600">Berat</th>
                    <th className="p-3 text-right text-xs font-semibold text-zinc-600">Nilai Bersih</th>
                    <th className="p-3 text-center text-xs font-semibold text-zinc-600">Poin</th>
                    <th className="p-3 text-center text-xs font-semibold text-zinc-600">Status QC</th>
                    <th className="p-3 text-center text-xs font-semibold text-zinc-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtered.map((r: any, i: number) => {
                    const key = r.id || `n-${i}`
                    const isExpanded = expanded === key
                    return (
                      <Fragment key={key}>
                        <tr
                          className={cn('hover:bg-emerald-50/40 cursor-pointer transition', isExpanded && 'bg-emerald-50/30')}
                          onClick={() => setExpanded(isExpanded ? null : key)}
                        >
                          <td className="p-3 text-xs text-zinc-600 font-mono whitespace-nowrap">{formatDate(r.tanggal)}</td>
                          <td className="p-3 text-xs font-mono font-medium text-emerald-700 whitespace-nowrap">{r.kode || '-'}</td>
                          <td className="p-3 text-xs text-zinc-800 font-medium">{r.barang || '-'}</td>
                          <td className="p-3 text-center text-xs font-semibold text-zinc-800 whitespace-nowrap">{formatNumber(toNumber(r.berat), 2)} kg</td>
                          <td className="p-3 text-right text-xs font-bold text-emerald-700 whitespace-nowrap">{formatRupiah(r.nilai)}</td>
                          <td className="p-3 text-center text-xs font-semibold text-amber-700 whitespace-nowrap">{r.poin || 0} pt</td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <Badge variant="outline" className={cn('text-[10px]', qcBadgeClass(r.qcStatus || r.status))}>
                              {qcLabel(r.qcStatus || r.status)}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <ChevronRight className={`size-4 mx-auto text-zinc-400 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-emerald-600' : ''}`} />
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-zinc-50/80 border-y border-zinc-200/80">
                            <td colSpan={8} className="p-4">
                              <div className="rounded-lg bg-white p-3 border border-zinc-200 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-zinc-800">Rincian Item Setoran ({r.items?.length || 1} jenis)</span>
                                    <Badge variant="outline" className="text-[10px] font-mono">{r.kode || '-'}</Badge>
                                  </div>
                                  <span className="text-xs text-zinc-500">Waktu: {formatDateTime(r.tanggal)}</span>
                                </div>

                                {r.items && r.items.length > 0 ? (
                                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {r.items.map((it: any) => (
                                      <div key={it.id} className="p-2.5 rounded-md border border-zinc-100 bg-zinc-50/50 flex flex-col justify-between">
                                        <div>
                                          <div className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-zinc-900">{it.barang}</span>
                                            <Badge variant="outline" className="text-[9px] border-zinc-200 bg-white">{it.kategori}</Badge>
                                          </div>
                                          <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Kode: {it.kode}</p>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between text-xs pt-1.5 border-t border-zinc-100">
                                          <span className="text-zinc-600 font-medium">{formatNumber(it.berat, 2)} kg</span>
                                          <span className="font-bold text-emerald-700">{formatRupiah(it.nilai)}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-zinc-600">Item: {r.barang} ({formatNumber(r.berat, 2)} kg — {formatRupiah(r.nilai)})</p>
                                )}

                                {r.status === 'menunggu_qc' && (
                                  <div className="rounded-md bg-amber-50 p-2 text-xs text-amber-800 border border-amber-200 flex items-center gap-1.5">
                                    <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                                    <span>Transaksi ini masih menunggu pemeriksaan mutu & berat (QC). Saldo tabungan akan ditambahkan setelah lolos QC.</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <p className="text-center text-[11px] text-zinc-400">Menampilkan {filtered.length} dari total {rows.length} transaksi</p>
    </div>
  )
}

// ============================================================
// Sedekah View - ENHANCED WITH COMPREHENSIVE FILTER SUITE
// ============================================================
function qcBadgeClass(status: string) {
  switch (status) {
    case 'passed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'adjusted':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'tidak_perlu':
      return 'border-blue-200 bg-blue-50 text-blue-700'
    case 'pending':
      return 'border-yellow-300 bg-yellow-50 text-yellow-900 animate-pulse'
    case 'rejected':
      return 'border-rose-200 bg-rose-50 text-rose-700'
    default:
      return 'border-zinc-200 bg-zinc-50 text-zinc-600'
  }
}

function qcLabel(status: string) {
  switch (status) {
    case 'passed':
      return 'Lolos QC'
    case 'adjusted':
      return 'Disesuaikan'
    case 'tidak_perlu':
      return 'Bersih (Tanpa QC)'
    case 'pending':
      return 'Menunggu QC'
    case 'rejected':
      return 'Ditolak'
    default:
      return 'Menunggu QC'
  }
}

function SedekahView({ data }: { data: any }) {
  const rows: any[] = data.riwayat?.sedekah || []
  const masterCategories = data.masterData?.categories || []
  const masterItems = data.masterData?.wasteItems || []

  const availableCategories = Array.from(new Set([
    ...masterCategories.map((c: any) => c.name),
    ...rows.map((r: any) => r.kategori),
  ])).filter(Boolean).sort()

  const availableItems = Array.from(new Set([
    ...masterItems.map((it: any) => it.name),
    ...rows.map((r: any) => r.barangNama || r.barang),
  ])).filter(Boolean).sort()

  // Filter States
  const [search, setSearch] = useState('')
  const [filterWaktu, setFilterWaktu] = useState('all')
  const [customDari, setCustomDari] = useState('')
  const [customSampai, setCustomSampai] = useState('')
  const [filterKategori, setFilterKategori] = useState('all')
  const [filterBarang, setFilterBarang] = useState('all')
  const [filterQc, setFilterQc] = useState('all')
  const [sortBy, setSortBy] = useState('date_desc')

  const resetFilters = () => {
    setSearch('')
    setFilterWaktu('all')
    setCustomDari('')
    setCustomSampai('')
    setFilterKategori('all')
    setFilterBarang('all')
    setFilterQc('all')
    setSortBy('date_desc')
  }

  const isFilterActive = search !== '' || filterWaktu !== 'all' || filterKategori !== 'all' || filterBarang !== 'all' || filterQc !== 'all'

  // Filter logic
  const filtered = rows.filter((r: any) => {
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchKode = r.kode?.toLowerCase().includes(q)
      const matchBarang = r.barang?.toLowerCase().includes(q)
      const matchKategori = r.kategori?.toLowerCase().includes(q)
      if (!matchKode && !matchBarang && !matchKategori) return false
    }

    if (!matchesDateFilter(r.tanggal, filterWaktu, customDari, customSampai)) return false

    if (filterKategori !== 'all' && r.kategori?.toLowerCase() !== filterKategori.toLowerCase()) return false

    if (filterBarang !== 'all') {
      const bName = (r.barangNama || r.barang || '').toLowerCase()
      if (!bName.includes(filterBarang.toLowerCase())) return false
    }

    if (filterQc !== 'all' && r.qcStatus !== filterQc) return false

    return true
  }).sort((a: any, b: any) => {
    if (sortBy === 'date_desc') return new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    if (sortBy === 'date_asc') return new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
    if (sortBy === 'weight_desc') return toNumber(b.beratBersih) - toNumber(a.beratBersih)
    if (sortBy === 'kotor_desc') return toNumber(b.beratKotor) - toNumber(a.beratKotor)
    return 0
  })

  // Recalculate summary from filtered rows
  const totalBeratKotor = filtered.reduce((s, r) => s + toNumber(r.beratKotor), 0)
  const totalBeratBersih = filtered.reduce((s, r) => s + toNumber(r.beratBersih), 0)
  const totalSusut = totalBeratKotor - totalBeratBersih
  const totalTransaksi = new Set(filtered.map((r) => String(r.tanggal))).size

  const summaryCards = [
    { label: 'Total Berat Kotor', value: `${formatNumber(totalBeratKotor, 2)} kg`, color: 'text-zinc-900', bg: 'bg-zinc-100', icon: Scale },
    { label: 'Total Berat Bersih', value: `${formatNumber(totalBeratBersih, 2)} kg`, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: HeartHandshake },
    { label: 'Total Susut QC', value: `${formatNumber(totalSusut, 2)} kg`, color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertTriangle },
    { label: 'Jumlah Item Donasi', value: `${filtered.length}`, color: 'text-purple-700', bg: 'bg-purple-50', icon: Package },
  ]

  const waktuOptions = [
    { value: 'all', label: 'Semua Waktu' },
    { value: 'today', label: 'Hari Ini' },
    { value: 'this_month', label: 'Bulan Ini' },
    { value: '1bul', label: '1 Bulan Terakhir' },
    { value: '3bul', label: '3 Bulan Terakhir' },
    { value: '6bul', label: '6 Bulan Terakhir' },
    { value: '1thn', label: '1 Tahun Terakhir' },
    { value: 'custom', label: 'Kustom Tanggal' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <HeartHandshake className="size-5 text-emerald-600" /> Sedekah Sampah Saya
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">Riwayat amal kebaikan dari sedekah sampah daur ulang</p>
        </div>
        {isFilterActive && (
          <Button variant="outline" size="sm" onClick={resetFilters} className="self-start text-xs text-zinc-600 hover:text-rose-600 gap-1.5 border-zinc-200">
            <X className="size-3.5" /> Reset Filter
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryCards.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
              <div className={cn('mb-2 flex h-7 w-7 items-center justify-center rounded-lg', c.bg)}>
                <Icon className={cn('h-4 w-4', c.color)} />
              </div>
              <p className={cn('text-lg font-bold', c.color)}>{c.value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{c.label}</p>
            </div>
          )
        })}
      </div>

      {/* Filter Toolbar Card */}
      <Card className="border border-zinc-200/80 bg-white shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <Filter className="size-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-900">Filter Riwayat Sedekah Sampah</h3>
                <p className="text-[11px] text-zinc-400">Saring riwayat amal sedekah sampah daur ulang Anda</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[11px] font-medium text-zinc-600 border-zinc-200 bg-zinc-50">
                {filtered.length} dari {rows.length} Data
              </Badge>
              {isFilterActive && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 px-2">
                  <X className="size-3" /> Reset Filter
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400 pointer-events-none" />
              <Input
                placeholder="Cari kode trx / sampah..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9.5 w-full pl-9 pr-8 text-xs bg-zinc-50/50 border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <Select value={filterWaktu} onValueChange={setFilterWaktu}>
              <SelectTrigger className="!w-full w-full h-9.5 rounded-xl bg-zinc-50/50 border-zinc-200 text-xs text-zinc-700 hover:bg-white hover:border-zinc-300 transition focus:ring-2 focus:ring-emerald-500/20">
                <div className="flex items-center gap-2 truncate">
                  <Calendar className="size-3.5 text-emerald-600 shrink-0" />
                  <SelectValue placeholder="Periode Waktu" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {waktuOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterKategori} onValueChange={setFilterKategori}>
              <SelectTrigger className="!w-full w-full h-9.5 rounded-xl bg-zinc-50/50 border-zinc-200 text-xs text-zinc-700 hover:bg-white hover:border-zinc-300 transition focus:ring-2 focus:ring-emerald-500/20">
                <div className="flex items-center gap-2 truncate">
                  <Recycle className="size-3.5 text-emerald-600 shrink-0" />
                  <SelectValue placeholder="Kategori" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Semua Kategori</SelectItem>
                {availableCategories.map((cat: string) => (
                  <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterQc} onValueChange={setFilterQc}>
              <SelectTrigger className="!w-full w-full h-9.5 rounded-xl bg-zinc-50/50 border-zinc-200 text-xs text-zinc-700 hover:bg-white hover:border-zinc-300 transition focus:ring-2 focus:ring-emerald-500/20">
                <div className="flex items-center gap-2 truncate">
                  <ShieldCheck className="size-3.5 text-teal-600 shrink-0" />
                  <SelectValue placeholder="Status QC" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Semua Status QC</SelectItem>
                <SelectItem value="tidak_perlu" className="text-xs">Bersih (Tanpa QC)</SelectItem>
                <SelectItem value="passed" className="text-xs">Lolos QC</SelectItem>
                <SelectItem value="adjusted" className="text-xs">Disesuaikan</SelectItem>
                <SelectItem value="pending" className="text-xs">Menunggu QC</SelectItem>
                <SelectItem value="rejected" className="text-xs">Ditolak</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filterWaktu === 'custom' && (
            <div className="flex flex-wrap items-end gap-3 rounded-xl bg-emerald-50/70 p-3.5 border border-emerald-200/80 animate-in fade-in slide-in-from-top-1">
              <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                <label className="text-[11px] font-semibold text-emerald-900">Dari Tanggal</label>
                <Input type="date" value={customDari} onChange={(e) => setCustomDari(e.target.value)} className="h-9 bg-white border-emerald-200 text-xs rounded-lg" />
              </div>
              <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                <label className="text-[11px] font-semibold text-emerald-900">Sampai Tanggal</label>
                <Input type="date" value={customSampai} onChange={(e) => setCustomSampai(e.target.value)} className="h-9 bg-white border-emerald-200 text-xs rounded-lg" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="border-0 bg-white p-4 shadow-sm ring-1 ring-zinc-100">
        <h3 className="mb-3 text-sm font-semibold text-zinc-900">Riwayat Sedekah Sampah</h3>
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-zinc-400">
            <HeartHandshake className="size-8 mx-auto mb-2 opacity-30" />
            <p>Tidak ada riwayat sedekah yang sesuai dengan filter.</p>
          </div>
        ) : (
          <SimpleTable
            headers={['Tanggal', 'Kode Trx', 'Kategori', 'Barang', 'Berat Kotor', 'Berat Bersih', 'Susut', 'Status QC']}
            rows={filtered.map((r: any) => [
              formatDate(r.tanggal),
              <span key="k" className="font-mono text-emerald-700 text-xs">{r.kode || '-'}</span>,
              r.kategori,
              r.barang,
              `${formatNumber(r.beratKotor, 2)} kg`,
              `${formatNumber(r.beratBersih, 2)} kg`,
              `${formatNumber(r.susut, 2)} kg`,
              <Badge key="qc" variant="outline" className={cn('text-[10px]', qcBadgeClass(r.qcStatus))}>{qcLabel(r.qcStatus)}</Badge>,
            ])}
            emptyMsg="Belum ada riwayat sedekah."
          />
        )}
      </Card>
      <p className="text-[11px] text-zinc-400">
        * Total berat dihitung dari item-level. {totalTransaksi > 0 ? `Tersebar di ${totalTransaksi} transaksi sedekah.` : ''}
      </p>
    </div>
  )
}

// ============================================================
// Pencairan View - REDESIGNED with withdrawal + release history
// ============================================================
function PencairanView({ data }: { data: any }) {
  const withdrawals = data.riwayat?.penarikan || []
  const releases = data.riwayat?.releaseSaldo || []
  const penukaran = data.riwayat?.penukaran || []

  const totalDitarik = withdrawals.reduce((s: number, w: any) => s + toNumber(w.jumlah), 0)
  const totalDirelease = releases.reduce((s: number, r: any) => s + toNumber(r.jumlah), 0)

  const [filterStatus, setFilterStatus] = useState<'all' | 'diproses' | 'selesai' | 'ditolak'>('all')

  const filteredWithdrawals = withdrawals.filter((w: any) => {
    if (filterStatus === 'all') return true
    return w.status === filterStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <Wallet className="size-5 text-emerald-600" /> Riwayat Pencairan & Penarikan
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Pantau penarikan saldo, pelepasan saldo tertahan, dan penukaran poin</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-emerald-700 font-medium">Total Penarikan Saldo</p>
              <Wallet className="size-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{formatRupiah(totalDitarik)}</p>
            <p className="mt-1 text-[10px] text-emerald-600/70">{withdrawals.length} transaksi</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-amber-700 font-medium">Total Saldo Di-release</p>
              <Unlock className="size-4 text-amber-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-700">{formatRupiah(totalDirelease)}</p>
            <p className="mt-1 text-[10px] text-amber-600/70">{releases.length} release</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-blue-700 font-medium">Total Penukaran Poin</p>
              <Gift className="size-4 text-blue-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-blue-700">{penukaran.length}x</p>
            <p className="mt-1 text-[10px] text-blue-600/70">produk ditukar</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="border-zinc-200">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-zinc-700">Filter Status:</span>
            {(['all', 'diproses', 'selesai', 'ditolak'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filterStatus === s
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {s === 'all' ? 'Semua' : s === 'diproses' ? 'Diproses' : s === 'selesai' ? 'Selesai' : 'Ditolak'}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Penarikan Saldo Table */}
      <Card className="border-zinc-200">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="size-4 text-emerald-600" /> Penarikan Saldo
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredWithdrawals.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-400">
              <Wallet className="size-8 mx-auto mb-2 opacity-40" />
              Belum ada riwayat penarikan
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-zinc-600">Kode</th>
                    <th className="text-left p-3 text-xs font-semibold text-zinc-600">Tanggal</th>
                    <th className="text-right p-3 text-xs font-semibold text-zinc-600">Jumlah</th>
                    <th className="text-center p-3 text-xs font-semibold text-zinc-600">Metode</th>
                    <th className="text-center p-3 text-xs font-semibold text-zinc-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWithdrawals.map((w: any, i: number) => (
                    <tr key={w.id || i} className="border-b hover:bg-zinc-50">
                      <td className="p-3 font-mono text-xs text-zinc-700">{w.receiptNo || w.id?.slice(-8)}</td>
                      <td className="p-3 text-zinc-700">{formatDateTime(w.tanggal)}</td>
                      <td className="p-3 text-right font-semibold text-emerald-700">{formatRupiah(w.jumlah)}</td>
                      <td className="p-3 text-center text-xs">
                        <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 capitalize">{w.metode || '-'}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          w.status === 'selesai' ? 'bg-emerald-100 text-emerald-700'
                          : w.status === 'diproses' ? 'bg-amber-100 text-amber-700'
                          : w.status === 'ditolak' ? 'bg-rose-100 text-rose-700'
                          : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          {w.status || 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Release Saldo Table */}
      {releases.length > 0 && (
        <Card className="border-zinc-200">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Unlock className="size-4 text-amber-600" /> Release Saldo Tertahan → Tersedia
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-zinc-600">Tanggal</th>
                    <th className="text-right p-3 text-xs font-semibold text-zinc-600">Jumlah</th>
                    <th className="text-center p-3 text-xs font-semibold text-zinc-600">Status</th>
                    <th className="text-left p-3 text-xs font-semibold text-zinc-600">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {releases.map((r: any, i: number) => (
                    <tr key={r.id || i} className="border-b hover:bg-zinc-50">
                      <td className="p-3 text-zinc-700">{formatDateTime(r.tanggal)}</td>
                      <td className="p-3 text-right font-semibold text-amber-700">{formatRupiah(r.jumlah)}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700">
                          {r.status || 'selesai'}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-zinc-500">{r.keterangan || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Penukaran Poin Table */}
      {penukaran.length > 0 && (
        <Card className="border-zinc-200">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="size-4 text-blue-600" /> Penukaran Poin
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-zinc-600">Tanggal</th>
                    <th className="text-left p-3 text-xs font-semibold text-zinc-600">Produk</th>
                    <th className="text-center p-3 text-xs font-semibold text-zinc-600">Qty</th>
                    <th className="text-right p-3 text-xs font-semibold text-zinc-600">Poin Dipakai</th>
                  </tr>
                </thead>
                <tbody>
                  {penukaran.map((r: any, i: number) => (
                    <tr key={r.id || i} className="border-b hover:bg-zinc-50">
                      <td className="p-3 text-zinc-700">{formatDate(r.tanggal)}</td>
                      <td className="p-3 text-zinc-700">{r.produk}</td>
                      <td className="p-3 text-center text-zinc-700">{formatNumber(toNumber(r.qty), 0)}</td>
                      <td className="p-3 text-right font-semibold text-blue-700">{r.poin} pt</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================================
// Poin View
// ============================================================
// ============================================================
// Poin View - REDESIGNED with summary + filter
// ============================================================
function PoinView({ data }: { data: any }) {
  const rows = data.riwayat?.poin || []
  const [filterTipe, setFilterTipe] = useState<'all' | 'earn' | 'spend'>('all')

  const filtered = rows.filter((r: any) => {
    if (filterTipe === 'all') return true
    return r.tipe === filterTipe || (filterTipe === 'earn' && r.poin > 0) || (filterTipe === 'spend' && r.poin < 0)
  })

  const totalEarned = rows.filter((r: any) => toNumber(r.poin) > 0).reduce((s: number, r: any) => s + toNumber(r.poin), 0)
  const totalSpent = rows.filter((r: any) => toNumber(r.poin) < 0).reduce((s: number, r: any) => s + Math.abs(toNumber(r.poin)), 0)
  const saldoPoin = data.saldo?.poin || 0

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
          <Award className="size-5 text-amber-500" /> Histori Poin
        </h2>
        <p className="text-xs text-zinc-500 mt-1">Pantau perolehan & penggunaan poin Anda</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-amber-700 font-medium">Saldo Poin Saat Ini</p>
              <Award className="size-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-700">{formatNumber(saldoPoin, 0)} pt</p>
            <p className="text-[10px] text-amber-600/70 mt-1">≈ {formatRupiah(saldoPoin * 100)} nilai tukar</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-emerald-700 font-medium">Total Poin Didapat</p>
              <TrendingUp className="size-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-700">+{formatNumber(totalEarned, 0)} pt</p>
            <p className="text-[10px] text-emerald-600/70 mt-1">{rows.filter((r: any) => toNumber(r.poin) > 0).length} transaksi earn</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-50 to-red-50 border-rose-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-rose-700 font-medium">Total Poin Dipakai</p>
              <Gift className="size-4 text-rose-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-rose-700">-{formatNumber(totalSpent, 0)} pt</p>
            <p className="text-[10px] text-rose-600/70 mt-1">{rows.filter((r: any) => toNumber(r.poin) < 0).length} transaksi spend</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="border-zinc-200">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
              <Filter className="size-3" /> Tipe:
            </span>
            {([
              { v: 'all', l: 'Semua' },
              { v: 'earn', l: 'Poin Didapat' },
              { v: 'spend', l: 'Poin Dipakai' },
            ] as const).map((s) => (
              <button
                key={s.v}
                onClick={() => setFilterTipe(s.v)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filterTipe === s.v
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {s.l}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-zinc-200">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-400">
              <Award className="size-10 mx-auto mb-2 opacity-30" />
              Belum ada histori poin
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-zinc-600">Tanggal</th>
                    <th className="text-center p-3 text-xs font-semibold text-zinc-600">Tipe</th>
                    <th className="text-right p-3 text-xs font-semibold text-zinc-600">Poin</th>
                    <th className="text-right p-3 text-xs font-semibold text-zinc-600">Saldo</th>
                    <th className="text-left p-3 text-xs font-semibold text-zinc-600">Deskripsi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r: any, i: number) => {
                    const poin = toNumber(r.poin)
                    const isEarn = poin > 0
                    return (
                      <tr key={r.id || i} className="border-b hover:bg-zinc-50">
                        <td className="p-3 text-zinc-700">{formatDate(r.tanggal)}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                            isEarn ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {isEarn ? 'Earn' : 'Spend'}
                          </span>
                        </td>
                        <td className={`p-3 text-right font-bold ${isEarn ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {isEarn ? '+' : ''}{poin} pt
                        </td>
                        <td className="p-3 text-right text-zinc-700">{formatNumber(toNumber(r.saldo), 0)}</td>
                        <td className="p-3 text-xs text-zinc-500">{r.deskripsi || '-'}</td>
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
// Simpanan View (koperasi) - REDESIGNED profesional
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
  if (!data) {
    return (
      <Card className="border-amber-200 bg-amber-50/30">
        <CardContent className="p-8 text-center">
          <Landmark className="size-12 mx-auto mb-3 text-amber-500/60" />
          <p className="text-sm font-semibold text-amber-800">Belum Terdaftar sebagai Anggota Koperasi</p>
          <p className="mt-1 text-xs text-amber-700">Hubungi admin untuk mendaftar sebagai anggota koperasi simpan pinjam.</p>
        </CardContent>
      </Card>
    )
  }

  const cards = [
    { jenis: 'pokok', label: 'Simpanan Pokok', saldo: data.simpanan.pokok, color: 'text-zinc-900', desc: 'Simpanan wajib sekali daftar', bg: 'from-zinc-50 to-zinc-100 border-zinc-200' },
    { jenis: 'wajib', label: 'Simpanan Wajib', saldo: data.simpanan.wajib, color: 'text-blue-700', desc: 'Setoran wajib bulanan', bg: 'from-blue-50 to-cyan-50 border-blue-200' },
    { jenis: 'sukarela', label: 'Simpanan Sukarela', saldo: data.simpanan.sukarela, color: 'text-emerald-700', desc: 'Bisa ditarik kapan saja', bg: 'from-emerald-50 to-teal-50 border-emerald-200' },
  ] as const

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <Landmark className="size-5 text-emerald-600" /> Simpanan Koperasi Saya
          </h2>
          <p className="text-xs text-zinc-500 mt-1">No. Anggota: <span className="font-mono font-semibold text-zinc-700">{data.profile?.nomorAnggota || user.anggotaId?.slice(-8)}</span></p>
        </div>
        {selectedJenis && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedJenis(null)}
            className="h-9 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Kembali ke Overview
          </Button>
        )}
      </div>

      {!selectedJenis ? (
        <>
          {/* Summary Cards - Gradient profesional */}
          <div className="grid gap-3 sm:grid-cols-3">
            {cards.map((c) => (
              <button
                key={c.jenis}
                type="button"
                onClick={() => setSelectedJenis(c.jenis)}
                className="group block w-full cursor-pointer rounded-xl text-left transition-all hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <Card className={`bg-gradient-to-br ${c.bg} p-5 transition group-hover:shadow-lg`}>
                  <div className="flex items-start justify-between">
                    <p className="text-xs text-zinc-600 font-medium">{c.label}</p>
                    <PiggyBank className={`size-4 ${c.color} opacity-60 group-hover:opacity-100 transition`} />
                  </div>
                  <p className={`mt-2 text-2xl font-bold ${c.color}`}>{formatRupiah(c.saldo)}</p>
                  <p className="mt-1 text-[10px] text-zinc-500">{c.desc}</p>
                  <div className="mt-3 flex items-center text-[10px] font-medium text-emerald-700/70 opacity-0 transition group-hover:opacity-100">
                    Lihat detail transaksi <ChevronRight className="size-3 ml-1" />
                  </div>
                </Card>
              </button>
            ))}
          </div>

          {/* Total Kas */}
          <Card className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100">Total Kas Tersimpan</p>
                  <p className="mt-2 text-3xl font-bold">{formatRupiah(data.simpanan.totalKasTersimpan)}</p>
                  <p className="mt-1 text-xs text-emerald-100/80">Gabungan Pokok + Wajib + Sukarela</p>
                </div>
                <Landmark className="size-12 opacity-30" />
              </div>
            </CardContent>
          </Card>

          {/* Status info */}
          <Card className="border-zinc-200">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-zinc-500">Status Keanggotaan</p>
                  <p className="font-semibold text-emerald-700 mt-1 flex items-center gap-1">
                    <ShieldCheck className="size-4" /> {data.profile?.status || 'Aktif'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Tanggal Bergabung</p>
                  <p className="font-semibold text-zinc-700 mt-1">{data.profile?.tanggalBergabung ? formatDate(data.profile.tanggalBergabung) : '-'}</p>
                </div>
              </div>
            </CardContent>
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
  const saldoSekarang = totalSetor - totalTarik

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[11px] font-semibold uppercase text-emerald-700">
          {label}
        </Badge>
        <span className="text-xs text-zinc-400">·</span>
        <span className="text-xs text-zinc-500">{rows.length} transaksi</span>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-emerald-700 font-medium">Saldo {label}</p>
              <PiggyBank className="size-3.5 text-emerald-600" />
            </div>
            <p className="mt-1.5 text-xl font-bold text-emerald-700">{formatRupiah(saldoSekarang)}</p>
            <p className="text-[9px] text-emerald-600/70">saldo saat ini</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-blue-700 font-medium">Total Setor</p>
              <TrendingUp className="size-3.5 text-blue-600" />
            </div>
            <p className="mt-1.5 text-xl font-bold text-blue-700">{formatRupiah(totalSetor)}</p>
            <p className="text-[9px] text-blue-600/70">{rows.filter((r) => r.tipe === 'setor').length}x setor</p>
          </CardContent>
        </Card>
        {totalTarik > 0 && (
          <Card className="bg-gradient-to-br from-rose-50 to-red-50 border-rose-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-rose-700 font-medium">Total Tarik</p>
                <Wallet className="size-3.5 text-rose-600" />
              </div>
              <p className="mt-1.5 text-xl font-bold text-rose-700">{formatRupiah(totalTarik)}</p>
              <p className="text-[9px] text-rose-600/70">{rows.filter((r) => r.tipe === 'tarik').length}x tarik</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filter bar */}
      <Card className="border-zinc-200">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-end gap-2">
            <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1 w-full mb-1">
              <Filter className="size-3" /> Filter Riwayat
            </span>
            <div className="flex items-center gap-1">
              {(['all', 'setor', 'tarik'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTipeFilter(t)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    tipeFilter === t
                      ? t === 'setor' ? 'bg-emerald-600 text-white'
                      : t === 'tarik' ? 'bg-rose-600 text-white'
                      : 'bg-emerald-600 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {t === 'all' ? 'Semua' : t === 'setor' ? 'Setor' : 'Tarik'}
                </button>
              ))}
            </div>
            <div>
              <Input
                type="date"
                value={dariInput}
                onChange={(e) => setDariInput(e.target.value)}
                className="h-9 w-36 bg-white"
                placeholder="Dari"
              />
            </div>
            <div>
              <Input
                type="date"
                value={sampaiInput}
                onChange={(e) => setSampaiInput(e.target.value)}
                className="h-9 w-36 bg-white"
                placeholder="Sampai"
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
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-zinc-200">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Landmark className="size-4 text-emerald-600" /> Riwayat Transaksi {label}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              Memuat transaksi...
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-400">
              <PiggyBank className="size-10 mx-auto mb-2 opacity-30" />
              Belum ada transaksi {label.toLowerCase()}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-zinc-600">Tanggal</th>
                    <th className="text-left p-3 text-xs font-semibold text-zinc-600">No. Transaksi</th>
                    <th className="text-center p-3 text-xs font-semibold text-zinc-600">Tipe</th>
                    <th className="text-right p-3 text-xs font-semibold text-zinc-600">Jumlah</th>
                    <th className="text-right p-3 text-xs font-semibold text-zinc-600">Saldo Setelah</th>
                    <th className="text-left p-3 text-xs font-semibold text-zinc-600">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any, i: number) => (
                    <tr key={r.id || i} className="border-b hover:bg-zinc-50">
                      <td className="p-3 text-xs text-zinc-700">{formatDateTime(r.tanggalTransaksi)}</td>
                      <td className="p-3 font-mono text-xs text-zinc-700">{r.nomorTransaksi}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          r.tipe === 'setor' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {r.tipe === 'setor' ? 'Setor' : 'Tarik'}
                        </span>
                      </td>
                      <td className={`p-3 text-right text-xs font-bold ${r.tipe === 'setor' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {r.tipe === 'setor' ? '+' : '-'} {formatRupiah(r.jumlah)}
                      </td>
                      <td className="p-3 text-right text-xs text-zinc-700">{formatRupiah(r.saldoSesudah)}</td>
                      <td className="p-3 text-xs text-zinc-500">{r.keterangan || '-'}</td>
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
// Pinjaman View (koperasi) - REDESIGNED with filter + summary cards
// ============================================================
function PinjamanView({ user }: { user: AuthUser }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [schedulePinjaman, setSchedulePinjaman] = useState<any>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'berjalan' | 'lunas' | 'diajukan' | 'ditolak'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!user.anggotaId) return
    api.personalDashboardKoperasi(user.anggotaId)
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user.anggotaId])

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />
  if (!data) {
    return (
      <Card className="border-amber-200 bg-amber-50/30">
        <CardContent className="p-8 text-center">
          <Landmark className="size-12 mx-auto mb-3 text-amber-500/60" />
          <p className="text-sm font-semibold text-amber-800">Belum Terdaftar sebagai Anggota Koperasi</p>
        </CardContent>
      </Card>
    )
  }

  const allPinjaman = data.riwayatKontrak || []
  const filtered = allPinjaman.filter((p: any) => {
    if (filterStatus === 'all') return true
    return p.status === filterStatus
  })

  const totalPinjaman = allPinjaman.reduce((s: number, p: any) => s + toNumber(p.jumlahPinjaman), 0)
  const totalSisa = allPinjaman.filter((p: any) => p.status === 'berjalan').reduce((s: number, p: any) => s + toNumber(p.sisaPinjaman), 0)
  const pinjamanAktif = allPinjaman.filter((p: any) => p.status === 'berjalan').length
  const pinjamanLunas = allPinjaman.filter((p: any) => p.status === 'lunas').length

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
          <HandCoins className="size-5 text-amber-600" /> Pinjaman Saya
        </h2>
        <p className="text-xs text-zinc-500 mt-1">No. Anggota: <span className="font-mono font-semibold text-zinc-700">{data.profile?.nomorAnggota || user.anggotaId?.slice(-8)}</span></p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-amber-700 font-medium">Total Pinjaman</p>
              <HandCoins className="size-3.5 text-amber-600" />
            </div>
            <p className="mt-1.5 text-lg font-bold text-amber-700">{formatRupiah(totalPinjaman)}</p>
            <p className="text-[9px] text-amber-600/70">{allPinjaman.length} kontrak</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-50 to-red-50 border-rose-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-rose-700 font-medium">Sisa Hutang</p>
              <AlertTriangle className="size-3.5 text-rose-600" />
            </div>
            <p className="mt-1.5 text-lg font-bold text-rose-700">{formatRupiah(totalSisa)}</p>
            <p className="text-[9px] text-rose-600/70">{pinjamanAktif} aktif</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-emerald-700 font-medium">Pinjaman Lunas</p>
              <CheckCircle2 className="size-3.5 text-emerald-600" />
            </div>
            <p className="mt-1.5 text-lg font-bold text-emerald-700">{pinjamanLunas}</p>
            <p className="text-[9px] text-emerald-600/70">kontrak selesai</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-blue-700 font-medium">Angsuran/Bulan</p>
              <CalendarClock className="size-3.5 text-blue-600" />
            </div>
            <p className="mt-1.5 text-lg font-bold text-blue-700">
              {allPinjaman.filter((p: any) => p.status === 'berjalan').length > 0
                ? formatRupiah(allPinjaman.filter((p: any) => p.status === 'berjalan').reduce((s: number, p: any) => s + toNumber(p.angsuranPerBulan), 0))
                : '-'}
            </p>
            <p className="text-[9px] text-blue-600/70">cicilan bulanan</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="border-zinc-200">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
              <Filter className="size-3" /> Status:
            </span>
            {([
              { v: 'all', l: 'Semua' },
              { v: 'berjalan', l: 'Berjalan' },
              { v: 'lunas', l: 'Lunas' },
              { v: 'diajukan', l: 'Diajukan' },
              { v: 'ditolak', l: 'Ditolak' },
            ] as const).map((s) => (
              <button
                key={s.v}
                onClick={() => setFilterStatus(s.v)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filterStatus === s.v
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {s.l}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-zinc-200">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <HandCoins className="size-4 text-amber-600" /> Riwayat Kontrak Pinjaman
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-400">
              <HandCoins className="size-10 mx-auto mb-2 opacity-30" />
              Belum ada pinjaman {filterStatus !== 'all' ? `dengan status "${filterStatus}"` : ''}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-zinc-600">No. Pinjaman</th>
                    <th className="text-left p-3 text-xs font-semibold text-zinc-600">Tanggal</th>
                    <th className="text-right p-3 text-xs font-semibold text-zinc-600">Jumlah</th>
                    <th className="text-center p-3 text-xs font-semibold text-zinc-600">Tenor</th>
                    <th className="text-right p-3 text-xs font-semibold text-zinc-600">Angsuran/Bln</th>
                    <th className="text-right p-3 text-xs font-semibold text-zinc-600">Sisa</th>
                    <th className="text-center p-3 text-xs font-semibold text-zinc-600">Status</th>
                    <th className="text-center p-3 text-xs font-semibold text-zinc-600">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p: any, i: number) => {
                    const key = p.id || `p-${i}`
                    const isExpanded = expanded === key
                    return (
                      <Fragment key={key}>
                        <tr className="border-b hover:bg-zinc-50 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : key)}>
                          <td className="p-3 font-mono text-xs text-zinc-700">{p.nomorPinjaman}</td>
                          <td className="p-3 text-xs text-zinc-700">{formatDate(p.tanggalPengajuan)}</td>
                          <td className="p-3 text-right font-semibold text-amber-700">{formatRupiah(p.jumlahPinjaman)}</td>
                          <td className="p-3 text-center text-xs text-zinc-600">{p.tenorBulan} bln</td>
                          <td className="p-3 text-right text-xs text-zinc-600">{formatRupiah(p.angsuranPerBulan)}</td>
                          <td className="p-3 text-right text-xs font-medium text-rose-700">{p.status === 'berjalan' ? formatRupiah(p.sisaPinjaman) : '-'}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                              p.status === 'lunas' ? 'bg-emerald-100 text-emerald-700'
                              : p.status === 'berjalan' ? 'bg-amber-100 text-amber-700'
                              : p.status === 'diajukan' ? 'bg-blue-100 text-blue-700'
                              : p.status === 'ditolak' ? 'bg-rose-100 text-rose-700'
                              : 'bg-zinc-100 text-zinc-600'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 border-emerald-200 px-2 text-[10px] text-emerald-700 hover:bg-emerald-50"
                                onClick={(e) => { e.stopPropagation(); setSchedulePinjaman(p) }}
                              >
                                <CalendarDays className="h-3 w-3" />
                                Jadwal
                              </Button>
                              <ChevronRight className={`size-4 text-zinc-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-zinc-50/50">
                            <td colSpan={8} className="p-4">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div>
                                  <p className="text-zinc-500">Suku Bunga:</p>
                                  <p className="font-semibold text-zinc-800">{toNumber(p.sukuBunga)}% / tahun</p>
                                </div>
                                <div>
                                  <p className="text-zinc-500">Biaya Admin:</p>
                                  <p className="font-semibold text-zinc-800">{formatRupiah(p.biayaAdmin)}</p>
                                </div>
                                <div>
                                  <p className="text-zinc-500">Total Angsuran:</p>
                                  <p className="font-semibold text-zinc-800">{formatRupiah(toNumber(p.angsuranPerBulan) * p.tenorBulan)}</p>
                                </div>
                                <div>
                                  <p className="text-zinc-500">Tanggal Pengajuan:</p>
                                  <p className="font-semibold text-zinc-800">{formatDateTime(p.tanggalPengajuan)}</p>
                                </div>
                                {p.keterangan && (
                                  <div className="col-span-2 sm:col-span-4">
                                    <p className="text-zinc-500">Keterangan:</p>
                                    <p className="text-zinc-700">{p.keterangan}</p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
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

// ============================================================
// PengaturanView — self-service profile + password management
// ============================================================
function PengaturanView({ user }: { user: AuthUser }) {
  const [tab, setTab] = useState<'profil' | 'password' | 'info'>('profil')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [nik, setNik] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (!user?.id) return
    api.profile.get(user.id)
      .then((res) => {
        setProfile(res.user)
        setName(res.user.name || '')
        setPhone(res.user.phone || '')
        setAddress(res.user.address || '')
        setNik(res.user.nik || '')
      })
      .catch((e) => toast.error('Gagal memuat profil: ' + e.message))
      .finally(() => setLoading(false))
  }, [user?.id])

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error('Nama tidak boleh kosong')
      return
    }
    setSaving(true)
    try {
      const res = await api.profile.update(user.id, { name, phone, address, nik })
      setProfile(res.user)
      toast.success(res.message || 'Profil berhasil diperbarui')
    } catch (e: any) {
      toast.error(e.message || 'Gagal menyimpan profil')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Semua field password wajib diisi')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password baru minimal 8 karakter')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password tidak cocok')
      return
    }
    setSaving(true)
    try {
      const res = await api.profile.update(user.id, { currentPassword, newPassword })
      toast.success('Password berhasil diubah')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e: any) {
      toast.error(e.message || 'Gagal mengubah password')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-zinc-900">Pengaturan Akun</h2>
        <p className="text-sm text-zinc-500">Kelola data diri, password, dan informasi akun Anda.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1">
        {([
          { id: 'profil' as const, label: 'Profil' },
          { id: 'password' as const, label: 'Ubah Password' },
          { id: 'info' as const, label: 'Info Akun' },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 rounded-md px-3 py-2 text-sm font-medium transition',
              tab === t.id ? 'bg-white text-emerald-700 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Profil */}
      {tab === 'profil' && (
        <Card className="border-0 bg-white shadow-sm ring-1 ring-zinc-100">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700">
                {name.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="font-semibold text-zinc-900">{name || 'User'}</p>
                <p className="text-xs text-zinc-500">{profile?.email || user.email}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">No. Telepon</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxx" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nik">NIK</Label>
                <Input id="nik" value={nik} onChange={(e) => setNik(e.target.value)} placeholder="16 digit NIK" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile?.email || user.email} disabled className="bg-zinc-50 text-zinc-500" />
                <p className="text-[10px] text-zinc-400">Email tidak dapat diubah. Hubungi admin jika perlu.</p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Alamat</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Alamat lengkap" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setName(profile?.name || '')
                setPhone(profile?.phone || '')
                setAddress(profile?.address || '')
                setNik(profile?.nik || '')
              }}>Batal</Button>
              <Button onClick={handleSaveProfile} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : 'Simpan Perubahan'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab: Password */}
      {tab === 'password' && (
        <Card className="border-0 bg-white shadow-sm ring-1 ring-zinc-100">
          <CardContent className="p-6">
            <div className="mb-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
              <Info className="mb-1 inline h-4 w-4" /> Password minimal 8 karakter. Demi keamanan, masukkan password saat ini sebelum mengganti.
            </div>
            <div className="grid gap-4 sm:max-w-md">
              <div className="space-y-2">
                <Label htmlFor="curpwd">Password Saat Ini</Label>
                <Input id="curpwd" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newpwd">Password Baru</Label>
                <Input id="newpwd" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 8 karakter" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confpwd">Konfirmasi Password Baru</Label>
                <Input id="confpwd" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ulangi password baru" />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={handleChangePassword} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengubah...</> : 'Ubah Password'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab: Info Akun */}
      {tab === 'info' && (
        <Card className="border-0 bg-white shadow-sm ring-1 ring-zinc-100">
          <CardContent className="p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow label="Kode Anggota" value={profile?.memberCode || '-'} />
              <InfoRow label="Status Keanggotaan" value={profile?.isMember ? 'Aktif' : 'Belum Aktif'} />
              <InfoRow label="Email Terverifikasi" value={profile?.emailVerifiedAt ? 'Ya' : 'Belum'} />
              <InfoRow label="Bergabung Sejak" value={profile?.memberJoinedAt ? formatDate(profile.memberJoinedAt) : '-'} />
              <InfoRow label="Terdaftar Sejak" value={profile?.createdAt ? formatDate(profile.createdAt) : '-'} />
              <InfoRow label="Role" value={(profile?.roles ? JSON.parse(profile.roles) : user.roles).join(', ') || '-'} />
            </div>
            <div className="mt-6 rounded-lg bg-zinc-50 p-4 text-xs text-zinc-600 ring-1 ring-zinc-100">
              <p className="font-semibold text-zinc-700">Butuh bantuan?</p>
              <p className="mt-1">Hubungi admin Bank Sampah Sukamaju Sejahtera jika ada data yang tidak dapat Anda ubah sendiri, seperti email, kode anggota, atau status keanggotaan.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-zinc-900">{value}</p>
    </div>
  )
}

export default UserDashboard