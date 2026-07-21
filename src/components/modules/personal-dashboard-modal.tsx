'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  X, Phone, Calendar, MapPin, Wallet, Coins, Award, Scale, TrendingUp,
  FolderOpen, FileText, CheckCircle2, Clock, ArrowRight, Filter,
} from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { formatRupiah, formatNumber, formatDate, toNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts'

const PIE_COLORS = ['#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1']

const TREN_RANGE_OPTIONS = [
  { value: '1bul', label: '1 Bulan' },
  { value: '3bul', label: '3 Bulan' },
  { value: '6bul', label: '6 Bulan' },
  { value: '1thn', label: '1 Tahun' },
  { value: 'custom', label: 'Custom' },
]

// ============================================================
// Nasabah Personal Dashboard Modal
// ============================================================
export function NasabahDashboardModal({ userId, open, onOpenChange }: { userId: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [state, setState] = useState<{ loading: boolean; data: any }>({ loading: true, data: null })
  const [trenRange, setTrenRange] = useState('6bul')
  const [chartDari, setChartDari] = useState('')
  const [chartSampai, setChartSampai] = useState('')
  const reqId = useRef(0)

  useEffect(() => {
    if (!userId || !open) return
    const myId = ++reqId.current
    // use microtask to defer setState out of effect body
    Promise.resolve().then(() => setState({ loading: true, data: null }))
    api.personalDashboard(userId, {
      chartRange: trenRange,
      chartDari: trenRange === 'custom' ? chartDari : undefined,
      chartSampai: trenRange === 'custom' ? chartSampai : undefined,
    })
      .then((res) => { if (myId === reqId.current) setState({ loading: false, data: res }) })
      .catch((e) => { if (myId === reqId.current) { toast.error('Gagal memuat dashboard: ' + e.message); setState({ loading: false, data: null }) } })
    return () => { reqId.current++ }
  }, [userId, open, trenRange, chartDari, chartSampai])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-4xl">
        <DialogTitle className="sr-only">Dashboard Personal Nasabah</DialogTitle>
        {state.loading ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : state.data ? (
          <NasabahDashboardContent
            data={state.data}
            onClose={() => onOpenChange(false)}
            trenRange={trenRange}
            setTrenRange={setTrenRange}
            chartDari={chartDari}
            setChartDari={setChartDari}
            chartSampai={chartSampai}
            setChartSampai={setChartSampai}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function NasabahDashboardContent({ data, onClose, trenRange, setTrenRange, chartDari, setChartDari, chartSampai, setChartSampai }: {
  data: any
  onClose: () => void
  trenRange: string
  setTrenRange: (r: string) => void
  chartDari: string
  setChartDari: (v: string) => void
  chartSampai: string
  setChartSampai: (v: string) => void
}) {
  const { profile, saldo, trenTabungan, komposisiKategori, riwayat } = data

  const statCards = [
    { label: 'Saldo Tersedia', value: formatRupiah(saldo.saldoTersedia), icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Poin Saat Ini', value: `${formatNumber(saldo.poin, 0)} pt`, icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Ditabung', value: `${formatNumber(saldo.totalDitabung, 1)} kg`, icon: Scale, color: 'text-zinc-900', bg: 'bg-zinc-100' },
  ]

  // trenTabungan now comes from the API filtered by the selected range (no client-side slicing)
  const trenFiltered = trenTabungan
  const rangeLabel = trenRange === 'custom' && chartDari && chartSampai
    ? `${chartDari} s/d ${chartSampai}`
    : trenRange !== 'custom'
      ? (TREN_RANGE_OPTIONS.find((o) => o.value === trenRange)?.label || '')
      : ''

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-zinc-100 bg-gradient-to-r from-emerald-50 to-teal-50 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-lg font-bold text-white shadow-sm">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900">{profile.name}</h2>
              <Badge className="border-emerald-200 bg-emerald-100 text-[10px] font-semibold uppercase text-emerald-700">Aktif</Badge>
              {profile.memberCode && <Badge variant="outline" className="border-emerald-200 bg-white text-xs font-mono text-emerald-700">{profile.memberCode}</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              {profile.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {profile.phone}</span>}
              {profile.memberJoinedAt && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Bergabung {formatDate(profile.memberJoinedAt)}</span>}
              {profile.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {profile.address}</span>}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-zinc-100"><X className="h-5 w-5" /></Button>
      </div>

      <div className="space-y-5 px-5 pb-5">
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3">
          {statCards.map((c) => {
            const Icon = c.icon
            return (
              <div key={c.label} className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{c.label}</p>
                  <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', c.bg)}>
                    <Icon className={cn('h-4 w-4', c.color)} />
                  </div>
                </div>
                <p className={cn('mt-2 text-xl font-bold', c.color)}>{c.value}</p>
              </div>
            )
          })}
        </div>

        {/* Tren Tabungan + Komposisi */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm lg:col-span-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">Tren Tabungan</h3>
                <p className="text-[11px] text-zinc-500">Berat sampah (kg) per bulan{rangeLabel ? ` · ${rangeLabel}` : ''}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {TREN_RANGE_OPTIONS.map((opt) => (
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
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trenFiltered} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} formatter={(v: any) => [`${formatNumber(v, 2)} kg`, 'Berat']} />
                  <Line type="monotone" dataKey="berat" name="Berat (kg)" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4, fill: '#10B981' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-900">Total Sampah per Kategori</h3>
            <p className="text-[11px] text-zinc-500">Kilogram per kategori{rangeLabel ? ` · ${rangeLabel}` : ''}</p>
            {komposisiKategori.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-center">
                <Scale className="h-8 w-8 text-zinc-300" />
                <p className="mt-2 text-xs text-zinc-400">Belum ada data tabungan.</p>
              </div>
            ) : (
              <div className="mt-3 h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={komposisiKategori} layout="vertical" margin={{ left: 20, right: 10 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} formatter={(v: any) => [`${formatNumber(v, 2)} kg`, 'Berat']} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {komposisiKategori.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Riwayat tabs */}
        <div className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
          <Tabs defaultValue="tabungan">
            <TabsList className="mb-3 bg-zinc-100">
              <TabsTrigger value="tabungan" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs">Tabungan</TabsTrigger>
              <TabsTrigger value="sedekah" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs">Sedekah</TabsTrigger>
              <TabsTrigger value="poin" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs">Poin</TabsTrigger>
              <TabsTrigger value="penukaran" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs">Penukaran</TabsTrigger>
            </TabsList>

            <TabsContent value="tabungan">
              <RiwayatTable
                headers={['Tanggal', 'Barang', 'Berat', 'Nilai']}
                rows={riwayat.tabungan.map((r: any) => [formatDate(r.tanggal), r.barang, `${formatNumber(r.berat, 2)} kg`, formatRupiah(r.nilai)])}
                emptyMsg="Belum ada riwayat tabungan."
              />
            </TabsContent>
            <TabsContent value="sedekah">
              <RiwayatTable
                headers={['Tanggal', 'Barang', 'Berat']}
                rows={riwayat.sedekah.map((r: any) => [formatDate(r.tanggal), r.barang, `${formatNumber(r.berat, 2)} kg`])}
                emptyMsg="Belum ada riwayat sedekah."
              />
            </TabsContent>
            <TabsContent value="poin">
              <RiwayatTable
                headers={['Tanggal', 'Tipe', 'Poin', 'Saldo', 'Deskripsi']}
                rows={riwayat.poin.map((r: any) => [formatDate(r.tanggal), r.tipe, `${r.poin > 0 ? '+' : ''}${r.poin}`, formatNumber(r.saldo, 0), r.deskripsi])}
                emptyMsg="Belum ada riwayat poin."
              />
            </TabsContent>
            <TabsContent value="penukaran">
              <RiwayatTable
                headers={['Tanggal', 'Produk', 'Qty', 'Poin Dipakai']}
                rows={riwayat.penukaran.map((r: any) => [formatDate(r.tanggal), r.produk, formatNumber(toNumber(r.qty), 0), `${r.poin} pt`])}
                emptyMsg="Belum ada riwayat penukaran."
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose} className="bg-zinc-900 text-white hover:bg-zinc-800">Tutup Dashboard</Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Koperasi Personal Dashboard Modal
// ============================================================
export function KoperasiDashboardModal({ anggotaId, open, onOpenChange }: { anggotaId: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [state, setState] = useState<{ loading: boolean; data: any }>({ loading: true, data: null })
  const reqId = useRef(0)

  useEffect(() => {
    if (!anggotaId || !open) return
    const myId = ++reqId.current
    Promise.resolve().then(() => setState({ loading: true, data: null }))
    api.personalDashboardKoperasi(anggotaId)
      .then((res) => { if (myId === reqId.current) setState({ loading: false, data: res }) })
      .catch((e) => { if (myId === reqId.current) { toast.error('Gagal memuat dashboard: ' + e.message); setState({ loading: false, data: null }) } })
    return () => { reqId.current++ }
  }, [anggotaId, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-3xl">
        <DialogTitle className="sr-only">Dashboard Personal Anggota Koperasi</DialogTitle>
        {state.loading ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          </div>
        ) : state.data ? (
          <KoperasiDashboardContent data={state.data} onClose={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function KoperasiDashboardContent({ data, onClose }: { data: any; onClose: () => void }) {
  const { profile, simpanan, pinjaman, riwayatKontrak } = data

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-zinc-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white shadow-sm">
            {profile.nama.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900">{profile.nama}</h2>
              <Badge className={cn('text-[10px] font-semibold uppercase', profile.status === 'aktif' ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'border-zinc-200 bg-zinc-100 text-zinc-600')}>{profile.status}</Badge>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">ID: {profile.nomorAnggota} | NIK: {profile.noKtp}</p>
            <p className="mt-0.5 text-[11px] text-zinc-400">Bergabung: {formatDate(profile.tanggalBergabung)} (Lama: {profile.lamaBulan} Bulan)</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-zinc-100"><X className="h-5 w-5" /></Button>
      </div>

      <div className="space-y-5 px-5 pb-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Dashboard Personal Anggota</h3>

        {/* Two summary cards */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Buku Simpanan Pribadi */}
          <div className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100">
                <FolderOpen className="h-4 w-4 text-zinc-500" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-900">Buku Simpanan Pribadi</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-zinc-500">Simpanan Pokok</span><span className="font-medium text-zinc-900">{formatRupiah(simpanan.pokok)}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Simpanan Wajib</span><span className="font-medium text-zinc-900">{formatRupiah(simpanan.wajib)}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Simpanan Sukarela</span><span className="font-medium text-emerald-600">{formatRupiah(simpanan.sukarela)}</span></div>
              <div className="mt-2 flex justify-between border-t border-zinc-100 pt-2"><span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Total Kas Tersimpan</span><span className="font-bold text-zinc-900">{formatRupiah(simpanan.totalKasTersimpan)}</span></div>
            </div>
          </div>

          {/* Status Pembayaran & Denda */}
          <div className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100">
                <FileText className="h-4 w-4 text-zinc-500" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-900">Status Pembayaran & Denda</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-zinc-500">Pinjaman Aktif (Berjalan)</span><span className="font-medium text-zinc-900">{pinjaman.pinjamanAktifCount} Kontrak</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Akumulasi Sisa Hutang</span><span className="font-medium text-zinc-900">{formatRupiah(pinjaman.akumulasiSisaHutang)}</span></div>
              <div className="flex justify-between items-center"><span className="text-zinc-500">Histori Keterlambatan</span>
                <Badge className={cn('text-[10px]', pinjaman.totalTerlambat === 0 ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'border-amber-200 bg-amber-100 text-amber-700')}>
                  {pinjaman.disiplin}
                </Badge>
              </div>
              <div className="mt-2 flex justify-between border-t border-zinc-100 pt-2"><span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Total Denda Dibayar</span><span className="font-bold text-red-600">{formatRupiah(pinjaman.totalDendaDibayar)}</span></div>
            </div>
          </div>
        </div>

        {/* Riwayat Kontrak Pinjaman */}
        <div className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
          <h4 className="mb-3 text-sm font-semibold text-zinc-900">Riwayat Kontrak Pinjaman</h4>
          {riwayatKontrak.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <FileText className="h-10 w-10 text-zinc-300" />
              <p className="mt-2 text-sm italic text-zinc-400">Anggota ini belum pernah mengajukan pinjaman pembiayaan.</p>
            </div>
          ) : (
            <div className="max-h-64 overflow-auto rounded-lg border border-zinc-100">
              <Table>
                <TableHeader className="sticky top-0 bg-zinc-50">
                  <TableRow>
                    <TableHead className="text-[10px] uppercase">No Pinjaman</TableHead>
                    <TableHead className="text-[10px] uppercase">Tgl Cair</TableHead>
                    <TableHead className="text-[10px] uppercase">Jumlah</TableHead>
                    <TableHead className="text-[10px] uppercase">Tenor</TableHead>
                    <TableHead className="text-[10px] uppercase">Angsuran</TableHead>
                    <TableHead className="text-[10px] uppercase">Sisa</TableHead>
                    <TableHead className="text-[10px] uppercase">Progress</TableHead>
                    <TableHead className="text-[10px] uppercase">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riwayatKontrak.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.nomorPinjaman}</TableCell>
                      <TableCell className="text-xs">{p.tanggalPencairan ? formatDate(p.tanggalPencairan) : '-'}</TableCell>
                      <TableCell className="text-xs font-medium">{formatRupiah(p.jumlahPinjaman)}</TableCell>
                      <TableCell className="text-xs">{p.tenorBulan} bln</TableCell>
                      <TableCell className="text-xs">{formatRupiah(p.angsuranPerBulan)}</TableCell>
                      <TableCell className="text-xs">{formatRupiah(p.sisaPinjaman)}</TableCell>
                      <TableCell className="text-xs">{p.angsuranTerbayar}/{p.tenorBulan} ({p.progress}%)</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-[10px]',
                          p.status === 'lunas' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                          p.status === 'berjalan' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                          p.status === 'disetujui' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                          'border-zinc-200 bg-zinc-50 text-zinc-600')}>
                          {p.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose} className="bg-zinc-900 text-white hover:bg-zinc-800">Tutup Dashboard</Button>
        </div>
      </div>
    </div>
  )
}

// Shared Riwayat Table
function RiwayatTable({ headers, rows, emptyMsg }: { headers: string[]; rows: any[][]; emptyMsg: string }) {
  return (
    <div className="max-h-64 overflow-auto rounded-lg border border-zinc-100">
      <Table>
        <TableHeader className="sticky top-0 bg-zinc-50">
          <TableRow>
            {headers.map((h) => <TableHead key={h} className="text-[10px] uppercase">{h}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={headers.length} className="py-8 text-center text-sm text-zinc-400">{emptyMsg}</TableCell>
            </TableRow>
          ) : (
            rows.map((r, i) => (
              <TableRow key={i}>
                {r.map((c, j) => <TableCell key={j} className="text-xs">{c}</TableCell>)}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default NasabahDashboardModal
