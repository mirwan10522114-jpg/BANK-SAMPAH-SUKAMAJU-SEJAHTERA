'use client'

import { useEffect, useState, useCallback, Fragment } from 'react'
import { api } from '@/lib/api'
import { formatRupiah, formatNumber, formatDate, formatDateTime, toNumber } from '@/lib/format'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import {
  FileBarChart, TrendingUp, TrendingDown, Wallet, Banknote, HandCoins,
  ShoppingBag, Package, Recycle, Info, Landmark, ArrowUpRight, ArrowDownRight,
  Coins, AlertCircle, Printer, Leaf, PiggyBank, Store, CheckCircle2, XCircle, LineChart,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const PERIODE_OPTIONS = [
  { value: 'bulan_ini', label: 'Bulan Ini' },
  { value: '1bul', label: '30 Hari' },
  { value: '3bul', label: '3 Bulan' },
  { value: '6bul', label: '6 Bulan' },
  { value: '1thn', label: '1 Tahun' },
  { value: 'custom', label: 'Custom' },
]

// Print helper: opens a clean new window with just the report content
function handlePrintLaporan() {
  if (typeof document === 'undefined') return
  const reportEl = document.getElementById('printable-laporan')
  if (!reportEl) {
    toast.error('Konten laporan tidak ditemukan.')
    return
  }

  const styleEls = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
  const stylesHtml = styleEls.map((el) => el.outerHTML).join('\n    ')

  const clone = reportEl.cloneNode(true) as HTMLElement
  clone.querySelectorAll('.print\\:hidden').forEach((el) => el.remove())
  clone.querySelectorAll('.print-header').forEach((el) => {
    el.classList.remove('hidden')
    ;(el as HTMLElement).style.display = 'block'
  })

  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) {
    toast.error('Popup diblokir browser. Mohon izinkan popup untuk mencetak laporan.')
    return
  }

  printWindow.document.open()
  printWindow.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cetak Laporan Laba Rugi</title>
${stylesHtml}
<style>
  @page { margin: 1.5cm; size: A4 portrait; }
  html, body { background: #ffffff !important; margin: 0 !important; padding: 12px !important; color: #18181b !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; }
  #printable-laporan, #printable-laporan * { visibility: visible !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  [class*="border-"] { break-inside: avoid; }
  button, input, select, textarea { display: none !important; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 4px 8px; border: 1px solid #e5e7eb; font-size: 11px; }
  th { background: #f0fdf4; }
  .max-h-96, .max-h-72, .max-h-80 { max-height: none !important; overflow: visible !important; }
  .recharts-wrapper, .recharts-responsive-container { display: none !important; }
</style>
</head>
<body>
${clone.outerHTML}
</body>
</html>`)
  printWindow.document.close()
  printWindow.focus()
  printWindow.onload = () => { setTimeout(() => { printWindow.print() }, 500) }
  setTimeout(() => { try { printWindow.print() } catch {} }, 2000)
}

// ============= Shared Period Filter =============
function PeriodFilter({ periode, setPeriode, dari, setDari, sampai, setSampai, onReset }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="w-40">
        <Label className="text-xs text-zinc-500">Periode</Label>
        <Select value={periode} onValueChange={setPeriode}>
          <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {periode === 'custom' && (
        <>
          <div>
            <Label className="text-xs text-zinc-500">Dari</Label>
            <Input type="date" value={dari} onChange={(e) => setDari(e.target.value)} className="h-9 w-40 bg-white" />
          </div>
          <div>
            <Label className="text-xs text-zinc-500">Sampai</Label>
            <Input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} className="h-9 w-40 bg-white" />
          </div>
        </>
      )}
      <Button variant="outline" size="sm" onClick={onReset} className="h-9">
        Reset
      </Button>
    </div>
  )
}

// ============= BIG Result Card (untung/rugi) =============
function ResultCard({ isProfit, label, amount, sub }: { isProfit: boolean; label: string; amount: string; sub?: string }) {
  return (
    <div className={cn(
      'rounded-2xl border-2 p-5 text-center',
      isProfit ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50' : 'border-rose-300 bg-gradient-to-br from-rose-50 to-red-50'
    )}>
      <div className={cn(
        'mx-auto mb-2 flex size-14 items-center justify-center rounded-full',
        isProfit ? 'bg-emerald-100' : 'bg-rose-100'
      )}>
        {isProfit ? <CheckCircle2 className="size-8 text-emerald-600" /> : <XCircle className="size-8 text-rose-600" />}
      </div>
      <p className={cn('text-sm font-bold uppercase tracking-wide', isProfit ? 'text-emerald-700' : 'text-rose-700')}>
        {label}
      </p>
      <p className={cn('mt-1 text-4xl font-black', isProfit ? 'text-emerald-900' : 'text-rose-900')}>
        {amount}
      </p>
      {sub && <p className={cn('mt-1 text-xs', isProfit ? 'text-emerald-600' : 'text-rose-600')}>{sub}</p>}
    </div>
  )
}

// ============= Simple Row =============
function MoneyRow({ icon: Icon, label, value, tone = 'default' }: { icon?: any; label: string; value: number; tone?: 'default' | 'positive' | 'negative' | 'total' | 'highlight' }) {
  const valColor = tone === 'positive' ? 'text-emerald-700' : tone === 'negative' ? 'text-rose-700' : tone === 'total' ? 'text-zinc-900' : tone === 'highlight' ? 'text-emerald-900' : 'text-zinc-700'
  return (
    <div className={cn('flex items-center justify-between py-2', tone === 'total' && 'border-t border-zinc-200 mt-1 pt-2.5')}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className={cn('size-4', tone === 'positive' ? 'text-emerald-500' : tone === 'negative' ? 'text-rose-500' : 'text-zinc-400')} />}
        <span className={cn('text-sm', tone === 'total' || tone === 'highlight' ? 'font-bold text-zinc-900' : 'text-zinc-600')}>{label}</span>
      </div>
      <span className={cn('text-sm tabular-nums font-semibold', valColor)}>{formatRupiah(value)}</span>
    </div>
  )
}

// ============= Skeleton =============
function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  )
}

// ========================================================================
// TAB 1: BANK SAMPAH (Sederhana)
// ========================================================================
function LaporanBankSampah() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState('1thn')
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [buku, setBuku] = useState('utama')
  const [expandedMitraTx, setExpandedMitraTx] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.laporan.bankSampah({
        periode,
        dari: periode === 'custom' ? dari : undefined,
        sampai: periode === 'custom' ? sampai : undefined,
        buku,
      })
      setData(d)
    } catch (e: any) {
      toast.error(e?.message || 'Gagal memuat laporan')
    } finally {
      setLoading(false)
    }
  }, [periode, dari, sampai, buku])

  useEffect(() => { load() }, [load])

  if (loading || !data) return <ReportSkeleton />

  const r = data.ringkasan
  const op = data.operasional

  // Kalkulasi Hasil Usaha (Keuntungan)
  // Keuntungan = Penjualan ke Mitra - Nilai Beli Sampah dari Nasabah - Biaya Operasional
  const nilaiSampahBeli = Number(op.penjualanMitra?.totalBeliNasabah || 0)
  const penjualanMitra = Number(op.penjualanMitra?.totalJualMitra || 0)
  const marginKotor = penjualanMitra - nilaiSampahBeli
  const keuntungan = marginKotor - r.bebanOperasional

  return (
    <div id="printable-laporan" className="space-y-4">
      {/* TAB FILTER: UTAMA / NASABAH */}
      <div className="print:hidden bg-emerald-50/50 p-2 rounded-xl border border-emerald-100 w-fit">
        <Tabs value={buku} onValueChange={setBuku}>
          <TabsList className="h-auto p-1 bg-white border border-emerald-100">
            <TabsTrigger value="utama" className="px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Kas Utama</TabsTrigger>
            <TabsTrigger value="nasabah" className="px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Kas Nasabah</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Header card (print:hidden) */}
      <Card className="border-emerald-200 print:hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-emerald-900">
                <Recycle className="size-5" /> Laporan Kas Operasional
              </CardTitle>
              <CardDescription className="mt-1">
                Ringkasan uang masuk, uang keluar, dan hasil kegiatan Bank Sampah
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <PeriodFilter periode={periode} setPeriode={setPeriode} dari={dari} setDari={setDari} sampai={sampai} setSampai={setSampai} onReset={() => { setPeriode('1thn'); setDari(''); setSampai('') }} />
              <Button onClick={handlePrintLaporan} size="sm" className="h-9 bg-emerald-600 text-white hover:bg-emerald-700">
                <Printer className="mr-1 size-3.5" /> Cetak
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Print header */}
      <div className="hidden print:block print-header">
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>LAPORAN KAS OPERASIONAL</h1>
        <p style={{ fontSize: '12px', marginBottom: '2px' }}>Bank Sampah Sukamaju Sejahtera</p>
        <p style={{ fontSize: '11px', color: '#555' }}>Periode: {formatDate(data.periode.start)} — {formatDate(data.periode.end)}</p>
        <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #999' }} />
      </div>

      {/* 4 CARD RINGKASAN UTAMA */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Uang Masuk */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <ArrowUpRight className="size-4" />
            <p className="text-xs font-semibold uppercase">Total Uang Masuk</p>
          </div>
          <p className="mt-1 text-2xl font-black text-emerald-900" title="Total seluruh kas masuk">
            {formatRupiah(r.totalPendapatan)}
          </p>
          <p className="text-[11px] text-emerald-600 mt-1">Seluruh uang masuk (pendapatan & setoran)</p>
        </div>

        {/* Total Uang Keluar */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
          <div className="flex items-center gap-2 text-rose-700">
            <ArrowDownRight className="size-4" />
            <p className="text-xs font-semibold uppercase">Total Uang Keluar</p>
          </div>
          <p className="mt-1 text-2xl font-black text-rose-900" title="Total seluruh kas keluar">
            {formatRupiah(r.totalPengeluaran)}
          </p>
          <p className="text-[11px] text-rose-600 mt-1">Seluruh pengeluaran (biaya & penarikan nasabah)</p>
        </div>

        {/* Dynamic Card 3: Keuntungan (Utama) OR Kewajiban (Nasabah) */}
        {buku === 'utama' ? (
          <div className={cn('rounded-xl border p-4', keuntungan >= 0 ? 'border-blue-200 bg-blue-50/50' : 'border-amber-300 bg-amber-50/50')}>
            <div className={cn('flex items-center gap-2', keuntungan >= 0 ? 'text-blue-700' : 'text-amber-700')}>
              <LineChart className="size-4" />
              <p className="text-xs font-semibold uppercase">Laba Rugi Jual Beli</p>
            </div>
            <p className={cn('mt-1 text-2xl font-black', keuntungan >= 0 ? 'text-blue-900' : 'text-amber-900')} title="Hasil jual sampah dikurangi nilai beli dan biaya operasional">
              {formatRupiah(keuntungan)}
            </p>
            <p className={cn('text-[11px] mt-1', keuntungan >= 0 ? 'text-blue-600' : 'text-amber-700')}>
              Hasil bersih operasional (Margin - Beban)
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4">
            <div className="flex items-center gap-2 text-purple-700">
              <Wallet className="size-4" />
              <p className="text-xs font-semibold uppercase">Total Saldo Nasabah</p>
            </div>
            <p className="mt-1 text-2xl font-black text-purple-900" title="Total seluruh utang ke nasabah">
              {formatRupiah(r.totalUtangNasabah)}
            </p>
            <p className="text-[11px] text-purple-600 mt-1">Seluruh kewajiban bayar koperasi ke nasabah</p>
          </div>
        )}

        {/* Sisa Uang di Kas */}
        <div className={cn('rounded-xl border p-4', r.saldoKas < 0 ? 'border-rose-300 bg-rose-50/50' : 'border-teal-200 bg-teal-50/50')}>
          <div className={cn('flex items-center gap-2', r.saldoKas < 0 ? 'text-rose-700' : 'text-teal-700')}>
            <Wallet className="size-4" />
            <p className="text-xs font-semibold uppercase">Sisa Uang di Kas</p>
          </div>
          <p className={cn('mt-1 text-2xl font-black', r.saldoKas < 0 ? 'text-rose-900' : 'text-teal-900')} title="Saldo fisik kas saat ini">
            {formatRupiah(r.saldoKas)}
          </p>
          <p className={cn('text-[11px] mt-1', r.saldoKas < 0 ? 'text-rose-600' : 'text-teal-600')}>
            {r.saldoKas < 0 ? '⚠️ Kas fisik minus' : 'Uang tunai yang tersedia'}
          </p>
        </div>
      </div>

      {r.saldoKas < 0 && (
        <div className="rounded-lg border-2 border-rose-400 bg-rose-100 p-3 text-sm">
          <p className="font-bold text-rose-900">⚠️ PERHATIAN: Kas Fisik Minus ({formatRupiah(r.saldoKas)})!</p>
          <p className="mt-0.5 text-[12px] text-rose-800">Uang yang ada di kas tidak cukup. Lakukan penyesuaian saldo awal atau cek riwayat kas keluar.</p>
        </div>
      )}

      {/* Info tambahan jika Kas Nasabah */}
      {buku === 'nasabah' && (
        <div className="rounded-lg border border-purple-200 bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4">
          <div>
            <h4 className="font-bold text-purple-900 flex items-center gap-2">
              <Info className="size-4" /> Mengapa Total Saldo Nasabah {r.totalUtangNasabah > r.saldoKas ? 'lebih besar' : 'berbeda'} dari Sisa Uang di Kas?
            </h4>
            <p className="text-sm text-zinc-600 mt-1 max-w-3xl">
              Uang di <b>Kas Nasabah</b> hanya bertambah ketika Bank Sampah <b>menjual sampah ke pengepul/mitra</b>. 
              Sedangkan <b>Total Saldo Nasabah</b> langsung bertambah ketika nasabah <b>menabung sampah</b> (meskipun belum dijual).
            </p>
          </div>
          <div className="shrink-0 bg-purple-50 p-3 rounded-lg border border-purple-100 min-w-[14rem]">
            <div className="flex justify-between items-center text-sm mb-1">
              <span className="text-zinc-600">Sisa Uang Tunai:</span>
              <span className="font-bold text-teal-700">{formatRupiah(r.saldoKas)}</span>
            </div>
            <div className="flex justify-between items-center text-sm mb-2 pb-2 border-b border-purple-200">
              <span className="text-zinc-600">Est. Nilai Gudang:</span>
              <span className="font-bold text-amber-600">+{formatRupiah(r.inventoryValueNasabah || 0)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-purple-900">Total Proyeksi Aset:</span>
              <span className="font-bold text-purple-900">{formatRupiah(r.saldoKas + (r.inventoryValueNasabah || 0))}</span>
            </div>
          </div>
        </div>
      )}

      {/* Rincian Masuk & Keluar */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Dari mana uang masuk */}
        <Card className="border-emerald-200">
          <CardHeader className="pb-2 border-b border-emerald-100/50">
            <CardTitle className="flex items-center justify-between text-base text-emerald-900">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="size-4" /> Dari Mana Uang Masuk?
              </div>
              <span className="text-sm font-bold">{formatRupiah(r.totalPendapatan)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900">Penjualan ke Mitra</p>
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[9px] h-4 px-1.5 rounded-sm">Pendapatan Usaha</Badge>
                  </div>
                  <p className="text-[11px] text-zinc-500">Hasil jual sampah ke pengepul</p>
                </div>
                <span className="text-sm font-semibold text-emerald-700">{formatRupiah(data.pendapatan.penjualanMitra)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900">Modal / Setoran Awal</p>
                    <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-zinc-600 text-[9px] h-4 px-1.5 rounded-sm">Bukan Keuntungan</Badge>
                  </div>
                  <p className="text-[11px] text-zinc-500">Uang modal untuk operasional</p>
                </div>
                <span className="text-sm font-semibold text-emerald-700">{formatRupiah(data.pendapatan.setoranAwal)}</span>
              </div>
              {data.pendapatan.penyesuaianPositif > 0 && (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-900">Penerimaan Lainnya</p>
                      <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-zinc-600 text-[9px] h-4 px-1.5 rounded-sm">Lain-lain</Badge>
                    </div>
                    <p className="text-[11px] text-zinc-500">Penyesuaian kas sistem</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700">{formatRupiah(data.pendapatan.penyesuaianPositif)}</span>
                </div>
              )}
              {data.pendapatan.lainnya > 0 && (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-900">Pendapatan Lainnya</p>
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[9px] h-4 px-1.5 rounded-sm">Lain-lain</Badge>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700">{formatRupiah(data.pendapatan.lainnya)}</span>
                </div>
              )}
            </div>
            {r.pendapatanProdukDipisah > 0 && (
              <div className="mt-4 rounded-md border border-purple-200 bg-purple-50/50 px-3 py-2 text-[11px] text-purple-800">
                <ShoppingBag className="mr-1 inline size-3" />
                Ada <span className="font-semibold">{formatRupiah(r.pendapatanProdukDipisah)}</span> masuk dari penjualan barang olahan. Ini bisa dilihat terpisah di tab "Penjualan".
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ke mana uang keluar */}
        <Card className="border-rose-200">
          <CardHeader className="pb-2 border-b border-rose-100/50">
            <CardTitle className="flex items-center justify-between text-base text-rose-900">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="size-4" /> Ke Mana Uang Keluar?
              </div>
              <span className="text-sm font-bold">{formatRupiah(r.totalPengeluaran)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900">Pembayaran ke Nasabah</p>
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-[9px] h-4 px-1.5 rounded-sm">Pengembalian Hak</Badge>
                  </div>
                  <p className="text-[11px] text-zinc-500">Penarikan uang hasil menabung nasabah</p>
                </div>
                <span className="text-sm font-semibold text-rose-700">{formatRupiah(data.pengeluaran.penarikanNasabah)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900">Biaya Operasional</p>
                    <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 text-[9px] h-4 px-1.5 rounded-sm">Pengurang Keuntungan</Badge>
                  </div>
                  <p className="text-[11px] text-zinc-500">Gaji, listrik, bensin, operasional lainnya</p>
                </div>
                <span className="text-sm font-semibold text-rose-700">{formatRupiah(data.pengeluaran.biayaOperasional)}</span>
              </div>
              {data.pengeluaran.penyesuaianNegatif > 0 && (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-900">Penyesuaian Negatif</p>
                      <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-zinc-600 text-[9px] h-4 px-1.5 rounded-sm">Lain-lain</Badge>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-rose-700">{formatRupiah(data.pengeluaran.penyesuaianNegatif)}</span>
                </div>
              )}
              {data.pengeluaran.lainnya > 0 && (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-900">Pengeluaran Lainnya</p>
                      <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 text-[9px] h-4 px-1.5 rounded-sm">Lain-lain</Badge>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-rose-700">{formatRupiah(data.pengeluaran.lainnya)}</span>
                </div>
              )}
            </div>
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-[11px] text-amber-900">
              <Wallet className="mr-1 inline size-3" />
              <span className="font-semibold">Penting:</span> Pembayaran ke Nasabah BUKAN biaya kerugian Bank Sampah, melainkan uang simpanan yang diambil oleh mereka.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rincian Hasil Usaha */}
      <Card className="border-blue-200">
        <CardHeader className="pb-3 border-b border-blue-100/50">
          <CardTitle className="flex items-center gap-2 text-base text-blue-900">
            <LineChart className="size-4" /> Perhitungan Hasil Usaha (Keuntungan Bersih)
          </CardTitle>
          <CardDescription className="text-xs">
            Menghitung hasil murni dari aktivitas jual beli sampah dikurangi biaya operasional.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="max-w-2xl bg-white rounded-lg border border-zinc-100 overflow-hidden">
            <div className="flex justify-between p-3 border-b border-zinc-100">
              <span className="text-sm text-zinc-600">Pemasukan Penjualan ke Mitra</span>
              <span className="text-sm font-semibold text-emerald-700">{formatRupiah(penjualanMitra)}</span>
            </div>
            <div className="flex justify-between p-3 border-b border-zinc-100">
              <span className="text-sm text-zinc-600">Dikurangi: Nilai Sampah (Beli dari Nasabah)</span>
              <span className="text-sm font-semibold text-rose-700">- {formatRupiah(nilaiSampahBeli)}</span>
            </div>
            <div className="flex justify-between p-3 bg-zinc-50 border-b border-zinc-200">
              <span className="text-sm font-medium text-zinc-800">Hasil Jual Sampah</span>
              <span className="text-sm font-bold text-zinc-900">{formatRupiah(marginKotor)}</span>
            </div>
            <div className="flex justify-between p-3 border-b border-zinc-100">
              <span className="text-sm text-zinc-600">Dikurangi: Biaya Operasional</span>
              <span className="text-sm font-semibold text-rose-700">- {formatRupiah(r.bebanOperasional)}</span>
            </div>
            <div className={cn("flex justify-between p-4", keuntungan >= 0 ? "bg-emerald-50" : "bg-rose-50")}>
              <span className={cn("text-base font-bold", keuntungan >= 0 ? "text-emerald-900" : "text-rose-900")}>
                Keuntungan Bersih Bank Sampah
              </span>
              <span className={cn("text-lg font-black", keuntungan >= 0 ? "text-emerald-700" : "text-rose-700")}>
                {formatRupiah(keuntungan)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DETAIL PENJUALAN MITRA (Tabel Margin lama) */}
      {data.penjualanMitraDetail && data.penjualanMitraDetail.length > 0 && (
        <Card className="border-zinc-200">
          <CardHeader className="pb-2 border-b border-zinc-100">
            <CardTitle className="flex items-center justify-between text-base text-zinc-800">
              <div className="flex items-center gap-2">
                <Store className="size-4" /> Rincian Penjualan per Transaksi
              </div>
            </CardTitle>
            <CardDescription className="text-xs">
              Rincian keuntungan dari tiap penjualan ke mitra/pengepul.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto rounded-lg border border-zinc-200">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead className="text-zinc-600 text-xs">Tanggal</TableHead>
                    <TableHead className="text-zinc-600 text-xs">Mitra</TableHead>
                    <TableHead className="text-right text-zinc-600 text-xs">Berat (kg)</TableHead>
                    <TableHead className="text-right text-zinc-600 text-xs">Nilai Sampah</TableHead>
                    <TableHead className="text-right text-zinc-600 text-xs">Jual (Mitra)</TableHead>
                    <TableHead className="text-right text-zinc-600 text-xs">Keuntungan</TableHead>
                    <TableHead className="text-right text-zinc-600 text-xs">%</TableHead>
                    <TableHead className="text-center text-zinc-600 text-xs">Item</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.penjualanMitraDetail.map((tx: any) => {
                    const margin = Number(tx.totalMargin ?? 0)
                    const isTxProfit = tx.isProfit !== false
                    const isExpanded = expandedMitraTx === tx.id
                    return (
                      <Fragment key={tx.id}>
                        <TableRow className={cn('border-zinc-100', !isTxProfit && 'bg-rose-50/30')}>
                          <TableCell className="text-zinc-700 text-xs">{formatDate(tx.tanggal)}</TableCell>
                          <TableCell className="font-medium text-zinc-900 text-xs">{tx.mitra?.name ?? tx.mitra ?? '-'}</TableCell>
                          <TableCell className="text-right text-zinc-700 text-xs">{formatNumber(tx.totalWeight ?? 0, 2)}</TableCell>
                          <TableCell className="text-right text-amber-700 text-xs">{formatRupiah(tx.totalBeliNasabah ?? 0)}</TableCell>
                          <TableCell className="text-right text-emerald-700 text-xs">{formatRupiah(tx.totalJualMitra ?? 0)}</TableCell>
                          <TableCell className={cn('text-right font-bold text-xs', isTxProfit ? 'text-emerald-700' : 'text-rose-700')}>
                            {formatRupiah(margin)}
                          </TableCell>
                          <TableCell className={cn('text-right text-xs', isTxProfit ? 'text-emerald-600' : 'text-rose-600')}>
                            {(Number(tx.totalMarginPersen ?? 0)).toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-zinc-600 hover:bg-zinc-100 text-[11px]"
                              onClick={() => setExpandedMitraTx(isExpanded ? null : tx.id)}
                            >
                              {isExpanded ? 'Tutup' : 'Lihat'}
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isExpanded && tx.items && tx.items.length > 0 && (
                          <TableRow className="bg-zinc-50/50">
                            <TableCell colSpan={8} className="p-3">
                              <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
                                <Table>
                                  <TableHeader className="bg-zinc-50">
                                    <TableRow>
                                      <TableHead className="text-[10px] text-zinc-500">Nama Barang</TableHead>
                                      <TableHead className="text-right text-[10px] text-zinc-500">Jumlah</TableHead>
                                      <TableHead className="text-right text-[10px] text-zinc-500">Hrg Nasabah</TableHead>
                                      <TableHead className="text-right text-[10px] text-zinc-500">Hrg Mitra</TableHead>
                                      <TableHead className="text-right text-[10px] text-zinc-500">Total Nilai</TableHead>
                                      <TableHead className="text-right text-[10px] text-zinc-500">Total Jual</TableHead>
                                      <TableHead className="text-right text-[10px] text-zinc-500">Keuntungan</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {tx.items.map((it: any, idx: number) => {
                                      const itMargin = Number(it.margin ?? 0)
                                      const itProfit = it.isProfit !== false
                                      return (
                                        <TableRow key={it.id ?? idx}>
                                          <TableCell className="text-[11px] font-medium text-zinc-800">
                                            {it.itemName ?? it.itemNameSnapshot}
                                          </TableCell>
                                          <TableCell className="text-right text-[11px] text-zinc-600">
                                            {formatNumber(it.qty ?? 0, 2)} {it.unit ?? ''}
                                          </TableCell>
                                          <TableCell className="text-right text-[11px] text-amber-700">{formatRupiah(it.hargaBeliNasabah ?? 0)}</TableCell>
                                          <TableCell className="text-right text-[11px] text-emerald-700">{formatRupiah(it.hargaJualMitra ?? 0)}</TableCell>
                                          <TableCell className="text-right text-[11px] text-amber-700">{formatRupiah(it.subtotalBeli ?? 0)}</TableCell>
                                          <TableCell className="text-right text-[11px] text-emerald-700">{formatRupiah(it.subtotalJual ?? 0)}</TableCell>
                                          <TableCell className={cn('text-right text-[11px] font-bold', itProfit ? 'text-emerald-700' : 'text-rose-700')}>
                                            {formatRupiah(itMargin)}
                                          </TableCell>
                                        </TableRow>
                                      )
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabel transaksi terbaru */}
      <Card className="border-zinc-200">
        <CardHeader className="pb-3 border-b border-zinc-100">
          <CardTitle className="text-base text-zinc-800">Riwayat Uang Masuk & Keluar</CardTitle>
          <CardDescription className="text-xs">
            Buku catatan pergerakan kas fisik terbaru.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {data.transaksi.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-400">Belum ada transaksi.</p>
          ) : (
            <div className="max-h-80 overflow-auto border-x border-b border-zinc-100 rounded-b-lg">
              <Table>
                <TableHeader className="bg-zinc-50 sticky top-0">
                  <TableRow>
                    <TableHead className="text-zinc-600 text-xs">Tanggal</TableHead>
                    <TableHead className="text-zinc-600 text-xs">Keterangan</TableHead>
                    <TableHead className="text-zinc-600 text-right text-xs">Uang Masuk</TableHead>
                    <TableHead className="text-zinc-600 text-right text-xs">Uang Keluar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.transaksi.map((t: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-[11px] text-zinc-500 whitespace-nowrap">{formatDateTime(t.transactedAt)}</TableCell>
                      <TableCell className="text-[11px] text-zinc-800 max-w-xs truncate" title={t.keterangan || ''}>{t.keterangan || '-'}</TableCell>
                      <TableCell className="text-right text-[11px] font-medium text-emerald-600">{t.tipe === 'masuk' ? formatRupiah(toNumber(t.jumlah)) : '—'}</TableCell>
                      <TableCell className="text-right text-[11px] font-medium text-rose-600">{t.tipe === 'keluar' ? formatRupiah(toNumber(t.jumlah)) : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ========================================================================
// TAB 2: KOPERASI (Sederhana)
// ========================================================================
function LaporanKoperasi() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState('1thn')
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.laporan.koperasi({
        periode,
        dari: periode === 'custom' ? dari : undefined,
        sampai: periode === 'custom' ? sampai : undefined,
      })
      setData(d)
    } catch (e: any) {
      toast.error(e?.message || 'Gagal memuat laporan')
    } finally {
      setLoading(false)
    }
  }, [periode, dari, sampai])

  useEffect(() => { load() }, [load])

  if (loading || !data) return <ReportSkeleton />

  const r = data.ringkasan
  const isProfit = r.labaRugiBersih >= 0

  return (
    <div id="printable-laporan" className="space-y-4">
      <Card className="border-blue-200 print:hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Landmark className="size-5" /> Laporan Koperasi
              </CardTitle>
              <CardDescription className="mt-1">
                {data.setting?.namaKoperasi || 'Koperasi'} · Periode: {formatDate(data.periode.start)} — {formatDate(data.periode.end)}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <PeriodFilter periode={periode} setPeriode={setPeriode} dari={dari} setDari={setDari} sampai={sampai} setSampai={setSampai} onReset={() => { setPeriode('1thn'); setDari(''); setSampai('') }} />
              <Button onClick={handlePrintLaporan} size="sm" className="h-9 bg-blue-600 text-white hover:bg-blue-700">
                <Printer className="mr-1 size-3.5" /> Cetak
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Print header */}
      <div className="hidden print:block print-header">
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>LAPORAN KOPERASI</h1>
        <p style={{ fontSize: '12px', marginBottom: '2px' }}>{data.setting?.namaKoperasi || 'Koperasi Sukamaju Sejahtera'}</p>
        <p style={{ fontSize: '11px', color: '#555' }}>Periode: {formatDate(data.periode.start)} — {formatDate(data.periode.end)}</p>
        <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #999' }} />
      </div>

      {/* HASIL UTAMA */}
      <ResultCard
        isProfit={isProfit}
        label={isProfit ? '✓ KOPERASI UNTUNG' : '✗ KOPERASI RUGI'}
        amount={formatRupiah(Math.abs(r.labaRugiBersih))}
        sub="dari bunga pinjaman, biaya admin & denda"
      />

      {/* 3 angka penting */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <ArrowUpRight className="size-4" />
            <p className="text-xs font-semibold uppercase">Pendapatan</p>
          </div>
          <p className="mt-1 text-2xl font-black text-emerald-900">{formatRupiah(r.totalPendapatan)}</p>
          <p className="text-[11px] text-emerald-600">bunga + admin + denda</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
          <div className="flex items-center gap-2 text-rose-700">
            <ArrowDownRight className="size-4" />
            <p className="text-xs font-semibold uppercase">Biaya</p>
          </div>
          <p className="mt-1 text-2xl font-black text-rose-900">{formatRupiah(r.bebanOperasional)}</p>
          <p className="text-[11px] text-rose-600">pengeluaran koperasi</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
          <div className="flex items-center gap-2 text-blue-700">
            <Wallet className="size-4" />
            <p className="text-xs font-semibold uppercase">Uang di Kas Koperasi</p>
          </div>
          <p className="mt-1 text-2xl font-black text-blue-900">{formatRupiah(r.saldoKas)}</p>
          <p className="text-[11px] text-blue-600">{r.totalAnggota} anggota aktif</p>
        </div>
      </div>

      {/* Rincian */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-emerald-900">
              <ArrowUpRight className="size-4" /> Dari Mana Pendapatan?
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <MoneyRow icon={Coins} label="Bunga pinjaman anggota" value={data.pendapatan.bungaPinjaman} tone="positive" />
            <MoneyRow icon={Banknote} label="Biaya admin pinjaman" value={data.pendapatan.biayaAdminPinjaman} tone="positive" />
            <MoneyRow icon={AlertCircle} label="Denda keterlambatan" value={data.pendapatan.dendaKeterlambatan} tone="positive" />
            {data.pendapatan.lainnya > 0 && <MoneyRow label="Lainnya" value={data.pendapatan.lainnya} tone="positive" />}
            <MoneyRow label="TOTAL PENDAPATAN" value={r.totalPendapatan} tone="total" />
            <div className="mt-2 rounded-md bg-blue-50 px-3 py-2 text-[11px] text-blue-800">
              <AlertCircle className="mr-1 inline size-3" />
              Catatan: setoran simpanan anggota BUKAN pendapatan — itu uang titipan (utang koperasi ke anggota).
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-purple-900">
              <Landmark className="size-4" /> Pinjaman yang Masih Berjalan
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <MoneyRow icon={HandCoins} label="Sisa pinjaman belum lunas" value={data.pinjaman.totalBerjalan} tone="highlight" />
            <MoneyRow icon={Coins} label="Estimasi bunga yang akan diterima" value={data.pinjaman.estimasiBungaBerjalan} tone="positive" />
            <div className="mt-2 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg border border-purple-100 bg-purple-50/40 p-2">
                <p className="text-lg font-bold text-purple-900">{data.pinjaman.countBerjalan}</p>
                <p className="text-[10px] text-purple-600">pinjaman aktif</p>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-2">
                <p className="text-lg font-bold text-emerald-900">{data.pinjaman.lunasDalamPeriode.count}</p>
                <p className="text-[10px] text-emerald-600">lunas periode ini</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabel transaksi */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="text-base text-blue-900">Transaksi Kas Koperasi Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {data.transaksi.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-400">Belum ada transaksi.</p>
          ) : (
            <div className="max-h-80 overflow-auto">
              <Table>
                <TableHeader className="bg-blue-50 sticky top-0">
                  <TableRow>
                    <TableHead className="text-blue-800">Tanggal</TableHead>
                    <TableHead className="text-blue-800">Keterangan</TableHead>
                    <TableHead className="text-blue-800 text-right">Masuk</TableHead>
                    <TableHead className="text-blue-800 text-right">Keluar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.transaksi.map((t: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs text-zinc-600">{formatDateTime(t.tanggalTransaksi)}</TableCell>
                      <TableCell className="text-xs text-zinc-700 max-w-xs truncate" title={t.keterangan || ''}>{t.keterangan || '-'}</TableCell>
                      <TableCell className="text-right text-xs font-medium text-emerald-700">{t.tipe === 'masuk' ? formatRupiah(toNumber(t.jumlah)) : '—'}</TableCell>
                      <TableCell className="text-right text-xs font-medium text-rose-700">{t.tipe === 'keluar' ? formatRupiah(toNumber(t.jumlah)) : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ========================================================================
// TAB 3: PENJUALAN PRODUK (Sederhana)
// ========================================================================
function LaporanPenjualanProduk() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState('1thn')
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.laporan.penjualanProduk({
        periode,
        dari: periode === 'custom' ? dari : undefined,
        sampai: periode === 'custom' ? sampai : undefined,
      })
      setData(d)
    } catch (e: any) {
      toast.error(e?.message || 'Gagal memuat laporan')
    } finally {
      setLoading(false)
    }
  }, [periode, dari, sampai])

  useEffect(() => { load() }, [load])

  if (loading || !data) return <ReportSkeleton />

  const r = data.ringkasan
  const isProfit = r.labaRugiBersih >= 0

  return (
    <div id="printable-laporan" className="space-y-4">
      <Card className="border-purple-200 print:hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-purple-900">
                <ShoppingBag className="size-5" /> Laporan Penjualan Produk
              </CardTitle>
              <CardDescription className="mt-1">
                Kasir Offline + Toko Online · Periode: {formatDate(data.periode.start)} — {formatDate(data.periode.end)}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <PeriodFilter periode={periode} setPeriode={setPeriode} dari={dari} setDari={setDari} sampai={sampai} setSampai={setSampai} onReset={() => { setPeriode('1thn'); setDari(''); setSampai('') }} />
              <Button onClick={handlePrintLaporan} size="sm" className="h-9 bg-purple-600 text-white hover:bg-purple-700">
                <Printer className="mr-1 size-3.5" /> Cetak
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Print header */}
      <div className="hidden print:block print-header">
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>LAPORAN PENJUALAN PRODUK</h1>
        <p style={{ fontSize: '12px', marginBottom: '2px' }}>Bank Sampah Sukamaju Sejahtera · Kasir Offline + Toko Online</p>
        <p style={{ fontSize: '11px', color: '#555' }}>Periode: {formatDate(data.periode.start)} — {formatDate(data.periode.end)}</p>
        <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #999' }} />
      </div>

      {/* HASIL UTAMA */}
      <ResultCard
        isProfit={isProfit}
        label={isProfit ? '✓ PENJUALAN PRODUK UNTUNG' : '✗ PENJUALAN PRODUK RUGI'}
        amount={formatRupiah(Math.abs(r.labaRugiBersih))}
        sub={`margin ${r.marginBersih.toFixed(1)}% · ${r.offlineTransactions + r.onlineTransactions} transaksi · ${r.offlineItemsSold + r.onlineItemsSold} unit terjual`}
      />

      {/* 3 angka penting */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <ArrowUpRight className="size-4" />
            <p className="text-xs font-semibold uppercase">Total Penjualan</p>
          </div>
          <p className="mt-1 text-2xl font-black text-emerald-900">{formatRupiah(r.totalRevenue)}</p>
          <p className="text-[11px] text-emerald-600">offline {formatRupiah(r.offlineRevenue)} · online {formatRupiah(r.onlineRevenue)}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <Package className="size-4" />
            <p className="text-xs font-semibold uppercase">Modal (Harga Bahan)</p>
          </div>
          <p className="mt-1 text-2xl font-black text-amber-900">{formatRupiah(r.totalCOGS)}</p>
          <p className="text-[11px] text-amber-600">biaya bahan baku sampah</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
          <div className="flex items-center gap-2 text-rose-700">
            <ArrowDownRight className="size-4" />
            <p className="text-xs font-semibold uppercase">Biaya Ongkir</p>
          </div>
          <p className="mt-1 text-2xl font-black text-rose-900">{formatRupiah(r.bebanOperasional)}</p>
          <p className="text-[11px] text-rose-600">ongkos kirim online</p>
        </div>
      </div>

      {/* Rincian per channel */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-purple-900">
              <Store className="size-4" /> Penjualan Offline (Kasir)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <MoneyRow icon={ShoppingBag} label="Penjualan" value={r.offlineRevenue} tone="positive" />
            <MoneyRow icon={Package} label="Modal bahan" value={r.offlineCOGS} tone="negative" />
            <MoneyRow label="LABA OFFLINE" value={r.offlineRevenue - r.offlineCOGS} tone="total" />
            <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
              <span>{r.offlineTransactions} transaksi</span>
              <span>·</span>
              <span>{formatNumber(r.offlineItemsSold, 0)} unit terjual</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-blue-900">
              <ShoppingBag className="size-4" /> Penjualan Online (Toko)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <MoneyRow icon={ShoppingBag} label="Penjualan" value={r.onlineRevenue} tone="positive" />
            <MoneyRow icon={Package} label="Modal bahan" value={r.onlineCOGS} tone="negative" />
            <MoneyRow icon={ArrowDownRight} label="Ongkir" value={r.onlineOngkir} tone="negative" />
            <MoneyRow label="LABA ONLINE" value={r.onlineRevenue - r.onlineCOGS - r.onlineOngkir} tone="total" />
            <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
              <span>{r.onlineTransactions} transaksi</span>
              <span>·</span>
              <span>{formatNumber(r.onlineItemsSold, 0)} pcs terjual</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Produk terlaris */}
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="text-base text-purple-900">Produk Terlaris</CardTitle>
        </CardHeader>
        <CardContent>
          {data.byProduct.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-400">Belum ada penjualan.</p>
          ) : (
            <div className="max-h-80 overflow-auto">
              <Table>
                <TableHeader className="bg-purple-50 sticky top-0">
                  <TableRow>
                    <TableHead className="text-purple-800">Produk</TableHead>
                    <TableHead className="text-purple-800 text-right">Terjual</TableHead>
                    <TableHead className="text-purple-800 text-right">Modal</TableHead>
                    <TableHead className="text-purple-800 text-right">Penjualan</TableHead>
                    <TableHead className="text-purple-800 text-right">Laba</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byProduct.slice(0, 15).map((p: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium text-zinc-900 max-w-[160px] truncate" title={p.name}>{p.name}</TableCell>
                      <TableCell className="text-right text-xs">{formatNumber(p.qty, 0)} pcs</TableCell>
                      <TableCell className="text-right text-xs font-medium text-amber-700">{formatRupiah(p.revenue - p.laba)}</TableCell>
                      <TableCell className="text-right text-xs font-medium text-purple-700">{formatRupiah(p.revenue)}</TableCell>
                      <TableCell className="text-right text-xs font-bold text-emerald-700">{formatRupiah(p.laba)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaksi terbaru */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-purple-200">
          <CardHeader><CardTitle className="text-base text-purple-900">Transaksi Offline Terbaru</CardTitle></CardHeader>
          <CardContent>
            {data.detailTransaksi.offline.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-400">Belum ada.</p>
            ) : (
              <div className="max-h-60 overflow-auto">
                <Table>
                  <TableHeader className="bg-purple-50 sticky top-0">
                    <TableRow>
                      <TableHead className="text-purple-800">Tanggal</TableHead>
                      <TableHead className="text-purple-800">Pembeli</TableHead>
                      <TableHead className="text-purple-800 text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.detailTransaksi.offline.map((t: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs text-zinc-600">{formatDateTime(t.tanggal)}</TableCell>
                        <TableCell className="text-xs text-zinc-700 max-w-[120px] truncate" title={t.buyer}>{t.buyer}</TableCell>
                        <TableCell className="text-right text-xs font-medium text-purple-700">{formatRupiah(t.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader><CardTitle className="text-base text-blue-900">Transaksi Online Terbaru</CardTitle></CardHeader>
          <CardContent>
            {data.detailTransaksi.online.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-400">Belum ada.</p>
            ) : (
              <div className="max-h-60 overflow-auto">
                <Table>
                  <TableHeader className="bg-blue-50 sticky top-0">
                    <TableRow>
                      <TableHead className="text-blue-800">No. Order</TableHead>
                      <TableHead className="text-blue-800">Pembeli</TableHead>
                      <TableHead className="text-blue-800 text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.detailTransaksi.online.map((t: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-[10px] text-blue-700">{t.orderNumber}</TableCell>
                        <TableCell className="text-xs text-zinc-700 max-w-[120px] truncate" title={t.buyer}>{t.buyer}</TableCell>
                        <TableCell className="text-right text-xs font-medium text-blue-700">{formatRupiah(t.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============= Main Export =============
export function LaporanLabaRugi() {
  const [tab, setTab] = useState('bank-sampah')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <FileBarChart className="size-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-emerald-900">Laporan Laba Rugi</h2>
          <p className="text-sm text-zinc-500">Cek apakah Bank Sampah, Koperasi, dan Penjualan Produk untung atau rugi</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="bank-sampah" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-2">
            <Recycle className="size-3.5 shrink-0" /> <span className="truncate">Bank Sampah</span>
          </TabsTrigger>
          <TabsTrigger value="koperasi" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-2">
            <Landmark className="size-3.5 shrink-0" /> <span className="truncate">Koperasi</span>
          </TabsTrigger>
          <TabsTrigger value="penjualan-produk" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-2">
            <ShoppingBag className="size-3.5 shrink-0" /> <span className="truncate">Penjualan</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="bank-sampah" className="mt-4">
          <LaporanBankSampah />
        </TabsContent>
        <TabsContent value="koperasi" className="mt-4">
          <LaporanKoperasi />
        </TabsContent>
        <TabsContent value="penjualan-produk" className="mt-4">
          <LaporanPenjualanProduk />
        </TabsContent>
      </Tabs>
    </div>
  )
}
