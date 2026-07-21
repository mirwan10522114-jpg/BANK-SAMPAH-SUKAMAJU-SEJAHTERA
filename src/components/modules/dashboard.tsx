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
import { Search, Plus, Heart, DollarSign, Package, Users, Download, TrendingUp, Scale, Recycle, Clock, Award, Wallet, ArrowRight, BarChart3, PieChart, Filter, MousePointerClick } from 'lucide-react'
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
  const [chartRange, setChartRange] = useState('1thn')
  const [chartDari, setChartDari] = useState('')
  const [chartSampai, setChartSampai] = useState('')
  // transaction log filters
  const [fQ, setFQ] = useState('')
  const [fTipe, setFTipe] = useState('Semua Tipe')
  const [fStatusQc, setFStatusQc] = useState('Semua Status QC')
  const [fKategori, setFKategori] = useState('Semua Kategori')
  const [fBarang, setFBarang] = useState('Semua Barang')
  const [fRange, setFRange] = useState('30')
  const [fLogDari, setFLogDari] = useState('')
  const [fLogSampai, setFLogSampai] = useState('')
  const [detailModal, setDetailModal] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.dashboard({
        q: fQ,
        tipe: fTipe === 'Semua Tipe' ? '' : fTipe,
        statusQc: fStatusQc === 'Semua Status QC' ? '' : fStatusQc,
        kategori: fKategori === 'Semua Kategori' ? '' : fKategori,
        barang: fBarang === 'Semua Barang' ? '' : fBarang,
        range: fRange,
        logDari: fRange === 'custom' ? fLogDari : undefined,
        logSampai: fRange === 'custom' ? fLogSampai : undefined,
        chartRange,
        chartDari: chartRange === 'custom' ? chartDari : undefined,
        chartSampai: chartRange === 'custom' ? chartSampai : undefined,
      })
      setData(d)
    } catch (e) {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [fQ, fTipe, fStatusQc, fKategori, fBarang, fRange, fLogDari, fLogSampai, chartRange, chartDari, chartSampai])

  useEffect(() => { load() }, [load])

  if (loading || !data) {
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

  const { topMetrics, todaySummary, timeSeries, composition, leaderboard, balanceStructure, transactionLog, filters } = data

  const nabungColumns: DetailColumn[] = [
    { key: 'transactedAt', label: 'Tanggal', format: (v) => formatDateTime(v) },
    { key: 'user.name', label: 'Nasabah', format: (v, row) => row.user?.name || '-' },
    { key: 'user.memberCode', label: 'Kode', format: (v, row) => row.user?.memberCode || '-' },
    { key: 'totalWeight', label: 'Berat (kg)', align: 'right', format: (v) => formatNumber(toNumber(v)) },
    { key: 'totalValue', label: 'Nilai', align: 'right', format: (v) => formatRupiah(toNumber(v)) },
    { key: 'pointsAwarded', label: 'Poin', align: 'right', format: (v) => formatNumber(toNumber(v), 0) },
    { key: 'qcStatus', label: 'QC', format: (v) => v === 'passed' ? 'Lolos' : v === 'adjusted' ? 'Disesuaikan' : v === 'pending' ? 'Menunggu' : v },
  ]
  const sedekahColumns: DetailColumn[] = [
    { key: 'transactedAt', label: 'Tanggal', format: (v) => formatDateTime(v) },
    { key: 'user.name', label: 'Nasabah', format: (v, row) => row.user?.name || row.donorName || '-' },
    { key: 'user.memberCode', label: 'Kode', format: (v, row) => row.user?.memberCode || '-' },
    { key: 'totalWeight', label: 'Berat Bersih (kg)', align: 'right', format: (v) => formatNumber(toNumber(v)) },
    { key: 'totalWeightKotor', label: 'Berat Kotor (kg)', align: 'right', format: (v) => formatNumber(toNumber(v)) },
    { key: 'qcStatus', label: 'QC', format: (v) => v === 'passed' ? 'Lolos' : v === 'adjusted' ? 'Disesuaikan' : v === 'pending' ? 'Menunggu' : v },
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
      label: 'Total Nilai Tabungan Sampah', value: formatRupiah(topMetrics.totalNilaiTabungan), icon: DollarSign, color: 'emerald', badge: 'Lolos QC',
      detail: {
        title: 'Detail Tabungan Sampah',
        description: 'Seluruh transaksi nabung yang lolos QC.',
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
      label: 'Total Sampah Ditabung', value: `${formatNumber(topMetrics.totalSampahDitabung, 1)} kg`, icon: Package, color: 'amber', badge: 'Lolos QC',
      detail: {
        title: 'Detail Tabungan Sampah (Berat)',
        description: 'Seluruh transaksi nabung yang lolos QC.',
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
      label: 'Total Sampah Disedekahkan', value: `${formatNumber(topMetrics.totalSampahDisedekahkan, 1)} kg`, icon: Heart, color: 'purple', badge: 'Lolos QC',
      detail: {
        title: 'Detail Sedekah Sampah',
        description: 'Seluruh transaksi sedekah yang lolos QC.',
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
    { label: 'Total Nasabah Terdaftar', value: formatNumber(topMetrics.totalNasabah, 0), icon: Users, color: 'cyan', badge: 'Terverifikasi' },
  ]

  const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-100' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', ring: 'ring-cyan-100' },
  }

  const summaryCards = [
    { label: 'Nabung Sah Hari Ini', value: `${todaySummary.nabungSahHariIni}`, unit: 'Trx', icon: Recycle, color: 'emerald' },
    { label: 'Sedekah Sah Hari Ini', value: `${todaySummary.sedekahSahHariIni}`, unit: 'Trx', icon: Heart, color: 'purple' },
    {
      label: 'Nilai Masuk Bersih', value: formatRupiah(todaySummary.nilaiMasukBersih), unit: '', icon: DollarSign, color: 'emerald',
      detail: {
        title: 'Detail Tabungan Sampah (Nilai Masuk)',
        description: 'Seluruh transaksi nabung yang lolos QC.',
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
      label: 'Total Berat Bersih', value: `${formatNumber(todaySummary.totalBeratBersih, 1)}`, unit: 'kg', icon: Scale, color: 'amber',
      detail: {
        title: 'Detail Tabungan Sampah (Berat Bersih)',
        description: 'Seluruh transaksi nabung yang lolos QC.',
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
    { label: 'Nasabah Aktif Hari Ini', value: `${todaySummary.nasabahAktifHariIni}`, unit: 'Orang', icon: Users, color: 'cyan' },
    {
      label: 'Menunggu QC • Global', value: `${todaySummary.menungguQcGlobal}`, unit: 'Trx', icon: Clock, color: 'purple',
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
  const maxLeaderboard = Math.max(...leaderboard.map((l: any) => l.kg), 1)

  return (
    <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Panel Eksekutif</p>
          <h2 className="mt-0.5 text-2xl font-bold tracking-tight text-zinc-900 lg:text-3xl">Executive Dashboard</h2>
          <p className="mt-1 text-sm text-zinc-500">Pemantauan analitik terpusat operasional Bank Sampah — data setelah QC.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => onNavigate('operasional')} className="bg-emerald-500 text-white shadow-sm hover:bg-emerald-600">
            <Plus className="mr-1.5 h-4 w-4" /> Nabung Baru
          </Button>
          <Button onClick={() => onNavigate('operasional')} className="bg-emerald-700 text-white shadow-sm hover:bg-emerald-800">
            <Heart className="mr-1.5 h-4 w-4" /> Sedekah Baru
          </Button>
        </div>
      </div>

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

      {/* ===== CHART SECTION ===== */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Filter Chart</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {rangeButtons.map((b) => (
              <button
                key={b.value}
                onClick={() => setChartRange(b.value)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                  chartRange === b.value ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50'
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
        {chartRange === 'custom' && (
          <div className="mb-3 flex flex-wrap items-end gap-2 rounded-xl bg-zinc-50 p-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Dari</label>
              <Input type="date" value={chartDari} onChange={(e) => setChartDari(e.target.value)} className="h-9 w-40 border-zinc-200 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Sampai</label>
              <Input type="date" value={chartSampai} onChange={(e) => setChartSampai(e.target.value)} className="h-9 w-40 border-zinc-200 text-sm" />
            </div>
            <Button onClick={load} disabled={!chartDari || !chartSampai} className="h-9 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
              <Filter className="mr-1.5 h-4 w-4" /> Terapkan
            </Button>
            {!chartDari && !chartSampai && (
              <p className="text-[11px] text-amber-600">Pilih tanggal dari & sampai lalu klik Terapkan</p>
            )}
          </div>
        )}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Trend line chart */}
          <Card className="border-0 bg-white shadow-sm ring-1 ring-zinc-100 lg:col-span-2">
            <CardContent className="p-5">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Tren Komparatif</p>
                  <h3 className="mt-0.5 text-base font-semibold text-zinc-900">Operasional Tabungan vs Sedekah</h3>
                  <p className="text-xs text-zinc-500">
                    Perbandingan pertumbuhan setelah QC.
                    {chartRange === 'custom' && chartDari && chartSampai && ` Periode: ${chartDari} s/d ${chartSampai}.`}
                    {chartRange !== 'custom' && ` Periode: ${rangeButtons.find((r) => r.value === chartRange)?.label}.`}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="border-zinc-200 text-xs text-zinc-600">
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Export
                </Button>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeries} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} kg`} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      formatter={(v: any, name: any) => {
                        if (name === 'Nilai Ekonomi') return [formatRupiah(v), name]
                        return [`${formatNumber(v, 2)} kg`, name]
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
                    <Line yAxisId="right" type="monotone" dataKey="tabunganBersih" name="Tabungan Bersih (kg)" stroke="#F59E0B" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                    <Line yAxisId="right" type="monotone" dataKey="sedekahBersih" name="Sedekah Bersih (kg)" stroke="#8B5CF6" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                    <Line yAxisId="left" type="monotone" dataKey="nilaiEkonomi" name="Nilai Ekonomi (Rp)" stroke="#10B981" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Composition donut */}
          <Card className="border-0 bg-white shadow-sm ring-1 ring-zinc-100">
            <CardContent className="p-5">
              <div className="mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Komposisi</p>
                <h3 className="mt-0.5 text-base font-semibold text-zinc-900">Jenis Sampah</h3>
                <p className="text-xs text-zinc-500">Kilogram bersih per kategori.</p>
              </div>
              {composition.length === 0 ? (
                <div className="flex h-72 flex-col items-center justify-center rounded-xl bg-zinc-50 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
                    <Package className="h-7 w-7 text-amber-500" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-zinc-600">Belum Ada Data Lolos QC</p>
                  <p className="mt-1 text-xs text-zinc-400">Selesaikan proses QC untuk melihat visualisasi.</p>
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RPieChart>
                      <Pie data={composition} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                        {composition.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
                        formatter={(v: any, n: any) => [`${formatNumber(v, 2)} kg`, n]}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" />
                    </RPieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ===== LEADERBOARD + BALANCE STRUCTURE ===== */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Leaderboard */}
        <Card className="border-0 bg-white shadow-sm ring-1 ring-zinc-100">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Leaderboard</p>
                <h3 className="text-base font-semibold text-zinc-900">Top 10 Pahlawan Lingkungan</h3>
                <p className="text-xs text-zinc-500">Kontribusi bersih terbanyak (kg valid).</p>
              </div>
            </div>
            {leaderboard.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-xl bg-zinc-50 text-center">
                <BarChart3 className="h-10 w-10 text-zinc-300" />
                <p className="mt-2 text-sm font-medium text-zinc-500">Belum Ada Kontribusi</p>
                <p className="mt-1 text-xs text-zinc-400">Data akan muncul setelah setoran lolos QC.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((l: any, i: number) => (
                  <div key={l.name + i} className="flex items-center gap-3">
                    <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-zinc-200 text-zinc-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-zinc-100 text-zinc-500')}>
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-medium text-zinc-900">{l.name} {l.memberCode && <span className="text-zinc-400">· {l.memberCode}</span>}</p>
                        <p className="text-sm font-bold text-emerald-600">{formatNumber(l.kg, 2)} kg</p>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" style={{ width: `${(l.kg / maxLeaderboard) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Balance Structure */}
        <Card className="border-0 bg-white shadow-sm ring-1 ring-zinc-100">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Struktur Saldo</p>
                <h3 className="text-base font-semibold text-zinc-900">Kas Nasabah</h3>
                <p className="text-xs text-zinc-500">Distribusi keamanan finansial.</p>
              </div>
            </div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Total Aset</span>
              <span className="text-2xl font-bold text-zinc-900">{formatRupiah(balanceStructure.totalAset)}</span>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-emerald-50/60 p-4 ring-1 ring-emerald-100">
                <button
                  onClick={() => setDetailModal({
                    title: 'Detail Penarikan Nasabah',
                    description: 'Riwayat penarikan saldo oleh nasabah.',
                    apiPath: '/finansial/penarikan', responsePath: 'list', columns: penarikanColumns,
                    sumField: 'amount', sumLabel: 'Total Penarikan', sumFormat: 'currency' as const,
                    extraFilters: [
                      { key: 'status', label: 'Status', options: [
                        { value: 'all', label: 'Semua' },
                        { value: 'diproses', label: 'Diproses' },
                        { value: 'sukses', label: 'Sukses' },
                        { value: 'ditolak', label: 'Ditolak' },
                      ]},
                      { key: 'method', label: 'Metode', options: [
                        { value: 'all', label: 'Semua' },
                        { value: 'cash', label: 'Tunai' },
                        { value: 'transfer', label: 'Transfer' },
                      ]},
                    ],
                  })}
                  className="flex w-full cursor-pointer items-center justify-between text-left transition hover:opacity-80"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-medium text-zinc-700">Saldo Tersedia</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-600">{formatRupiah(balanceStructure.saldoTersedia)}</span>
                </button>
                <p className="mt-1 pl-4 text-xs text-zinc-500">Siap dicairkan nasabah · klik untuk detail penarikan</p>
              </div>
            </div>
            <button onClick={() => onNavigate('master')} className="mt-4 flex w-full items-center justify-center gap-1 rounded-lg border border-zinc-200 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50">
              Kelola Nasabah <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </CardContent>
        </Card>
      </div>

      {/* ===== TRANSACTION LOG ===== */}
      <Card className="border-0 bg-white shadow-sm ring-1 ring-zinc-100">
        <CardContent className="p-5">
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Transaksi Detail</p>
            <h3 className="mt-0.5 text-base font-semibold text-zinc-900">Log Seluruh Transaksi</h3>
            <p className="text-xs text-zinc-500">Riwayat lengkap dengan filter analitik instan.</p>
          </div>

          {/* Filters */}
          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={fQ}
                onChange={(e) => setFQ(e.target.value)}
                placeholder="Cari Nasabah..."
                className="border-zinc-200 pl-9 text-sm"
              />
            </div>
            <Select value={fRange} onValueChange={setFRange}>
              <SelectTrigger className="border-zinc-200 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 Hari Terakhir</SelectItem>
                <SelectItem value="30">30 Hari Terakhir</SelectItem>
                <SelectItem value="90">90 Hari Terakhir</SelectItem>
                <SelectItem value="365">1 Tahun Terakhir</SelectItem>
                <SelectItem value="custom">Custom (Pilih Tanggal)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fTipe} onValueChange={setFTipe}>
              <SelectTrigger className="border-zinc-200 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua Tipe">Semua Tipe</SelectItem>
                <SelectItem value="nabung">Nabung</SelectItem>
                <SelectItem value="sedekah">Sedekah</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fStatusQc} onValueChange={setFStatusQc}>
              <SelectTrigger className="border-zinc-200 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua Status QC">Semua Status QC</SelectItem>
                <SelectItem value="passed">Lolos QC</SelectItem>
                <SelectItem value="adjusted">Disesuaikan</SelectItem>
                <SelectItem value="pending">Menunggu QC</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fKategori} onValueChange={setFKategori}>
              <SelectTrigger className="border-zinc-200 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua Kategori">Semua Kategori</SelectItem>
                {filters.kategori.map((k: any) => <SelectItem key={k.id} value={k.name}>{k.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Select value={fBarang} onValueChange={setFBarang}>
              <SelectTrigger className="border-zinc-200 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua Barang">Semua Barang</SelectItem>
                {filters.barang.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.code} · {b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {fRange === 'custom' && (
            <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl bg-zinc-50 p-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Dari</label>
                <Input type="date" value={fLogDari} onChange={(e) => setFLogDari(e.target.value)} className="h-9 w-40 border-zinc-200 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Sampai</label>
                <Input type="date" value={fLogSampai} onChange={(e) => setFLogSampai(e.target.value)} className="h-9 w-40 border-zinc-200 text-sm" />
              </div>
              <Button onClick={load} disabled={!fLogDari || !fLogSampai} className="h-9 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                <Filter className="mr-1.5 h-4 w-4" /> Terapkan
              </Button>
              {!fLogDari && !fLogSampai && (
                <p className="text-[11px] text-amber-600">Pilih tanggal dari & sampai lalu klik Terapkan</p>
              )}
            </div>
          )}

          {/* Summary */}
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-zinc-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Total Transaksi</p>
              <p className="mt-1 text-xl font-bold text-zinc-900">{formatNumber(transactionLog.total, 0)}</p>
            </div>
            <div className="rounded-xl bg-zinc-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Total Berat Bersih</p>
              <p className="mt-1 text-xl font-bold text-zinc-900">{formatNumber(transactionLog.totalBeratBersih, 1)} kg</p>
            </div>
            <div className="rounded-xl bg-zinc-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Total Nilai Bersih</p>
              <p className="mt-1 text-xl font-bold text-emerald-600">{formatRupiah(transactionLog.totalNilaiBersih)}</p>
            </div>
          </div>

          {/* Table */}
          <div className="max-h-[460px] overflow-auto rounded-xl border border-zinc-100">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-zinc-50">
                <tr>
                  {['Tanggal & Waktu', 'Nasabah & Kode', 'Kategori Sampah', 'Berat Bersih (kg)', 'Nilai Bersih (Rp)', 'Tipe', 'Status QC'].map((h) => (
                    <th key={h} className="whitespace-nowrap border-b border-zinc-100 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {transactionLog.rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
                          <Search className="h-6 w-6 text-zinc-400" />
                        </div>
                        <p className="text-sm font-medium text-zinc-500">Belum ada riwayat transaksi.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  transactionLog.rows.map((r: any) => (
                    <tr key={r.id} className="hover:bg-zinc-50/50">
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-zinc-600">{formatDateTime(r.transactedAt)}</td>
                      <td className="px-3 py-2.5">
                        <p className="text-xs font-medium text-zinc-900">{r.nasabah}</p>
                        {r.memberCode && <p className="text-[10px] text-zinc-400">{r.memberCode}</p>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-zinc-600">{r.kategori}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-zinc-900">{formatNumber(r.beratBersih, 3)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-emerald-600">{r.nilaiBersih > 0 ? formatRupiah(r.nilaiBersih) : '-'}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className={cn('text-[10px]',
                          r.tipe === 'nabung' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-purple-200 bg-purple-50 text-purple-700')}>
                          {r.tipe === 'nabung' ? 'Nabung' : 'Sedekah'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className={cn('text-[10px]',
                          r.qcStatus === 'passed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                          r.qcStatus === 'adjusted' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                          'border-zinc-200 bg-zinc-50 text-zinc-600')}>
                          {r.qcStatus === 'passed' ? 'Lolos QC' : r.qcStatus === 'adjusted' ? 'Disesuaikan' : 'Menunggu'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {transactionLog.rows.length > 0 && (
            <p className="mt-3 text-center text-[11px] text-zinc-400">Menampilkan {transactionLog.rows.length} dari {transactionLog.total} transaksi</p>
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
