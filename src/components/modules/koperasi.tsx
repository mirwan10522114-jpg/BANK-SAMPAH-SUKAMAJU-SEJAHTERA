'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { formatRupiah, formatDate, formatDateTime, toNumber } from '@/lib/format'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import {
  HandCoins,
  PiggyBank,
  Wallet,
  Landmark,
  Plus,
  Eye,
  Banknote,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Coins,
  Loader2,
  ListChecks,
  Info,
  Calculator,
  ReceiptText,
  Search,
  AlertTriangle,
  ShieldCheck,
  ShieldX,
  UserCircle,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { StrukModal, useStruk } from './struk-modal'

// ============================ Types ============================
type Anggota = {
  id: string
  nomorAnggota: string
  nama: string
  noTelepon?: string
  status: string
  simpananSaldos?: { jenisSimpanan: string; saldo: string | number }[]
}

type KoperasiSetting = {
  id: string
  namaKoperasi?: string
  nominalSimpananPokok?: string | number
  nominalSimpananWajib?: string | number
  biayaAdminPinjaman?: string | number
  sukuBungaPinjaman?: string | number
  dendaTerlambatPerHari?: string | number
  minimalBulanAnggota?: number
} | null

// ============================ Constants ============================
const SUMBER_LABEL: Record<string, string> = {
  simpanan: 'Simpanan',
  penarikan: 'Penarikan',
  pinjaman: 'Pinjaman',
  angsuran: 'Angsuran',
  denda: 'Denda',
  saldo_awal: 'Saldo Awal',
}

// ============================ Helpers ============================
function getSaldoByJenis(anggota: Anggota | null, jenis: string): number {
  if (!anggota?.simpananSaldos) return 0
  const s = anggota.simpananSaldos.find((x) => x.jenisSimpanan === jenis)
  return s ? toNumber(s.saldo) : 0
}

function PinjamanStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    diajukan: 'border-zinc-200 bg-zinc-50 text-zinc-600',
    disetujui: 'border-teal-200 bg-teal-50 text-teal-700',
    berjalan: 'border-amber-200 bg-amber-50 text-amber-700',
    lunas: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    ditolak: 'border-rose-200 bg-rose-50 text-rose-700',
  }
  const labelMap: Record<string, string> = {
    diajukan: 'Diajukan',
    disetujui: 'Disetujui',
    berjalan: 'Berjalan',
    lunas: 'Lunas',
    ditolak: 'Ditolak',
  }
  return (
    <Badge variant="outline" className={map[status] || 'border-zinc-200 text-zinc-600'}>
      {labelMap[status] || status}
    </Badge>
  )
}

function PenarikanStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    menunggu: 'border-amber-200 bg-amber-50 text-amber-700',
    disetujui: 'border-teal-200 bg-teal-50 text-teal-700',
    ditolak: 'border-rose-200 bg-rose-50 text-rose-700',
    dicairkan: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }
  const labelMap: Record<string, string> = {
    menunggu: 'Menunggu',
    disetujui: 'Disetujui',
    ditolak: 'Ditolak',
    dicairkan: 'Dicairkan',
  }
  return (
    <Badge variant="outline" className={map[status] || 'border-zinc-200 text-zinc-600'}>
      {labelMap[status] || status}
    </Badge>
  )
}

function SumberBadge({ sumber }: { sumber: string }) {
  return (
    <Badge variant="outline" className="border-emerald-200 bg-emerald-50/50 text-emerald-700">
      {SUMBER_LABEL[sumber] || sumber}
    </Badge>
  )
}

// ============================ Stat Card ============================
function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'emerald',
  sub,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  accent?: 'emerald' | 'teal' | 'amber' | 'rose' | 'sky'
  sub?: string
}) {
  const accentMap: Record<string, string> = {
    emerald: 'from-emerald-500 to-emerald-600 text-white',
    teal: 'from-teal-500 to-teal-600 text-white',
    amber: 'from-amber-500 to-amber-600 text-white',
    rose: 'from-rose-500 to-rose-600 text-white',
    sky: 'from-teal-400 to-emerald-500 text-white',
  }
  return (
    <Card className="overflow-hidden border-emerald-100 py-0">
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accentMap[accent]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-emerald-700/70">{label}</p>
          <p className="truncate text-lg font-bold text-emerald-900 sm:text-xl">{value}</p>
          {sub && <p className="text-[11px] text-emerald-600/60">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================ Anggota Selector ============================
function AnggotaSelector({
  value,
  onChange,
  anggotaList,
  loading,
}: {
  value: string
  onChange: (id: string) => void
  anggotaList: Anggota[]
  loading: boolean
}) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = anggotaList.filter((a) => {
    // Only show active anggota in selector
    if (a.status && a.status !== 'aktif') return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      a.nama.toLowerCase().includes(q) ||
      a.nomorAnggota.toLowerCase().includes(q)
    )
  })

  const selected = anggotaList.find((a) => a.id === value)

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-emerald-700/70">Anggota Koperasi</Label>
      <Select
        value={value}
        onValueChange={(v) => { onChange(v); setOpen(false); setSearch('') }}
        disabled={loading || anggotaList.length === 0}
        open={open}
        onOpenChange={(o) => { setOpen(o); if (!o) setSearch('') }}
      >
        <SelectTrigger className="w-full sm:w-[340px]">
          <SelectValue placeholder={loading ? 'Memuat anggota...' : 'Pilih anggota'}>
            {selected ? (
              <span><span className="font-mono">{selected.nomorAnggota}</span> · {selected.nama}</span>
            ) : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <div className="border-b border-zinc-100 p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, kode, NIK, telp..."
                className="h-8 border-zinc-200 pl-8 text-xs"
                onKeyDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-[280px] overflow-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-emerald-700/60">
                {anggotaList.length === 0 ? 'Tidak ada anggota' : 'Tidak ditemukan'}
              </div>
            ) : (
              filtered.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  <span className="font-mono">{a.nomorAnggota}</span> · {a.nama}
                  {a.noTelepon && <span className="ml-1 text-[10px] text-zinc-400">{a.noTelepon}</span>}
                </SelectItem>
              ))
            )}
          </div>
          {anggotaList.length > 0 && (
            <div className="border-t border-zinc-100 px-3 py-1.5 text-[10px] text-zinc-400">
              {filtered.length} dari {anggotaList.length} anggota
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  )
}

// ============================ Empty Row ============================
function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center text-sm text-emerald-700/60">
        {message}
      </TableCell>
    </TableRow>
  )
}

function SkeletonRows({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton className="h-5 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

// ============================ SIMPANAN TAB ============================
function SimpananTab({ setting }: { setting: KoperasiSetting }) {
  const [anggotaList, setAnggotaList] = useState<Anggota[]>([])
  const [anggotaId, setAnggotaId] = useState<string>('')
  const [list, setList] = useState<any[]>([])
  const [loadingAnggota, setLoadingAnggota] = useState(true)
  const [loadingList, setLoadingList] = useState(false)

  // ---- Filter state (Riwayat Transaksi Simpanan) ----
  const [dariInput, setDariInput] = useState('')
  const [sampaiInput, setSampaiInput] = useState('')
  const [qInput, setQInput] = useState('')
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [q, setQ] = useState('')
  const [jenisFilter, setJenisFilter] = useState<string>('all') // 'all' | 'pokok' | 'wajib' | 'sukarela'
  const [tipeFilter, setTipeFilter] = useState<string>('all') // 'all' | 'setor' | 'tarik'

  const [jenis, setJenis] = useState<'pokok' | 'wajib' | 'sukarela'>('sukarela')
  const [tipe, setTipe] = useState<'setor' | 'tarik'>('setor')
  const [jumlah, setJumlah] = useState('')
  const [keterangan, setKeterangan] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { strukData, strukOpen, setStrukOpen, showStruk } = useStruk()

  const selectedAnggota = anggotaList.find((a) => a.id === anggotaId) || null

  // Nominal otomatis dari pengaturan koperasi
  const nominalPokok = toNumber(setting?.nominalSimpananPokok)
  const nominalWajib = toNumber(setting?.nominalSimpananWajib)
  const isAutoNominal = jenis === 'pokok' || jenis === 'wajib'

  // Auto-fill jumlah saat jenis berubah (dipanggil dari handler, bukan effect)
  const handleJenisChange = (v: 'pokok' | 'wajib' | 'sukarela') => {
    setJenis(v)
    if (v === 'pokok') {
      setJumlah(nominalPokok > 0 ? String(nominalPokok) : '')
    } else if (v === 'wajib') {
      setJumlah(nominalWajib > 0 ? String(nominalWajib) : '')
    } else {
      setJumlah('')
    }
    // Tarik hanya untuk sukarela
    if (v !== 'sukarela' && tipe === 'tarik') setTipe('setor')
  }

  useEffect(() => {
    setLoadingAnggota(true)
    api.anggota
      .list()
      .then((data) => {
        setAnggotaList(data)
        if (data.length > 0) setAnggotaId(data[0].id)
      })
      .catch((e) => toast.error('Gagal memuat anggota: ' + e.message))
      .finally(() => setLoadingAnggota(false))
  }, [])

  const loadList = useCallback(async () => {
    if (!anggotaId) {
      setList([])
      return
    }
    setLoadingList(true)
    try {
      const [tx, ag] = await Promise.all([
        api.koperasi.simpananList(anggotaId, {
          jenisSimpanan: jenisFilter === 'all' ? '' : jenisFilter,
          tipe: tipeFilter === 'all' ? '' : tipeFilter,
          dari,
          sampai,
          q,
        }),
        api.anggota.list(),
      ])
      setList(tx)
      setAnggotaList(ag)
    } catch (e: any) {
      toast.error('Gagal memuat simpanan: ' + e.message)
    } finally {
      setLoadingList(false)
    }
  }, [anggotaId, jenisFilter, tipeFilter, dari, sampai, q])

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
    setDari('')
    setSampai('')
    setQ('')
    setJenisFilter('all')
    setTipeFilter('all')
  }

  // Sinkronisasi jumlah otomatis saat pengaturan koperasi selesai dimuat
  // (untuk kasus user sudah memilih pokok/wajib sebelum setting tersedia).
  // Dipicu satu kali saat `setting` berubah dari null → object.
  useEffect(() => {
    if (!setting) return
    if (jenis === 'pokok') {
      setJumlah(nominalPokok > 0 ? String(nominalPokok) : '')
    } else if (jenis === 'wajib') {
      setJumlah(nominalWajib > 0 ? String(nominalWajib) : '')
    }
  }, [setting])

  const handleSubmit = async () => {
    const n = parseFloat(jumlah)
    if (isNaN(n) || n <= 0) {
      toast.error(
        isAutoNominal
          ? 'Nominal dari pengaturan belum valid. Periksa pengaturan koperasi.'
          : 'Jumlah harus lebih dari 0',
      )
      return
    }
    setSubmitting(true)
    try {
      const tx = await api.koperasi.simpananTx({
        anggotaId,
        jenisSimpanan: jenis,
        tipe,
        jumlah: n,
        keterangan: keterangan || undefined,
      })
      toast.success(
        `${tipe === 'setor' ? 'Setoran' : 'Penarikan'} simpanan ${jenis} berhasil`,
      )
      // Tampilkan struk simpanan
      showStruk({
        type: 'simpanan',
        receiptNo: tx?.nomorTransaksi || '-',
        tanggal: tx?.tanggalTransaksi || new Date().toISOString(),
        anggotaName: selectedAnggota?.nama || '-',
        anggotaCode: selectedAnggota?.nomorAnggota || '-',
        jenisSimpanan: `${jenis} · ${tipe}`,
        summary: [
          { label: 'Jumlah', value: formatRupiah(n) },
          {
            label: 'Saldo Sebelum',
            value: formatRupiah(toNumber(tx?.saldoSebelum)),
          },
          {
            label: 'Saldo Sesudah',
            value: formatRupiah(toNumber(tx?.saldoSesudah)),
            highlight: true,
          },
        ],
        saldoSebelum: toNumber(tx?.saldoSebelum),
        saldoSesudah: toNumber(tx?.saldoSesudah),
        notes: keterangan || undefined,
      })
      // Jangan reset jumlah kalau auto-nominal (pokok/wajib) — biarkan tetap terisi
      if (!isAutoNominal) setJumlah('')
      setKeterangan('')
      loadList()
    } catch (e: any) {
      toast.error(e.message || 'Gagal memproses transaksi')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-emerald-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-900">
          <PiggyBank className="h-5 w-5 text-emerald-600" /> Simpanan Anggota
        </CardTitle>
        <CardDescription>
          Kelola simpanan pokok, wajib, dan sukarela anggota koperasi.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <AnggotaSelector
          value={anggotaId}
          onChange={setAnggotaId}
          anggotaList={anggotaList}
          loading={loadingAnggota}
        />

        {/* Saldo cards */}
        {loadingAnggota ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Simpanan Pokok"
              value={formatRupiah(getSaldoByJenis(selectedAnggota, 'pokok'))}
              icon={Coins}
              accent="emerald"
            />
            <StatCard
              label="Simpanan Wajib"
              value={formatRupiah(getSaldoByJenis(selectedAnggota, 'wajib'))}
              icon={Wallet}
              accent="teal"
            />
            <StatCard
              label="Simpanan Sukarela"
              value={formatRupiah(getSaldoByJenis(selectedAnggota, 'sukarela'))}
              icon={PiggyBank}
              accent="sky"
            />
          </div>
        )}

        {/* Transaction form */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
          <p className="mb-3 text-sm font-semibold text-emerald-900">
            Transaksi Simpanan
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Jenis Simpanan</Label>
              <Select value={jenis} onValueChange={(v) => handleJenisChange(v as any)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pokok">Pokok</SelectItem>
                  <SelectItem value="wajib">Wajib</SelectItem>
                  <SelectItem value="sukarela">Sukarela</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Tipe Transaksi</Label>
              <Select value={tipe} onValueChange={(v) => setTipe(v as any)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="setor">Setor</SelectItem>
                  <SelectItem value="tarik" disabled={jenis !== 'sukarela'}>
                    Tarik (sukarela saja)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">
                {isAutoNominal
                  ? 'Nominal (otomatis dari pengaturan)'
                  : 'Jumlah (Rp)'}
              </Label>
              <Input
                type="number"
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                placeholder={isAutoNominal ? '— otomatis —' : '0'}
                min="0"
                readOnly={isAutoNominal}
                disabled={isAutoNominal}
                className={
                  isAutoNominal
                    ? 'bg-zinc-50 text-zinc-600 cursor-not-allowed'
                    : ''
                }
              />
              <p className="flex items-center gap-1 text-[11px] text-emerald-700/60">
                <Info className="h-3 w-3 shrink-0" />
                {isAutoNominal
                  ? 'Nominal mengikuti pengaturan koperasi'
                  : 'Nominal bebas (sukarela)'}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Keterangan</Label>
              <Input
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="opsional"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={submitting || !anggotaId}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {!submitting &&
                (tipe === 'setor' ? (
                  <ArrowUpCircle className="mr-1.5 h-4 w-4" />
                ) : (
                  <ArrowDownCircle className="mr-1.5 h-4 w-4" />
                ))}
              {tipe === 'setor' ? 'Setor' : 'Tarik'} Simpanan
            </Button>
          </div>
        </div>

        {/* Transactions table */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-emerald-900">
              Riwayat Transaksi Simpanan
            </p>
            {loadingList && <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />}
          </div>

          {/* Filter bar */}
          <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
            <div className="w-36">
              <Label className="text-xs text-zinc-500">Jenis Simpanan</Label>
              <Select value={jenisFilter} onValueChange={setJenisFilter}>
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="pokok">Pokok</SelectItem>
                  <SelectItem value="wajib">Wajib</SelectItem>
                  <SelectItem value="sukarela">Sukarela</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            {(dari || sampai || q || jenisFilter !== 'all' || tipeFilter !== 'all') && (
              <div className="ml-auto text-xs text-emerald-800">
                Aktif: <span className="font-medium">{dari || '…'} — {sampai || '…'}</span>
                {jenisFilter !== 'all' && ` · ${jenisFilter}`}
                {tipeFilter !== 'all' && ` · ${tipeFilter}`}
                {q && ` · "${q}"`}
              </div>
            )}
          </div>

          <div className="max-h-[480px] overflow-auto rounded-lg border border-emerald-100">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-emerald-50/95 backdrop-blur">
                <TableRow>
                  <TableHead>No Transaksi</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead className="text-right">Saldo Sesudah</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingList ? (
                  <SkeletonRows cols={7} />
                ) : list.length === 0 ? (
                  <EmptyRow colSpan={7} message="Belum ada transaksi simpanan." />
                ) : (
                  list.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-xs">
                        {tx.nomorTransaksi}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDateTime(tx.tanggalTransaksi)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-emerald-200 text-emerald-700"
                        >
                          {tx.jenisSimpanan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {tx.tipe === 'setor' ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 text-emerald-700"
                          >
                            <ArrowUpCircle className="h-3 w-3" /> setor
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-rose-200 bg-rose-50 text-rose-700"
                          >
                            <ArrowDownCircle className="h-3 w-3" /> tarik
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatRupiah(toNumber(tx.jumlah))}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-900">
                        {formatRupiah(toNumber(tx.saldoSesudah))}
                      </TableCell>
                      <TableCell
                        className="max-w-[220px] truncate text-xs text-emerald-700/70"
                        title={tx.keterangan || ''}
                      >
                        {tx.keterangan || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
      <StrukModal data={strukData} open={strukOpen} onOpenChange={setStrukOpen} />
    </Card>
  )
}

// ============================ PINJAMAN TAB ============================
function PinjamanTab({ setting }: { setting: KoperasiSetting }) {
  const [anggotaList, setAnggotaList] = useState<Anggota[]>([])
  const [anggotaId, setAnggotaId] = useState<string>('')
  const [list, setList] = useState<any[]>([])
  const [loadingAnggota, setLoadingAnggota] = useState(true)
  const [loadingList, setLoadingList] = useState(false)

  // ---- Filter state (Daftar Pinjaman) ----
  const [dariInput, setDariInput] = useState('')
  const [sampaiInput, setSampaiInput] = useState('')
  const [qInput, setQInput] = useState('')
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all') // 'all' | 'diajukan' | 'disetujui' | 'berjalan' | 'lunas' | 'ditolak'

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [jumlahPinjaman, setJumlahPinjaman] = useState('')
  const [tenorBulan, setTenorBulan] = useState('')
  const [keterangan, setKeterangan] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Eligibility state for create dialog
  const [eligibility, setEligibility] = useState<any>(null)
  const [loadingElig, setLoadingElig] = useState(false)

  // Jadwal dialog
  const [jadwalOpen, setJadwalOpen] = useState(false)
  const [jadwalData, setJadwalData] = useState<any | null>(null)
  const [loadingJadwal, setLoadingJadwal] = useState(false)

  // Bayar Angsuran dialog
  const [bayarOpen, setBayarOpen] = useState(false)
  const [bayarPinjaman, setBayarPinjaman] = useState<any | null>(null)
  const [bayarMode, setBayarMode] = useState<'1x' | 'beberapa' | 'lunas'>('1x')
  const [bayarJumlah, setBayarJumlah] = useState<number>(1)
  const [bayarKet, setBayarKet] = useState('')
  const [bayarSubmitting, setBayarSubmitting] = useState(false)

  // Suku bunga dari pengaturan (untuk dialog Create)
  const sukuBungaSetting = toNumber(setting?.sukuBungaPinjaman)

  const { strukData, strukOpen, setStrukOpen, showStruk } = useStruk()

  // Hitung ulang field otomatis di dialog Create
  const jpCreate = parseFloat(jumlahPinjaman) || 0
  const tbCreate = parseInt(tenorBulan) || 0
  const bungaPerBulanCreate =
    jpCreate > 0 && sukuBungaSetting > 0
      ? (jpCreate * sukuBungaSetting) / 100 / 12
      : 0
  const pokokPerBulanCreate = tbCreate > 0 ? jpCreate / tbCreate : 0
  const angsuranPerBulanCreate = pokokPerBulanCreate + bungaPerBulanCreate
  const totalBungaCreate = bungaPerBulanCreate * (tbCreate > 0 ? tbCreate : 0)
  const totalPinjamanBungaCreate = jpCreate + totalBungaCreate

  // Hitung field di dialog Bayar Angsuran (dari data pinjaman, bukan setting)
  const bpJumlahPinjaman = toNumber(bayarPinjaman?.jumlahPinjaman)
  const bpSukuBunga = toNumber(bayarPinjaman?.sukuBunga)
  const bpAngsuranPerBulan = toNumber(bayarPinjaman?.angsuranPerBulan)
  const bpBungaPerBulan =
    bpJumlahPinjaman > 0 ? (bpJumlahPinjaman * bpSukuBunga) / 100 / 12 : 0
  const bpPokokPerBulan = bpAngsuranPerBulan - bpBungaPerBulan
  const bpCurrentSisa = toNumber(bayarPinjaman?.sisaPinjaman)
  const bpTenor = bayarPinjaman?.tenorBulan || 0
  const bpSudahBayar = bayarPinjaman?.angsurans?.length || 0
  const bpSisaAngsuran = Math.max(0, bpTenor - bpSudahBayar)

  const bpJumlahBayar =
    bayarMode === '1x'
      ? 1
      : bayarMode === 'lunas'
        ? bpSisaAngsuran
        : Math.min(Math.max(1, bayarJumlah || 1), bpSisaAngsuran)
  const bpTotalBayar = bpJumlahBayar * bpAngsuranPerBulan
  const bpSisaSetelah = Math.max(
    0,
    bpCurrentSisa - bpJumlahBayar * bpPokokPerBulan,
  )
  const bpWillLunas = bpJumlahBayar >= bpSisaAngsuran || bpSisaSetelah <= 0

  useEffect(() => {
    setLoadingAnggota(true)
    api.anggota
      .list()
      .then((data) => {
        setAnggotaList(data)
        if (data.length > 0) setAnggotaId(data[0].id)
      })
      .catch((e) => toast.error('Gagal memuat anggota: ' + e.message))
      .finally(() => setLoadingAnggota(false))
  }, [])

  const loadList = useCallback(async () => {
    if (!anggotaId) {
      setList([])
      return
    }
    setLoadingList(true)
    try {
      const data = await api.koperasi.pinjamanList(
        anggotaId,
        statusFilter === 'all' ? '' : statusFilter,
        { dari, sampai, q },
      )
      setList(data)
    } catch (e: any) {
      toast.error('Gagal memuat pinjaman: ' + e.message)
    } finally {
      setLoadingList(false)
    }
  }, [anggotaId, statusFilter, dari, sampai, q])

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
    setDari('')
    setSampai('')
    setQ('')
    setStatusFilter('all')
  }

  const resetForm = () => {
    setJumlahPinjaman('')
    setTenorBulan('')
    setKeterangan('')
    setEligibility(null)
  }

  // Fetch eligibility when dialog opens
  const openCreateDialog = () => {
    if (!anggotaId) return
    setDialogOpen(true)
    setEligibility(null)
    setLoadingElig(true)
    api.koperasi.checkPinjamanEligibility(anggotaId)
      .then((res) => { setEligibility(res); setLoadingElig(false) })
      .catch(() => { setEligibility(null); setLoadingElig(false) })
  }

  const handleCreate = async () => {
    const jp = parseFloat(jumlahPinjaman)
    const tb = parseInt(tenorBulan)
    if (isNaN(jp) || jp <= 0) {
      toast.error('Jumlah pinjaman harus > 0')
      return
    }
    if (isNaN(tb) || tb <= 0) {
      toast.error('Tenor harus > 0 bulan')
      return
    }
    setSubmitting(true)
    try {
      await api.koperasi.pinjamanCreate({
        anggotaId,
        jumlahPinjaman: jp,
        tenorBulan: tb,
        keterangan: keterangan || undefined,
      })
      toast.success('Pengajuan pinjaman berhasil dibuat')
      setDialogOpen(false)
      resetForm()
      loadList()
    } catch (e: any) {
      toast.error(e.message || 'Gagal mengajukan pinjaman')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async (p: any) => {
    try {
      await api.koperasi.pinjamanApprove(p.id)
      toast.success(`Pinjaman ${p.nomorPinjaman} disetujui`)
      loadList()
    } catch (e: any) {
      toast.error(e.message || 'Gagal menyetujui pinjaman')
    }
  }

  const handleCairkan = async (p: any) => {
    try {
      const res = await api.koperasi.pinjamanCairkan(p.id)
      toast.success(`Pinjaman ${p.nomorPinjaman} berhasil dicairkan`)
      const anggota = anggotaList.find((a) => a.id === anggotaId) || null
      showStruk({
        type: 'pencairan_pinjaman',
        receiptNo: p.nomorPinjaman,
        tanggal: res?.tanggalPencairan || new Date().toISOString(),
        anggotaName: anggota?.nama || '-',
        anggotaCode: anggota?.nomorAnggota || '-',
        summary: [
          {
            label: 'Jumlah Pinjaman',
            value: formatRupiah(toNumber(res?.jumlahPinjaman ?? p.jumlahPinjaman)),
          },
          { label: 'Tenor', value: `${res?.tenorBulan || p.tenorBulan} bulan` },
          {
            label: 'Suku Bunga',
            value: `${toNumber(res?.sukuBunga)}% / thn`,
          },
          {
            label: 'Angsuran per Bulan',
            value: formatRupiah(toNumber(res?.angsuranPerBulan)),
            highlight: true,
          },
        ],
        notes: 'Pinjaman telah dicairkan. Mohon bayar angsuran tepat waktu.',
      })
      loadList()
    } catch (e: any) {
      toast.error(e.message || 'Gagal mencairkan pinjaman')
    }
  }

  const openBayar = (pinjaman: any) => {
    setBayarPinjaman(pinjaman)
    setBayarMode('1x')
    setBayarJumlah(1)
    setBayarKet('')
    setBayarOpen(true)
  }

  const handleBayarAngsuran = async () => {
    if (!bayarPinjaman) return
    setBayarSubmitting(true)
    try {
      const payload: any = { keterangan: bayarKet || undefined }
      if (bayarMode === '1x') {
        payload.jumlahAngsuran = 1
      } else if (bayarMode === 'lunas') {
        payload.jumlahAngsuran = 'lunas'
      } else {
        payload.jumlahAngsuran = bpJumlahBayar
      }
      const res = await api.koperasi.pinjamanAngsuran(
        bayarPinjaman.id,
        payload,
      )
      if (res?.isLunas) {
        toast.success(
          `Pinjaman lunas! ${res.countPaid} angsuran dibayar (${formatRupiah(res.totalPaid)})`,
        )
      } else {
        toast.success(
          `${res?.countPaid ?? bpJumlahBayar} angsuran berhasil dibayar (${formatRupiah(res?.totalPaid ?? bpTotalBayar)}). Sisa: ${res?.sisaAngsuran ?? bpSisaAngsuran - bpJumlahBayar} angsuran`,
        )
      }
      const anggota = anggotaList.find((a) => a.id === anggotaId) || null
      showStruk({
        type: 'angsuran',
        receiptNo: bayarPinjaman.nomorPinjaman,
        tanggal: new Date().toISOString(),
        anggotaName: anggota?.nama || '-',
        anggotaCode: anggota?.nomorAnggota || '-',
        summary: [
          {
            label: 'Angsuran Dibayar',
            value: `${res?.countPaid ?? bpJumlahBayar} kali`,
          },
          {
            label: 'Total Dibayar',
            value: formatRupiah(res?.totalPaid ?? bpTotalBayar),
            highlight: true,
          },
          {
            label: 'Sisa Pinjaman',
            value: formatRupiah(toNumber(res?.pinjaman?.sisaPinjaman)),
          },
          {
            label: 'Status',
            value: res?.isLunas ? 'LUNAS' : 'Masih Berjalan',
          },
        ],
        notes: res?.isLunas
          ? 'Pinjaman telah lunas sepenuhnya. Terima kasih.'
          : undefined,
      })
      setBayarOpen(false)
      setBayarPinjaman(null)
      loadList()
    } catch (e: any) {
      toast.error(e.message || 'Gagal membayar angsuran')
    } finally {
      setBayarSubmitting(false)
    }
  }

  const openJadwal = async (id: string) => {
    setJadwalOpen(true)
    setLoadingJadwal(true)
    setJadwalData(null)
    try {
      const data = await api.koperasi.pinjamanGet(id)
      setJadwalData(data)
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat jadwal angsuran')
      setJadwalOpen(false)
    } finally {
      setLoadingJadwal(false)
    }
  }

  return (
    <Card className="border-emerald-100">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-emerald-900">
              <HandCoins className="h-5 w-5 text-emerald-600" /> Pinjaman & Angsuran
            </CardTitle>
            <CardDescription>
              Ajukan, cairkan, dan bayar angsuran pinjaman anggota.
            </CardDescription>
          </div>
          <Button
            onClick={openCreateDialog}
            disabled={!anggotaId}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Ajukan Pinjaman
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <AnggotaSelector
          value={anggotaId}
          onChange={setAnggotaId}
          anggotaList={anggotaList}
          loading={loadingAnggota}
        />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-emerald-900">
              Daftar Pinjaman
            </p>
            {loadingList && <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />}
          </div>

          {/* Filter bar */}
          <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
            <div className="w-40">
              <Label className="text-xs text-zinc-500">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="diajukan">Diajukan</SelectItem>
                  <SelectItem value="disetujui">Disetujui</SelectItem>
                  <SelectItem value="berjalan">Berjalan</SelectItem>
                  <SelectItem value="lunas">Lunas</SelectItem>
                  <SelectItem value="ditolak">Ditolak</SelectItem>
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
              <Label className="text-xs text-zinc-500">Cari No. Pinjaman</Label>
              <Input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFilters()
                }}
                placeholder="No. pinjaman..."
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
            {(dari || sampai || q || statusFilter !== 'all') && (
              <div className="ml-auto text-xs text-emerald-800">
                Aktif: <span className="font-medium">{dari || '…'} — {sampai || '…'}</span>
                {statusFilter !== 'all' && ` · ${statusFilter}`}
                {q && ` · "${q}"`}
              </div>
            )}
          </div>

          <div className="max-h-[480px] overflow-auto rounded-lg border border-emerald-100">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-emerald-50/95 backdrop-blur">
                <TableRow>
                  <TableHead>Nomor</TableHead>
                  <TableHead>Tanggal Pengajuan</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Tenor</TableHead>
                  <TableHead className="text-right">Angsuran/Bln</TableHead>
                  <TableHead className="text-right">Sisa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingList ? (
                  <SkeletonRows cols={8} />
                ) : list.length === 0 ? (
                  <EmptyRow
                    colSpan={8}
                    message="Belum ada pinjaman. Klik 'Ajukan Pinjaman' untuk membuat."
                  />
                ) : (
                  list.map((p) => {
                    const canApprove = p.status === 'diajukan'
                    const canCairkan = p.status === 'disetujui'
                    const canBayar = p.status === 'berjalan'
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">
                          {p.nomorPinjaman}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDate(p.tanggalPengajuan)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatRupiah(toNumber(p.jumlahPinjaman))}
                        </TableCell>
                        <TableCell>{p.tenorBulan} bln</TableCell>
                        <TableCell className="text-right">
                          {formatRupiah(toNumber(p.angsuranPerBulan))}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-emerald-900">
                          {formatRupiah(toNumber(p.sisaPinjaman))}
                        </TableCell>
                        <TableCell>
                          <PinjamanStatusBadge status={p.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap justify-end gap-1">
                            {canApprove && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 border-amber-200 text-amber-700 hover:bg-amber-50"
                                onClick={() => handleApprove(p)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Setujui
                              </Button>
                            )}
                            {canCairkan && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                onClick={() => handleCairkan(p)}
                              >
                                <Banknote className="h-3.5 w-3.5" /> Cairkan
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 border-teal-200 text-teal-700 hover:bg-teal-50"
                              onClick={() => openJadwal(p.id)}
                            >
                              <Eye className="h-3.5 w-3.5" /> Jadwal
                            </Button>
                            {canBayar && (
                              <Button
                                size="sm"
                                className="h-7 bg-emerald-600 text-white hover:bg-emerald-700"
                                onClick={() => openBayar(p)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Bayar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-900">
              <HandCoins className="h-5 w-5 text-emerald-600" /> Ajukan Pinjaman Baru
            </DialogTitle>
            <DialogDescription>
              Isi detail pengajuan pinjaman. Suku bunga & biaya admin mengikuti
              pengaturan koperasi.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Eligibility Status Banner */}
            {loadingElig && (
              <Skeleton className="h-28 w-full rounded-xl" />
            )}
            {!loadingElig && eligibility && (
              <div className={cn(
                'relative overflow-hidden rounded-xl border-2 p-4',
                eligibility.eligible
                  ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50'
                  : 'border-red-200 bg-gradient-to-br from-red-50 to-rose-50'
              )}>
                <div className="flex items-start gap-3">
                  {eligibility.eligible ? (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 ring-3 ring-emerald-100/50">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 ring-3 ring-red-100/50">
                      <XCircle className="h-6 w-6 text-red-500" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <p className={cn('text-sm font-bold', eligibility.eligible ? 'text-emerald-800' : 'text-red-800')}>
                        {eligibility.eligible ? 'LAYAK' : 'TIDAK LAYAK'}
                      </p>
                      <Badge className={cn(
                        'text-[10px] font-bold uppercase',
                        eligibility.eligible
                          ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
                          : 'border-red-300 bg-red-100 text-red-700'
                      )}>
                        {eligibility.eligible ? '✓ Memenuhi Syarat' : '✗ Tidak Memenuhi Syarat'}
                      </Badge>
                    </div>
                    {/* Keanggotaan info */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg bg-white/70 px-3 py-2 text-[11px]">
                      <div className="flex items-center gap-1">
                        <UserCircle className="h-3 w-3 text-teal-600" />
                        <span className="text-zinc-500">{eligibility.anggotaInfo?.nomorAnggota || '-'}</span>
                      </div>
                      <div className="h-3 w-px bg-zinc-200" />
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-teal-600" />
                        <span className="text-zinc-500">Bergabung {eligibility.anggotaInfo?.tanggalBergabung ? formatDate(eligibility.anggotaInfo.tanggalBergabung) : '-'}</span>
                      </div>
                      <div className="h-3 w-px bg-zinc-200" />
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-teal-600" />
                        <span className="text-zinc-500">Lama:</span>
                        <span className={cn('font-bold', (eligibility.memberMonths ?? 0) >= (eligibility.minimalBulanAnggota ?? 3) ? 'text-emerald-700' : 'text-red-600')}>
                          {eligibility.memberMonths ?? 0} bulan
                        </span>
                        <span className="text-zinc-400">(min. {eligibility.minimalBulanAnggota ?? 3} bln)</span>
                      </div>
                    </div>
                    {/* 3 checks summary */}
                    <div className="flex flex-wrap gap-2">
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium',
                        (eligibility.memberMonths ?? 0) >= (eligibility.minimalBulanAnggota ?? 3)
                          ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      )}>
                        {(eligibility.memberMonths ?? 0) >= (eligibility.minimalBulanAnggota ?? 3) ? <ShieldCheck className="h-3 w-3" /> : <ShieldX className="h-3 w-3" />}
                        Keanggotaan
                      </span>
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium',
                        eligibility.riwayatPembayaran === 'baik' || eligibility.riwayatPembayaran === 'baru'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      )}>
                        {eligibility.riwayatPembayaran === 'buruk' ? <ShieldX className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                        Riwayat {eligibility.riwayatPembayaran === 'baru' ? '(baru)' : eligibility.riwayatPembayaran === 'baik' ? '(bagus)' : `(buruk: ${eligibility.totalKeterlambatan}x telat)`}
                      </span>
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium',
                        !eligibility.adaPinjamanAktif
                          ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      )}>
                        {!eligibility.adaPinjamanAktif ? <ShieldCheck className="h-3 w-3" /> : <ShieldX className="h-3 w-3" />}
                        {eligibility.adaPinjamanAktif ? 'Ada pinjaman aktif' : 'Tidak ada pinjaman aktif'}
                      </span>
                    </div>
                    {/* Reasons */}
                    {!eligibility.eligible && eligibility.reasons?.length > 0 && (
                      <ul className="space-y-0.5">
                        {eligibility.reasons.map((r: string, i: number) => (
                          <li key={i} className="flex items-start gap-1 text-[11px] text-red-600">
                            <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-current" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
            {!loadingElig && !eligibility && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Gagal memuat status eligibilitas. Pastikan data anggota valid.
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="jp">Jumlah Pinjaman (Rp)</Label>
              <Input
                id="jp"
                type="number"
                value={jumlahPinjaman}
                onChange={(e) => setJumlahPinjaman(e.target.value)}
                placeholder="5000000"
                min="0"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tb">Tenor (bulan)</Label>
              <Input
                id="tb"
                type="number"
                value={tenorBulan}
                onChange={(e) => setTenorBulan(e.target.value)}
                placeholder="12"
                min="1"
              />
            </div>

            {/* Perhitungan Otomatis (dari Pengaturan) */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                <Calculator className="h-3.5 w-3.5" />
                Perhitungan Otomatis (dari Pengaturan)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md bg-white/70 p-2">
                  <p className="text-[10px] uppercase tracking-wide text-emerald-700/70">
                    Suku Bunga
                  </p>
                  <p className="text-sm font-semibold text-emerald-900">
                    {sukuBungaSetting}% / thn
                  </p>
                </div>
                <div className="rounded-md bg-white/70 p-2">
                  <p className="text-[10px] uppercase tracking-wide text-emerald-700/70">
                    Bunga per Bulan
                  </p>
                  <p className="text-sm font-semibold text-emerald-900">
                    {formatRupiah(bungaPerBulanCreate)}
                  </p>
                </div>
                <div className="rounded-md bg-white/70 p-2">
                  <p className="text-[10px] uppercase tracking-wide text-emerald-700/70">
                    Pokok per Bulan
                  </p>
                  <p className="text-sm font-semibold text-emerald-900">
                    {formatRupiah(pokokPerBulanCreate)}
                  </p>
                </div>
                <div className="rounded-md bg-emerald-100/80 p-2 ring-1 ring-emerald-200">
                  <p className="text-[10px] uppercase tracking-wide text-emerald-800">
                    Angsuran per Bulan
                  </p>
                  <p className="text-sm font-bold text-emerald-900">
                    {formatRupiah(angsuranPerBulanCreate)}
                  </p>
                </div>
                <div className="rounded-md bg-white/70 p-2">
                  <p className="text-[10px] uppercase tracking-wide text-emerald-700/70">
                    Total Bunga
                  </p>
                  <p className="text-sm font-semibold text-emerald-900">
                    {formatRupiah(totalBungaCreate)}
                  </p>
                </div>
                <div className="rounded-md bg-emerald-100/80 p-2 ring-1 ring-emerald-200">
                  <p className="text-[10px] uppercase tracking-wide text-emerald-800">
                    Total Pinjaman + Bunga
                  </p>
                  <p className="text-sm font-bold text-emerald-900">
                    {formatRupiah(totalPinjamanBungaCreate)}
                  </p>
                </div>
              </div>
              <p className="mt-2 flex items-center gap-1 text-[10px] text-emerald-700/70">
                <Info className="h-3 w-3" />
                Estimasi dihitung otomatis dari pengaturan koperasi. Backend
                akan menyimpan nilai final saat pinjaman disetujui.
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="ket-p">Keterangan (opsional)</Label>
              <Textarea
                id="ket-p"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Keperluan pinjaman..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              onClick={handleCreate}
              disabled={submitting || (eligibility && !eligibility.eligible)}
              className={cn(
                eligibility && !eligibility.eligible
                  ? 'cursor-not-allowed bg-zinc-300 text-zinc-500 hover:bg-zinc-300'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              )}
            >
              {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {eligibility && !eligibility.eligible ? 'Tidak Layak' : 'Ajukan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Jadwal Dialog */}
      <Dialog open={jadwalOpen} onOpenChange={setJadwalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-emerald-900">
              Jadwal Angsuran
            </DialogTitle>
            <DialogDescription>
              {jadwalData
                ? `${jadwalData.nomorPinjaman} · ${jadwalData.anggota?.nama || ''} · ${jadwalData.tenorBulan} bulan`
                : 'Memuat...'}
            </DialogDescription>
          </DialogHeader>
          {jadwalData && (
            <div className="mb-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-2">
                <p className="text-[11px] text-emerald-700/70">Jumlah Pinjaman</p>
                <p className="text-sm font-semibold text-emerald-900">
                  {formatRupiah(toNumber(jadwalData.jumlahPinjaman))}
                </p>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-2">
                <p className="text-[11px] text-emerald-700/70">Angsuran/Bln</p>
                <p className="text-sm font-semibold text-emerald-900">
                  {formatRupiah(toNumber(jadwalData.angsuranPerBulan))}
                </p>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-2">
                <p className="text-[11px] text-emerald-700/70">Suku Bunga</p>
                <p className="text-sm font-semibold text-emerald-900">
                  {toNumber(jadwalData.sukuBunga)}% / thn
                </p>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-2">
                <p className="text-[11px] text-emerald-700/70">Sisa Pinjaman</p>
                <p className="text-sm font-semibold text-emerald-900">
                  {formatRupiah(toNumber(jadwalData.sisaPinjaman))}
                </p>
              </div>
            </div>
          )}
          <div className="max-h-[400px] overflow-auto rounded-lg border border-emerald-100">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-emerald-50/95 backdrop-blur">
                <TableRow>
                  <TableHead>Ke-</TableHead>
                  <TableHead className="text-right">Pokok</TableHead>
                  <TableHead className="text-right">Bunga</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Sisa</TableHead>
                  <TableHead>Tgl Bayar</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingJadwal ? (
                  <SkeletonRows cols={7} rows={6} />
                ) : jadwalData?.schedule?.length ? (
                  jadwalData.schedule.map((s: any) => (
                    <TableRow key={s.angsuranKe}>
                      <TableCell className="font-medium">{s.angsuranKe}</TableCell>
                      <TableCell className="text-right">
                        {formatRupiah(toNumber(s.pokok))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatRupiah(toNumber(s.bunga))}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-900">
                        {formatRupiah(toNumber(s.total))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatRupiah(toNumber(s.sisaSetelah))}
                      </TableCell>
                      <TableCell className="text-xs">
                        {s.tanggalBayar ? formatDate(s.tanggalBayar) : '-'}
                      </TableCell>
                      <TableCell>
                        {s.status === 'lunas' ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 text-emerald-700"
                          >
                            <CheckCircle2 className="h-3 w-3" /> lunas
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-zinc-200 bg-zinc-50 text-zinc-600"
                          >
                            <Clock className="h-3 w-3" /> belum
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <EmptyRow colSpan={7} message="Jadwal tidak tersedia." />
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setJadwalOpen(false)}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bayar Angsuran Dialog */}
      <Dialog open={bayarOpen} onOpenChange={setBayarOpen}>
       <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-900">
              <ReceiptText className="h-5 w-5 text-emerald-600" /> Bayar Angsuran
            </DialogTitle>
            <DialogDescription>
              {bayarPinjaman
                ? `${bayarPinjaman.nomorPinjaman} · Sisa ${formatRupiah(bpCurrentSisa)} · Angsuran/bln ${formatRupiah(bpAngsuranPerBulan)}`
                : 'Memuat...'}
            </DialogDescription>
          </DialogHeader>

          {bayarPinjaman && (
            <div className="grid gap-4 py-2">
              {/* Info pinjaman ringkas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-lg border border-emerald-100 bg-emerald-50/30 p-2 text-center">
                <div>
                  <p className="text-[10px] uppercase text-emerald-700/70">
                    Tenor
                  </p>
                  <p className="text-sm font-semibold text-emerald-900">
                    {bpTenor} bln
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-emerald-700/70">
                    Sudah Bayar
                  </p>
                  <p className="text-sm font-semibold text-emerald-900">
                    {bpSudahBayar}x
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-emerald-700/70">
                    Sisa Angsuran
                  </p>
                  <p className="text-sm font-semibold text-emerald-900">
                    {bpSisaAngsuran}x
                  </p>
                </div>
              </div>

              {/* Pilihan Pembayaran */}
              <div className="grid gap-2">
                <Label className="text-xs font-semibold text-emerald-800">
                  Pilihan Pembayaran
                </Label>
                <RadioGroup
                  value={bayarMode}
                  onValueChange={(v) => setBayarMode(v as any)}
                  className="grid gap-2"
                >
                  <label
                    className={
                      'flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition ' +
                      (bayarMode === '1x'
                        ? 'border-emerald-400 bg-emerald-50/60 ring-1 ring-emerald-200'
                        : 'border-emerald-100 hover:bg-emerald-50/30')
                    }
                  >
                    <RadioGroupItem value="1x" className="mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">
                        1x Angsuran
                      </p>
                      <p className="text-[11px] text-emerald-700/70">
                        Bayar 1 (satu) angsuran saja
                      </p>
                    </div>
                  </label>

                  <label
                    className={
                      'flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition ' +
                      (bayarMode === 'beberapa'
                        ? 'border-emerald-400 bg-emerald-50/60 ring-1 ring-emerald-200'
                        : 'border-emerald-100 hover:bg-emerald-50/30')
                    }
                  >
                    <RadioGroupItem value="beberapa" className="mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-emerald-900">
                        Beberapa Angsuran
                      </p>
                      <p className="text-[11px] text-emerald-700/70">
                        Bayar beberapa angsuran sekaligus
                      </p>
                      {bayarMode === 'beberapa' && (
                        <div className="mt-2 flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={bpSisaAngsuran}
                            value={bayarJumlah}
                            onChange={(e) =>
                              setBayarJumlah(parseInt(e.target.value) || 1)
                            }
                            className="h-8 w-24"
                          />
                          <span className="text-[11px] text-emerald-700/70">
                            dari maks {bpSisaAngsuran} angsuran
                          </span>
                        </div>
                      )}
                    </div>
                  </label>

                  <label
                    className={
                      'flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition ' +
                      (bayarMode === 'lunas'
                        ? 'border-emerald-400 bg-emerald-50/60 ring-1 ring-emerald-200'
                        : 'border-emerald-100 hover:bg-emerald-50/30')
                    }
                  >
                    <RadioGroupItem value="lunas" className="mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">
                        Lunasi Semua
                      </p>
                      <p className="text-[11px] text-emerald-700/70">
                        Bayar semua sisa angsuran ({bpSisaAngsuran}x) — pinjaman
                        akan lunas
                      </p>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              {/* Summary card */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                <p className="mb-2 text-xs font-semibold text-emerald-800">
                  Ringkasan Pembayaran
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-[10px] uppercase text-emerald-700/70">
                      Jumlah Angsuran
                    </p>
                    <p className="font-semibold text-emerald-900">
                      {bpJumlahBayar} kali
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-emerald-700/70">
                      Nominal per Angsuran
                    </p>
                    <p className="font-semibold text-emerald-900">
                      {formatRupiah(bpAngsuranPerBulan)}
                    </p>
                  </div>
                  <div className="col-span-2 rounded-md bg-emerald-100/80 p-2 ring-1 ring-emerald-200">
                    <p className="text-[10px] uppercase text-emerald-800">
                      Total Bayar
                    </p>
                    <p className="text-lg font-bold text-emerald-900">
                      {formatRupiah(bpTotalBayar)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-emerald-700/70">
                      Sisa Pinjaman Setelah
                    </p>
                    <p className="font-semibold text-emerald-900">
                      {formatRupiah(bpSisaSetelah)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-emerald-700/70">
                      Status Setelah
                    </p>
                    {bpWillLunas ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-200 bg-emerald-50 text-emerald-700"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Lunas
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-amber-200 bg-amber-50 text-amber-700"
                      >
                        <Clock className="h-3 w-3" /> Masih berjalan
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Keterangan */}
              <div className="grid gap-1.5">
                <Label htmlFor="bayar-ket" className="text-xs">
                  Keterangan (opsional)
                </Label>
                <Textarea
                  id="bayar-ket"
                  value={bayarKet}
                  onChange={(e) => setBayarKet(e.target.value)}
                  placeholder="Catatan pembayaran angsuran..."
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBayarOpen(false)}
              disabled={bayarSubmitting}
            >
              Batal
            </Button>
            <Button
              onClick={handleBayarAngsuran}
              disabled={bayarSubmitting || !bayarPinjaman || bpSisaAngsuran <= 0}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {bayarSubmitting && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Bayar &amp; Proses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <StrukModal data={strukData} open={strukOpen} onOpenChange={setStrukOpen} />
    </Card>
  )
}

// ============================ PENARIKAN SUKARELA TAB ============================
function PenarikanTab() {
  const [anggotaList, setAnggotaList] = useState<Anggota[]>([])
  const [anggotaId, setAnggotaId] = useState<string>('')
  const [list, setList] = useState<any[]>([])
  const [loadingAnggota, setLoadingAnggota] = useState(true)
  const [loadingList, setLoadingList] = useState(false)

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [jumlah, setJumlah] = useState('')
  const [alasan, setAlasan] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ---- Filter state (Daftar Pengajuan Penarikan) ----
  const [dariInput, setDariInput] = useState('')
  const [sampaiInput, setSampaiInput] = useState('')
  const [qInput, setQInput] = useState('')
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all') // 'all' | 'menunggu' | 'disetujui' | 'ditolak' | 'dicairkan'

  const { strukData, strukOpen, setStrukOpen, showStruk } = useStruk()

  useEffect(() => {
    setLoadingAnggota(true)
    api.anggota
      .list()
      .then((data) => {
        setAnggotaList(data)
        if (data.length > 0) setAnggotaId(data[0].id)
      })
      .catch((e) => toast.error('Gagal memuat anggota: ' + e.message))
      .finally(() => setLoadingAnggota(false))
  }, [])

  const loadList = useCallback(async () => {
    if (!anggotaId) {
      setList([])
      return
    }
    setLoadingList(true)
    try {
      const data = await api.koperasi.penarikanList(anggotaId, {
        status: statusFilter === 'all' ? '' : statusFilter,
        dari,
        sampai,
        q,
      })
      setList(data)
    } catch (e: any) {
      toast.error('Gagal memuat penarikan: ' + e.message)
    } finally {
      setLoadingList(false)
    }
  }, [anggotaId, statusFilter, dari, sampai, q])

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
    setDari('')
    setSampai('')
    setQ('')
    setStatusFilter('all')
  }

  const handleCreate = async () => {
    const n = parseFloat(jumlah)
    if (isNaN(n) || n <= 0) {
      toast.error('Jumlah harus > 0')
      return
    }
    if (!alasan.trim()) {
      toast.error('Alasan wajib diisi')
      return
    }
    setSubmitting(true)
    try {
      await api.koperasi.penarikanCreate({ anggotaId, jumlah: n, alasan })
      toast.success('Pengajuan penarikan sukarela berhasil dibuat')
      setDialogOpen(false)
      setJumlah('')
      setAlasan('')
      loadList()
    } catch (e: any) {
      toast.error(e.message || 'Gagal mengajukan penarikan')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (
    p: any,
    status: 'disetujui' | 'ditolak' | 'dicairkan',
  ) => {
    try {
      const res = await api.koperasi.penarikanUpdate(p.id, { status })
      const label =
        status === 'disetujui'
          ? 'disetujui'
          : status === 'ditolak'
            ? 'ditolak'
            : 'dicairkan'
      toast.success(`Pengajuan ${p.nomorPengajuan} ${label}`)
      // Tampilkan struk saat pencairan sukarela berhasil
      if (status === 'dicairkan' && res) {
        showStruk({
          type: 'penarikan_sukarela',
          receiptNo: res.nomorPengajuan || p.nomorPengajuan,
          tanggal: res.tanggalPencairan || new Date().toISOString(),
          anggotaName: res.anggota?.nama || '-',
          anggotaCode: res.anggota?.nomorAnggota || '-',
          summary: [
            {
              label: 'Jumlah Ditarik',
              value: formatRupiah(toNumber(res.jumlah ?? p.jumlah)),
              highlight: true,
            },
            { label: 'Status', value: 'DANA DICAIRKAN' },
          ],
          notes: 'Simpanan sukarela telah ditarik dan dana diserahkan kepada anggota.',
        })
      }
      loadList()
    } catch (e: any) {
      toast.error(e.message || 'Gagal memproses penarikan')
    }
  }

  return (
    <Card className="border-emerald-100">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-emerald-900">
              <ArrowDownCircle className="h-5 w-5 text-emerald-600" /> Penarikan
              Simpanan Sukarela
            </CardTitle>
            <CardDescription>
              Pengajuan penarikan sukarela anggota — butuh persetujuan pengurus
              sebelum dicairkan.
            </CardDescription>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            disabled={!anggotaId}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Ajukan Penarikan
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <AnggotaSelector
          value={anggotaId}
          onChange={setAnggotaId}
          anggotaList={anggotaList}
          loading={loadingAnggota}
        />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-emerald-900">
              Daftar Pengajuan Penarikan
            </p>
            {loadingList && <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />}
          </div>

          {/* Filter bar */}
          <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
            <div className="w-40">
              <Label className="text-xs text-zinc-500">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="menunggu">Menunggu</SelectItem>
                  <SelectItem value="disetujui">Disetujui</SelectItem>
                  <SelectItem value="ditolak">Ditolak</SelectItem>
                  <SelectItem value="dicairkan">Dicairkan</SelectItem>
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
              <Label className="text-xs text-zinc-500">Cari No. Pengajuan</Label>
              <Input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFilters()
                }}
                placeholder="No. pengajuan..."
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
            {(dari || sampai || q || statusFilter !== 'all') && (
              <div className="ml-auto text-xs text-emerald-800">
                Aktif: <span className="font-medium">{dari || '…'} — {sampai || '…'}</span>
                {statusFilter !== 'all' && ` · ${statusFilter}`}
                {q && ` · "${q}"`}
              </div>
            )}
          </div>

          <div className="max-h-[480px] overflow-auto rounded-lg border border-emerald-100">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-emerald-50/95 backdrop-blur">
                <TableRow>
                  <TableHead>Nomor</TableHead>
                  <TableHead>Tanggal Pengajuan</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Alasan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingList ? (
                  <SkeletonRows cols={6} />
                ) : list.length === 0 ? (
                  <EmptyRow
                    colSpan={6}
                    message="Belum ada pengajuan penarikan sukarela."
                  />
                ) : (
                  list.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">
                        {p.nomorPengajuan}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDate(p.tanggalPengajuan)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatRupiah(toNumber(p.jumlah))}
                      </TableCell>
                      <TableCell
                        className="max-w-[260px] truncate text-xs text-emerald-700/80"
                        title={p.alasan}
                      >
                        {p.alasan}
                      </TableCell>
                      <TableCell>
                        <PenarikanStatusBadge status={p.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-1">
                          {p.status === 'menunggu' && (
                            <>
                              <Button
                                size="sm"
                                className="h-7 bg-emerald-600 text-white hover:bg-emerald-700"
                                onClick={() =>
                                  handleUpdate(p, 'disetujui')
                                }
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Setujui
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 border-rose-200 text-rose-700 hover:bg-rose-50"
                                onClick={() =>
                                  handleUpdate(p, 'ditolak')
                                }
                              >
                                <XCircle className="h-3.5 w-3.5" /> Tolak
                              </Button>
                            </>
                          )}
                          {p.status === 'disetujui' && (
                            <Button
                              size="sm"
                              className="h-7 bg-teal-600 text-white hover:bg-teal-700"
                              onClick={() =>
                                handleUpdate(p, 'dicairkan')
                              }
                            >
                              <Banknote className="h-3.5 w-3.5" /> Cairkan
                            </Button>
                          )}
                          {(p.status === 'ditolak' || p.status === 'dicairkan') && (
                            <span className="text-xs text-emerald-700/50">—</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-emerald-900">
              Ajukan Penarikan Sukarela
            </DialogTitle>
            <DialogDescription>
              Pengajuan akan ditinjau oleh pengurus koperasi sebelum dicairkan.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="jp2">Jumlah (Rp)</Label>
              <Input
                id="jp2"
                type="number"
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                placeholder="100000"
                min="0"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="alasan">Alasan Penarikan</Label>
              <Textarea
                id="alasan"
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                placeholder="Jelaskan alasan penarikan..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              onClick={handleCreate}
              disabled={submitting}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Ajukan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <StrukModal data={strukData} open={strukOpen} onOpenChange={setStrukOpen} />
    </Card>
  )
}

// ============================ KAS KOPERASI TAB ============================
function KasTab() {
  const [data, setData] = useState<{
    list: any[]
    saldo: number | string
    totalMasuk?: number | string
    totalKeluar?: number | string
    bySumber: any[]
    periode?: { dari: string | null; sampai: string | null } | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterSumber, setFilterSumber] = useState<string>('')
  const [filterTipe, setFilterTipe] = useState<string>('')
  const [dariInput, setDariInput] = useState<string>('')
  const [sampaiInput, setSampaiInput] = useState<string>('')
  const [dari, setDari] = useState<string>('')
  const [sampai, setSampai] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.koperasi.kas(dari, sampai)
      setData(res)
    } catch (e: any) {
      toast.error('Gagal memuat kas koperasi: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [dari, sampai])

  useEffect(() => {
    load()
  }, [load])

  // Client-side filter (the API also supports query, but we filter locally for snappy UX)
  const filtered = (data?.list || []).filter((k) => {
    if (filterSumber && k.sumber !== filterSumber) return false
    if (filterTipe && k.tipe !== filterTipe) return false
    return true
  })

  const masukTotal =
    data?.totalMasuk != null
      ? toNumber(data.totalMasuk)
      : (data?.list || [])
          .filter((k) => k.tipe === 'masuk')
          .reduce((sum, k) => sum + toNumber(k.jumlah), 0)
  const keluarTotal =
    data?.totalKeluar != null
      ? toNumber(data.totalKeluar)
      : (data?.list || [])
          .filter((k) => k.tipe === 'keluar')
          .reduce((sum, k) => sum + toNumber(k.jumlah), 0)
  const periodeLabel =
    dari || sampai
      ? `periode: ${dari || '…'} — ${sampai || '…'}`
      : 'semua periode'

  const applyPeriode = () => {
    setDari(dariInput)
    setSampai(sampaiInput)
  }

  const resetPeriode = () => {
    setDariInput('')
    setSampaiInput('')
    setDari('')
    setSampai('')
  }

  return (
    <Card className="border-emerald-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-900">
          <Landmark className="h-5 w-5 text-emerald-600" /> Kas Koperasi
        </CardTitle>
        <CardDescription>
          Buku kas koperasi — masuk & keluar dari semua sumber transaksi.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        ) : (
          <>
            {/* Big saldo card */}
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
              <CardContent className="flex items-center justify-between gap-4 p-6">
                <div>
                  <p className="text-xs font-medium text-emerald-50/80">
                    Saldo Kas Saat Ini
                  </p>
                  <p className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                    {formatRupiah(toNumber(data?.saldo))}
                  </p>
                  <p className="mt-1 text-xs text-emerald-50/70">
                    Saldo berjalan — semua periode (tidak terfilter)
                  </p>
                </div>
                <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur sm:flex">
                  <ListChecks className="h-8 w-8 text-white" />
                </div>
              </CardContent>
            </Card>

            {/* Stat cards */}
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard
                label="Total Kas Masuk"
                value={formatRupiah(masukTotal)}
                icon={ArrowUpCircle}
                accent="emerald"
                sub={`(${periodeLabel})`}
              />
              <StatCard
                label="Total Kas Keluar"
                value={formatRupiah(keluarTotal)}
                icon={ArrowDownCircle}
                accent="rose"
                sub={`(${periodeLabel})`}
              />
            </div>

            {/* Period filter */}
            <div className="flex flex-wrap items-end gap-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
              <div className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Filter Periode
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Dari</Label>
                <Input
                  type="date"
                  value={dariInput}
                  onChange={(e) => setDariInput(e.target.value)}
                  className="w-full sm:w-[150px]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Sampai</Label>
                <Input
                  type="date"
                  value={sampaiInput}
                  onChange={(e) => setSampaiInput(e.target.value)}
                  className="w-full sm:w-[150px]"
                />
              </div>
              <Button
                size="sm"
                onClick={applyPeriode}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Terapkan
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={resetPeriode}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                Reset
              </Button>
              {(dari || sampai) && (
                <div className="ml-auto text-xs text-emerald-800">
                  Aktif: <span className="font-medium">{dari || '…'}</span> —{' '}
                  <span className="font-medium">{sampai || '…'}</span>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Sumber</Label>
                <Select
                  value={filterSumber}
                  onValueChange={(v) => setFilterSumber(v === 'all' ? '' : v)}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Semua sumber" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua sumber</SelectItem>
                    {Object.entries(SUMBER_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Tipe</Label>
                <Select
                  value={filterTipe}
                  onValueChange={(v) => setFilterTipe(v === 'all' ? '' : v)}
                >
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Semua tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua tipe</SelectItem>
                    <SelectItem value="masuk">Masuk</SelectItem>
                    <SelectItem value="keluar">Keluar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={load}
              >
                <Loader2
                  className={
                    'mr-1.5 h-4 w-4 ' + (loading ? 'animate-spin' : 'hidden')
                  }
                />
                Refresh
              </Button>
            </div>

            {/* Table */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-emerald-900">
                  Riwayat Transaksi Kas
                </p>
                <span className="text-xs text-emerald-700/60">
                  {filtered.length} transaksi
                </span>
              </div>
              <div className="max-h-[480px] overflow-auto rounded-lg border border-emerald-100">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-emerald-50/95 backdrop-blur">
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Sumber</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead>No Referensi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <EmptyRow colSpan={6} message="Tidak ada transaksi kas." />
                    ) : (
                      filtered.map((k) => (
                        <TableRow key={k.id}>
                          <TableCell className="text-xs">
                            {formatDateTime(k.tanggalTransaksi)}
                          </TableCell>
                          <TableCell>
                            <SumberBadge sumber={k.sumber} />
                          </TableCell>
                          <TableCell>
                            {k.tipe === 'masuk' ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-200 bg-emerald-50 text-emerald-700"
                              >
                                <ArrowUpCircle className="h-3 w-3" /> masuk
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-rose-200 bg-rose-50 text-rose-700"
                              >
                                <ArrowDownCircle className="h-3 w-3" /> keluar
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell
                            className={
                              'text-right font-semibold ' +
                              (k.tipe === 'masuk'
                                ? 'text-emerald-700'
                                : 'text-rose-700')
                            }
                          >
                            {k.tipe === 'masuk' ? '+' : '-'}{' '}
                            {formatRupiah(toNumber(k.jumlah))}
                          </TableCell>
                          <TableCell
                            className="max-w-[240px] truncate text-xs text-emerald-700/80"
                            title={k.keterangan || ''}
                          >
                            {k.keterangan || '-'}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-emerald-700/60">
                            {k.nomorReferensi || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ============================ MAIN ============================
export function Koperasi() {
  const [tab, setTab] = useState<string>('simpanan')
  const [setting, setSetting] = useState<KoperasiSetting>(null)

  useEffect(() => {
    api.koperasiSetting
      .get()
      .then((data) => setSetting(data))
      .catch((e) =>
        toast.error('Gagal memuat pengaturan koperasi: ' + e.message),
      )
  }, [])

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-emerald-100/60 p-1 sm:w-fit">
          <TabsTrigger
            value="simpanan"
            className="data-[state=active]:bg-white data-[state=active]:text-emerald-700"
          >
            <PiggyBank className="h-4 w-4" />
            <span className="hidden sm:inline">Simpanan</span>
          </TabsTrigger>
          <TabsTrigger
            value="pinjaman"
            className="data-[state=active]:bg-white data-[state=active]:text-emerald-700"
          >
            <HandCoins className="h-4 w-4" />
            <span className="hidden sm:inline">Pinjaman</span>
          </TabsTrigger>
          <TabsTrigger
            value="penarikan"
            className="data-[state=active]:bg-white data-[state=active]:text-emerald-700"
          >
            <ArrowDownCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Penarikan Sukarela</span>
          </TabsTrigger>
          <TabsTrigger
            value="kas"
            className="data-[state=active]:bg-white data-[state=active]:text-emerald-700"
          >
            <Landmark className="h-4 w-4" />
            <span className="hidden sm:inline">Kas Koperasi</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="simpanan">
          <SimpananTab setting={setting} />
        </TabsContent>
        <TabsContent value="pinjaman">
          <PinjamanTab setting={setting} />
        </TabsContent>
        <TabsContent value="penarikan">
          <PenarikanTab />
        </TabsContent>
        <TabsContent value="kas">
          <KasTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
