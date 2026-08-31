'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { formatRupiah, formatNumber, formatDateTime, toNumber } from '@/lib/format'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Plus, Heart, DollarSign, Package, Users, Download, TrendingUp, Scale, Recycle, Clock, Award, Wallet, ArrowRight, BarChart3, PieChart, Filter, MousePointerClick, RotateCw, Calendar, Sparkles } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RPieChart, Pie, Cell, BarChart, Bar, LabelList,
} from 'recharts'
import { cn } from '@/lib/utils'
import { DashboardDetailModal, type DetailColumn } from '@/components/modules/dashboard-detail-modal'

type Section = 'dashboard' | 'master' | 'operasional' | 'koperasi' | 'inventaris' | 'teller'

const PIE_COLORS = ['#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1']

export function Dashboard({ onNavigate }: { onNavigate: (s: Section) => void }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Period / Range filter
  const [chartRange, setChartRange] = useState('1thn')
  const [chartDari, setChartDari] = useState('')
  const [chartSampai, setChartSampai] = useState('')

  // Transaction log filters
  const [fQ, setFQ] = useState('')
  const [fTipe, setFTipe] = useState('Semua Tipe')
  const [fStatusQc, setFStatusQc] = useState('Semua Status QC')
  const [fKategori, setFKategori] = useState('Semua Kategori')
  const [fBarang, setFBarang] = useState('Semua Barang')
  const [detailModal, setDetailModal] = useState<any>(null)

  const load = useCallback(async (isSilent = false) => {
    if (isSilent) setIsRefreshing(true)
    else setLoading(true)
    try {
      const d = await api.dashboard({
        q: fQ,
        tipe: fTipe === 'Semua Tipe' ? '' : fTipe,
        statusQc: fStatusQc === 'Semua Status QC' ? '' : fStatusQc,
        kategori: fKategori === 'Semua Kategori' ? '' : fKategori,
        barang: fBarang === 'Semua Barang' ? '' : fBarang,
        chartRange,
        chartDari: chartRange === 'custom' ? chartDari : undefined,
        chartSampai: chartRange === 'custom' ? chartSampai : undefined,
      })
      setData(d)
      setLastUpdated(new Date())
    } catch (e) {
      // ignore
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [fQ, fTipe, fStatusQc, fKategori, fBarang, chartRange, chartDari, chartSampai])

  // Initial load and periodic realtime polling (every 10s)
  useEffect(() => {
    load()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !detailModal) {
        load(true)
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [load, detailModal])

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    )
  }

  const { topMetrics, allTimeMetrics, todaySummary, timeSeries, composition, leaderboard, balanceStructure, transactionLog, filters, periodLabel } = data || {}

  const nabungColumns: DetailColumn[] = [
    { key: 'transactedAt', label: 'Tanggal', format: (v) => formatDateTime(v) },
    { key: 'kodeTransaksi', label: 'Kode Transaksi', format: (v, row) => row.kodeTransaksi || '-' },
    { key: 'user.name', label: 'Nasabah', format: (v, row) => row.user?.name || '-' },
    { key: 'user.memberCode', label: 'Kode Anggota', format: (v, row) => row.user?.memberCode || '-' },
    { key: 'totalWeight', label: 'Berat (kg)', align: 'right', format: (v) => formatNumber(toNumber(v)) },
    { key: 'totalValue', label: 'Nilai', align: 'right', format: (v) => formatRupiah(toNumber(v)) },
    { key: 'pointsAwarded', label: 'Poin', align: 'right', format: (v) => formatNumber(toNumber(v), 0) },
    { key: 'qcStatus', label: 'QC', format: (v) => v === 'passed' || v === 'tidak_perlu' ? 'Lolos' : v === 'adjusted' ? 'Disesuaikan' : v === 'pending' ? 'Menunggu' : v },
  ]
  const sedekahColumns: DetailColumn[] = [
    { key: 'transactedAt', label: 'Tanggal', format: (v) => formatDateTime(v) },
    { key: 'kodeTransaksi', label: 'Kode Transaksi', format: (v, row) => row.kodeTransaksi || '-' },
    { key: 'user.name', label: 'Nasabah', format: (v, row) => row.user?.name || row.donorName || '-' },
    { key: 'user.memberCode', label: 'Kode Anggota', format: (v, row) => row.user?.memberCode || '-' },
    { key: 'totalWeight', label: 'Berat Bersih (kg)', align: 'right', format: (v) => formatNumber(toNumber(v)) },
    { key: 'totalWeightKotor', label: 'Berat Kotor (kg)', align: 'right', format: (v) => formatNumber(toNumber(v)) },
    { key: 'qcStatus', label: 'QC', format: (v) => v === 'passed' || v === 'tidak_perlu' ? 'Lolos' : v === 'adjusted' ? 'Disesuaikan' : v === 'pending' ? 'Menunggu' : v },
  ]
  const penarikanColumns: DetailColumn[] = [
    { key: 'processedAt', label: 'Tanggal', format: (v) => formatDateTime(v) },
    { key: 'receiptNo', label: 'No. Ref' },
    { key: 'user.name', label: 'Nasabah', format: (v, row) => row.user?.name || '-' },
    { key: 'user.memberCode', label: 'Kode', format: (v, row) => row.user?.memberCode || '-' },
    { key: 'amount', label: 'Nominal', align: 'right', format: (v) => formatRupiah(toNumber(v)) },
    { key: 'method', label: 'Metode', format: (v) => v === 'cash' ? 'Tunai' : v === 'transfer' ? 'Transfer' : v },
    { key: 'status', label: 'Status' },
  ]

  const topCards = [
    {
      label: 'Total Nilai Tabungan Sampah', value: formatRupiah(topMetrics?.totalNilaiTabungan || 0), icon: DollarSign, color: 'emerald', badge: 'Lolos QC',
      subLabel: allTimeMetrics ? `Semua waktu: ${formatRupiah(allTimeMetrics.totalNilaiTabungan)}` : undefined,
      detail: {
        title: 'Detail Tabungan Sampah',
        description: `Seluruh transaksi nabung yang lolos QC (${periodLabel || 'Periode Aktif'}).`,
        apiPath: '/operasional/nabung', columns: nabungColumns,
        sumField: 'totalValue', sumLabel: 'Total Nilai Tabungan', sumFormat: 'currency' as const,
        extraFilters: [
          { key: 'qcStatus', label: 'Status QC', options: [
            { value: 'all', label: 'Semua' },
            { value: 'passed', label: 'Lolos' },
            { value: 'adjusted', label: 'Disesuaikan' },
            { value: 'pending', label: 'Menunggu' },
          ]},
        ],
      },
    },
    {
      label: 'Total Sampah Ditabung', value: `${formatNumber(topMetrics?.totalSampahDitabung || 0, 1)} kg`, icon: Package, color: 'amber', badge: 'Lolos QC',
      subLabel: allTimeMetrics ? `Semua waktu: ${formatNumber(allTimeMetrics.totalSampahDitabung, 1)} kg` : undefined,
      detail: {
        title: 'Detail Tabungan Sampah (Berat)',
        description: `Seluruh transaksi nabung yang lolos QC (${periodLabel || 'Periode Aktif'}).`,
        apiPath: '/operasional/nabung', columns: nabungColumns,
        sumField: 'totalWeight', sumLabel: 'Total Berat (kg)', sumFormat: 'qty' as const,
        extraFilters: [
          { key: 'qcStatus', label: 'Status QC', options: [
            { value: 'all', label: 'Semua' },
            { value: 'passed', label: 'Lolos' },
            { value: 'adjusted', label: 'Disesuaikan' },
            { value: 'pending', label: 'Menunggu' },
          ]},
        ],
      },
    },
    {
      label: 'Total Sampah Disedekahkan', value: `${formatNumber(topMetrics?.totalSampahDisedekahkan || 0, 1)} kg`, icon: Heart, color: 'purple', badge: 'Lolos QC',
      subLabel: allTimeMetrics ? `Semua waktu: ${formatNumber(allTimeMetrics.totalSampahDisedekahkan, 1)} kg` : undefined,
      detail: {
        title: 'Detail Sedekah Sampah',
        description: `Seluruh transaksi sedekah yang lolos QC (${periodLabel || 'Periode Aktif'}).`,
        apiPath: '/operasional/sedekah', columns: sedekahColumns,
        sumField: 'totalWeight', sumLabel: 'Total Berat Bersih (kg)', sumFormat: 'qty' as const,
        extraFilters: [
          { key: 'qcStatus', label: 'Status QC', options: [
            { value: 'all', label: 'Semua' },
            { value: 'passed', label: 'Lolos' },
            { value: 'adjusted', label: 'Disesuaikan' },
            { value: 'pending', label: 'Menunggu' },
          ]},
        ],
      },
    },
    { label: 'Total Nasabah Terdaftar', value: `${topMetrics?.totalNasabah || 0}`, icon: Users, color: 'blue', badge: 'Terverifikasi' },
  ]

  const summaryCards = [
    {
      label: 'Nabung Sah Hari Ini', value: `${todaySummary?.nabungSahHariIni || 0}`, unit: 'Trx', icon: Recycle, color: 'emerald',
      detail: {
        title: 'Detail Nabung Sah Hari Ini',
        description: 'Transaksi nabung yang selesai dan sah hari ini.',
        apiPath: '/operasional/nabung', columns: nabungColumns,
        sumField: 'totalWeight', sumLabel: 'Total Berat (kg)', sumFormat: 'qty' as const,
        baseParams: { dari: new Date().toISOString().split('T')[0] },
      },
    },
    {
      label: 'Sedekah Sah Hari Ini', value: `${todaySummary?.sedekahSahHariIni || 0}`, unit: 'Trx', icon: Heart, color: 'purple',
      detail: {
        title: 'Detail Sedekah Sah Hari Ini',
        description: 'Transaksi sedekah yang selesai dan sah hari ini.',
        apiPath: '/operasional/sedekah', columns: sedekahColumns,
        sumField: 'totalWeight', sumLabel: 'Total Berat (kg)', sumFormat: 'qty' as const,
        baseParams: { dari: new Date().toISOString().split('T')[0] },
      },
    },
    {
      label: 'Nilai Masuk Bersih', value: formatRupiah(todaySummary?.nilaiMasukBersih || 0), unit: '', icon: DollarSign, color: 'emerald',
      detail: {
        title: 'Detail Nilai Masuk Hari Ini',
        description: 'Total nilai tabungan sampah yang sah hari ini.',
        apiPath: '/operasional/nabung', columns: nabungColumns,
        sumField: 'totalValue', sumLabel: 'Total Nilai Masuk', sumFormat: 'currency' as const,
        baseParams: { dari: new Date().toISOString().split('T')[0] },
      },
    },
    {
      label: 'Total Berat Bersih', value: `${formatNumber(todaySummary?.totalBeratBersih || 0, 1)}`, unit: 'kg', icon: Scale, color: 'amber',
      detail: {
        title: 'Detail Berat Bersih Hari Ini',
        description: 'Total berat tabungan + sedekah yang sah hari ini.',
        apiPath: '/operasional/nabung', columns: nabungColumns,
        sumField: 'totalWeight', sumLabel: 'Total Berat (kg)', sumFormat: 'qty' as const,
        baseParams: { dari: new Date().toISOString().split('T')[0] },
      },
    },
    { label: 'Nasabah Aktif Hari Ini', value: `${todaySummary?.nasabahAktifHariIni || 0}`, unit: 'Orang', icon: Users, color: 'cyan' },
    {
      label: 'Menunggu QC • Global', value: `${todaySummary?.menungguQcGlobal || 0}`, unit: 'Trx', icon: Clock, color: 'purple',
      detail: {
        title: 'Detail Transaksi Menunggu QC',
        description: 'Transaksi nabung yang masih menunggu QC.',
        apiPath: '/operasional/nabung', columns: nabungColumns,
        sumField: 'totalWeight', sumLabel: 'Total Berat (kg)', sumFormat: 'qty' as const,
        baseParams: { qcStatus: 'pending' },
      },
    },
  ]

  const rangeButtons = [
    { value: '1bul', label: '1 Bulan' },
    { value: '3bul', label: '3 Bulan' },
    { value: '6bul', label: '6 Bulan' },
    { value: '1thn', label: '1 Tahun' },
    { value: 'custom', label: 'Custom' },
  ]
  const maxLeaderboard = Math.max(...(leaderboard || []).map((l: any) => l.kg), 1)

  const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-100' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', ring: 'ring-cyan-100' },
  }

  return (
    <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Panel Eksekutif</p>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] font-medium text-emerald-700">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Real-time Live
            </Badge>
          </div>
          <h2 className="mt-0.5 text-2xl font-bold tracking-tight text-zinc-900 lg:text-3xl">Executive Dashboard</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Pemantauan analitik terpusat operasional Bank Sampah — Data terverifikasi QC ({periodLabel}).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => load(true)} variant="outline" size="sm" className="h-9 gap-1.5 text-xs text-zinc-600 hover:text-emerald-700">
            <RotateCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin text-emerald-600')} />
            Segarkan Data
          </Button>
          <Button onClick={() => onNavigate('operasional')} className="bg-emerald-500 text-white shadow-sm hover:bg-emerald-600">
            <Plus className="mr-1.5 h-4 w-4" /> Nabung Baru
          </Button>
          <Button onClick={() => onNavigate('operasional')} className="bg-emerald-700 text-white shadow-sm hover:bg-emerald-800">
            <Heart className="mr-1.5 h-4 w-4" /> Sedekah Baru
          </Button>
        </div>
      </div>

      {/* ===== GLOBAL UNIFIED PERIOD FILTER BAR ===== */}
      <Card className="border-0 bg-white shadow-sm ring-1 ring-zinc-200/80">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 mr-2">
                <Calendar className="h-4 w-4 text-emerald-600" />
                <span>Filter Periode Analitik:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {rangeButtons.map((b) => (
                  <button
                    key={b.value}
                    onClick={() => setChartRange(b.value)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                      chartRange === b.value ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600' : 'bg-zinc-50 text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-100'
                    )}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <span>Periode Aktif: <strong className="text-zinc-700">{periodLabel}</strong></span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Diperbarui: <strong className="text-zinc-600">{lastUpdated.toLocaleTimeString('id-ID')}</strong></span>
            </div>
          </div>

          {chartRange === 'custom' && (
            <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-emerald-900">Dari Tanggal</label>
                <Input type="date" value={chartDari} onChange={(e) => setChartDari(e.target.value)} className="h-9 w-40 bg-white border-zinc-200 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-emerald-900">Sampai Tanggal</label>
                <Input type="date" value={chartSampai} onChange={(e) => setChartSampai(e.target.value)} className="h-9 w-40 bg-white border-zinc-200 text-sm" />
              </div>
              <Button onClick={() => load(false)} disabled={!chartDari || !chartSampai} className="h-9 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                <Filter className="mr-1.5 h-3.5 w-3.5" /> Terapkan Filter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== TOP METRIC CARDS ===== */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {topCards.map((c) => {
          const Icon = c.icon
          const col = colorMap[c.color]
          const clickable = !!c.detail
          return (
            <Card
              key={c.label}
              onClick={clickable ? () => setDetailModal(c.detail) : undefined}
              className={cn(
                'overflow-hidden border-0 bg-white shadow-sm ring-1 ring-zinc-100',
                clickable && 'cursor-pointer transition-shadow hover:shadow-md hover:ring-emerald-200',
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl ring-4', col.bg, col.text, col.ring)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] font-medium text-emerald-700">
                      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> {c.badge}
                    </Badge>
                    {clickable && (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50/70 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700">
                        <MousePointerClick className="h-3 w-3" /> Detail
                      </span>
                    )}
                  </div>
                </div>
                <p className={cn('mt-4 text-2xl font-bold', c.color === 'emerald' ? 'text-emerald-600' : 'text-zinc-900')}>{c.value}</p>
                <p className="mt-0.5 text-xs font-medium text-zinc-500">{c.label}</p>
                {c.subLabel && (
                  <p className="mt-1 text-[11px] text-zinc-400">{c.subLabel}</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ===== TODAY SUMMARY (6 cards) ===== */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Ringkasan Hari Ini</span>
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] font-medium text-emerald-700">Lolos QC</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {summaryCards.map((c) => {
            const Icon = c.icon
            const col = colorMap[c.color]
            const clickable = !!c.detail
            return (
              <Card
                key={c.label}
                onClick={clickable ? () => setDetailModal(c.detail) : undefined}
                className={cn(
                  'border-0 bg-white shadow-sm ring-1 ring-zinc-100',
                  clickable && 'cursor-pointer transition-shadow hover:shadow-md hover:ring-emerald-200',
                )}
              >
                <CardContent className="p-4">
                  <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', col.bg, col.text)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="mt-3 text-xl font-bold text-zinc-900">{c.value}<span className="ml-1 text-xs font-normal text-zinc-400">{c.unit}</span></p>
                  <p className="mt-0.5 text-[11px] font-medium text-zinc-500">{c.label}</p>
                  {clickable && (
                    <p className="mt-1 inline-flex items-center gap-0.5 text-[9px] font-medium text-emerald-700">
                      <MousePointerClick className="h-3 w-3" /> Klik untuk detail
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* ===== CHARTS SECTION ===== */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tren Komparatif Line Chart (2 cols) */}
        <Card className="border-0 bg-white shadow-sm ring-1 ring-zinc-100 lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Tren Komparatif</p>
                <h3 className="text-base font-bold text-zinc-900">Operasional Tabungan vs Sedekah</h3>
                <p className="text-xs text-zinc-500">Perbandingan pertumbuhan setelah QC. Periode: {periodLabel}.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="self-start text-xs text-zinc-600 sm:self-auto"
                onClick={() => {
                  const header = 'Bulan,Tabungan Bersih (kg),Sedekah Bersih (kg),Nilai Ekonomi (Rp)\n'
                  const rows = (timeSeries || []).map((t: any) => `"${t.month}",${t.tabunganBersih},${t.sedekahBersih},${t.nilaiEkonomi}`).join('\n')
                  const blob = new Blob([header + rows], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `tren-operasional-${chartRange}.csv`
                  a.click()
                }}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Export
              </Button>
            </div>

            <div className="mt-6 h-72 w-full">
              {(timeSeries || []).every((t: any) => t.tabunganBersih === 0 && t.sedekahBersih === 0 && t.nilaiEkonomi === 0) ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <TrendingUp className="h-10 w-10 text-zinc-200" />
                  <p className="mt-2 text-sm text-zinc-400">Belum ada aktivitas operasional pada periode ini.</p>
                  <p className="text-xs text-zinc-400">Lakukan setoran nabung/sedekah di Teller Wizard untuk melihat visualisasi grafik.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeries || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="kg" orientation="left" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} unit=" kg" />
                    <YAxis yAxisId="rp" orientation="right" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', fontSize: 12 }}
                      formatter={(v: any, name: any) => {
                        if (name === 'Nilai Ekonomi (Rp)') return [formatRupiah(v), name]
                        return [`${formatNumber(v, 2)} kg`, name]
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
                    <Line yAxisId="kg" type="monotone" dataKey="tabunganBersih" name="Tabungan Bersih (kg)" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3, fill: '#F59E0B' }} activeDot={{ r: 5 }} />
                    <Line yAxisId="kg" type="monotone" dataKey="sedekahBersih" name="Sedekah Bersih (kg)" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 3, fill: '#8B5CF6' }} activeDot={{ r: 5 }} />
                    <Line yAxisId="rp" type="monotone" dataKey="nilaiEkonomi" name="Nilai Ekonomi (Rp)" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3, fill: '#10B981' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Komposisi Jenis Sampah Donut Chart (1 col) */}
        <Card className="border-0 bg-white shadow-sm ring-1 ring-zinc-100">
          <CardContent className="p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Komposisi</p>
            <h3 className="text-base font-bold text-zinc-900">Jenis Sampah</h3>
            <p className="text-xs text-zinc-500">Kilogram bersih per kategori ({periodLabel}).</p>

            <div className="mt-6 h-56 w-full">
              {(!composition || composition.length === 0) ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <PieChart className="h-10 w-10 text-zinc-200" />
                  <p className="mt-2 text-sm text-zinc-400">Belum ada data komposisi.</p>
                  <p className="text-xs text-zinc-400">Selesaikan proses setoran untuk melihat visualisasi.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RPieChart>
                    <Pie
                      data={composition}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {composition.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
                      formatter={(v: any) => [`${formatNumber(v, 2)} kg`, 'Berat Bersih']}
                    />
                  </RPieChart>
                </ResponsiveContainer>
              )}
            </div>

            {composition && composition.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
                {composition.map((c: any, i: number) => (
                  <div key={c.name} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-zinc-600">{c.name}</span>
                    <strong className="text-zinc-900">{formatNumber(c.value, 1)} kg</strong>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== LEADERBOARD & BALANCE STRUCTURE ===== */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top 10 Leaderboard (2 cols) */}
        <Card className="border-0 bg-white shadow-sm ring-1 ring-zinc-100 lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">Leaderboard</p>
                <h3 className="text-base font-bold text-zinc-900">Top 10 Pahlawan Lingkungan</h3>
                <p className="text-xs text-zinc-500">Kontribusi bersih terbanyak ({periodLabel}).</p>
              </div>
              <Award className="h-6 w-6 text-amber-500" />
            </div>

            <div className="mt-6 space-y-3">
              {(!leaderboard || leaderboard.length === 0) ? (
                <div className="flex h-40 flex-col items-center justify-center text-center">
                  <Award className="h-8 w-8 text-zinc-200" />
                  <p className="mt-2 text-sm text-zinc-400">Belum Ada Kontribusi</p>
                  <p className="text-xs text-zinc-400">Data akan muncul setelah setoran nasabah diproses.</p>
                </div>
              ) : (
                leaderboard.map((l: any, i: number) => {
                  const pct = Math.min(100, Math.round((l.kg / maxLeaderboard) * 100))
                  const isTop3 = i < 3
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                        i === 0 ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-300' :
                        i === 1 ? 'bg-zinc-200 text-zinc-700' :
                        i === 2 ? 'bg-amber-50 text-amber-700' :
                        'bg-zinc-100 text-zinc-500'
                      )}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-zinc-900 truncate">{l.name}</span>
                          <span className="font-bold text-emerald-600 ml-2 shrink-0">{formatNumber(l.kg, 1)} kg</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className={cn('h-full transition-all duration-500 rounded-full', isTop3 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-zinc-300')}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Struktur Saldo Kas Nasabah (1 col) */}
        <Card className="border-0 bg-white shadow-sm ring-1 ring-zinc-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Struktur Saldo</p>
                <h3 className="text-base font-bold text-zinc-900">Kas Nasabah</h3>
                <p className="text-xs text-zinc-500">Distribusi keamanan finansial.</p>
              </div>
              <Wallet className="h-6 w-6 text-emerald-600" />
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl bg-zinc-50 p-4 border border-zinc-100">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Total Aset</p>
                <p className="mt-1 text-2xl font-bold text-zinc-900">{formatRupiah(balanceStructure?.totalAset || 0)}</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-100 bg-emerald-50/40">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <div>
                      <p className="text-xs font-semibold text-zinc-800">Saldo Tersedia</p>
                      <p className="text-[10px] text-zinc-400">Siap dicairkan nasabah</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-emerald-700">{formatRupiah(balanceStructure?.saldoTersedia || 0)}</p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-100 bg-zinc-50/50">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <div>
                      <p className="text-xs font-semibold text-zinc-800">Saldo Tertahan</p>
                      <p className="text-[10px] text-zinc-400">Menunggu verifikasi rilis</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-zinc-700">{formatRupiah(balanceStructure?.saldoTertahan || 0)}</p>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full text-xs text-zinc-600 hover:text-emerald-700"
                onClick={() => onNavigate('operasional')}
              >
                Kelola Nasabah <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== LOG SELURUH TRANSAKSI ===== */}
      <Card className="border-0 bg-white shadow-sm ring-1 ring-zinc-100">
        <CardContent className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Transaksi Detail</p>
              <h3 className="text-base font-bold text-zinc-900">Log Seluruh Transaksi</h3>
              <p className="text-xs text-zinc-500">Riwayat lengkap pada periode {periodLabel}.</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-zinc-500">Total: <strong className="text-zinc-800">{transactionLog?.total || 0} Trx</strong></span>
              <span className="text-zinc-300">•</span>
              <span className="text-zinc-500">Berat: <strong className="text-zinc-800">{formatNumber(transactionLog?.totalBeratBersih || 0, 1)} kg</strong></span>
              <span className="text-zinc-300">•</span>
              <span className="text-zinc-500">Nilai: <strong className="text-emerald-600">{formatRupiah(transactionLog?.totalNilaiBersih || 0)}</strong></span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <div className="relative col-span-2 sm:col-span-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
              <Input
                placeholder="Cari Nasabah..."
                value={fQ}
                onChange={(e) => setFQ(e.target.value)}
                className="h-8 pl-8 text-xs border-zinc-200"
              />
            </div>
            <Select value={fTipe} onValueChange={setFTipe}>
              <SelectTrigger className="h-8 text-xs border-zinc-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua Tipe">Semua Tipe</SelectItem>
                <SelectItem value="nabung">Nabung</SelectItem>
                <SelectItem value="sedekah">Sedekah</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fStatusQc} onValueChange={setFStatusQc}>
              <SelectTrigger className="h-8 text-xs border-zinc-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua Status QC">Semua Status QC</SelectItem>
                <SelectItem value="passed">Lolos QC</SelectItem>
                <SelectItem value="tidak_perlu">Tanpa QC / Bersih</SelectItem>
                <SelectItem value="adjusted">Disesuaikan</SelectItem>
                <SelectItem value="pending">Menunggu</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fKategori} onValueChange={setFKategori}>
              <SelectTrigger className="h-8 text-xs border-zinc-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua Kategori">Semua Kategori</SelectItem>
                {(filters?.kategori || []).map((k: any) => (
                  <SelectItem key={k.id} value={k.name}>{k.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={fBarang} onValueChange={setFBarang}>
              <SelectTrigger className="h-8 text-xs border-zinc-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua Barang">Semua Barang</SelectItem>
                {(filters?.barang || []).map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-100">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-100 bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-3 py-2.5">Tanggal</th>
                  <th className="px-3 py-2.5">Kode Transaksi</th>
                  <th className="px-3 py-2.5">Nasabah</th>
                  <th className="px-3 py-2.5">Barang</th>
                  <th className="px-3 py-2.5">Kategori</th>
                  <th className="px-3 py-2.5 text-right">Berat (kg)</th>
                  <th className="px-3 py-2.5 text-right">Nilai (Rp)</th>
                  <th className="px-3 py-2.5">Tipe</th>
                  <th className="px-3 py-2.5">Status QC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {(!transactionLog?.rows || transactionLog.rows.length === 0) ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-zinc-400">
                      Tidak ada transaksi yang cocok dengan filter pada periode {periodLabel}.
                    </td>
                  </tr>
                ) : (
                  transactionLog.rows.map((r: any) => (
                    <tr key={r.id} className="hover:bg-zinc-50/60 transition">
                      <td className="whitespace-nowrap px-3 py-2.5 text-zinc-500 font-mono text-[11px]">
                        {formatDateTime(r.transactedAt)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] font-medium text-emerald-700">
                        {r.kodeTransaksi}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-medium text-zinc-800">
                        {r.nasabah}
                        {r.memberCode && <span className="ml-1 text-[10px] text-zinc-400 font-mono">({r.memberCode})</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-zinc-700">{r.barang}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-zinc-500">{r.kategori}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-zinc-900">{formatNumber(r.beratBersih, 3)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-emerald-600">{r.nilaiBersih > 0 ? formatRupiah(r.nilaiBersih) : '-'}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className={cn('text-[10px]',
                          r.tipe === 'nabung' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-purple-200 bg-purple-50 text-purple-700')}>
                          {r.tipe === 'nabung' ? 'Nabung' : 'Sedekah'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className={cn('text-[10px]',
                          r.qcStatus === 'passed' || r.qcStatus === 'tidak_perlu' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                          r.qcStatus === 'adjusted' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                          'border-zinc-200 bg-zinc-50 text-zinc-600')}>
                          {r.qcStatus === 'passed' || r.qcStatus === 'tidak_perlu' ? 'Lolos QC' : r.qcStatus === 'adjusted' ? 'Disesuaikan' : 'Menunggu'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {transactionLog?.rows?.length > 0 && (
            <p className="mt-3 text-center text-[11px] text-zinc-400">Menampilkan {transactionLog.rows.length} dari {transactionLog.total} transaksi ({periodLabel})</p>
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
