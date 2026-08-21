'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { formatRupiah, formatNumber, formatDate, formatDateTime, toNumber } from '@/lib/format'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Filter, RotateCcw, FileText, Landmark, CreditCard, AlertTriangle, Users, TrendingUp, TrendingDown, ArrowDownRight, ArrowUpRight, MousePointerClick } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import { cn } from '@/lib/utils'
import { DashboardDetailModal, type DetailColumn } from '@/components/modules/dashboard-detail-modal'

const SIMPANAN_COLORS = { pokok: '#2563EB', wajib: '#10B981', sukarela: '#F97316' }

export function DashboardKoperasi() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  // period filter
  const [periode, setPeriode] = useState('bulan_ini')
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  // log filters
  const [fQ, setFQ] = useState('')
  const [fWaktu, setFWaktu] = useState('Semua Waktu')
  const [fLogDari, setFLogDari] = useState('')
  const [fLogSampai, setFLogSampai] = useState('')
  const [fJenis, setFJenis] = useState('Semua Jenis')
  const [fStatus, setFStatus] = useState('Semua Status')
  const [detailModal, setDetailModal] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.dashboardKoperasi({
        periode,
        dari: periode === 'custom' ? dari : undefined,
        sampai: periode === 'custom' ? sampai : undefined,
        q: fQ,
        waktu: fWaktu,
        logDari: fWaktu === 'custom' ? fLogDari : undefined,
        logSampai: fWaktu === 'custom' ? fLogSampai : undefined,
        jenis: fJenis,
        status: fStatus,
      })
      setData(d)
    } catch (e) {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [periode, dari, sampai, fQ, fWaktu, fLogDari, fLogSampai, fJenis, fStatus])

  useEffect(() => { load() }, [load])

  const reset = () => {
    setPeriode('bulan_ini')
    setDari('')
    setSampai('')
    setFQ('')
    setFWaktu('Semua Waktu')
    setFJenis('Semua Jenis')
    setFStatus('Semua Status')
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

  const { metrics, arusKasTrend, komposisiSimpanan, transactionLog } = data

  // ===== Column configs for detail modal =====
  const kasColumns: DetailColumn[] = [
    { key: 'tanggalTransaksi', label: 'Tanggal', format: (v) => formatDateTime(v) },
    { key: 'keterangan', label: 'Keterangan', format: (v) => v || '-' },
    { key: 'sumber', label: 'Sumber', format: (v) => v },
    { key: 'tipe', label: 'Tipe', format: (v) => v === 'masuk' ? 'Masuk' : 'Keluar' },
    { key: 'jumlah', label: 'Jumlah', align: 'right', format: (v) => formatRupiah(toNumber(v)) },
    { key: 'createdBy.name', label: 'Petugas', format: (v, row) => row.createdBy?.name || '-' },
  ]
  const simpananColumns: DetailColumn[] = [
    { key: 'tanggalTransaksi', label: 'Tanggal', format: (v) => formatDateTime(v) },
    { key: 'nomorTransaksi', label: 'No. Transaksi' },
    { key: 'anggota.nama', label: 'Anggota', format: (v, row) => row.anggota?.nama || '-' },
    { key: 'anggota.nomorAnggota', label: 'Kode', format: (v, row) => row.anggota?.nomorAnggota || '-' },
    { key: 'jenisSimpanan', label: 'Jenis', format: (v) => v === 'pokok' ? 'Pokok' : v === 'wajib' ? 'Wajib' : 'Sukarela' },
    { key: 'tipe', label: 'Tipe', format: (v) => v === 'setor' ? 'Setor' : 'Tarik' },
    { key: 'jumlah', label: 'Jumlah', align: 'right', format: (v) => formatRupiah(toNumber(v)) },
  ]
  const pinjamanColumns: DetailColumn[] = [
    { key: 'tanggalPengajuan', label: 'Tgl Pengajuan', format: (v) => formatDate(v) },
    { key: 'nomorPinjaman', label: 'No. Pinjaman' },
    { key: 'anggota.nama', label: 'Anggota', format: (v, row) => row.anggota?.nama || '-' },
    { key: 'anggota.nomorAnggota', label: 'Kode', format: (v, row) => row.anggota?.nomorAnggota || '-' },
    { key: 'jumlahPinjaman', label: 'Pinjaman', align: 'right', format: (v) => formatRupiah(toNumber(v)) },
    { key: 'sisaPinjaman', label: 'Sisa', align: 'right', format: (v) => formatRupiah(toNumber(v)) },
    { key: 'tenorBulan', label: 'Tenor', align: 'right', format: (v) => `${formatNumber(toNumber(v), 0)} bln` },
    { key: 'status', label: 'Status' },
  ]

  const metricCards = [
    {
      label: 'Total Kas', value: formatRupiah(metrics.totalKas), icon: FileText, color: 'blue', sub: 'Saldo kas koperasi',
      detail: {
        title: 'Detail Kas Koperasi',
        description: 'Seluruh transaksi kas koperasi (masuk & keluar).',
        apiPath: '/koperasi/kas', responsePath: 'list', columns: kasColumns,
        sumField: 'jumlah', sumLabel: 'Total Mutasi Kas', sumFormat: 'currency' as const,
        extraFilters: [
          { key: 'tipe', label: 'Tipe', options: [
            { value: 'all', label: 'Semua' },
            { value: 'masuk', label: 'Masuk' },
            { value: 'keluar', label: 'Keluar' },
          ]},
          { key: 'sumber', label: 'Sumber', options: [
            { value: 'all', label: 'Semua' },
            { value: 'simpanan', label: 'Simpanan' },
            { value: 'penarikan', label: 'Penarikan' },
            { value: 'pinjaman', label: 'Pinjaman' },
            { value: 'angsuran', label: 'Angsuran' },
            { value: 'denda', label: 'Denda' },
            { value: 'saldo_awal', label: 'Saldo Awal' },
          ]},
        ],
      },
    },
    {
      label: 'Total Simpanan', value: formatRupiah(metrics.totalSimpanan), icon: Landmark, color: 'green', sub: 'Pokok + Wajib + Sukarela',
      detail: {
        title: 'Detail Simpanan',
        description: 'Seluruh transaksi simpanan koperasi.',
        apiPath: '/koperasi/simpanan', columns: simpananColumns,
        sumField: 'jumlah', sumLabel: 'Total Mutasi Simpanan', sumFormat: 'currency' as const,
        extraFilters: [
          { key: 'jenisSimpanan', label: 'Jenis', options: [
            { value: 'all', label: 'Semua' },
            { value: 'pokok', label: 'Pokok' },
            { value: 'wajib', label: 'Wajib' },
            { value: 'sukarela', label: 'Sukarela' },
          ]},
          { key: 'tipe', label: 'Tipe', options: [
            { value: 'all', label: 'Semua' },
            { value: 'setor', label: 'Setor' },
            { value: 'tarik', label: 'Tarik' },
          ]},
        ],
      },
    },
    {
      label: 'Sisa Pinjaman', value: formatRupiah(metrics.sisaPinjaman), icon: CreditCard, color: 'orange', sub: 'Outstanding berjalan',
      detail: {
        title: 'Detail Pinjaman Berjalan',
        description: 'Daftar pinjaman dengan status berjalan.',
        apiPath: '/koperasi/pinjaman', columns: pinjamanColumns,
        sumField: 'sisaPinjaman', sumLabel: 'Total Sisa Pinjaman', sumFormat: 'currency' as const,
        baseParams: { status: 'berjalan' },
        extraFilters: [
          { key: 'status', label: 'Status', options: [
            { value: 'all', label: 'Semua' },
            { value: 'berjalan', label: 'Berjalan' },
            { value: 'lunas', label: 'Lunas' },
            { value: 'diajukan', label: 'Diajukan' },
            { value: 'disetujui', label: 'Disetujui' },
            { value: 'ditolak', label: 'Ditolak' },
          ]},
        ],
      },
    },
    {
      label: 'Pemasukan Denda', value: formatRupiah(metrics.pemasukanDenda), icon: AlertTriangle, color: 'red', sub: 'Denda keterlambatan', isNegative: true,
      detail: {
        title: 'Detail Pemasukan Denda',
        description: 'Transaksi kas koperasi dengan sumber denda.',
        apiPath: '/koperasi/kas', responsePath: 'list', columns: kasColumns,
        sumField: 'jumlah', sumLabel: 'Total Denda', sumFormat: 'currency' as const,
        baseParams: { sumber: 'denda' },
      },
    },
    { label: 'Total Anggota', value: formatNumber(metrics.totalAnggota, 0), icon: Users, color: 'purple', sub: 'Anggota aktif' },
  ]

  const colorMap: Record<string, { bg: string; text: string; ring: string; valueText: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-100', valueText: 'text-zinc-900' },
    green: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100', valueText: 'text-zinc-900' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', ring: 'ring-orange-100', valueText: 'text-zinc-900' },
    red: { bg: 'bg-red-50', text: 'text-red-600', ring: 'ring-red-100', valueText: 'text-red-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-100', valueText: 'text-zinc-900' },
  }

  const pieData = [
    { name: 'Pokok', value: komposisiSimpanan.pokok, color: SIMPANAN_COLORS.pokok },
    { name: 'Wajib', value: komposisiSimpanan.wajib, color: SIMPANAN_COLORS.wajib },
    { name: 'Sukarela', value: komposisiSimpanan.sukarela, color: SIMPANAN_COLORS.sukarela },
  ]
  const totalSimpananPie = pieData.reduce((s, p) => s + p.value, 0)

  return (
    <div className="space-y-5">
      {/* ===== PERIOD FILTER BAR ===== */}
      <Card className="border-0 bg-white shadow-sm ring-1 ring-zinc-100">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Periode</label>
            <Select value={periode} onValueChange={setPeriode}>
              <SelectTrigger className="h-9 w-40 border-zinc-200 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bulan_ini">Bulan Ini</SelectItem>
                <SelectItem value="1bul">1 Bulan</SelectItem>
                <SelectItem value="3bul">3 Bulan</SelectItem>
                <SelectItem value="6bul">6 Bulan</SelectItem>
                <SelectItem value="1thn">1 Tahun</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
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
          <Button onClick={load} className="h-9 bg-blue-600 text-white shadow-sm hover:bg-blue-700">
            <Filter className="mr-1.5 h-4 w-4" /> Terapkan
          </Button>
          <Button onClick={reset} variant="outline" className="h-9 border-zinc-200 text-sm text-zinc-600">
            <RotateCcw className="mr-1.5 h-4 w-4" /> Reset
          </Button>
        </CardContent>
      </Card>

      {/* ===== 5 METRIC CARDS ===== */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metricCards.map((c) => {
          const Icon = c.icon
          const col = colorMap[c.color]
          const clickable = !!c.detail
          return (
            <Card
              key={c.label}
              onClick={clickable ? () => setDetailModal(c.detail) : undefined}
              className={cn(
                'border-0 bg-white shadow-sm ring-1 ring-zinc-100',
                clickable && 'cursor-pointer transition-shadow hover:shadow-md hover:ring-blue-200',
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{c.label}</p>
                    <p className={cn('mt-2 text-2xl font-bold', col.valueText)}>{c.value}</p>
                    <p className="mt-0.5 text-[10px] text-zinc-400">{c.sub}</p>
                    {clickable && (
                      <p className="mt-1.5 inline-flex items-center gap-0.5 text-[9px] font-medium text-blue-700">
                        <MousePointerClick className="h-3 w-3" /> Klik untuk detail
                      </p>
                    )}
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
        {/* Arus Kas Trend */}
        <Card className="border-0 bg-white shadow-sm ring-1 ring-zinc-100 lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-zinc-900">Arus Kas (Trend)</h3>
              <p className="text-xs text-zinc-500">
                Perbandingan pemasukan vs pengeluaran kas.
                {periode === 'custom' && dari && sampai ? ` Periode: ${dari} s/d ${sampai}.` : ` Periode: ${periode === 'bulan_ini' ? 'Bulan Ini' : periode === '1bul' ? '1 Bulan' : periode === '3bul' ? '3 Bulan' : periode === '6bul' ? '6 Bulan' : periode === '1thn' ? '1 Tahun' : 'Custom'}.`}
              </p>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={arusKasTrend} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    formatter={(v: any, name: any) => [formatRupiah(v), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
                  <Line type="monotone" dataKey="pemasukan" name="Pemasukan" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4, fill: '#10B981' }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="pengeluaran" name="Pengeluaran" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 4, fill: '#EF4444' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Komposisi Simpanan */}
        <Card className="border-0 bg-white shadow-sm ring-1 ring-zinc-100">
          <CardContent className="p-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-zinc-900">Komposisi Simpanan</h3>
              <p className="text-xs text-zinc-500">Distribusi saldo per jenis simpanan.</p>
            </div>
            {totalSimpananPie === 0 ? (
              <div className="flex h-56 flex-col items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100">
                  <Landmark className="h-7 w-7 text-zinc-300" />
                </div>
                <p className="mt-3 text-sm font-medium text-zinc-500">Belum Ada Simpanan</p>
                <p className="mt-1 text-xs text-zinc-400">Data muncul setelah ada setoran.</p>
              </div>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {pieData.map((p, i) => <Cell key={i} fill={p.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
                      formatter={(v: any, n: any) => [formatRupiah(v), n]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-4 space-y-2">
              {pieData.map((p) => (
                <div key={p.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="font-medium text-zinc-700">{p.name}</span>
                  </div>
                  <span className="font-semibold text-zinc-900">{formatRupiah(p.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== TRANSACTION LOG ===== */}
      <Card className="border-0 bg-white shadow-sm ring-1 ring-zinc-100">
        <CardContent className="p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-zinc-900">Log Riwayat Transaksi</h3>
            <p className="text-xs text-zinc-500">Pemantauan data tabel lengkap dengan filter pintar instan.</p>
          </div>

          {/* Filters */}
          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={fQ}
                onChange={(e) => setFQ(e.target.value)}
                placeholder="Cari Anggota..."
                className="border-zinc-200 pl-9 text-sm"
              />
            </div>
            <Select value={fWaktu} onValueChange={setFWaktu}>
              <SelectTrigger className="border-zinc-200 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua Waktu">Semua Waktu</SelectItem>
                <SelectItem value="7 Hari Terakhir">7 Hari Terakhir</SelectItem>
                <SelectItem value="30 Hari Terakhir">30 Hari Terakhir</SelectItem>
                <SelectItem value="90 Hari Terakhir">90 Hari Terakhir</SelectItem>
                <SelectItem value="1 Tahun Terakhir">1 Tahun Terakhir</SelectItem>
                <SelectItem value="custom">Custom (Pilih Tanggal)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fJenis} onValueChange={setFJenis}>
              <SelectTrigger className="border-zinc-200 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua Jenis">Semua Jenis</SelectItem>
                <SelectItem value="Simpanan">Simpanan</SelectItem>
                <SelectItem value="Penarikan">Penarikan</SelectItem>
                <SelectItem value="Pinjaman">Pinjaman</SelectItem>
                <SelectItem value="Angsuran">Angsuran</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger className="border-zinc-200 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua Status">Semua Status</SelectItem>
                <SelectItem value="Selesai">Selesai</SelectItem>
                <SelectItem value="Berjalan">Berjalan</SelectItem>
                <SelectItem value="Lunas">Lunas</SelectItem>
                <SelectItem value="Disetujui">Disetujui</SelectItem>
                <SelectItem value="Menunggu">Menunggu</SelectItem>
                <SelectItem value="Ditolak">Ditolak</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {fWaktu === 'custom' && (
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
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Total Transaksi</p>
              <p className="mt-1 text-xl font-bold text-zinc-900">{formatNumber(transactionLog.total, 0)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50/60 p-4 ring-1 ring-emerald-100">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Total Pemasukan</p>
              <p className="mt-1 text-xl font-bold text-emerald-600">{formatRupiah(transactionLog.totalPemasukan)}</p>
            </div>
            <div className="rounded-xl bg-red-50/60 p-4 ring-1 ring-red-100">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600">Total Pengeluaran</p>
              <p className="mt-1 text-xl font-bold text-red-600">{formatRupiah(transactionLog.totalPengeluaran)}</p>
            </div>
          </div>

          {/* Table */}
          <div className="max-h-[460px] overflow-auto rounded-xl border border-zinc-100">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-zinc-50">
                <tr>
                  {['Tanggal', 'Anggota & Kode', 'Keterangan', 'Nominal (Rp)', 'Jenis', 'Status'].map((h) => (
                    <th key={h} className="whitespace-nowrap border-b border-zinc-100 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {transactionLog.rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
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
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-zinc-600">{formatDate(r.tanggal)}</td>
                      <td className="px-3 py-2.5">
                        <p className="text-xs font-medium text-zinc-900">{r.anggota}</p>
                        {r.kode && <p className="text-[10px] text-zinc-400">{r.kode}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-zinc-600">{r.keterangan}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span className={cn('flex items-center gap-1 text-xs font-semibold', r.tipe === 'masuk' ? 'text-emerald-600' : 'text-red-600')}>
                          {r.tipe === 'masuk' ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                          {formatRupiah(r.nominal)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className={cn('text-[10px]',
                          r.jenis === 'Simpanan' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                          r.jenis === 'Penarikan' ? 'border-orange-200 bg-orange-50 text-orange-700' :
                          r.jenis === 'Pinjaman' ? 'border-purple-200 bg-purple-50 text-purple-700' :
                          r.jenis === 'Angsuran' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                          'border-zinc-200 bg-zinc-50 text-zinc-600')}>
                          {r.jenis}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className={cn('text-[10px]',
                          r.status === 'Selesai' || r.status === 'Lunas' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                          r.status === 'Berjalan' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                          r.status === 'Disetujui' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                          r.status === 'Ditolak' ? 'border-red-200 bg-red-50 text-red-700' :
                          'border-zinc-200 bg-zinc-50 text-zinc-600')}>
                          {r.status}
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
