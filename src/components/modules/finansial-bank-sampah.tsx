'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  formatRupiah,
  formatDateTime,
  toNumber,
} from '@/lib/format'
import { printStruk } from '@/lib/print-struk'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Wallet,
  ShieldCheck,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Info,
  Search,
  User as UserIcon,
  X,
  Plus,
  ReceiptText,
  Receipt,
  Landmark,
  CircleDot,
  CheckCircle2,
  XCircle,
  Filter,
} from 'lucide-react'

// ===================== Types =====================
type ReleaseData = {
  nasabahList: any[]
  kasStatus: {
    kasSaldo: number
    totalTertahan: number
    totalTersedia: number
    releaseCapacity: number
    likuiditasRatio: number
  }
}

type NasabahOption = {
  id: string
  name: string
  memberCode: string | null
  phone: string | null
  isMember?: boolean | null
}

type NasabahBalance = {
  saldoTersedia?: unknown
  saldoTertahan?: unknown
  points?: unknown
  user?: { name?: string; memberCode?: string | null }
  saldoTersediaSnapshot?: unknown
  saldoTertahanSnapshot?: unknown
}

type WithdrawalRow = {
  id: string
  receiptNo: string | null
  processedAt: string | null
  amount: unknown
  method: string
  status: string
  notes?: string | null
  bankName?: string | null
  accountNumber?: string | null
  accountName?: string | null
  user?: { id: string; name: string; memberCode: string | null; phone?: string | null } | null
  processedBy?: { name: string } | null
}

type PenarikanData = {
  list: WithdrawalRow[]
  kasSaldo: number
}

type KasRow = {
  id: string
  tipe: string
  sumber: string
  jumlah: number
  saldoSetelah: number
  keterangan?: string | null
  transactedAt: string
  createdBy?: { name: string } | null
}

type KasData = {
  list: KasRow[]
  kasSaldo: number
  totalMasuk: number
  totalKeluar: number
}

type ReceiptInfo = {
  receiptNo: string
  nasabahName: string
  nasabahCode: string | null
  amount: number
  method: string
  processedBy: string
  timestamp: string
  saldoTersediaAfter: number
  kasSetelah: number
}

// ===================== Helpers =====================
const SUMBER_OPTIONS = [
  { value: 'setoran_awal', label: 'Setoran Awal' },
  { value: 'penyesuaian', label: 'Penyesuaian' },
  { value: 'biaya_operasional', label: 'Biaya Operasional' },
  { value: 'lainnya', label: 'Lainnya' },
]

function sumberLabel(s: string): string {
  const found = SUMBER_OPTIONS.find((o) => o.value === s)
  if (found) return found.label
  if (s === 'penjualan_mitra') return 'Penjualan Mitra'
  if (s === 'penjualan_produk') return 'Penjualan Produk'
  if (s === 'penarikan_nasabah') return 'Penarikan Nasabah'
  return s || '-'
}

function methodLabel(m: string): string {
  if (m === 'cash' || m === 'tunai') return 'Tunai'
  if (m === 'transfer' || m === 'bank') return 'Transfer'
  return m || '-'
}

function statusBadge(status: string) {
  const s = (status || '').toLowerCase()
  if (s === 'sukses' || s === 'success') {
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
        <CheckCircle2 className="size-3" /> Sukses
      </Badge>
    )
  }
  if (s === 'ditolak' || s === 'rejected') {
    return (
      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
        <XCircle className="size-3" /> Ditolak
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
      <CircleDot className="size-3" /> Diproses
    </Badge>
  )
}

// ===================== Stat Tile =====================
function StatTile({
  icon,
  label,
  value,
  sub,
  tone = 'emerald',
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  tone?: 'emerald' | 'amber' | 'teal' | 'rose'
}) {
  const toneMap: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
  }
  const iconBgMap: Record<string, string> = {
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-500',
    teal: 'bg-teal-600',
    rose: 'bg-rose-600',
  }
  return (
    <div className={`rounded-xl border p-4 ${toneMap[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-medium opacity-80">{label}</div>
          <div className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">{value}</div>
          {sub && <div className="mt-0.5 text-xs opacity-75 truncate">{sub}</div>}
        </div>
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-white ${iconBgMap[tone]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

// ===================== Section Card =====================
function SectionCard({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card className="border-emerald-200">
      <CardHeader className="border-b border-emerald-100 flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
            {icon}
          </div>
          <div>
            <CardTitle className="text-emerald-900">{title}</CardTitle>
            <CardDescription className="text-emerald-700/70">{description}</CardDescription>
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </CardHeader>
      <CardContent className="p-4 sm:p-6">{children}</CardContent>
    </Card>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-400">
        <Info className="size-6" />
      </div>
      <div className="text-sm text-muted-foreground">{text}</div>
    </div>
  )
}

function TableSkeleton({ cols = 5, rows = 4 }: { cols?: number; rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-8" />
          ))}
        </div>
      ))}
    </div>
  )
}

// ===================== Nasabah Search Picker (for Penarikan) =====================
function NasabahSearchPicker({
  onPick,
}: {
  onPick: (n: NasabahOption, balance: NasabahBalance | null) => void
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<NasabahOption[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<NasabahOption | null>(null)
  const [balance, setBalance] = useState<NasabahBalance | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  // Use ref for onPick so the balance-fetch effect doesn't re-run when parent re-renders
  const onPickRef = useRef(onPick)
  useEffect(() => { onPickRef.current = onPick })

  // Debounced search
  useEffect(() => {
    if (!q.trim()) return
    let cancelled = false
    const t = setTimeout(() => {
      setLoading(true)
      api.operasional
        .nasabahList(q)
        .then((r) => {
          if (cancelled) return
          setResults((r as NasabahOption[]) || [])
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

  // Click-outside
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Fetch balance when selected changes (NOT when onPick changes — uses ref to avoid re-fetch loop)
  useEffect(() => {
    if (!selected) {
      Promise.resolve().then(() => setBalance(null))
      return
    }
    let cancelled = false
    Promise.resolve().then(() => setBalanceLoading(true))
    api.operasional
      .nasabahBalance(selected.id)
      .then((res) => {
        if (cancelled) return
        setBalance(res as NasabahBalance)
        onPickRef.current(selected, res as NasabahBalance)
      })
      .catch(() => {
        if (cancelled) return
        setBalance(null)
        onPickRef.current(selected, null)
      })
      .finally(() => {
        if (!cancelled) setBalanceLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selected])

  const pick = (n: NasabahOption) => {
    setSelected(n)
    setQ('')
    setResults([])
    setOpen(false)
  }

  const clear = () => {
    setSelected(null)
    setBalance(null)
    onPick(null as any, null)
  }

  // The nasabahBalance API returns { balance: { saldoTersedia, saldoTertahan, points }, ... }
  const innerBalance = (balance as any)?.balance ?? balance
  const saldoTersedia = toNumber(innerBalance?.saldoTersedia ?? innerBalance?.saldoTersediaSnapshot)

  return (
    <div ref={containerRef} className="space-y-2">
      <Label className="text-emerald-900 font-medium">Nasabah</Label>
      {selected ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                <UserIcon className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="font-medium text-emerald-900 truncate">{selected.name}</div>
                <div className="text-xs text-emerald-700/80 truncate">
                  {selected.memberCode || '-'}
                  {selected.phone ? ` · ${selected.phone}` : ''}
                </div>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900"
              onClick={clear}
            >
              <X className="size-4" /> Ganti
            </Button>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 text-xs">
            <div className="rounded-md bg-white/70 px-2.5 py-1.5 border border-emerald-100">
              <div className="text-emerald-700/70">Saldo Tersedia</div>
              <div className="font-semibold text-emerald-800">
                {balanceLoading ? '...' : formatRupiah(saldoTersedia)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-700/60" />
          <Input
            value={q}
            placeholder="Cari nasabah (nama / kode / telp)…"
            onChange={(e) => {
              setQ(e.target.value)
              if (!e.target.value.trim()) {
                setResults([])
                setOpen(false)
              }
            }}
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
                      <UserIcon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-emerald-900 truncate">{n.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {n.memberCode || '-'}
                        {n.phone ? ` · ${n.phone}` : ''}
                      </div>
                    </div>
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

// ============================================================
// Helper: Print Penarikan receipt via new window
// ============================================================
function printPenarikanReceipt(receipt: any) {
  if (!receipt) return
  let html = ''
  html += `<div class="struk-header">
    <div class="icon">💸</div>
    <h2>Bank Sampah</h2>
    <div class="sub">Sukamaju Sejahtera</div>
    <div class="desc">Layanan Keuangan Nasabah</div>
    <div class="badge">STRUK PENARIKAN SALDO</div>
  </div>`
  html += `<div class="struk-section">
    <div class="info-row"><span class="key">No. Transaksi</span><span class="val mono">${receipt.receiptNo}</span></div>
    <div class="info-row"><span class="key">Tanggal</span><span class="val">${formatDateTime(receipt.timestamp)}</span></div>
    <div class="info-row"><span class="key">Nasabah</span><span class="val bold">${receipt.nasabahName}</span></div>`
  if (receipt.nasabahCode) {
    html += `<div class="info-row"><span class="key">Kode</span><span class="val mono">${receipt.nasabahCode}</span></div>`
  }
  html += `<div class="info-row"><span class="key">Metode</span><span class="val" style="text-transform:capitalize">${receipt.method}</span></div>
    <div class="info-row"><span class="key">Petugas</span><span class="val">${receipt.processedBy}</span></div>
  </div>`
  html += `<div class="struk-section">
    <div class="label">Ringkasan Penarikan</div>
    <div class="summary-row highlight"><span class="key">Jumlah Ditarik</span><span class="val">${formatRupiah(receipt.amount)}</span></div>
  </div>`
  html += `<div class="struk-section">
    <div class="label">Saldo Setelah Penarikan</div>
    <div class="summary-row"><span class="key">Saldo Tersedia</span><span class="val" style="font-weight:700;color:#047857">${formatRupiah(receipt.saldoTersediaAfter)}</span></div>
    <div class="summary-row"><span class="key">Kas Institusi</span><span class="val">${formatRupiah(receipt.kasSetelah)}</span></div>
  </div>`
  html += `<div class="struk-section">
    <div class="label">Catatan</div>
    <div class="notes">Penarikan dicatat di Buku Kas Utama sebagai arus kas keluar.</div>
  </div>`
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

// ===================== Penarikan Tab =====================
function PenarikanTab() {
  const [state, setState] = useState<{ loading: boolean; data: PenarikanData | null }>({
    loading: true,
    data: null,
  })
  const [totalTersedia, setTotalTersedia] = useState<number>(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptInfo | null>(null)

  // form state
  const [selectedNasabah, setSelectedNasabah] = useState<NasabahOption | null>(null)
  const [saldoTersedia, setSaldoTersedia] = useState<number>(0)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // ---- Filter state (Riwayat Penarikan) ----
  // Pending inputs (typed but not yet applied)
  const [dariInput, setDariInput] = useState('')
  const [sampaiInput, setSampaiInput] = useState('')
  const [qInput, setQInput] = useState('')
  // Committed filters
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all') // 'all' | 'diproses' | 'sukses' | 'ditolak'
  const [methodFilter, setMethodFilter] = useState<string>('all') // 'all' | 'cash' | 'transfer'

  const [refreshKey, setRefreshKey] = useState(0)
  const filterKey = `${dari}|${sampai}|${q}|${statusFilter}|${methodFilter}`

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (cancelled) return
      setState((s) => ({ loading: true, data: s.data }))
    })
    Promise.all([
      api.finansial.penarikanList('', {
        status: statusFilter === 'all' ? '' : statusFilter,
        method: methodFilter === 'all' ? '' : methodFilter,
        dari,
        sampai,
        q,
      }),
      api.finansial.releaseList(),
    ])
      .then(([res, rel]) => {
        if (cancelled) return
        const pdata = res as PenarikanData
        const rdata = rel as ReleaseData
        setState({ loading: false, data: pdata })
        setTotalTersedia(toNumber(rdata?.kasStatus?.totalTersedia))
      })
      .catch((e) => {
        if (cancelled) return
        toast.error(e.message || 'Gagal memuat data penarikan')
        setState({ loading: false, data: null })
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey, filterKey])

  const list = state.data?.list ?? []
  const kasSaldo = state.data?.kasSaldo ?? 0

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
    setMethodFilter('all')
  }

  const openDialog = () => {
    setSelectedNasabah(null)
    setSaldoTersedia(0)
    setAmount('')
    setMethod('cash')
    setBankName('')
    setAccountNumber('')
    setAccountName('')
    setNotes('')
    setDialogOpen(true)
  }

  const nominal = parseFloat(amount) || 0
  const saldoSesudah = saldoTersedia - nominal
  const cukup = nominal > 0 && saldoSesudah >= 0
  const canSubmit =
    !!selectedNasabah && nominal > 0 && cukup && !saving && (method !== 'transfer' || (bankName && accountNumber && accountName))

  const onPick = useCallback((n: NasabahOption | null, balance: NasabahBalance | null) => {
    setSelectedNasabah(n)
    // The nasabahBalance API returns { balance: { saldoTersedia, saldoTertahan, points }, ... }
    // but if balance is already the inner object, use it directly
    const innerBalance = (balance as any)?.balance ?? balance
    setSaldoTersedia(toNumber(innerBalance?.saldoTersedia ?? innerBalance?.saldoTersediaSnapshot))
    setAmount('')
  }, [])

  const submit = async () => {
    if (!selectedNasabah || !canSubmit) return
    setSaving(true)
    try {
      const res = await api.finansial.penarikanExecute({
        userId: selectedNasabah.id,
        amount: nominal,
        method,
        notes: notes.trim(),
        bankInfo:
          method === 'transfer'
            ? { bankName, accountNumber, accountName }
            : undefined,
      }) as any
      const r: ReceiptInfo = {
        receiptNo: res?.receiptNo || res?.withdrawal?.receiptNo || '-',
        nasabahName: selectedNasabah.name,
        nasabahCode: selectedNasabah.memberCode,
        amount: nominal,
        method,
        processedBy: res?.withdrawal?.processedBy?.name || 'Petugas',
        timestamp: res?.withdrawal?.processedAt || new Date().toISOString(),
        saldoTersediaAfter: toNumber(res?.saldoTersediaSesudah),
        kasSetelah: toNumber(res?.kasSaldoSesudah),
      }
      setReceipt(r)
      setDialogOpen(false)
      setReceiptOpen(true)
      toast.success('Penarikan berhasil diproses')
      setRefreshKey((k) => k + 1)
    } catch (e: any) {
      toast.error(e.message || 'Gagal memproses penarikan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard
      icon={<Banknote className="size-5" />}
      title="Penarikan Saldo Tersedia"
      description="Nasabah menarik tunai/transfer dari saldo tersedia dengan validasi real-time."
      action={
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openDialog}>
          <Plus className="size-4" /> Buat Penarikan
        </Button>
      }
    >
      {/* 2 stat cards */}
      {state.loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatTile
            icon={<Wallet className="size-5" />}
            label="Kas Institusi"
            value={formatRupiah(kasSaldo)}
            sub="Saldo kas utama bank sampah"
            tone="emerald"
          />
          <StatTile
            icon={<ShieldCheck className="size-5" />}
            label="Total Saldo Tersedia"
            value={formatRupiah(totalTersedia)}
            sub="Semua nasabah (siap ditarik)"
            tone="teal"
          />
        </div>
      )}

      {/* Withdrawal history */}
      <div className="mt-5">
        <h4 className="mb-2 text-sm font-semibold text-emerald-900">Riwayat Penarikan</h4>

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
            <Label className="text-xs text-zinc-500">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="diproses">Diproses</SelectItem>
                <SelectItem value="sukses">Sukses</SelectItem>
                <SelectItem value="ditolak">Ditolak</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-36">
            <Label className="text-xs text-zinc-500">Metode</Label>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="cash">Tunai</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-52">
            <Label className="text-xs text-zinc-500">Cari Receipt/Nasabah</Label>
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyFilters()
              }}
              placeholder="No. receipt / nama..."
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
          {(dari || sampai || q || statusFilter !== 'all' || methodFilter !== 'all') && (
            <div className="ml-auto text-xs text-emerald-800">
              Aktif: <span className="font-medium">{dari || '…'} — {sampai || '…'}</span>
              {statusFilter !== 'all' && ` · ${statusFilter}`}
              {methodFilter !== 'all' && ` · ${methodFilter}`}
              {q && ` · "${q}"`}
            </div>
          )}
        </div>

        {state.loading ? (
          <TableSkeleton cols={7} rows={4} />
        ) : list.length === 0 ? (
          <EmptyState text="Belum ada riwayat penarikan" />
        ) : (
          <div className="max-h-[480px] overflow-auto rounded-lg border border-emerald-200">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-emerald-50">
                <TableRow className="border-emerald-200">
                  <TableHead className="text-emerald-800">Receipt No</TableHead>
                  <TableHead className="text-emerald-800">Tanggal</TableHead>
                  <TableHead className="text-emerald-800">Nasabah</TableHead>
                  <TableHead className="text-emerald-800 text-right">Nominal</TableHead>
                  <TableHead className="text-emerald-800">Metode</TableHead>
                  <TableHead className="text-emerald-800">Status</TableHead>
                  <TableHead className="text-emerald-800">Petugas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((w) => (
                  <TableRow key={w.id} className="border-emerald-100">
                    <TableCell className="font-mono text-xs text-emerald-700">
                      {w.receiptNo || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(w.processedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-emerald-900">{w.user?.name || '-'}</div>
                      <div className="text-xs text-muted-foreground">
                        {w.user?.memberCode || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-700">
                      {formatRupiah(toNumber(w.amount))}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-emerald-200 text-emerald-700">
                        {methodLabel(w.method)}
                      </Badge>
                    </TableCell>
                    <TableCell>{statusBadge(w.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {w.processedBy?.name || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create Penarikan Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-emerald-900 flex items-center gap-2">
              <Banknote className="size-5 text-emerald-600" /> Buat Penarikan
            </DialogTitle>
            <DialogDescription>
              Tarik saldo tersedia nasabah. Validasi real-time terhadap saldo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5">
            <NasabahSearchPicker key={dialogOpen ? 'open' : 'closed'} onPick={onPick} />

            {selectedNasabah && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-emerald-900 font-medium">Nominal Penarikan</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="border-emerald-200 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => setAmount(String(saldoTersedia))}
                    >
                      Saldo Tersedia Penuh
                    </Button>
                  </div>
                </div>

                {/* Real-time validation */}
                <div
                  className={`rounded-lg border p-3 text-xs ${
                    nominal > 0 && !cukup
                      ? 'border-rose-200 bg-rose-50'
                      : 'border-emerald-200 bg-emerald-50/40'
                  }`}
                >
                  <div className="font-semibold text-emerald-800 mb-1.5">Validasi Real-time</div>
                  <div className="grid gap-1 text-emerald-900">
                    <div className="flex justify-between gap-2">
                      <span className="opacity-75">Saldo Tersedia</span>
                      <span className="font-semibold text-emerald-700">
                        {formatRupiah(saldoTersedia)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="opacity-75">Setelah Penarikan</span>
                      <span className="font-semibold text-emerald-700">
                        {formatRupiah(Math.max(0, saldoSesudah))}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2 border-t border-emerald-200 pt-1.5">
                      <span className="opacity-75">Status</span>
                      {nominal <= 0 ? (
                        <span className="text-muted-foreground">Masukkan nominal</span>
                      ) : cukup ? (
                        <span className="font-semibold text-emerald-700">✅ Cukup</span>
                      ) : (
                        <span className="font-semibold text-rose-700">❌ Tidak Cukup</span>
                      )}
                    </div>
                  </div>
                  {nominal > 0 && !cukup && (
                    <div className="mt-2 rounded-md bg-rose-100 px-2 py-1.5 text-rose-800">
                      Saldo tersedia tidak mencukupi.
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-emerald-900 font-medium">Metode Penarikan</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger className="border-emerald-200 focus-visible:ring-emerald-500/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Tunai</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {method === 'transfer' && (
                  <div className="space-y-2.5 rounded-lg border border-teal-200 bg-teal-50/40 p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-emerald-900 text-xs font-medium">Bank</Label>
                        <Input
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          placeholder="BCA / Mandiri / BNI"
                          className="border-teal-200 focus-visible:ring-teal-500/30 h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-emerald-900 text-xs font-medium">No. Rekening</Label>
                        <Input
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          placeholder="1234567890"
                          className="border-teal-200 focus-visible:ring-teal-500/30 h-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-emerald-900 text-xs font-medium">Atas Nama</Label>
                      <Input
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="Nama pemilik rekening"
                        className="border-teal-200 focus-visible:ring-teal-500/30 h-9"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-emerald-900 font-medium">
                    Catatan <span className="text-muted-foreground font-normal">(opsional)</span>
                  </Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan tambahan untuk penarikan ini"
                    className="border-emerald-200 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500 min-h-[60px]"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              Batal
            </Button>
            <Button
              onClick={submit}
              disabled={!canSubmit}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? 'Memproses…' : 'Proses Penarikan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogTitle className="sr-only">Bukti Penarikan</DialogTitle>
          {receipt && (
            <>
            <div id="printable-struk" className="relative bg-white">
              {/* Header */}
              <div className="border-b-2 border-dashed border-zinc-300 bg-emerald-50 px-5 py-4 text-center">
                <div className="mb-1 text-2xl">💸</div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-900">Bank Sampah</h2>
                <p className="text-xs font-semibold text-emerald-700">Sukamaju Sejahtera</p>
                <p className="mt-0.5 text-[10px] text-emerald-600/70">Layanan Keuangan Nasabah</p>
                <div className="mt-2 inline-block rounded-full bg-emerald-600 px-3 py-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white">STRUK PENARIKAN SALDO</p>
                </div>
              </div>

              {/* Info Section */}
              <div className="space-y-1.5 border-b-2 border-dashed border-zinc-300 px-5 py-4">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="shrink-0 text-zinc-500">No. Transaksi</span>
                  <span className="text-right font-mono font-medium text-zinc-900">{receipt.receiptNo}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="shrink-0 text-zinc-500">Tanggal</span>
                  <span className="text-right font-medium text-zinc-900">{formatDateTime(receipt.timestamp)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="shrink-0 text-zinc-500">Nasabah</span>
                  <span className="text-right font-bold text-zinc-900">{receipt.nasabahName}</span>
                </div>
                {receipt.nasabahCode && (
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="shrink-0 text-zinc-500">Kode</span>
                    <span className="text-right font-mono text-zinc-900">{receipt.nasabahCode}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="shrink-0 text-zinc-500">Metode</span>
                  <span className="text-right font-medium capitalize text-zinc-900">{methodLabel(receipt.method)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="shrink-0 text-zinc-500">Petugas</span>
                  <span className="text-right font-medium text-zinc-900">{receipt.processedBy}</span>
                </div>
              </div>

              {/* Amount Summary */}
              <div className="border-b-2 border-dashed border-zinc-300 px-5 py-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Ringkasan Penarikan</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between rounded-md bg-emerald-50 px-2 py-1.5 text-sm font-bold">
                    <span className="text-emerald-900">Jumlah Ditarik</span>
                    <span className="text-emerald-700">{formatRupiah(receipt.amount)}</span>
                  </div>
                </div>
              </div>

              {/* Saldo After */}
              <div className="border-b-2 border-dashed border-zinc-300 px-5 py-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Saldo Setelah Penarikan</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Saldo Tersedia</span>
                    <span className="font-bold text-emerald-700">{formatRupiah(receipt.saldoTersediaAfter)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Kas Institusi</span>
                    <span className="font-medium text-zinc-900">{formatRupiah(receipt.kasSetelah)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="border-b-2 border-dashed border-zinc-300 px-5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Catatan</p>
                <p className="mt-1 text-xs italic leading-relaxed text-zinc-600">Penarikan dicatat di Buku Kas Utama sebagai arus kas keluar.</p>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 text-center">
                <p className="text-[11px] font-medium text-zinc-500">Terima kasih telah berkontribusi</p>
                <p className="text-[10px] text-zinc-400">menjaga lingkungan & membangun ekonomi komunitas</p>
                <div className="mt-4 flex justify-between gap-4 text-[10px] text-zinc-400">
                  <div className="flex-1 text-center">
                    <p className="h-8">&nbsp;</p>
                    <p className="border-t border-zinc-300 pt-0.5 font-medium text-zinc-500">Nasabah</p>
                  </div>
                  <div className="flex-1 text-center">
                    <p className="h-8">&nbsp;</p>
                    <p className="border-t border-zinc-300 pt-0.5 font-medium text-zinc-500">Petugas</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 border-t border-zinc-100 bg-white p-4 print:hidden">
              <Button
                variant="outline"
                onClick={() => setReceiptOpen(false)}
                className="flex-1 text-sm"
              >
                Tutup
              </Button>
              <Button
                onClick={() => printPenarikanReceipt(receipt)}
                className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <ReceiptText className="mr-1.5 size-4" /> Cetak Struk
              </Button>
            </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </SectionCard>
  )
}

// ===================== Buku Kas Utama Tab =====================
function BukuKasTab() {
  const [tipeFilter, setTipeFilter] = useState<string>('all')
  const [sumberFilter, setSumberFilter] = useState<string>('all')
  const [dariInput, setDariInput] = useState<string>('')
  const [sampaiInput, setSampaiInput] = useState<string>('')
  const [dari, setDari] = useState<string>('')
  const [sampai, setSampai] = useState<string>('')
  const [state, setState] = useState<{ loading: boolean; data: KasData | null }>({
    loading: true,
    data: null,
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [tipe, setTipe] = useState<'masuk' | 'keluar'>('masuk')
  const [sumber, setSumber] = useState('setoran_awal')
  const [jumlah, setJumlah] = useState('')
  const [keterangan, setKeterangan] = useState('')
  const [saving, setSaving] = useState(false)

  const filterKey = `${tipeFilter}|${sumberFilter}|${dari}|${sampai}`

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (cancelled) return
      setState((s) => ({ loading: true, data: s.data }))
    })
    api.finansial
      .kasBankSampah(
        tipeFilter === 'all' ? '' : tipeFilter,
        sumberFilter === 'all' ? '' : sumberFilter,
        dari,
        sampai
      )
      .then((res) => {
        if (cancelled) return
        setState({ loading: false, data: res as KasData })
      })
      .catch((e) => {
        if (cancelled) return
        toast.error(e.message || 'Gagal memuat buku kas')
        setState({ loading: false, data: null })
      })
    return () => {
      cancelled = true
    }
  }, [filterKey])

  const list = state.data?.list ?? []
  const kasSaldo = state.data?.kasSaldo ?? 0
  const totalMasuk = state.data?.totalMasuk ?? 0
  const totalKeluar = state.data?.totalKeluar ?? 0
  const periodeLabel = dari || sampai ? `periode: ${dari || '…'} — ${sampai || '…'}` : 'semua periode'

  const applyPeriode = () => {
    setDari(dariInput)
    setSampai(sampaiInput)
  }

  const resetPeriode = () => {
    setDariInput('')
    setSampaiInput('')
    setDari('')
    setSampai('')
    setTipeFilter('all')
    setSumberFilter('all')
  }

  const openDialog = () => {
    setTipe('masuk')
    setSumber('setoran_awal')
    setJumlah('')
    setKeterangan('')
    setDialogOpen(true)
  }

  const openBiayaDialog = () => {
    setTipe('keluar')
    setSumber('biaya_operasional')
    setJumlah('')
    setKeterangan('')
    setDialogOpen(true)
  }

  const jumlahNum = parseFloat(jumlah) || 0
  const canSubmit = jumlahNum > 0 && !saving

  const submit = async () => {
    if (!canSubmit) return
    setSaving(true)
    try {
      await api.finansial.kasTopUp({
        tipe,
        sumber,
        jumlah: jumlahNum,
        keterangan: keterangan.trim(),
      })
      toast.success('Transaksi kas berhasil dicatat')
      setDialogOpen(false)
      // Re-trigger fetch via filter dep (no-op)
      setTipeFilter((t) => (t === 'all' ? '' : 'all'))
    } catch (e: any) {
      toast.error(e.message || 'Gagal mencatat transaksi kas')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard
      icon={<Landmark className="size-5" />}
      title="Buku Kas Utama"
      description="Buku kas institusi — sumber kebenaran likuiditas bank sampah."
      action={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="border-rose-300 text-rose-700 hover:bg-rose-50" onClick={openBiayaDialog}>
            <Receipt className="size-4" /> Catat Biaya
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openDialog}>
            <Plus className="size-4" /> Top-up Kas
          </Button>
        </div>
      }
    >
      {/* 3 stat cards */}
      {state.loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile
            icon={<Wallet className="size-5" />}
            label="Kas Saldo (saat ini)"
            value={formatRupiah(kasSaldo)}
            sub="Saldo berjalan — semua periode"
            tone={kasSaldo >= 0 ? 'emerald' : 'rose'}
          />
          <StatTile
            icon={<ArrowDownCircle className="size-5" />}
            label="Total Masuk"
            value={formatRupiah(totalMasuk)}
            sub={`(${periodeLabel})`}
            tone="emerald"
          />
          <StatTile
            icon={<ArrowUpCircle className="size-5" />}
            label="Total Keluar"
            value={formatRupiah(totalKeluar)}
            sub={`(${periodeLabel})`}
            tone="rose"
          />
        </div>
      )}

      {/* Filters */}
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div className="text-sm font-semibold text-emerald-900 flex items-center gap-1.5 mr-auto">
          <Filter className="size-4" /> Riwayat Transaksi Kas
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-emerald-800">Tipe</Label>
          <Select value={tipeFilter} onValueChange={setTipeFilter}>
            <SelectTrigger className="w-[140px] border-emerald-200 focus-visible:ring-emerald-500/30 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="masuk">Masuk</SelectItem>
              <SelectItem value="keluar">Keluar</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-emerald-800">Sumber</Label>
          <Select value={sumberFilter} onValueChange={setSumberFilter}>
            <SelectTrigger className="w-[180px] border-emerald-200 focus-visible:ring-emerald-500/30 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Sumber</SelectItem>
              {SUMBER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
              <SelectItem value="penjualan_mitra">Penjualan Mitra</SelectItem>
              <SelectItem value="penjualan_produk">Penjualan Produk</SelectItem>
              <SelectItem value="penarikan_nasabah">Penarikan Nasabah</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Period filter */}
      <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
        <div className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
          <Filter className="size-3.5" /> Filter Periode
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-emerald-800">Dari</Label>
          <Input
            type="date"
            value={dariInput}
            onChange={(e) => setDariInput(e.target.value)}
            className="w-[150px] h-9 border-emerald-200 focus-visible:ring-emerald-500/30"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-emerald-800">Sampai</Label>
          <Input
            type="date"
            value={sampaiInput}
            onChange={(e) => setSampaiInput(e.target.value)}
            className="w-[150px] h-9 border-emerald-200 focus-visible:ring-emerald-500/30"
          />
        </div>
        <Button
          size="sm"
          onClick={applyPeriode}
          className="h-9 bg-emerald-600 hover:bg-emerald-700"
        >
          Terapkan
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={resetPeriode}
          className="h-9 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          Reset
        </Button>
        {(dari || sampai) && (
          <div className="text-xs text-emerald-800 ml-auto">
            Aktif: <span className="font-medium">{dari || '…'}</span> —{' '}
            <span className="font-medium">{sampai || '…'}</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="mt-3">
        {state.loading ? (
          <TableSkeleton cols={6} rows={5} />
        ) : list.length === 0 ? (
          <EmptyState text="Belum ada transaksi kas" />
        ) : (
          <div className="max-h-[480px] overflow-auto rounded-lg border border-emerald-200">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-emerald-50">
                <TableRow className="border-emerald-200">
                  <TableHead className="text-emerald-800">Tanggal & Waktu</TableHead>
                  <TableHead className="text-emerald-800">Tipe</TableHead>
                  <TableHead className="text-emerald-800">Sumber</TableHead>
                  <TableHead className="text-emerald-800 text-right">Jumlah</TableHead>
                  <TableHead className="text-emerald-800 text-right">Saldo Setelah</TableHead>
                  <TableHead className="text-emerald-800">Keterangan</TableHead>
                  <TableHead className="text-emerald-800">Petugas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((k) => {
                  const isMasuk = k.tipe === 'masuk'
                  return (
                    <TableRow key={k.id} className="border-emerald-100">
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(k.transactedAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            isMasuk
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }
                        >
                          {isMasuk ? 'Masuk' : 'Keluar'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-emerald-200 text-emerald-700">
                          {sumberLabel(k.sumber)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            isMasuk ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isMasuk ? (
                            <ArrowDownCircle className="size-3.5" />
                          ) : (
                            <ArrowUpCircle className="size-3.5" />
                          )}
                          {isMasuk ? '+' : '−'}
                          {formatRupiah(toNumber(k.jumlah))}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium text-emerald-900">
                        {formatRupiah(toNumber(k.saldoSetelah))}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[240px] truncate">
                        {k.keterangan || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {k.createdBy?.name || 'Sistem'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Top-up / Biaya Kas Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className={cn('flex items-center gap-2', tipe === 'keluar' ? 'text-rose-900' : 'text-emerald-900')}>
              {tipe === 'keluar' ? (
                <Receipt className="size-5 text-rose-600" />
              ) : (
                <Landmark className="size-5 text-emerald-600" />
              )}
              {tipe === 'keluar' ? 'Catat Pengeluaran / Biaya' : 'Top-up / Penyesuaian Kas'}
            </DialogTitle>
            <DialogDescription>
              {tipe === 'keluar'
                ? 'Catat pengeluaran kas (biaya operasional, pembelian, dll). Kas akan berkurang.'
                : 'Catat transaksi kas masuk atau penyesuaian secara manual (admin only).'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-emerald-900 font-medium">Tipe</Label>
                <Select
                  value={tipe}
                  onValueChange={(v) => setTipe(v as 'masuk' | 'keluar')}
                >
                  <SelectTrigger className="border-emerald-200 focus-visible:ring-emerald-500/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masuk">Masuk</SelectItem>
                    <SelectItem value="keluar">Keluar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-emerald-900 font-medium">Sumber</Label>
                <Select value={sumber} onValueChange={setSumber}>
                  <SelectTrigger className="border-emerald-200 focus-visible:ring-emerald-500/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUMBER_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-emerald-900 font-medium">Jumlah</Label>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                placeholder="0"
                className="border-emerald-200 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-emerald-900 font-medium">Keterangan</Label>
              <Textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Contoh: Setoran awal kas operasional"
                className="border-emerald-200 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500 min-h-[70px]"
              />
            </div>

            {/* Preview */}
            {jumlahNum > 0 && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 text-xs">
                <div className="font-semibold text-emerald-800 mb-1">Pratinjau</div>
                <div className="flex items-center justify-between gap-2 text-emerald-900">
                  <span className="opacity-75">Saldo Kas Setelah</span>
                  <span className="font-semibold text-emerald-700">
                    {formatRupiah(
                      tipe === 'masuk' ? kasSaldo + jumlahNum : kasSaldo - jumlahNum
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className={cn(tipe === 'keluar' ? 'border-rose-200 text-rose-700 hover:bg-rose-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50')}
            >
              Batal
            </Button>
            <Button
              onClick={submit}
              disabled={!canSubmit}
              className={cn(tipe === 'keluar' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700')}
            >
              {saving ? 'Menyimpan…' : (tipe === 'keluar' ? 'Catat Pengeluaran' : 'Catat Transaksi')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  )
}

// ===================== Main Component =====================
export function FinansialBankSampah() {
  const [tab, setTab] = useState('penarikan')

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-emerald-100/60 p-1 h-auto flex flex-wrap">
          <TabsTrigger
            value="penarikan"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-emerald-800 gap-1.5"
          >
            <Banknote className="size-4" />
            Penarikan
          </TabsTrigger>
          <TabsTrigger
            value="kas"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-emerald-800 gap-1.5"
          >
            <Landmark className="size-4" />
            Buku Kas Utama
          </TabsTrigger>
        </TabsList>

        <TabsContent value="penarikan" className="mt-4">
          <PenarikanTab />
        </TabsContent>
        <TabsContent value="kas" className="mt-4">
          <BukuKasTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
