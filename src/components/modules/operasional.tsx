'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import {
  formatRupiah,
  formatNumber,
  formatDate,
  formatDateTime,
  toNumber,
} from '@/lib/format'
import { printStruk } from '@/lib/print-struk'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  Plus,
  Trash2,
  Save,
  FileText,
  Recycle,
  Leaf,
  AlertCircle,
  CheckCircle2,
  Printer,
  Scale,
  HandHeart,
  History,
  User,
  X,
  ChevronDown,
  ClipboardEdit,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------- Types ----------------
type Nasabah = {
  id: string
  name: string
  memberCode: string | null
  phone: string | null
  address: string | null
  roles: string | null
  isMember: boolean | null
  balance?:
    | {
        saldoTertahan: unknown
        saldoTersedia: unknown
        points: unknown
      }
    | null
  koperasiAnggota?: unknown
}

type WasteItem = {
  id: string
  code: string
  name: string
  unit: string
  pricePerUnit: unknown
  category?: { id: string; name: string } | null
  prices?: { pricePerUnit: unknown }[]
}

type ItemRow = {
  key: string
  wasteItemId: string
  quantityBeforeQc: string
  quantityAfterQc: string
  qcReason: string
}

type ReceiptData = {
  nomor: string
  jenis: 'nabung' | 'sedekah'
  nasabahNama: string
  nasabahKode: string
  donorName?: string
  tanggal: string
  totalBeratKotor: number
  totalBeratBersih: number
  totalNilai: number
  poin: number
  persentaseSusut: number
  qcStatus: string
  items: {
    kode: string
    nama: string
    kategori: string
    qtyKotor: number
    qtyBersih: number
    susut: number
    harga: number
    subtotal: number
  }[]
}

// ---------------- Helpers ----------------
function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function itemPrice(wi: WasteItem | undefined): number {
  if (!wi) return 0
  if (wi.prices && wi.prices.length > 0) return toNumber(wi.prices[0].pricePerUnit)
  return toNumber(wi.pricePerUnit)
}

function rowBruto(row: ItemRow): number {
  return parseFloat(row.quantityBeforeQc) || 0
}

function rowNetto(row: ItemRow, applyQc: boolean): number {
  const bruto = rowBruto(row)
  if (!applyQc) return bruto
  if (row.quantityAfterQc === '') return bruto
  const n = parseFloat(row.quantityAfterQc)
  if (isNaN(n)) return bruto
  return Math.max(0, Math.min(n, bruto))
}

function rowSubtotal(
  row: ItemRow,
  applyQc: boolean,
  itemMap: Map<string, WasteItem>
): number {
  const wi = itemMap.get(row.wasteItemId)
  if (!wi) return 0
  return rowNetto(row, applyQc) * itemPrice(wi)
}

function qcBadge(status: string) {
  switch (status) {
    case 'passed':
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
          <CheckCircle2 className="size-3" /> OK
        </Badge>
      )
    case 'adjusted':
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
          <AlertCircle className="size-3" /> Disesuaikan
        </Badge>
      )
    case 'failed':
      return (
        <Badge className="bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-100">
          <AlertCircle className="size-3" /> Gagal
        </Badge>
      )
    default:
      return <Badge variant="outline">{status || '-'}</Badge>
  }
}

// ---------------- Nasabah Picker ----------------
function NasabahPicker({
  value,
  onChange,
  optional,
}: {
  value: Nasabah | null
  onChange: (n: Nasabah | null) => void
  optional?: boolean
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Nasabah[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounced search; setState only fires inside async callback (after timeout),
  // so it does not run synchronously during the effect body.
  useEffect(() => {
    if (!q.trim()) return
    let cancelled = false
    const t = setTimeout(() => {
      setLoading(true)
      api.operasional
        .nasabahList(q)
        .then((r) => {
          if (cancelled) return
          setResults(r as Nasabah[])
          setOpen(true)
        })
        .catch(() => {
          if (cancelled) return
          setResults([])
          setOpen(false)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [q])

  const onSearchChange = (val: string) => {
    setQ(val)
    if (!val.trim()) {
      setResults([])
      setOpen(false)
    }
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const pick = (n: Nasabah) => {
    onChange(n)
    setQ('')
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <Label className="text-emerald-900 font-medium">
        Nasabah {optional && <span className="text-muted-foreground font-normal">(opsional — donatur anonim juga diperbolehkan)</span>}
      </Label>
      {value ? (
        <div className="mt-1.5 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
              <User className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-emerald-900 truncate">{value.name}</div>
              <div className="text-xs text-emerald-700/80 truncate">
                {value.memberCode || '-'}
                {value.phone ? ` · ${value.phone}` : ''}
              </div>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900"
            onClick={() => onChange(null)}
          >
            <X className="size-4" /> Ganti
          </Button>
        </div>
      ) : (
        <div className="relative mt-1.5">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-700/60" />
          <Input
            value={q}
            placeholder={optional ? 'Cari nasabah (nama / kode / telp) — atau kosongkan' : 'Cari nasabah (nama / kode / telp)…'}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            className="pl-9 border-emerald-200 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              mencari…
            </div>
          )}
          {open && !loading && (
            <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-emerald-200 bg-white shadow-lg">
              {results.length === 0 ? (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                  Tidak ada nasabah ditemukan.
                </div>
              ) : (
                results.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => pick(n)}
                    className="flex w-full items-center gap-3 border-b border-emerald-50 px-3 py-2 text-left last:border-0 hover:bg-emerald-50"
                  >
                    <div className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <User className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-emerald-900 truncate">
                        {n.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {n.memberCode || '-'}
                        {n.phone ? ` · ${n.phone}` : ''}
                      </div>
                    </div>
                    {n.isMember && (
                      <Badge className="bg-teal-100 text-teal-800 border-teal-200">
                        Anggota
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------- Item Row ----------------
function ItemRowCard({
  row,
  index,
  applyQc,
  itemMap,
  wasteItems,
  onChange,
  onRemove,
  canRemove,
}: {
  row: ItemRow
  index: number
  applyQc: boolean
  itemMap: Map<string, WasteItem>
  wasteItems: WasteItem[]
  onChange: (r: ItemRow) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const wi = itemMap.get(row.wasteItemId)
  const price = itemPrice(wi)
  const bruto = rowBruto(row)
  const netto = rowNetto(row, applyQc)
  const susut = Math.max(0, bruto - netto)
  const subtotal = netto * price

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        {/* Barang */}
        <div className="sm:col-span-4">
          <Label className="text-xs text-emerald-800">Barang Sampah #{index + 1}</Label>
          <Select
            value={row.wasteItemId}
            onValueChange={(v) => onChange({ ...row, wasteItemId: v })}
          >
            <SelectTrigger className="mt-1 w-full bg-white border-emerald-200 focus:ring-emerald-500/30">
              <SelectValue placeholder="Pilih barang…" />
            </SelectTrigger>
            <SelectContent>
              {wasteItems.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  <span className="font-mono text-xs text-emerald-700">{w.code}</span>
                  <span className="ml-1">— {w.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {wi && (
            <div className="mt-1 text-xs text-emerald-700/80">
              Kategori: {wi.category?.name || '-'} · Harga:{' '}
              <span className="font-medium">{formatRupiah(price)}/{wi.unit || 'kg'}</span>
            </div>
          )}
        </div>

        {/* Bruto */}
        <div className="sm:col-span-2">
          <Label className="text-xs text-emerald-800">Berat Kotor (kg)</Label>
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={row.quantityBeforeQc}
            onChange={(e) => onChange({ ...row, quantityBeforeQc: e.target.value })}
            placeholder="0.00"
            className="mt-1 bg-white border-emerald-200 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500"
          />
        </div>

        {/* Bersih (QC) */}
        {applyQc && (
          <div className="sm:col-span-2">
            <Label className="text-xs text-emerald-800">Berat Bersih (kg)</Label>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={row.quantityAfterQc}
              onChange={(e) => onChange({ ...row, quantityAfterQc: e.target.value })}
              placeholder="= kotor"
              className="mt-1 bg-white border-emerald-200 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500"
            />
            {susut > 0 && (
              <div className="mt-1 text-xs text-amber-700">
                Susut: {formatNumber(susut)} kg
              </div>
            )}
          </div>
        )}

        {/* Alasan QC */}
        {applyQc && (
          <div className={applyQc ? 'sm:col-span-2' : 'sm:col-span-3'}>
            <Label className="text-xs text-emerald-800">Alasan QC (opsional)</Label>
            <Input
              value={row.qcReason}
              onChange={(e) => onChange({ ...row, qcReason: e.target.value })}
              placeholder="cth: basah, kotor…"
              className="mt-1 bg-white border-emerald-200 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500"
            />
          </div>
        )}

        {/* Subtotal + Hapus */}
        <div
          className={
            applyQc
              ? 'sm:col-span-2 flex flex-col justify-end gap-1.5'
              : 'sm:col-span-3 flex flex-col justify-end gap-1.5'
          }
        >
          <div>
            <Label className="text-xs text-emerald-800">Subtotal</Label>
            <div className="mt-1 rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-900">
              {formatRupiah(subtotal)}
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!canRemove}
            onClick={onRemove}
            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          >
            <Trash2 className="size-4" /> Hapus
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------- Summary Bar ----------------
function SummaryBar({
  totalBerat,
  totalNilai,
  poin,
  showNilai = true,
  extraInfo,
}: {
  totalBerat: number
  totalNilai: number
  poin: number
  showNilai?: boolean
  extraInfo?: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
        <div className="text-xs text-emerald-700">Total Berat Bersih</div>
        <div className="text-lg font-bold text-emerald-900">
          {formatNumber(totalBerat)} kg
        </div>
      </div>
      {showNilai && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
          <div className="text-xs text-emerald-700">Total Nilai</div>
          <div className="text-lg font-bold text-emerald-900">
            {formatRupiah(totalNilai)}
          </div>
        </div>
      )}
      {showNilai && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
          <div className="text-xs text-emerald-700">Estimasi Poin</div>
          <div className="text-lg font-bold text-emerald-900">{formatNumber(poin, 0)}</div>
        </div>
      )}
      <div className="col-span-2 flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 sm:col-span-1">
        <div className="text-xs text-emerald-700 text-center">
          <Leaf className="mx-auto mb-1 size-4" />
          Konversi poin: 1 poin / Rp 100
        </div>
      </div>
      {extraInfo && (
        <div className="col-span-2 sm:col-span-4">{extraInfo}</div>
      )}
    </div>
  )
}

// ---------------- Receipt Dialog ----------------
function ReceiptDialog({
  open,
  onOpenChange,
  data,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  data: ReceiptData | null
}) {
  if (!data) return null
  const isSedekah = data.jenis === 'sedekah'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              {isSedekah ? <HandHeart className="size-5" /> : <Recycle className="size-5" />}
            </div>
            <div>
              <DialogTitle className="text-emerald-900">
                {isSedekah ? 'Tanda Terima Sedekah Sampah' : 'Tanda Terima Nabung Sampah'}
              </DialogTitle>
              <DialogDescription>
                Nomor: <span className="font-mono font-medium text-emerald-700">{data.nomor}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div id="printable-struk" className="space-y-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-emerald-700">Tanggal</div>
              <div className="font-medium text-emerald-900">{data.tanggal}</div>
            </div>
            <div>
              <div className="text-xs text-emerald-700">
                {isSedekah ? 'Donatur' : 'Nasabah'}
              </div>
              <div className="font-medium text-emerald-900">{data.nasabahNama}</div>
              <div className="text-xs text-emerald-700/80">
                {data.nasabahKode || (isSedekah ? 'Donatur eksternal' : '-')}
              </div>
            </div>
          </div>

          <Separator className="my-3 bg-emerald-200" />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <div className="text-xs text-emerald-700">Berat Kotor</div>
              <div className="font-semibold text-emerald-900">
                {formatNumber(data.totalBeratKotor)} kg
              </div>
            </div>
            <div>
              <div className="text-xs text-emerald-700">Berat Bersih</div>
              <div className="font-semibold text-emerald-900">
                {formatNumber(data.totalBeratBersih)} kg
              </div>
            </div>
            {isSedekah ? (
              <div>
                <div className="text-xs text-emerald-700">% Susut</div>
                <div className="font-semibold text-emerald-900">
                  {formatNumber(data.persentaseSusut, 2)}%
                </div>
              </div>
            ) : (
              <div>
                <div className="text-xs text-emerald-700">Total Nilai</div>
                <div className="font-semibold text-emerald-900">
                  {formatRupiah(data.totalNilai)}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs text-emerald-700">Poin</div>
              <div className="font-semibold text-emerald-900">
                {isSedekah ? '—' : formatNumber(data.poin, 0)}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-emerald-700">Status QC:</span>
            {qcBadge(data.qcStatus)}
          </div>
        </div>

        {/* Item breakdown */}
        <div className="rounded-lg border border-emerald-200 overflow-hidden">
          <div className="max-h-64 overflow-auto">
            <Table>
              <TableHeader className="bg-emerald-50">
                <TableRow className="border-emerald-200">
                  <TableHead className="text-emerald-800">Kode</TableHead>
                  <TableHead className="text-emerald-800">Nama</TableHead>
                  <TableHead className="text-emerald-800 text-right">Kotor</TableHead>
                  <TableHead className="text-emerald-800 text-right">Bersih</TableHead>
                  <TableHead className="text-emerald-800 text-right">Susut</TableHead>
                  {!isSedekah && (
                    <TableHead className="text-emerald-800 text-right">Harga</TableHead>
                  )}
                  {!isSedekah && (
                    <TableHead className="text-emerald-800 text-right">Subtotal</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs text-emerald-700">
                      {it.kode}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-emerald-900">{it.nama}</div>
                      <div className="text-xs text-muted-foreground">{it.kategori}</div>
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(it.qtyKotor)} kg</TableCell>
                    <TableCell className="text-right">{formatNumber(it.qtyBersih)} kg</TableCell>
                    <TableCell className="text-right text-amber-700">
                      {formatNumber(it.susut)} kg
                    </TableCell>
                    {!isSedekah && (
                      <TableCell className="text-right">
                        {formatRupiah(it.harga)}
                      </TableCell>
                    )}
                    {!isSedekah && (
                      <TableCell className="text-right font-semibold text-emerald-900">
                        {formatRupiah(it.subtotal)}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {isSedekah && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertCircle className="mr-1 inline size-3.5" />
            Sedekah tidak menghasilkan saldo nasabah — material menjadi aset Bank Sampah.
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground print:hidden">
          <div className="flex items-center gap-1">
            <Printer className="size-3.5" />
            <span>Cetak tanda terima ini dari browser (Ctrl + P) untuk arsip.</span>
          </div>
          <span className="font-mono">{data.nomor}</span>
        </div>
        </div>

        <DialogFooter className="print:hidden">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            Tutup
          </Button>
          <Button
            type="button"
            onClick={() => printReceiptData(data)}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Printer className="size-4" /> Cetak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------- Nabung Form ----------------
function NabungForm({ wasteItems }: { wasteItems: WasteItem[] }) {
  const [nasabah, setNasabah] = useState<Nasabah | null>(null)
  const [balance, setBalance] = useState<{
    saldoTertahan: number
    saldoTersedia: number
    points: number
  } | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [rows, setRows] = useState<ItemRow[]>([
    { key: uid(), wasteItemId: '', quantityBeforeQc: '', quantityAfterQc: '', qcReason: '' },
  ])
  const [applyQc, setApplyQc] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)

  const itemMap = useMemo(() => {
    const m = new Map<string, WasteItem>()
    wasteItems.forEach((w) => m.set(w.id, w))
    return m
  }, [wasteItems])

  useEffect(() => {
    if (!nasabah) {
      setBalance(null)
      return
    }
    setBalanceLoading(true)
    api.operasional
      .nasabahBalance(nasabah.id)
      .then((res: any) => {
        setBalance({
          saldoTertahan: toNumber(res?.balance?.saldoTertahan),
          saldoTersedia: toNumber(res?.balance?.saldoTersedia),
          points: toNumber(res?.balance?.points),
        })
      })
      .catch(() => setBalance(null))
      .finally(() => setBalanceLoading(false))
  }, [nasabah])

  const { totalBerat, totalNilai, poin } = useMemo(() => {
    let berat = 0
    let nilai = 0
    rows.forEach((r) => {
      if (!r.wasteItemId) return
      berat += rowNetto(r, applyQc)
      nilai += rowSubtotal(r, applyQc, itemMap)
    })
    return {
      totalBerat: berat,
      totalNilai: nilai,
      poin: Math.floor(nilai / 100),
    }
  }, [rows, applyQc, itemMap])

  const updateRow = (i: number, r: ItemRow) => {
    setRows((prev) => prev.map((x, idx) => (idx === i ? r : x)))
  }
  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { key: uid(), wasteItemId: '', quantityBeforeQc: '', quantityAfterQc: '', qcReason: '' },
    ])
  }
  const removeRow = (i: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== i))
  }

  const reset = () => {
    setNasabah(null)
    setRows([{ key: uid(), wasteItemId: '', quantityBeforeQc: '', quantityAfterQc: '', qcReason: '' }])
    setApplyQc(false)
    setNotes('')
    setBalance(null)
  }

  const submit = async () => {
    if (!nasabah) {
      toast.error('Nasabah wajib dipilih untuk Nabung Sampah.')
      return
    }
    const validRows = rows.filter(
      (r) => r.wasteItemId && (parseFloat(r.quantityBeforeQc) || 0) > 0
    )
    if (validRows.length === 0) {
      toast.error('Tambahkan minimal 1 item dengan berat > 0.')
      return
    }
    // Validate: bersih (net) must not exceed kotor (gross) when QC is ON
    if (applyQc) {
      for (const r of validRows) {
        const kotor = parseFloat(r.quantityBeforeQc) || 0
        const bersih = r.quantityAfterQc !== '' ? parseFloat(r.quantityAfterQc) : kotor
        if (bersih > kotor) {
          toast.error(`Berat bersih tidak boleh lebih besar dari berat kotor untuk ${r.wasteItemId}`)
          return
        }
      }
    }
    setSaving(true)
    try {
      const payload = {
        userId: nasabah.id,
        items: validRows.map((r) => ({
          wasteItemId: r.wasteItemId,
          quantityBeforeQc: parseFloat(r.quantityBeforeQc) || 0,
          quantityAfterQc: applyQc && r.quantityAfterQc !== '' ? parseFloat(r.quantityAfterQc) : null,
          qcReason: r.qcReason || undefined,
        })),
        notes: notes || undefined,
        applyQc,
      }
      const tx: any = await api.operasional.nabungCreate(payload)
      toast.success('Transaksi nabung sampah berhasil disimpan.')

      // Build receipt
      const itemRows = (tx.items || []).map((it: any) => ({
        kode: it.itemCodeSnapshot || it.wasteItem?.code || '-',
        nama: it.itemNameSnapshot || it.wasteItem?.name || '-',
        kategori: it.categoryNameSnapshot || it.wasteItem?.category?.name || '-',
        qtyKotor: toNumber(it.quantityBeforeQc),
        qtyBersih: toNumber(it.quantityAfterQc ?? it.quantityBeforeQc),
        susut: toNumber(it.susutQc),
        harga: toNumber(it.pricePerUnitSnapshot),
        subtotal: toNumber(it.subtotal),
      }))
      const totalKotor = itemRows.reduce((s: number, r: any) => s + r.qtyKotor, 0)
      const totalBersih = itemRows.reduce((s: number, r: any) => s + r.qtyBersih, 0)
      setReceipt({
        nomor: `NB-${(tx.id || '').slice(-6).toUpperCase()}`,
        jenis: 'nabung',
        nasabahNama: nasabah.name,
        nasabahKode: nasabah.memberCode || '-',
        tanggal: formatDateTime(tx.transactedAt || new Date()),
        totalBeratKotor: totalKotor,
        totalBeratBersih: toNumber(tx.totalWeight),
        totalNilai: toNumber(tx.totalValue),
        poin: toNumber(tx.pointsAwarded),
        persentaseSusut: totalKotor > 0 ? ((totalKotor - totalBersih) / totalKotor) * 100 : 0,
        qcStatus: tx.qcStatus || 'passed',
        items: itemRows,
      })
      reset()
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menyimpan transaksi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-emerald-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Recycle className="size-5" />
          </div>
          <div>
            <CardTitle className="text-emerald-900">Nabung Sampah</CardTitle>
            <CardDescription>
              Setoran sampah nasabah. Setoran dikreditkan sebagai saldo tersedia + poin.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Nasabah + Balance */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <NasabahPicker value={nasabah} onChange={setNasabah} />
          </div>
          <div className="rounded-lg border border-emerald-200 bg-white p-3">
            <div className="text-xs font-medium text-emerald-700 mb-2">Saldo Nasabah</div>
            {balanceLoading ? (
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : nasabah ? (
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Saldo Tersedia</span>
                  <span className="font-semibold text-emerald-900">
                    {formatRupiah(balance?.saldoTersedia ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Poin</span>
                  <span className="font-semibold text-emerald-900">
                    {formatNumber(balance?.points ?? 0, 0)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                Pilih nasabah untuk melihat saldo.
              </div>
            )}
          </div>
        </div>

        <Separator className="bg-emerald-100" />

        {/* QC Toggle */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Switch
              checked={applyQc}
              onCheckedChange={setApplyQc}
              className="data-[state=checked]:bg-emerald-600"
            />
            <div>
              <div className="text-sm font-medium text-emerald-900">Terapkan QC (Quality Control)</div>
              <div className="text-xs text-muted-foreground">
                Aktifkan untuk input berat bersih setelah QC & alasan penyesuaian.
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addRow}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            <Plus className="size-4" /> Tambah Item
          </Button>
        </div>

        {/* Item rows */}
        <div className="space-y-3">
          {rows.map((r, i) => (
            <ItemRowCard
              key={r.key}
              row={r}
              index={i}
              applyQc={applyQc}
              itemMap={itemMap}
              wasteItems={wasteItems}
              onChange={(nr) => updateRow(i, nr)}
              onRemove={() => removeRow(i)}
              canRemove={rows.length > 1}
            />
          ))}
        </div>

        {/* Summary */}
        <SummaryBar totalBerat={totalBerat} totalNilai={totalNilai} poin={poin} />

        {/* Notes */}
        <div>
          <Label className="text-emerald-900">Catatan (opsional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan teller / keterangan tambahan…"
            className="mt-1.5 bg-white border-emerald-200 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500"
            rows={2}
          />
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t border-emerald-100 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={reset}
          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          Reset
        </Button>
        <Button
          type="button"
          onClick={submit}
          disabled={saving}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {saving ? (
            <>
              <div className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Menyimpan…
            </>
          ) : (
            <>
              <Save className="size-4" /> Simpan Transaksi
            </>
          )}
        </Button>
      </CardFooter>

      <ReceiptDialog open={!!receipt} onOpenChange={(v) => !v && setReceipt(null)} data={receipt} />
    </Card>
  )
}

// ---------------- Sedekah Form ----------------
function SedekahForm({ wasteItems }: { wasteItems: WasteItem[] }) {
  const [nasabah, setNasabah] = useState<Nasabah | null>(null)
  const [donorName, setDonorName] = useState('')
  const [rows, setRows] = useState<ItemRow[]>([
    { key: uid(), wasteItemId: '', quantityBeforeQc: '', quantityAfterQc: '', qcReason: '' },
  ])
  const [applyQc, setApplyQc] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)

  const itemMap = useMemo(() => {
    const m = new Map<string, WasteItem>()
    wasteItems.forEach((w) => m.set(w.id, w))
    return m
  }, [wasteItems])

  const { totalKotor, totalBersih, persentaseSusut } = useMemo(() => {
    let kotor = 0
    let bersih = 0
    rows.forEach((r) => {
      if (!r.wasteItemId) return
      kotor += rowBruto(r)
      bersih += rowNetto(r, applyQc)
    })
    return {
      totalKotor: kotor,
      totalBersih: bersih,
      persentaseSusut: kotor > 0 ? ((kotor - bersih) / kotor) * 100 : 0,
    }
  }, [rows, applyQc, itemMap])

  const updateRow = (i: number, r: ItemRow) => {
    setRows((prev) => prev.map((x, idx) => (idx === i ? r : x)))
  }
  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { key: uid(), wasteItemId: '', quantityBeforeQc: '', quantityAfterQc: '', qcReason: '' },
    ])
  }
  const removeRow = (i: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== i))
  }

  const reset = () => {
    setNasabah(null)
    setDonorName('')
    setRows([{ key: uid(), wasteItemId: '', quantityBeforeQc: '', quantityAfterQc: '', qcReason: '' }])
    setApplyQc(false)
    setNotes('')
  }

  const submit = async () => {
    if (!nasabah && !donorName.trim()) {
      toast.error('Pilih nasabah atau isi nama donatur terlebih dahulu.')
      return
    }
    const validRows = rows.filter(
      (r) => r.wasteItemId && (parseFloat(r.quantityBeforeQc) || 0) > 0
    )
    if (validRows.length === 0) {
      toast.error('Tambahkan minimal 1 item dengan berat > 0.')
      return
    }
    // Validate: bersih (net) must not exceed kotor (gross) when QC is ON
    if (applyQc) {
      for (const r of validRows) {
        const kotor = parseFloat(r.quantityBeforeQc) || 0
        const bersih = r.quantityAfterQc !== '' ? parseFloat(r.quantityAfterQc) : kotor
        if (bersih > kotor) {
          toast.error(`Berat bersih tidak boleh lebih besar dari berat kotor untuk ${r.wasteItemId}`)
          return
        }
      }
    }
    setSaving(true)
    try {
      const payload = {
        userId: nasabah?.id,
        donorName: nasabah ? undefined : donorName.trim(),
        items: validRows.map((r) => ({
          wasteItemId: r.wasteItemId,
          quantityBeforeQc: parseFloat(r.quantityBeforeQc) || 0,
          quantityAfterQc: applyQc && r.quantityAfterQc !== '' ? parseFloat(r.quantityAfterQc) : null,
          qcReason: r.qcReason || undefined,
        })),
        notes: notes || undefined,
        applyQc,
      }
      const tx: any = await api.operasional.sedekahCreate(payload)
      toast.success('Sedekah sampah berhasil disimpan.')

      const itemRows = (tx.items || []).map((it: any) => ({
        kode: it.itemCodeSnapshot || it.wasteItem?.code || '-',
        nama: it.itemNameSnapshot || it.wasteItem?.name || '-',
        kategori: it.categoryNameSnapshot || it.wasteItem?.category?.name || '-',
        qtyKotor: toNumber(it.quantityBeforeQc),
        qtyBersih: toNumber(it.quantityAfterQc ?? it.quantityBeforeQc),
        susut: toNumber(it.susutQc),
        harga: 0,
        subtotal: 0,
      }))
      setReceipt({
        nomor: `SD-${(tx.id || '').slice(-6).toUpperCase()}`,
        jenis: 'sedekah',
        nasabahNama: nasabah?.name || donorName || 'Donatur Anonim',
        nasabahKode: nasabah?.memberCode || '',
        donorName: donorName || undefined,
        tanggal: formatDateTime(tx.transactedAt || tx.filterAt || new Date()),
        totalBeratKotor: toNumber(tx.totalWeightKotor ?? totalKotor),
        totalBeratBersih: toNumber(tx.totalWeightBersih ?? tx.totalWeight ?? totalBersih),
        totalNilai: 0,
        poin: 0,
        persentaseSusut: toNumber(tx.persentaseSusut ?? persentaseSusut),
        qcStatus: tx.qcStatus || 'passed',
        items: itemRows,
      })
      reset()
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menyimpan sedekah.')
    } finally {
      setSaving(false)
    }
  }

  const extraInfo = (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      <AlertCircle className="mr-1 inline size-3.5" />
      Sedekah tidak menghasilkan saldo nasabah — material menjadi aset Bank Sampah.
    </div>
  )

  return (
    <Card className="border-emerald-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-teal-600 text-white">
            <HandHeart className="size-5" />
          </div>
          <div>
            <CardTitle className="text-emerald-900">Sedekah Sampah</CardTitle>
            <CardDescription>
              Donasi sampah ke Bank Sampah. Tidak ada saldo atau poin untuk donatur.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Donatur info */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <NasabahPicker value={nasabah} onChange={setNasabah} optional />
          <div>
            <Label className="text-emerald-900 font-medium">
              Nama Donatur <span className="text-muted-foreground font-normal">(jika tanpa nasabah)</span>
            </Label>
            <Input
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder={nasabah ? '— (nasabah terpilih)' : 'cth: Budi / Donatur Anonim'}
              disabled={!!nasabah}
              className="mt-1.5 bg-white border-emerald-200 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {nasabah
                ? 'Donatur terisi otomatis dari nasabah terpilih.'
                : 'Jika nasabah tidak dipilih, nama donatur wajib diisi.'}
            </p>
          </div>
        </div>

        <Separator className="bg-emerald-100" />

        {/* QC Toggle */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Switch
              checked={applyQc}
              onCheckedChange={setApplyQc}
              className="data-[state=checked]:bg-emerald-600"
            />
            <div>
              <div className="text-sm font-medium text-emerald-900">Terapkan QC (Quality Control)</div>
              <div className="text-xs text-muted-foreground">
                Aktifkan untuk input berat bersih setelah QC & alasan penyesuaian.
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addRow}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            <Plus className="size-4" /> Tambah Item
          </Button>
        </div>

        {/* Item rows */}
        <div className="space-y-3">
          {rows.map((r, i) => (
            <ItemRowCard
              key={r.key}
              row={r}
              index={i}
              applyQc={applyQc}
              itemMap={itemMap}
              wasteItems={wasteItems}
              onChange={(nr) => updateRow(i, nr)}
              onRemove={() => removeRow(i)}
              canRemove={rows.length > 1}
            />
          ))}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
            <div className="text-xs text-emerald-700">Berat Kotor</div>
            <div className="text-lg font-bold text-emerald-900">
              {formatNumber(totalKotor)} kg
            </div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
            <div className="text-xs text-emerald-700">Berat Bersih</div>
            <div className="text-lg font-bold text-emerald-900">
              {formatNumber(totalBersih)} kg
            </div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
            <div className="text-xs text-emerald-700">% Susut</div>
            <div className="text-lg font-bold text-emerald-900">
              {formatNumber(persentaseSusut, 2)}%
            </div>
          </div>
          <div className="flex items-center justify-center rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-center">
            <div className="text-xs text-amber-800">
              <HandHeart className="mx-auto mb-1 size-4" />
              Material → Aset Bank Sampah
            </div>
          </div>
        </div>

        {extraInfo}

        {/* Notes */}
        <div>
          <Label className="text-emerald-900">Catatan (opsional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan teller / keterangan tambahan…"
            className="mt-1.5 bg-white border-emerald-200 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500"
            rows={2}
          />
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t border-emerald-100 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={reset}
          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          Reset
        </Button>
        <Button
          type="button"
          onClick={submit}
          disabled={saving}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {saving ? (
            <>
              <div className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Menyimpan…
            </>
          ) : (
            <>
              <Save className="size-4" /> Simpan Sedekah
            </>
          )}
        </Button>
      </CardFooter>

      <ReceiptDialog open={!!receipt} onOpenChange={(v) => !v && setReceipt(null)} data={receipt} />
    </Card>
  )
}

// ---------------- Riwayat ----------------
type RiwayatRow = {
  id: string
  jenis: 'nabung' | 'sedekah'
  tanggal: string
  nama: string
  kode: string
  totalBerat: number
  totalNilai: number
  poin: number
  qcStatus: string
  raw: any
}

function Riwayat() {
  const [data, setData] = useState<RiwayatRow[]>([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<RiwayatRow | null>(null)
  const [filter, setFilter] = useState<'all' | 'nabung' | 'sedekah'>('all')
  const [editQc, setEditQc] = useState<RiwayatRow | null>(null)
  const [editQcItems, setEditQcItems] = useState<{ id: string; quantityAfterQc: number; qcReason: string }[]>([])
  const [editQcNotes, setEditQcNotes] = useState('')
  const [editQcSaving, setEditQcSaving] = useState(false)

  // ---- Filter state ----
  // Pending inputs (typed but not yet applied)
  const [dariInput, setDariInput] = useState('')
  const [sampaiInput, setSampaiInput] = useState('')
  const [qInput, setQInput] = useState('')
  // Committed filters (applied to API call)
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [q, setQ] = useState('')
  const [qcFilter, setQcFilter] = useState<string>('all') // 'all' | 'passed' | 'adjusted' | 'pending'

  const buildRows = (
    nabung: any[],
    sedekah: any[]
  ): RiwayatRow[] => {
    const nabungRows: RiwayatRow[] = nabung.map((t) => ({
      id: t.id,
      jenis: 'nabung' as const,
      tanggal: t.transactedAt,
      nama: t.user?.name || '-',
      kode: t.user?.memberCode || '',
      totalBerat: toNumber(t.totalWeight),
      totalNilai: toNumber(t.totalValue),
      poin: toNumber(t.pointsAwarded),
      qcStatus: t.qcStatus || 'passed',
      raw: t,
    }))
    const sedekahRows: RiwayatRow[] = sedekah.map((t) => ({
      id: t.id,
      jenis: 'sedekah' as const,
      tanggal: t.transactedAt || t.filterAt,
      nama: t.user?.name || t.donorName || 'Donatur Anonim',
      kode: t.user?.memberCode || '',
      totalBerat: toNumber(t.totalWeightBersih ?? t.totalWeight),
      totalNilai: 0,
      poin: 0,
      qcStatus: t.qcStatus || 'passed',
      raw: t,
    }))
    return [...nabungRows, ...sedekahRows].sort(
      (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    )
  }

  // Build filter object sent to the API
  const buildFilters = () => ({
    qcStatus: qcFilter === 'all' ? '' : qcFilter,
    dari,
    sampai,
    q,
  })

  const filterKey = `${dari}|${sampai}|${q}|${qcFilter}`

  // Initial fetch + refetch when committed filters change
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const f = buildFilters()
    Promise.all([
      api.operasional.nabungList('', f),
      api.operasional.sedekahList('', f),
    ])
      .then(([nabung, sedekah]) => {
        if (cancelled) return
        setData(buildRows(nabung as any[], sedekah as any[]))
      })
      .catch((e) => {
        if (!cancelled) toast.error(e?.message || 'Gagal memuat riwayat.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [filterKey])

  // Manual reload triggered by user (e.g. "Muat ulang" button)
  const load = () => {
    setLoading(true)
    const f = buildFilters()
    Promise.all([api.operasional.nabungList('', f), api.operasional.sedekahList('', f)])
      .then(([nabung, sedekah]) => setData(buildRows(nabung as any[], sedekah as any[])))
      .catch((e) => toast.error(e?.message || 'Gagal memuat riwayat.'))
      .finally(() => setLoading(false))
  }

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
    setQcFilter('all')
    setFilter('all')
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return data
    return data.filter((r) => r.jenis === filter)
  }, [data, filter])

  // Open the Edit QC dialog for a given transaction row
  const openEditQc = (row: RiwayatRow) => {
    setEditQc(row)
    const items = (row.raw?.items || []).map((it: any) => ({
      id: it.id,
      quantityAfterQc: toNumber(it.quantityAfterQc ?? it.quantity ?? it.quantityBeforeQc),
      qcReason: it.qcReason || '',
    }))
    setEditQcItems(items)
    setEditQcNotes(row.raw?.qcNotes || '')
  }

  // Live recalculated totals for the Edit QC dialog
  const editQcTotals = useMemo(() => {
    const items = editQc?.raw?.items || []
    let totalBerat = 0
    let totalNilai = 0
    let totalKotor = 0
    for (const it of items) {
      const ei = editQcItems.find((e) => e.id === it.id)
      if (!ei) continue
      const before = toNumber(it.quantityBeforeQc)
      const after = ei.quantityAfterQc
      totalBerat += after
      totalKotor += before
      if (editQc?.jenis === 'nabung') {
        const price = toNumber(it.pricePerUnitSnapshot)
        totalNilai += after * price
      }
    }
    const totalSusut = Math.max(0, totalKotor - totalBerat)
    const persenSusut = totalKotor > 0 ? (totalSusut / totalKotor) * 100 : 0
    return { totalBerat, totalNilai, totalKotor, totalSusut, persenSusut }
  }, [editQc, editQcItems])

  // Save the QC edits
  const saveEditQc = async () => {
    if (!editQc) return
    // Validate: bersih must be >= 0
    for (const ei of editQcItems) {
      if (ei.quantityAfterQc < 0) {
        toast.error('Kuantitas bersih tidak boleh negatif')
        return
      }
    }
    setEditQcSaving(true)
    try {
      const payload = {
        items: editQcItems.map((ei) => ({ id: ei.id, quantityAfterQc: ei.quantityAfterQc, qcReason: ei.qcReason || null })),
        qcNotes: editQcNotes || null,
      }
      const isNabung = editQc.jenis === 'nabung'
      const res = isNabung
        ? await api.operasional.nabungEditQc(editQc.id, payload)
        : await api.operasional.sedekahEditQc(editQc.id, payload)
      const meta = res?._meta
      toast.success(
        `QC diperbarui. ${isNabung ? `Nilai ${formatRupiah(meta?.oldTotalValue ?? 0)} → ${formatRupiah(meta?.newTotalValue ?? 0)}` : `Berat ${formatNumber(meta?.oldTotalBersih ?? 0)} → ${formatNumber(meta?.newTotalBersih ?? 0)} kg`}. Status: ${meta?.qcStatus === 'adjusted' ? 'Disesuaikan' : 'OK'}`
      )
      setEditQc(null)
      setEditQcItems([])
      setEditQcNotes('')
      // Reload the data
      load()
    } catch (e: any) {
      toast.error(e?.message || 'Gagal memperbarui QC')
    } finally {
      setEditQcSaving(false)
    }
  }

  // Reset one item to its original "before QC" value (kotor)
  const resetItemToKotor = (itemId: string) => {
    const it = editQc?.raw?.items?.find((i: any) => i.id === itemId)
    if (!it) return
    setEditQcItems(editQcItems.map((ei) => ei.id === itemId ? { ...ei, quantityAfterQc: toNumber(it.quantityBeforeQc), qcReason: '' } : ei))
  }

  return (
    <Card className="border-emerald-200">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <History className="size-5" />
            </div>
            <div>
              <CardTitle className="text-emerald-900">Riwayat Transaksi</CardTitle>
              <CardDescription>
                Gabungan transaksi Nabung & Sedekah (100 terbaru per jenis).
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
              <SelectTrigger className="w-40 bg-white border-emerald-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                <SelectItem value="nabung">Nabung</SelectItem>
                <SelectItem value="sedekah">Sedekah</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={load}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              Muat ulang
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter bar */}
        <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
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
          <div className="w-40">
            <Label className="text-xs text-zinc-500">Status QC</Label>
            <Select value={qcFilter} onValueChange={setQcFilter}>
              <SelectTrigger className="h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="passed">OK</SelectItem>
                <SelectItem value="adjusted">Disesuaikan</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-52">
            <Label className="text-xs text-zinc-500">Cari Nasabah/Donatur</Label>
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyFilters()
              }}
              placeholder="Nama..."
              className="h-9 bg-white"
            />
          </div>
          <Button size="sm" onClick={applyFilters} className="h-9 bg-emerald-600 hover:bg-emerald-700">
            Terapkan
          </Button>
          <Button size="sm" variant="outline" onClick={resetFilters} className="h-9 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            Reset
          </Button>
          {(dari || sampai || q || qcFilter !== 'all') && (
            <div className="ml-auto text-xs text-emerald-800">
              Aktif:{' '}
              <span className="font-medium">
                {dari || '…'} — {sampai || '…'}
              </span>
              {qcFilter !== 'all' && ` · QC: ${qcFilter}`}
              {q && ` · "${q}"`}
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50/30 p-8 text-center">
            <FileText className="mx-auto mb-2 size-8 text-emerald-400" />
            <div className="text-sm font-medium text-emerald-900">Belum ada transaksi</div>
            <div className="text-xs text-muted-foreground">
              Transaksi nabung & sedekah akan muncul di sini.
            </div>
          </div>
        ) : (
          <div className="max-h-[480px] overflow-auto rounded-lg border border-emerald-200">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-emerald-50">
                <TableRow className="border-emerald-200">
                  <TableHead className="text-emerald-800">Tanggal</TableHead>
                  <TableHead className="text-emerald-800">Jenis</TableHead>
                  <TableHead className="text-emerald-800">Nasabah / Donatur</TableHead>
                  <TableHead className="text-emerald-800 text-right">Total Berat</TableHead>
                  <TableHead className="text-emerald-800 text-right">Total Nilai</TableHead>
                  <TableHead className="text-emerald-800 text-right">Poin</TableHead>
                  <TableHead className="text-emerald-800">QC</TableHead>
                  <TableHead className="text-emerald-800 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={`${r.jenis}-${r.id}`} className="border-emerald-100">
                    <TableCell className="text-xs text-emerald-800">
                      {formatDateTime(r.tanggal)}
                    </TableCell>
                    <TableCell>
                      {r.jenis === 'nabung' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                          <Recycle className="size-3" /> Nabung
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                          <HandHeart className="size-3" /> Sedekah
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-emerald-900">{r.nama}</div>
                      {r.kode && (
                        <div className="text-xs text-muted-foreground font-mono">{r.kode}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(r.totalBerat)} kg
                    </TableCell>
                    <TableCell className="text-right">
                      {r.jenis === 'nabung' ? (
                        <span className="font-medium text-emerald-900">
                          {formatRupiah(r.totalNilai)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.jenis === 'nabung' ? (
                        <span className="font-medium text-emerald-900">
                          {formatNumber(r.poin, 0)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{qcBadge(r.qcStatus)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setDetail(r)}
                          className="text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900"
                        >
                          <FileText className="size-4" /> Detail
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditQc(r)}
                          title="Edit QC — perbaiki kuantitas bersih & susut"
                          className="text-amber-700 hover:bg-amber-50 hover:text-amber-900"
                        >
                          <ClipboardEdit className="size-4" /> Edit QC
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-emerald-900">
              Detail Transaksi {detail?.jenis === 'sedekah' ? 'Sedekah' : 'Nabung'} Sampah
            </DialogTitle>
            <DialogDescription>
              Nomor:{' '}
              <span className="font-mono font-medium text-emerald-700">
                {detail
                  ? `${detail.jenis === 'sedekah' ? 'SD' : 'NB'}-${detail.id.slice(-6).toUpperCase()}`
                  : ''}
              </span>
            </DialogDescription>
          </DialogHeader>

          {detail && (
            <>
            <div id="printable-struk" className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 text-sm sm:grid-cols-4">
                <div>
                  <div className="text-xs text-emerald-700">Tanggal</div>
                  <div className="font-medium text-emerald-900">{formatDateTime(detail.tanggal)}</div>
                </div>
                <div>
                  <div className="text-xs text-emerald-700">
                    {detail.jenis === 'sedekah' ? 'Donatur' : 'Nasabah'}
                  </div>
                  <div className="font-medium text-emerald-900">{detail.nama}</div>
                </div>
                <div>
                  <div className="text-xs text-emerald-700">Total Berat</div>
                  <div className="font-semibold text-emerald-900">
                    {formatNumber(detail.totalBerat)} kg
                  </div>
                </div>
                {detail.jenis === 'nabung' ? (
                  <>
                    <div>
                      <div className="text-xs text-emerald-700">Total Nilai</div>
                      <div className="font-semibold text-emerald-900">
                        {formatRupiah(detail.totalNilai)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-emerald-700">Poin</div>
                      <div className="font-semibold text-emerald-900">
                        {formatNumber(detail.poin, 0)}
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="text-xs text-emerald-700">% Susut</div>
                    <div className="font-semibold text-emerald-900">
                      {formatNumber(toNumber(detail.raw?.persentaseSusut), 2)}%
                    </div>
                  </div>
                )}
                <div className="col-span-2 flex items-center gap-2 sm:col-span-4">
                  <span className="text-xs text-emerald-700">Status QC:</span>
                  {qcBadge(detail.qcStatus)}
                </div>
              </div>

              <div className="rounded-lg border border-emerald-200 overflow-hidden">
                <div className="max-h-72 overflow-auto">
                  <Table>
                    <TableHeader className="bg-emerald-50">
                      <TableRow className="border-emerald-200">
                        <TableHead className="text-emerald-800">Kode</TableHead>
                        <TableHead className="text-emerald-800">Nama</TableHead>
                        <TableHead className="text-emerald-800">Kategori</TableHead>
                        <TableHead className="text-emerald-800 text-right">Kotor</TableHead>
                        <TableHead className="text-emerald-800 text-right">Bersih</TableHead>
                        <TableHead className="text-emerald-800 text-right">Susut</TableHead>
                        {detail.jenis === 'nabung' && (
                          <>
                            <TableHead className="text-emerald-800 text-right">Harga</TableHead>
                            <TableHead className="text-emerald-800 text-right">Subtotal</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(detail.raw?.items || []).map((it: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs text-emerald-700">
                            {it.itemCodeSnapshot || it.wasteItem?.code || '-'}
                          </TableCell>
                          <TableCell className="font-medium text-emerald-900">
                            {it.itemNameSnapshot || it.wasteItem?.name || '-'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {it.categoryNameSnapshot || it.wasteItem?.category?.name || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(toNumber(it.quantityBeforeQc))} kg
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(
                              toNumber(it.quantityAfterQc ?? it.quantityBeforeQc)
                            )}{' '}
                            kg
                          </TableCell>
                          <TableCell className="text-right text-amber-700">
                            {formatNumber(toNumber(it.susutQc))} kg
                          </TableCell>
                          {detail.jenis === 'nabung' && (
                            <>
                              <TableCell className="text-right">
                                {formatRupiah(toNumber(it.pricePerUnitSnapshot))}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-emerald-900">
                                {formatRupiah(toNumber(it.subtotal))}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {detail.raw?.notes && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50/40 px-3 py-2 text-sm">
                  <span className="text-xs text-emerald-700">Catatan: </span>
                  <span className="text-emerald-900">{detail.raw.notes}</span>
                </div>
              )}

              {detail.jenis === 'sedekah' && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <AlertCircle className="mr-1 inline size-3.5" />
                  Sedekah tidak menghasilkan saldo nasabah — material menjadi aset Bank Sampah.
                </div>
              )}
            </div>
            </>
          )}

          <DialogFooter className="print:hidden">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDetail(null)}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              Tutup
            </Button>
            <Button
              type="button"
              onClick={() => printOperasionalDetail(detail)}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Printer className="size-4" /> Cetak Struk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit QC Dialog */}
      <Dialog open={!!editQc} onOpenChange={(v) => { if (!v && !editQcSaving) { setEditQc(null); setEditQcItems([]); setEditQcNotes('') } }}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                <ClipboardEdit className="size-5 text-amber-700" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-amber-900">
                  Edit QC — {editQc?.jenis === 'sedekah' ? 'Sedekah' : 'Nabung'} Sampah
                </DialogTitle>
                <DialogDescription className="mt-0.5">
                  Perbaiki kuantitas bersih setelah QC. Perubahan akan menyesuaikan saldo, poin, dan stok inventaris otomatis.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {editQc && (
            <div className="space-y-4">
              {/* Info banner */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3 text-xs sm:grid-cols-4">
                <div>
                  <div className="text-amber-700">Nomor</div>
                  <div className="font-mono font-medium text-amber-900">
                    {editQc.jenis === 'sedekah' ? 'SD' : 'NB'}-{editQc.id.slice(-6).toUpperCase()}
                  </div>
                </div>
                <div>
                  <div className="text-amber-700">{editQc.jenis === 'sedekah' ? 'Donatur' : 'Nasabah'}</div>
                  <div className="font-medium text-amber-900">{editQc.nama}</div>
                </div>
                <div>
                  <div className="text-amber-700">Tanggal</div>
                  <div className="font-medium text-amber-900">{formatDateTime(editQc.tanggal)}</div>
                </div>
                <div>
                  <div className="text-amber-700">Status QC Saat Ini</div>
                  <div>{qcBadge(editQc.qcStatus)}</div>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-2.5 text-[11px] text-amber-800">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                <p>
                  Ubah nilai <span className="font-semibold">Bersih (kg)</span> bila ada kesalahan perhitungan. Sistem akan menghitung ulang susut, total nilai, dan poin secara otomatis. Saldo & poin nasabah serta stok gudang akan disesuaikan (bertambah/berkurang sesuai selisih).
                </p>
              </div>

              {/* Editable items table */}
              <div className="rounded-lg border border-amber-200 overflow-hidden">
                <div className="max-h-72 overflow-auto">
                  <Table>
                    <TableHeader className="bg-amber-50">
                      <TableRow className="border-amber-200">
                        <TableHead className="text-amber-800">Item</TableHead>
                        <TableHead className="text-amber-800 text-right">Kotor (kg)</TableHead>
                        <TableHead className="text-amber-800 text-right">Bersih (kg)</TableHead>
                        <TableHead className="text-amber-800 text-right">Susut (kg)</TableHead>
                        {editQc.jenis === 'nabung' && (
                          <TableHead className="text-amber-800 text-right">Subtotal</TableHead>
                        )}
                        <TableHead className="text-amber-800 text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(editQc.raw?.items || []).map((it: any, i: number) => {
                        const ei = editQcItems.find((e) => e.id === it.id)
                        if (!ei) return null
                        const before = toNumber(it.quantityBeforeQc)
                        const after = ei.quantityAfterQc
                        const susut = Math.max(0, before - after)
                        const price = toNumber(it.pricePerUnitSnapshot)
                        const subtotal = after * price
                        return (
                          <TableRow key={it.id} className="border-amber-100">
                            <TableCell>
                              <div className="font-medium text-zinc-900">{it.itemNameSnapshot || it.wasteItem?.name || '-'}</div>
                              <div className="text-[10px] text-zinc-500">
                                {it.itemCodeSnapshot || it.wasteItem?.code || '-'} · {it.categoryNameSnapshot || it.wasteItem?.category?.name || '-'}
                                {editQc.jenis === 'nabung' && ` · ${formatRupiah(price)}/kg`}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-zinc-700">{formatNumber(before)}</TableCell>
                            <TableCell className="text-right p-1">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={ei.quantityAfterQc}
                                onChange={(e) => setEditQcItems(editQcItems.map((x) => x.id === it.id ? { ...x, quantityAfterQc: parseFloat(e.target.value) || 0 } : x))}
                                className="h-8 w-20 border-amber-300 bg-white text-right text-sm"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={cn('font-medium', susut > 0 ? 'text-amber-700' : 'text-zinc-400')}>
                                {formatNumber(susut)}
                              </span>
                            </TableCell>
                            {editQc.jenis === 'nabung' && (
                              <TableCell className="text-right font-semibold text-emerald-900">{formatRupiah(subtotal)}</TableCell>
                            )}
                            <TableCell className="text-center p-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => resetItemToKotor(it.id)}
                                title="Reset ke nilai kotor (tanpa susut)"
                                className="h-7 px-2 text-[10px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                              >
                                <RotateCcw className="size-3" /> Reset
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Per-item QC reason (collapsible list) */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-amber-800">Alasan Penyesuaian per Item (opsional)</Label>
                {editQcItems.map((ei) => {
                  const it = editQc.raw?.items?.find((x: any) => x.id === ei.id)
                  if (!it) return null
                  const before = toNumber(it.quantityBeforeQc)
                  const susut = Math.max(0, before - ei.quantityAfterQc)
                  if (susut <= 0) return null
                  return (
                    <div key={ei.id} className="flex items-center gap-2">
                      <span className="w-40 shrink-0 truncate text-[11px] text-zinc-600" title={it.itemNameSnapshot}>
                        {it.itemNameSnapshot}
                      </span>
                      <Input
                        type="text"
                        placeholder="Contoh: tercampur tanah, basah..."
                        value={ei.qcReason}
                        onChange={(e) => setEditQcItems(editQcItems.map((x) => x.id === ei.id ? { ...x, qcReason: e.target.value } : x))}
                        className="h-8 border-amber-200 bg-white text-xs"
                      />
                    </div>
                  )
                })}
                {editQcItems.every((ei) => {
                  const it = editQc.raw?.items?.find((x: any) => x.id === ei.id)
                  return it ? Math.max(0, toNumber(it.quantityBeforeQc) - ei.quantityAfterQc) <= 0 : true
                }) && (
                  <p className="text-[11px] text-zinc-400 italic">Tidak ada susut — semua item bersih = kotor.</p>
                )}
              </div>

              {/* QC Notes */}
              <div>
                <Label className="text-xs font-semibold text-amber-800">Catatan QC (opsional)</Label>
                <Textarea
                  rows={2}
                  placeholder="Catatan tambahan untuk koreksi QC ini..."
                  value={editQcNotes}
                  onChange={(e) => setEditQcNotes(e.target.value)}
                  className="border-amber-200 bg-white text-sm"
                />
              </div>

              {/* Live recalculated totals */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border-2 border-amber-200 bg-amber-50/60 p-3 sm:grid-cols-4">
                <div>
                  <div className="text-[11px] text-amber-700">Total Berat Bersih</div>
                  <div className="text-base font-bold text-amber-900">{formatNumber(editQcTotals.totalBerat)} kg</div>
                </div>
                <div>
                  <div className="text-[11px] text-amber-700">Total Susut</div>
                  <div className="text-base font-bold text-amber-700">
                    {formatNumber(editQcTotals.totalSusut)} kg
                    <span className="ml-1 text-[11px] font-normal text-amber-600">({editQcTotals.persenSusut.toFixed(1)}%)</span>
                  </div>
                </div>
                {editQc.jenis === 'nabung' ? (
                  <>
                    <div>
                      <div className="text-[11px] text-amber-700">Total Nilai Baru</div>
                      <div className="text-base font-bold text-emerald-700">{formatRupiah(editQcTotals.totalNilai)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-amber-700">Estimasi Poin</div>
                      <div className="text-base font-bold text-emerald-700">{formatNumber(Math.floor(editQcTotals.totalNilai * 0.01), 0)}</div>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2">
                    <div className="text-[11px] text-amber-700">Keterangan</div>
                    <div className="text-xs text-amber-800">Sedekah tidak mempengaruhi saldo/poin nasabah — hanya stok gudang & statistik berat.</div>
                  </div>
                )}
              </div>

              {/* Comparison with old values */}
              <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-[11px]">
                <span className="text-zinc-500">
                  {editQc.jenis === 'nabung'
                    ? `Sebelumnya: ${formatNumber(toNumber(editQc.raw?.totalWeight))} kg · ${formatRupiah(toNumber(editQc.raw?.totalValue))} · ${formatNumber(toNumber(editQc.raw?.pointsAwarded), 0)} poin`
                    : `Sebelumnya: ${formatNumber(toNumber(editQc.raw?.totalWeightBersih ?? editQc.raw?.totalWeight))} kg bersih`}
                </span>
                <span className="font-semibold text-amber-700">
                  → Setelah: {editQc.jenis === 'nabung'
                    ? `${formatNumber(editQcTotals.totalBerat)} kg · ${formatRupiah(editQcTotals.totalNilai)}`
                    : `${formatNumber(editQcTotals.totalBerat)} kg bersih`}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setEditQc(null); setEditQcItems([]); setEditQcNotes('') }}
              disabled={editQcSaving}
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={saveEditQc}
              disabled={editQcSaving}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {editQcSaving ? (
                <><div className="mr-2 size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Menyimpan...</>
              ) : (
                <><Save className="size-4" /> Simpan Koreksi QC</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ============================================================
// Helper: Print ReceiptData (nabung/sedekah success) via new window
// ============================================================
function printReceiptData(data: ReceiptData) {
  if (!data) return
  const isSedekah = data.jenis === 'sedekah'
  const icon = isSedekah ? '🤲' : '♻'
  const title = isSedekah ? 'STRUK SEDEKAH SAMPAH' : 'STRUK NABUNG SAMPAH'

  let html = ''
  html += `<div class="struk-header">
    <div class="icon">${icon}</div>
    <h2>Bank Sampah</h2>
    <div class="sub">Sukamaju Sejahtera</div>
    <div class="desc">Operasional Setoran Sampah</div>
    <div class="badge">${title}</div>
  </div>`
  html += `<div class="struk-section">
    <div class="info-row"><span class="key">No. Transaksi</span><span class="val mono">${data.nomor}</span></div>
    <div class="info-row"><span class="key">Tanggal</span><span class="val">${formatDateTime(data.tanggal)}</span></div>
    <div class="info-row"><span class="key">${isSedekah ? 'Donatur' : 'Nasabah'}</span><span class="val bold">${data.nasabahNama}</span></div>`
  if (data.nasabahKode) {
    html += `<div class="info-row"><span class="key">Kode</span><span class="val mono">${data.nasabahKode}</span></div>`
  }
  html += `<div class="info-row"><span class="key">Berat Kotor</span><span class="val">${formatNumber(data.totalBeratKotor)} kg</span></div>
    <div class="info-row"><span class="key">Berat Bersih</span><span class="val">${formatNumber(data.totalBeratBersih)} kg</span></div>`
  if (!isSedekah) {
    html += `<div class="info-row"><span class="key">Total Nilai</span><span class="val">${formatRupiah(data.totalNilai)}</span></div>
    <div class="info-row"><span class="key">Poin</span><span class="val">${formatNumber(data.poin, 0)}</span></div>`
  } else {
    html += `<div class="info-row"><span class="key">% Susut</span><span class="val">${formatNumber(data.persentaseSusut, 2)}%</span></div>`
  }
  html += `<div class="info-row"><span class="key">Status QC</span><span class="val">${data.qcStatus === 'passed' ? 'Lolos QC' : data.qcStatus === 'adjusted' ? 'Disesuaikan' : 'Menunggu QC'}</span></div>
  </div>`

  // Items table
  if (data.items && data.items.length > 0) {
    html += `<div class="struk-section">
      <div class="label">Detail Item</div>
      <table class="items-table">
        <thead><tr>
          <th>Kode</th>
          <th>Nama</th>
          <th class="right">Kotor</th>
          <th class="right">Bersih</th>`
    if (!isSedekah) {
      html += `<th class="right">Subtotal</th>`
    }
    html += `</tr></thead>
      <tbody>`
    for (const it of data.items) {
      html += `<tr>
        <td style="font-family:monospace;font-size:10px">${it.kode}</td>
        <td>${it.nama}</td>
        <td class="right">${formatNumber(it.qtyKotor)} kg</td>
        <td class="right">${formatNumber(it.qtyBersih)} kg</td>`
      if (!isSedekah) {
        html += `<td class="right">${formatRupiah(it.subtotal)}</td>`
      }
      html += `</tr>`
    }
    html += `</tbody></table></div>`
  }

  if (isSedekah) {
    html += `<div class="struk-section">
      <div class="notes" style="color:#b45309">Sedekah tidak menghasilkan saldo nasabah — material menjadi aset Bank Sampah.</div>
    </div>`
  }

  html += `<div class="struk-footer">
    <div class="thanks">Terima kasih telah berkontribusi</div>
    <div class="sub-thanks">menjaga lingkungan & membangun ekonomi komunitas</div>
    <div class="signature-area">
      <div class="sig"><div class="line"></div><div class="label">Nasabah</div></div>
      <div class="sig"><div class="line"></div><div class="label">Petugas</div></div>
    </div>
  </div>`
  printStruk(html)
}

// ============================================================
// Helper: Print Operasional detail via new window
// ============================================================
function printOperasionalDetail(detail: any) {
  if (!detail) return
  const isSedekah = detail.jenis === 'sedekah'
  const icon = isSedekah ? '🤲' : '♻'
  const title = isSedekah ? 'STRUK SEDEKAH SAMPAH' : 'STRUK NABUNG SAMPAH'
  const receiptNo = `${isSedekah ? 'SD' : 'NB'}-${detail.id.slice(-6).toUpperCase()}`

  let html = ''
  html += `<div class="struk-header">
    <div class="icon">${icon}</div>
    <h2>Bank Sampah</h2>
    <div class="sub">Sukamaju Sejahtera</div>
    <div class="desc">Operasional Setoran Sampah</div>
    <div class="badge">${title}</div>
  </div>`
  html += `<div class="struk-section">
    <div class="info-row"><span class="key">No. Transaksi</span><span class="val mono">${receiptNo}</span></div>
    <div class="info-row"><span class="key">Tanggal</span><span class="val">${formatDateTime(detail.tanggal)}</span></div>
    <div class="info-row"><span class="key">${isSedekah ? 'Donatur' : 'Nasabah'}</span><span class="val bold">${detail.nama}</span></div>
    <div class="info-row"><span class="key">Total Berat</span><span class="val">${formatNumber(detail.totalBerat)} kg</span></div>`
  if (!isSedekah) {
    html += `<div class="info-row"><span class="key">Total Nilai</span><span class="val">${formatRupiah(detail.totalNilai)}</span></div>
    <div class="info-row"><span class="key">Poin</span><span class="val">${formatNumber(detail.poin, 0)}</span></div>`
  }
  html += `<div class="info-row"><span class="key">Status QC</span><span class="val">${detail.qcStatus === 'passed' ? 'Lolos QC' : detail.qcStatus === 'adjusted' ? 'Disesuaikan' : 'Menunggu QC'}</span></div>
  </div>`

  // Items table
  if (detail.raw?.items && detail.raw.items.length > 0) {
    html += `<div class="struk-section">
      <div class="label">Detail Item</div>
      <table class="items-table">
        <thead><tr>
          <th>Kode</th>
          <th>Nama</th>
          <th class="right">Kotor</th>
          <th class="right">Bersih</th>`
    if (!isSedekah) {
      html += `<th class="right">Subtotal</th>`
    }
    html += `</tr></thead>
      <tbody>`
    for (const it of detail.raw.items) {
      const kode = it.itemCodeSnapshot || it.wasteItem?.code || '-'
      const nama = it.itemNameSnapshot || it.wasteItem?.name || '-'
      const kotor = formatNumber(toNumber(it.quantityBeforeQc))
      const bersih = formatNumber(toNumber(it.quantityAfterQc ?? it.quantityBeforeQc))
      html += `<tr>
        <td style="font-family:monospace;font-size:10px">${kode}</td>
        <td>${nama}</td>
        <td class="right">${kotor} kg</td>
        <td class="right">${bersih} kg</td>`
      if (!isSedekah) {
        html += `<td class="right">${formatRupiah(toNumber(it.subtotal))}</td>`
      }
      html += `</tr>`
    }
    html += `</tbody></table></div>`
  }

  if (detail.raw?.notes) {
    html += `<div class="struk-section">
      <div class="label">Catatan</div>
      <div class="notes">${detail.raw.notes}</div>
    </div>`
  }
  if (isSedekah) {
    html += `<div class="struk-section">
      <div class="notes" style="color:#b45309">Sedekah tidak menghasilkan saldo nasabah — material menjadi aset Bank Sampah.</div>
    </div>`
  }

  html += `<div class="struk-footer">
    <div class="thanks">Terima kasih telah berkontribusi</div>
    <div class="sub-thanks">menjaga lingkungan & membangun ekonomi komunitas</div>
    <div class="signature-area">
      <div class="sig"><div class="line"></div><div class="label">Nasabah</div></div>
      <div class="sig"><div class="line"></div><div class="label">Petugas</div></div>
    </div>
  </div>`
  printStruk(html)
}

// ---------------- Main ----------------
export function Operasional() {
  const [tab, setTab] = useState<'nabung' | 'sedekah' | 'riwayat'>('nabung')
  const [wasteItems, setWasteItems] = useState<WasteItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(true)

  // Initial fetch of waste items for the form selectors. `itemsLoading` defaults
  // to true so we avoid any synchronous setState inside the effect body.
  useEffect(() => {
    let cancelled = false
    api.barang
      .list()
      .then((r) => {
        if (cancelled) return
        setWasteItems(r as WasteItem[])
      })
      .catch((e) => {
        if (!cancelled) toast.error(e?.message || 'Gagal memuat barang sampah.')
      })
      .finally(() => {
        if (!cancelled) setItemsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
          <Scale className="size-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-emerald-900">Operasional Bank Sampah</h2>
          <p className="text-sm text-muted-foreground">
            Layanan setoran sampah nasabah, sedekah sampah, dan riwayat transaksi.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3 bg-emerald-100/60 border border-emerald-200">
          <TabsTrigger
            value="nabung"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs sm:text-sm"
          >
            <Recycle className="size-4" /> <span className="hidden sm:inline">Nabung</span> Sampah
          </TabsTrigger>
          <TabsTrigger
            value="sedekah"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs sm:text-sm"
          >
            <HandHeart className="size-4" /> <span className="hidden sm:inline">Sedekah</span> Sampah
          </TabsTrigger>
          <TabsTrigger
            value="riwayat"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs sm:text-sm"
          >
            <History className="size-4" /> <span className="hidden sm:inline">Riwayat</span> Transaksi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nabung">
          {itemsLoading ? (
            <Card className="border-emerald-200">
              <CardContent className="py-8">
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <NabungForm wasteItems={wasteItems} />
          )}
        </TabsContent>

        <TabsContent value="sedekah">
          {itemsLoading ? (
            <Card className="border-emerald-200">
              <CardContent className="py-8">
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <SedekahForm wasteItems={wasteItems} />
          )}
        </TabsContent>

        <TabsContent value="riwayat">
          <Riwayat />
        </TabsContent>
      </Tabs>
    </div>
  )
}
