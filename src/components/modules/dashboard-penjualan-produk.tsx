'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, getActingUserHeader } from '@/lib/api'
import { formatRupiah, formatNumber, formatDateTime, toNumber } from '@/lib/format'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Filter, RotateCcw, ShoppingBag, Store, Globe, TrendingUp, Receipt, MousePointerClick, Search } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { cn } from '@/lib/utils'
import { DashboardDetailModal, type DetailColumn } from '@/components/modules/dashboard-detail-modal'

const fmtDateTime = (v: any) => formatDateTime(v)

const PERIODE_OPTIONS = [
  { value: 'bulan_ini', label: 'Bulan Ini' },
  { value: '1bul', label: '1 Bulan' },
  { value: '3bul', label: '3 Bulan' },
  { value: '6bul', label: '6 Bulan' },
  { value: '1thn', label: '1 Tahun' },
  { value: 'custom', label: 'Custom' },
]

export function DashboardPenjualanProduk() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState('bulan_ini')
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [detailModal, setDetailModal] = useState<any>(null)

  // ===== Chart trend: separate period filter =====
  const [chartPeriode, setChartPeriode] = useState('1thn')
  const [chartDari, setChartDari] = useState('')
  const [chartSampai, setChartSampai] = useState('')
  const [chartData, setChartData] = useState<any[]>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [chartKey, setChartKey] = useState(0) // force chart re-render

  // ===== Recent transactions: separate filter =====
  const [txChannel, setTxChannel] = useState('all')
  const [txStatus, setTxStatus] = useState('all')
  const [txDari, setTxDari] = useState('')
  const [txSampai, setTxSampai] = useState('')
  const [txSearch, setTxSearch] = useState('')
  const [txList, setTxList] = useState<any[]>([])
  const [txLoading, setTxLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.dashboardPenjualanProduk({
        periode,
        dari: periode === 'custom' ? dari : undefined,
        sampai: periode === 'custom' ? sampai : undefined,
      })
      setData(d)
    } catch (e) {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [periode, dari, sampai])

  useEffect(() => { load() }, [load])

  // ===== Load chart trend data (separate API call with its own period) =====
  const loadChart = useCallback(async () => {
    setChartLoading(true)
    try {
      const d = await api.dashboardPenjualanProduk({
        periode: chartPeriode,
        dari: chartPeriode === 'custom' ? chartDari : undefined,
        sampai: chartPeriode === 'custom' ? chartSampai : undefined,
      })
      setChartData(d.trend || [])
      setChartKey((k) => k + 1) // force BarChart to re-render
    } catch (e) {
      // ignore
    } finally {
      setChartLoading(false)
    }
  }, [chartPeriode, chartDari, chartSampai])

  useEffect(() => { loadChart() }, [loadChart])

  // ===== Load recent transactions with filters =====
  const loadTransactions = useCallback(async () => {
    setTxLoading(true)
    try {
      const params = new URLSearchParams()
      if (txChannel !== 'all') params.set('channel', txChannel)
      if (txStatus !== 'all') params.set('status', txStatus)
      if (txDari) params.set('dari', txDari)
      if (txSampai) params.set('sampai', txSampai)
      if (txSearch) params.set('q', txSearch)
      const qs = params.toString()
      const actingUser = getActingUserHeader()
      const sep = qs ? '&' : '?'
      const url = `/api/toko/admin/penjualan${qs ? '?' + qs : ''}${actingUser ? sep + 'actingUser=' + actingUser : ''}`
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (actingUser) headers['x-acting-user'] = actingUser
      const res = await fetch(url, { headers })
      if (res.ok) {
        const json = await res.json()
        const orders = json.orders || []
        // Sort by date desc and take 50
        orders.sort((a: any, b: any) => new Date(b.transactedAt).getTime() - new Date(a.transactedAt).getTime())
        setTxList(orders.slice(0, 50))
      }
    } catch (e) {
      // ignore
    } finally {
      setTxLoading(false)
    }
  }, [txChannel, txStatus, txDari, txSampai, txSearch])

  useEffect(() => { loadTransactions() }, [loadTransactions])

  const reset = () => {
    setPeriode('bulan_ini')
    setDari('')
    setSampai('')
  }

  const resetChartFilter = () => {
    setChartPeriode('1thn')
    setChartDari('')
    setChartSampai('')
  }

  const resetTxFilter = () => {
    setTxChannel('all')
    setTxStatus('all')
    setTxDari('')
    setTxSampai('')
    setTxSearch('')
  }

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    )
  }

  const { metrics, byProduct } = data
  const trend = chartData // use chart-specific data

  // ===== Column configs for detail modal =====
  const penjualanColumns: DetailColumn[] = [
    { key: 'transactedAt', label: 'Tanggal', format: fmtDateTime },
    { key: 'channel', label: 'Channel', format: (v) => v === 'offline' ? 'Offline' : 'Online' },
    { key: 'refNumber', label: 'No. Ref' },
    { key: 'buyerName', label: 'Pembeli' },
    { key: 'totalQuantity', label: 'Qty', align: 'right', format: (v) => formatNumber(toNumber(v), 0) },
    { key: 'totalValue', label: 'Subtotal', align: 'right', format: (v) => formatRupiah(toNumber(v)) },
    { key: 'ongkir', label: 'Ongkir', align: 'right', format: (v, row) => row.channel === 'online' ? formatRupiah(toNumber(v)) : '-' },
    { key: 'paymentMethod', label: 'Bayar' },
    { key: 'status', label: 'Status' },
  ]

  const metricCards = [
    {
      label: 'Total Penjualan', value: formatRupiah(metrics.totalPenjualan), icon: ShoppingBag, color: 'purple',
      sub: `${formatNumber(metrics.countOffline + metrics.countOnline, 0)} transaksi`,
      detail: {
        title: 'Detail Penjualan Produk',
        description: 'Seluruh transaksi penjualan offline & online yang telah dibayar.',
        apiPath: '/toko/admin/penjualan',
        responsePath: 'orders',
        columns: penjualanColumns,
        sumField: 'totalValue', sumLabel: 'Total Penjualan', sumFormat: 'currency' as const,
        extraFilters: [
          { key: 'channel', label: 'Channel', options: [
            { value: 'all', label: 'Semua' },
            { value: 'offline', label: 'Offline' },
            { value: 'online', label: 'Online' },
          ]},
        ],
      },
    },
    {
      label: 'Total Offline', value: formatRupiah(metrics.totalOffline), icon: Store, color: 'purple',
      sub: `${formatNumber(metrics.countOffline, 0)} transaksi`,
      detail: {
        title: 'Detail Penjualan Offline',
        description: 'Transaksi kasir offline (ProductSale) yang telah dibayar.',
        apiPath: '/toko/admin/penjualan',
        responsePath: 'orders',
        columns: penjualanColumns,
        sumField: 'totalValue', sumLabel: 'Total Penjualan Offline', sumFormat: 'currency' as const,
        baseParams: { channel: 'offline' },
      },
    },
    {
      label: 'Total Online', value: formatRupiah(metrics.totalOnline), icon: Globe, color: 'purple',
      sub: `${formatNumber(metrics.countOnline, 0)} order`,
      detail: {
        title: 'Detail Penjualan Online',
        description: 'Order online (TokoOrder) yang telah dibayar.',
        apiPath: '/toko/admin/penjualan',
        responsePath: 'orders',
        columns: penjualanColumns,
        sumField: 'totalValue', sumLabel: 'Total Penjualan Online', sumFormat: 'currency' as const,
        baseParams: { channel: 'online' },
      },
    },
    {
      label: 'Laba Kotor', value: formatRupiah(metrics.labaKotor), icon: TrendingUp, color: 'purple',
      sub: `Margin ${formatNumber(metrics.marginKotor, 1)}% · COGS ${formatRupiah(metrics.totalCOGS)}`,
      detail: {
        title: 'Detail Penjualan (Laba Kotor)',
        description: 'Total penjualan dikurangi estimasi COGS dari input pengolahan.',
        apiPath: '/toko/admin/penjualan',
        responsePath: 'orders',
        columns: penjualanColumns,
        sumField: 'totalValue', sumLabel: 'Total Penjualan', sumFormat: 'currency' as const,
      },
    },
    {
      label: 'Total Transaksi', value: formatNumber(metrics.countOffline + metrics.countOnline, 0), icon: Receipt, color: 'purple',
      sub: `${formatNumber(metrics.totalUnitTerjual, 0)} unit terjual`,
      detail: {
        title: 'Detail Transaksi Penjualan',
        description: 'Seluruh transaksi penjualan offline & online yang telah dibayar.',
        apiPath: '/toko/admin/penjualan',
        responsePath: 'orders',
        columns: penjualanColumns,
        sumField: 'totalValue', sumLabel: 'Total Penjualan', sumFormat: 'currency' as const,
      },
    },
  ]

  const colorMap: Record<string, { bg: string; text: string; ring: string; valueText: string }> = {
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-100', valueText: 'text-zinc-900' },
  }

  const periodeLabel = (p: string) => PERIODE_OPTIONS.find(o => o.value === p)?.label || p

  return (
    <div className="space-y-5">
      {/* ===== PERIOD FILTER BAR (for metrics) ===== */}
      <Card className="border-0 bg-white shadow-sm ring-1 ring-zinc-100">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Periode Metrik</label>
            <Select value={periode} onValueChange={setPeriode}>
              <SelectTrigger className="h-9 w-40 border-zinc-200 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {periode === 'custom' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Dari</label>
                <Input type="date" value={dari} onChange={(e) => setDari(e.target.value)} className="h-9 w-40 border-zinc-200 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Sampai</label>
                <Input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} className="h-9 w-40 border-zinc-200 text-sm" />
              </div>
            </>
          )}
          <Button onClick={load} className="h-9 bg-purple-600 text-white shadow-sm hover:bg-purple-700">
            <Filter className="mr-1.5 h-4 w-4" /> Terapkan
          </Button>
          <Button onClick={reset} variant="outline" className="h-9 border-zinc-200 text-sm text-zinc-600">
            <RotateCcw className="mr-1.5 h-4 w-4" /> Reset
          </Button>
        </CardContent>
      </Card>

      {/* ===== 5 METRIC CARDS (clickable) ===== */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metricCards.map((c) => {
          const Icon = c.icon
          const col = colorMap[c.color]
          return (
            <Card
              key={c.label}
              onClick={() => setDetailModal(c.detail)}
              className="cursor-pointer border-0 bg-white shadow-sm ring-1 ring-zinc-100 transition-shadow hover:shadow-md hover:ring-purple-200"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{c.label}</p>
                    <p className={cn('mt-2 text-2xl font-bold', col.valueText)}>{c.value}</p>
                    <p className="mt-0.5 text-[10px] text-zinc-400">{c.sub}</p>
                    <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-purple-50/70 px-1.5 py-0.5 text-[9px] font-medium text-purple-700">
                      <MousePointerClick className="h-3 w-3" /> Klik untuk detail
                    </div>
                  </div>
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl ring-4', col.bg, col.text, col.ring)}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ===== CHARTS ROW ===== */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Trend bar chart — with its own period filter */}
        <Card className="border-0 bg-white shadow-sm ring-1 ring-zinc-100 lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">Tren Penjualan (Offline vs Online)</h3>
                <p className="text-xs text-zinc-500">Periode: {periodeLabel(chartPeriode)}{chartPeriode === 'custom' && chartDari && chartSampai ? ` (${chartDari} s/d ${chartSampai})` : ''}</p>
              </div>
              {/* Chart period filter */}
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">Filter Waktu</label>
                  <Select value={chartPeriode} onValueChange={setChartPeriode}>
                    <SelectTrigger className="h-8 w-32 border-zinc-200 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PERIODE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {chartPeriode === 'custom' && (
                  <>
                    <Input type="date" value={chartDari} onChange={(e) => setChartDari(e.target.value)} className="h-8 w-32 border-zinc-200 text-xs" />
                    <Input type="date" value={chartSampai} onChange={(e) => setChartSampai(e.target.value)} className="h-8 w-32 border-zinc-200 text-xs" />
                  </>
                )}
                <Button size="sm" onClick={loadChart} disabled={chartLoading} className="h-8 bg-purple-600 text-white hover:bg-purple-700 text-xs">
                  {chartLoading ? 'Memuat...' : 'Terapkan'}
                </Button>
                <Button size="sm" variant="outline" onClick={resetChartFilter} className="h-8 border-zinc-200 text-xs text-zinc-600">
                  <RotateCcw className="mr-1 h-3 w-3" /> Reset
                </Button>
              </div>
            </div>
            {chartLoading ? (
              <div className="flex h-72 items-center justify-center rounded-xl bg-zinc-50">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-300 border-t-purple-600" />
              </div>
            ) : trend.length === 0 ? (
              <div className="flex h-72 flex-col items-center justify-center rounded-xl bg-zinc-50 text-center">
                <ShoppingBag className="h-10 w-10 text-zinc-300" />
                <p className="mt-2 text-sm font-medium text-zinc-500">Belum Ada Penjualan</p>
                <p className="mt-1 text-xs text-zinc-400">Data muncul setelah ada transaksi pada periode ini.</p>
              </div>
            ) : (
              <div className="h-72 w-full" key={chartKey}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      formatter={(v: any, name: any) => [formatRupiah(v), name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
                    <Bar dataKey="offline" name="Offline" stackId="a" fill="#8B5CF6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="online" name="Online" stackId="a" fill="#EC4899" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top products */}
        <Card className="border-0 bg-white shadow-sm ring-1 ring-zinc-100">
          <CardContent className="p-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-zinc-900">Top 10 Produk</h3>
              <p className="text-xs text-zinc-500">Berdasarkan revenue · {periodeLabel(periode)}.</p>
            </div>
            {byProduct.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-xl bg-zinc-50 text-center">
                <ShoppingBag className="h-10 w-10 text-zinc-300" />
                <p className="mt-2 text-sm font-medium text-zinc-500">Belum Ada Data Produk</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-auto space-y-2">
                {byProduct.map((p: any, i: number) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      i === 0 ? 'bg-purple-100 text-purple-700' : i === 1 ? 'bg-zinc-200 text-zinc-700' : i === 2 ? 'bg-pink-100 text-pink-700' : 'bg-zinc-100 text-zinc-500')}>
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-medium text-zinc-900">{p.name}</p>
                        <p className="text-sm font-bold text-purple-600">{formatRupiah(p.revenue)}</p>
                      </div>
                      <p className="text-[11px] text-zinc-400">{formatNumber(p.qty, 0)} unit · margin {formatNumber(p.margin, 1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== RECENT TRANSACTIONS — with filters ===== */}
      <Card className="border-0 bg-white shadow-sm ring-1 ring-zinc-100">
        <CardContent className="p-5">
          <div className="mb-3">
            <h3 className="text-base font-semibold text-zinc-900">Transaksi Terbaru</h3>
            <p className="text-xs text-zinc-500">Riwayat transaksi penjualan dengan filter.</p>
          </div>

          {/* Filter bar for transactions */}
          <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">Dari</label>
              <Input type="date" value={txDari} onChange={(e) => setTxDari(e.target.value)} className="h-8 w-36 border-zinc-200 text-xs" />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">Sampai</label>
              <Input type="date" value={txSampai} onChange={(e) => setTxSampai(e.target.value)} className="h-8 w-36 border-zinc-200 text-xs" />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">Channel</label>
              <Select value={txChannel} onValueChange={setTxChannel}>
                <SelectTrigger className="h-8 w-32 border-zinc-200 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">Status</label>
              <Select value={txStatus} onValueChange={setTxStatus}>
                <SelectTrigger className="h-8 w-36 border-zinc-200 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="selesai">Selesai</SelectItem>
                  <SelectItem value="diproses">Diproses</SelectItem>
                  <SelectItem value="dikirim">Dikirim</SelectItem>
                  <SelectItem value="diterima">Diterima</SelectItem>
                  <SelectItem value="dibayar">Dibayar</SelectItem>
                  <SelectItem value="menunggu_pembayaran">Menunggu Bayar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative flex-1 min-w-[180px]">
              <label className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">Cari</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') loadTransactions() }}
                  placeholder="Cari pembeli / no. order..."
                  className="h-8 border-zinc-200 pl-8 text-xs"
                />
              </div>
            </div>
            <Button size="sm" onClick={loadTransactions} disabled={txLoading} className="h-8 bg-purple-600 text-white hover:bg-purple-700 text-xs">
              {txLoading ? 'Memuat...' : <><Filter className="mr-1 h-3 w-3" /> Terapkan</>}
            </Button>
            <Button size="sm" variant="outline" onClick={resetTxFilter} className="h-8 border-zinc-200 text-xs text-zinc-600">
              <RotateCcw className="mr-1 h-3 w-3" /> Reset
            </Button>
          </div>

          {/* Transaction table */}
          <div className="max-h-[460px] overflow-auto rounded-xl border border-zinc-100">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-zinc-50">
                <tr>
                  {['Tanggal', 'Channel', 'No. Ref', 'Pembeli', 'Qty', 'Subtotal', 'Ongkir', 'Total', 'Status'].map((h) => (
                    <th key={h} className="whitespace-nowrap border-b border-zinc-100 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {txLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-300 border-t-purple-600" />
                        <p className="text-sm text-zinc-500">Memuat transaksi...</p>
                      </div>
                    </td>
                  </tr>
                ) : txList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
                          <ShoppingBag className="h-6 w-6 text-zinc-400" />
                        </div>
                        <p className="text-sm font-medium text-zinc-500">Belum ada transaksi.</p>
                        <p className="text-xs text-zinc-400">Coba ubah filter atau reset.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  txList.map((r: any) => (
                    <tr key={r.id} className="hover:bg-zinc-50/50">
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-zinc-600">{formatDateTime(r.transactedAt)}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className={cn('text-[10px]',
                          r.channel === 'offline' ? 'border-purple-200 bg-purple-50 text-purple-700' : 'border-pink-200 bg-pink-50 text-pink-700')}>
                          {r.channel === 'offline' ? 'Offline' : 'Online'}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-zinc-600">{r.refNumber}</td>
                      <td className="px-3 py-2.5 text-xs font-medium text-zinc-900">{r.buyerName}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-zinc-600">{formatNumber(toNumber(r.totalQuantity), 0)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-zinc-900">{formatRupiah(toNumber(r.totalValue))}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-zinc-600">{r.channel === 'online' ? formatRupiah(toNumber(r.ongkir)) : '-'}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs font-bold text-purple-600">{formatRupiah(toNumber(r.totalValue) + toNumber(r.ongkir || 0))}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className="text-[10px] border-zinc-200 bg-zinc-50 text-zinc-600">{r.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!txLoading && txList.length > 0 && (
            <p className="mt-3 text-center text-[11px] text-zinc-400">Menampilkan {txList.length} transaksi</p>
          )}
        </CardContent>
      </Card>

      {/* ===== DETAIL MODAL ===== */}
      {detailModal && (
        <DashboardDetailModal
          open={!!detailModal}
          onClose={() => setDetailModal(null)}
          {...detailModal}
        />
      )}
    </div>
  )
}
