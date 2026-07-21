'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  Warehouse,
  Factory,
  Truck,
  ShoppingBag,
  Plus,
  Trash2,
  Eye,
  Package,
  Layers,
  Coins,
  HandCoins,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Leaf,
  Scale,
  RefreshCw,
  ChevronDown,
} from 'lucide-react'

import { api } from '@/lib/api'
import {
  formatRupiah,
  formatNumber,
  formatDateTime,
  toNumber,
} from '@/lib/format'
import { cn } from '@/lib/utils'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from '@/components/ui/collapsible'

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
interface WasteItemRow {
  id: string
  code: string
  name: string
  unit: string
  pricePerUnit: string | number
  category?: { name: string }
  prices?: { pricePerUnit: string | number }[]
  inventories?: { source: string; stock: string | number }[]
}

interface ProductRow {
  id: string
  name: string
  unit: string
  price: string | number
  stock: string | number
  prices?: { pricePerUnit: string | number }[]
}

interface PartnerRow {
  id: string
  name: string
  type: string
  phone?: string | null
  address?: string | null
}

interface StokBySource {
  source: string
  stock: number
  id?: string
  hargaBeliNasabah?: number
}
interface StokRow {
  wasteItemId: string
  wasteItem: WasteItemRow
  totalStock: number
  hargaAcuan?: number
  bySource: StokBySource[]
}

interface ProcessingInputItem {
  id: string
  wasteItemId: string
  itemCodeSnapshot: string
  itemNameSnapshot: string
  categoryNameSnapshot: string
  unitSnapshot: string
  quantity: string | number
  wasteItem?: WasteItemRow
}
interface ProcessingOutputItem {
  id: string
  productId: string
  productNameSnapshot: string
  unitSnapshot: string
  quantity: string | number
  product?: ProductRow
}
interface ProcessingTx {
  id: string
  totalInputWeight: string | number
  notes?: string | null
  transactedAt: string
  createdBy?: { name: string } | null
  inputs: ProcessingInputItem[]
  outputs: ProcessingOutputItem[]
}

interface SalesTxItem {
  id: string
  wasteItemId: string
  itemCodeSnapshot: string
  itemNameSnapshot: string
  categoryNameSnapshot: string
  unitSnapshot: string
  pricePerUnit: string | number
  quantity: string | number
  subtotal: string | number
  wasteItem?: WasteItemRow
  // Margin detail (added in API update)
  hargaBeliNasabah?: string | number
  hargaJualMitra?: string | number
  marginPerUnit?: string | number
  subtotalBeli?: string | number
  subtotalJual?: string | number
  margin?: string | number
  marginPersen?: string | number
  isProfit?: boolean
}
interface SalesTx {
  id: string
  partnerId: string
  totalWeight: string | number
  totalValue: string | number
  notes?: string | null
  transactedAt: string
  partner?: PartnerRow
  items: SalesTxItem[]
  createdBy?: { name: string } | null
  // Margin detail (added in API update)
  totalBeliNasabah?: string | number
  totalJualMitra?: string | number
  totalMargin?: string | number
  totalMarginPersen?: string | number
  isProfit?: boolean
}

interface ProductSaleItem {
  id: string
  productId: string
  productNameSnapshot: string
  unitSnapshot: string
  pricePerUnitSnapshot: string | number
  quantity: string | number
  subtotal: string | number
  product?: ProductRow
}
interface ProductSaleTx {
  id: string
  buyerName: string
  buyerPhone: string
  paymentMethod: string
  paymentStatus: string
  totalQuantity: string | number
  totalValue: string | number
  notes?: string | null
  transactedAt: string
  items: ProductSaleItem[]
  createdBy?: { name: string } | null
}

// ----------------------------------------------------------------------------
// Shared helpers
// ----------------------------------------------------------------------------
function EmptyState({ message = 'Belum ada data' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-400">
        <Leaf className="h-6 w-6" />
      </div>
      <p className="text-sm text-emerald-700/70">{message}</p>
    </div>
  )
}

function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-md" />
      ))}
    </div>
  )
}

function StatCard({
  icon: Icon, label, value, sub, accent = 'emerald',
}: {
  icon: any
  label: string
  value: string
  sub?: string
  accent?: 'emerald' | 'teal' | 'amber'
}) {
  const accentMap = {
    emerald: 'from-emerald-500 to-emerald-600',
    teal: 'from-teal-500 to-teal-600',
    amber: 'from-amber-500 to-amber-600',
  } as const
  return (
    <Card className="overflow-hidden border-emerald-100 py-0">
      <div className="flex items-stretch">
        <div className={`flex w-1.5 shrink-0 bg-gradient-to-b ${accentMap[accent]}`} />
        <div className="flex-1 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-emerald-700/70">{label}</p>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${accentMap[accent]} text-white shadow-sm`}>
              <Icon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-900">{value}</p>
          {sub && <p className="mt-0.5 text-[11px] text-emerald-700/60">{sub}</p>}
        </div>
      </div>
    </Card>
  )
}

function sourceBadge(source: string) {
  switch (source) {
    case 'nabung':
      return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Nabung</Badge>
    case 'sedekah':
      return <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100">Sedekah</Badge>
    case 'processing_output':
      return <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100">Hasil Olahan</Badge>
    case 'sale_return':
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Retur</Badge>
    default:
      return <Badge variant="outline">{source}</Badge>
  }
}

// ----------------------------------------------------------------------------
// 1. STOK GUDANG
// ----------------------------------------------------------------------------
function StokGudangTab() {
  const [data, setData] = React.useState<StokRow[]>([])
  const [loading, setLoading] = React.useState(true)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.inventaris.stok()
      setData(res as StokRow[])
    } catch (e: any) {
      toast.error('Gagal memuat stok gudang', { description: e.message })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const totalJenis = data.length
  const totalStok = data.reduce((s, r) => s + toNumber(r.totalStock), 0)
  const stokNabung = data.reduce(
    (s, r) => s + r.bySource.filter((b) => b.source === 'nabung').reduce((a, b) => a + toNumber(b.stock), 0),
    0,
  )
  const stokSedekah = data.reduce(
    (s, r) => s + r.bySource.filter((b) => b.source === 'sedekah').reduce((a, b) => a + toNumber(b.stock), 0),
    0,
  )

  return (
    <Card className="border-emerald-100">
      <CardHeader className="border-b border-emerald-100/70">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-emerald-900">
              <Warehouse className="h-5 w-5 text-emerald-600" />
              Stok Gudang
            </CardTitle>
            <CardDescription className="text-emerald-700/70">
              Ringkasan stok sampah per jenis dan sumber (nabung / sedekah).
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            <RefreshCw className="h-4 w-4" /> Muat Ulang
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Layers} label="Jenis Barang" value={formatNumber(totalJenis, 0)} sub="total kategori sampah" accent="emerald" />
          <StatCard icon={Scale} label="Total Stok" value={formatNumber(totalStok, 2)} sub="kg (gabungan)" accent="teal" />
          <StatCard icon={HandCoins} label="Dari Nabung" value={formatNumber(stokNabung, 2)} sub="kg dari setoran nasabah" accent="emerald" />
          <StatCard icon={Coins} label="Dari Sedekah" value={formatNumber(stokSedekah, 2)} sub="kg dari sedekah" accent="amber" />
        </div>

        <Separator className="my-4 bg-emerald-100" />

        {loading ? (
          <TableSkeleton rows={6} />
        ) : data.length === 0 ? (
          <EmptyState message="Belum ada data stok gudang" />
        ) : (
          <div className="max-h-[520px] overflow-auto rounded-lg border border-emerald-100/70">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-emerald-50/95 backdrop-blur">
                <TableRow className="border-emerald-100 hover:bg-transparent">
                  <TableHead className="text-emerald-800">Kode</TableHead>
                  <TableHead className="text-emerald-800">Nama Barang</TableHead>
                  <TableHead className="text-emerald-800">Kategori</TableHead>
                  <TableHead className="text-emerald-800">Satuan</TableHead>
                  <TableHead className="text-right text-emerald-800">Total Stok</TableHead>
                  <TableHead className="text-emerald-800">Rincian Sumber</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => {
                  const total = toNumber(row.totalStock)
                  const lowStock = total < 5
                  return (
                    <TableRow key={row.wasteItemId} className="border-emerald-50">
                      <TableCell className="font-mono text-xs text-emerald-700">{row.wasteItem?.code ?? '-'}</TableCell>
                      <TableCell className="font-medium text-emerald-900">{row.wasteItem?.name ?? '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-emerald-200 text-emerald-700">
                          {row.wasteItem?.category?.name ?? '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-emerald-700/80">{row.wasteItem?.unit ?? 'kg'}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold ${lowStock ? 'text-amber-600' : 'text-emerald-900'}`}>
                          {formatNumber(total, 2)}
                        </span>
                        {lowStock && (
                          <Badge variant="outline" className="ml-2 border-amber-300 bg-amber-50 text-amber-700">
                            <AlertTriangle className="h-3 w-3" /> Stok Rendah
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {row.bySource.length === 0 && (
                            <span className="text-xs text-emerald-700/50">-</span>
                          )}
                          {row.bySource.map((b, i) => (
                            <div key={i} className="flex items-center gap-1.5 rounded-md border border-emerald-100 bg-emerald-50/60 px-2 py-1 text-xs">
                              {sourceBadge(b.source)}
                              <span className="font-semibold text-emerald-900">{formatNumber(toNumber(b.stock), 2)}</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ----------------------------------------------------------------------------
// 2. PENGOLAHAN
// ----------------------------------------------------------------------------
interface InputRow { wasteItemId: string; source: string; quantity: string }
interface OutputRow { productId: string; quantity: string }

function PengolahanTab() {
  const [list, setList] = React.useState<ProcessingTx[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [viewing, setViewing] = React.useState<ProcessingTx | null>(null)
  const [viewOpen, setViewOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  const [wasteItems, setWasteItems] = React.useState<WasteItemRow[]>([])
  const [products, setProducts] = React.useState<ProductRow[]>([])
  const [inventory, setInventory] = React.useState<StokRow[]>([])

  const [inputs, setInputs] = React.useState<InputRow[]>([{ wasteItemId: '', source: '', quantity: '' }])
  const [outputs, setOutputs] = React.useState<OutputRow[]>([{ productId: '', quantity: '' }])
  const [notes, setNotes] = React.useState('')

  // ---- Filter state ----
  const [dariInput, setDariInput] = React.useState('')
  const [sampaiInput, setSampaiInput] = React.useState('')
  const [qInput, setQInput] = React.useState('')
  const [dari, setDari] = React.useState('')
  const [sampai, setSampai] = React.useState('')
  const [q, setQ] = React.useState('')

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.inventaris.pengolahanList({ dari, sampai, q })
      setList(res as ProcessingTx[])
    } catch (e: any) {
      toast.error('Gagal memuat pengolahan', { description: e.message })
    } finally {
      setLoading(false)
    }
  }, [dari, sampai, q])

  const loadCatalog = React.useCallback(async () => {
    try {
      const [w, p] = await Promise.all([api.barang.list(), api.produk.list()])
      setWasteItems(w as WasteItemRow[])
      setProducts(p as ProductRow[])
    } catch (e: any) {
      toast.error('Gagal memuat katalog bahan & produk', { description: e.message })
    }
  }, [])

  React.useEffect(() => { load() }, [load])

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
  }

  const openCreate = async () => {
    setInputs([{ wasteItemId: '', source: '', quantity: '' }])
    setOutputs([{ productId: '', quantity: '' }])
    setNotes('')
    setDialogOpen(true)
    try {
      const [w, p, inv] = await Promise.all([api.barang.list(), api.produk.list(), api.inventaris.stok()])
      setWasteItems(w as WasteItemRow[])
      setProducts(p as ProductRow[])
      setInventory(inv as StokRow[])
    } catch (e: any) {
      toast.error('Gagal memuat katalog & stok', { description: e.message })
    }
  }

  // Find inventory item by wasteItemId
  const findInv = (wasteItemId: string) => inventory.find((i) => i.wasteItemId === wasteItemId)
  // Find source stock for a wasteItemId + source
  const findSourceStock = (wasteItemId: string, source: string) => {
    const inv = findInv(wasteItemId)
    if (!inv) return 0
    if (source === 'all' || !source) return inv.totalStock
    return inv.bySource.find((s) => s.source === source)?.stock ?? 0
  }
  // Get harga beli for a source (0 for sedekah, hargaAcuan for nabung)
  const getHargaBeli = (wasteItemId: string, source: string) => {
    const inv = findInv(wasteItemId)
    if (!inv) return 0
    if (source === 'sedekah') return 0
    return inv.hargaAcuan ?? 0
  }
  // Get available sources for a wasteItemId (only those with stock > 0)
  const getAvailableSources = (wasteItemId: string) => {
    const inv = findInv(wasteItemId)
    if (!inv) return []
    return inv.bySource.filter((s) => s.stock > 0)
  }

  const updateInput = (idx: number, field: keyof InputRow, val: string) => {
    setInputs((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)))
    // Auto-select source when wasteItemId is chosen
    if (field === 'wasteItemId' && val) {
      const sources = getAvailableSources(val)
      const autoSource = sources.find((s) => s.source === 'nabung')?.source || sources[0]?.source || ''
      setInputs((prev) => prev.map((r, i) => (i === idx ? { ...r, source: autoSource, quantity: '' } : r)))
    }
  }
  const addInput = () => setInputs((p) => [...p, { wasteItemId: '', source: '', quantity: '' }])
  const removeInput = (idx: number) => setInputs((p) => p.filter((_, i) => i !== idx))

  const updateOutput = (idx: number, field: keyof OutputRow, val: string) => {
    setOutputs((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)))
  }
  const addOutput = () => setOutputs((p) => [...p, { productId: '', quantity: '' }])
  const removeOutput = (idx: number) => setOutputs((p) => p.filter((_, i) => i !== idx))

  const totalInputWeight = inputs.reduce((s, r) => s + (parseFloat(r.quantity) || 0), 0)
  const totalOutputQty = outputs.reduce((s, r) => s + (parseFloat(r.quantity) || 0), 0)

  const submit = async () => {
    const cleanInputs = inputs
      .filter((r) => r.wasteItemId && r.quantity && r.source)
      .map((r) => ({ wasteItemId: r.wasteItemId, quantity: parseFloat(r.quantity), source: r.source }))
    const cleanOutputs = outputs
      .filter((r) => r.productId && r.quantity)
      .map((r) => ({ productId: r.productId, quantity: parseFloat(r.quantity) }))

    if (cleanInputs.length === 0) {
      toast.error('Minimal 1 bahan baku harus diisi')
      return
    }
    if (cleanOutputs.length === 0) {
      toast.error('Minimal 1 produk hasil harus diisi')
      return
    }
    setSubmitting(true)
    try {
      await api.inventaris.pengolahanCreate({
        inputs: cleanInputs,
        outputs: cleanOutputs,
        notes: notes || undefined,
      })
      toast.success('Pengolahan berhasil dibuat', {
        description: `Total input ${formatNumber(totalInputWeight, 2)} kg · ${cleanOutputs.length} produk dihasilkan`,
      })
      setDialogOpen(false)
      load()
    } catch (e: any) {
      toast.error('Gagal membuat pengolahan', { description: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-emerald-100">
      <CardHeader className="border-b border-emerald-100/70">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-emerald-900">
              <Factory className="h-5 w-5 text-emerald-600" />
              Pengolahan Sampah
            </CardTitle>
            <CardDescription className="text-emerald-700/70">
              Olah bahan baku sampah menjadi produk upcycle.
            </CardDescription>
          </div>
          <Button onClick={openCreate} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700">
            <Plus className="h-4 w-4" /> Buat Pengolahan
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Filter bar */}
        <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
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
          <div className="w-64">
            <Label className="text-xs text-zinc-500">Cari Bahan/Produk</Label>
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyFilters()
              }}
              placeholder="Nama bahan baku / produk..."
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
          {(dari || sampai || q) && (
            <div className="ml-auto text-xs text-emerald-800">
              Aktif: <span className="font-medium">{dari || '…'} — {sampai || '…'}</span>
              {q && ` · "${q}"`}
            </div>
          )}
        </div>

        {loading ? (
          <TableSkeleton rows={6} />
        ) : list.length === 0 ? (
          <EmptyState message="Belum ada transaksi pengolahan" />
        ) : (
          <div className="max-h-[480px] overflow-auto rounded-lg border border-emerald-100/70">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-emerald-50/95 backdrop-blur">
                <TableRow className="border-emerald-100 hover:bg-transparent">
                  <TableHead className="text-emerald-800">Tanggal</TableHead>
                  <TableHead className="text-emerald-800">Bahan Baku (Jenis Sampah)</TableHead>
                  <TableHead className="text-right text-emerald-800">Total Input</TableHead>
                  <TableHead className="text-emerald-800">Produk Hasil</TableHead>
                  <TableHead className="text-right text-emerald-800">Total Output</TableHead>
                  <TableHead className="text-emerald-800">Dibuat oleh</TableHead>
                  <TableHead className="text-right text-emerald-800">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((tx) => {
                  // Format input items: "Buku 20 kg, Dus 10 kg"
                  const inputSummary = (tx.inputs ?? []).map((inp: any) =>
                    `${inp.itemNameSnapshot} ${formatNumber(toNumber(inp.quantity), 0)}${inp.unitSnapshot || 'kg'}`
                  ).join(', ')
                  // Format output items: "Pupuk Organik 15 pcs, Tas 5 pcs"
                  const outputSummary = (tx.outputs ?? []).map((out: any) =>
                    `${out.productNameSnapshot} ${formatNumber(toNumber(out.quantity), 0)} ${out.unitSnapshot || 'pcs'}`
                  ).join(', ')
                  const totalOutputQty = (tx.outputs ?? []).reduce((s: number, o: any) => s + toNumber(o.quantity), 0)
                  return (
                    <TableRow key={tx.id} className="border-emerald-50">
                      <TableCell className="text-xs text-emerald-900 whitespace-nowrap">{formatDateTime(tx.transactedAt)}</TableCell>
                      <TableCell className="text-xs text-emerald-700/80 max-w-[200px]">
                        {inputSummary || '-'}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-emerald-900 whitespace-nowrap">
                        {formatNumber(toNumber(tx.totalInputWeight), 2)} kg
                      </TableCell>
                      <TableCell className="text-xs text-teal-700/80 max-w-[200px]">
                        {outputSummary || '-'}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-teal-900 whitespace-nowrap">
                        {formatNumber(totalOutputQty, 0)} pcs
                      </TableCell>
                      <TableCell className="text-xs text-emerald-700/80 whitespace-nowrap">{tx.createdBy?.name ?? '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => { setViewing(tx); setViewOpen(true) }}
                        >
                          <Eye className="h-3.5 w-3.5" /> Lihat
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl lg:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-900">
              <Factory className="h-5 w-5 text-emerald-600" /> Buat Pengolahan
            </DialogTitle>
            <DialogDescription>
              Pilih bahan baku sampah sebagai input dan produk hasil sebagai output.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Inputs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-emerald-800">Bahan Baku (Input)</Label>
                <Button size="sm" variant="outline" onClick={addInput} className="h-7 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  <Plus className="h-3.5 w-3.5" /> Tambah Input
                </Button>
              </div>
              <div className="space-y-2">
                {inputs.map((row, idx) => {
                  const availableStock = findSourceStock(row.wasteItemId, row.source)
                  const hargaBeli = getHargaBeli(row.wasteItemId, row.source)
                  const qty = parseFloat(row.quantity) || 0
                  const modalBahan = hargaBeli * qty
                  const exceedsStock = row.wasteItemId && row.source && qty > availableStock
                  return (
                    <div key={idx} className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-3">
                      {/* Row 1: Barang + Sumber Stok + Remove */}
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-emerald-700/70">Barang Sampah</Label>
                          <Select value={row.wasteItemId} onValueChange={(v) => updateInput(idx, 'wasteItemId', v)}>
                            <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Pilih bahan..." /></SelectTrigger>
                            <SelectContent>
                              {inventory.filter((inv) => inv.totalStock > 0).map((inv) => (
                                <SelectItem key={inv.wasteItemId} value={inv.wasteItemId}>
                                  {inv.wasteItem.code} · {inv.wasteItem.name} (Stok: {formatNumber(inv.totalStock, 0)} kg)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-emerald-700/70">Sumber Stok</Label>
                          <Select
                            value={row.source}
                            onValueChange={(v) => updateInput(idx, 'source', v)}
                            disabled={!row.wasteItemId}
                          >
                            <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Pilih sumber..." /></SelectTrigger>
                            <SelectContent>
                              {row.wasteItemId && getAvailableSources(row.wasteItemId).map((s) => (
                                <SelectItem key={s.source} value={s.source}>
                                  {s.source === 'sedekah' ? `Sedekah (donasi) (${formatNumber(s.stock, 0)} kg)` : `Nabung (dari nasabah) (${formatNumber(s.stock, 0)} kg)`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeInput(idx)}
                          disabled={inputs.length === 1}
                          className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                          title="Hapus baris"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {/* Row 2: Harga Beli + Jumlah + Modal Bahan */}
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-end">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-emerald-700/70">Harga Beli/kg</Label>
                          <div className={cn('flex h-9 items-center rounded-md border px-3 text-sm',
                            row.source === 'sedekah' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-zinc-200 bg-zinc-50 text-zinc-600')}>
                            {row.source ? (row.source === 'sedekah' ? 'Rp 0 (donasi)' : formatRupiah(hargaBeli)) : '—'}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-emerald-700/70">Jumlah (kg)</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={row.quantity}
                            onChange={(e) => updateInput(idx, 'quantity', e.target.value)}
                            className={cn('bg-white', exceedsStock && 'border-rose-400')}
                          />
                          {row.wasteItemId && row.source && (
                            <p className={cn('text-[10px]', exceedsStock ? 'text-rose-600' : 'text-zinc-400')}>
                              {exceedsStock ? `⚠ Melebihi stok!` : `Max: ${formatNumber(availableStock, 0)} kg`}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-emerald-700/70">Modal Bahan</Label>
                          <div className="flex h-9 items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-900">
                            {row.source && qty > 0 ? formatRupiah(modalBahan) : 'Rp 0'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <Separator className="bg-emerald-100" />

            {/* Outputs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-emerald-800">Produk Hasil (Output)</Label>
                <Button size="sm" variant="outline" onClick={addOutput} className="h-7 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  <Plus className="h-3.5 w-3.5" /> Tambah Output
                </Button>
              </div>
              <div className="space-y-2">
                {outputs.map((row, idx) => {
                  const product = products.find((p) => p.id === row.productId)
                  const hargaJual = product ? toNumber(product.price) : 0
                  const outQty = parseFloat(row.quantity) || 0
                  const totalNilaiJual = hargaJual * outQty
                  return (
                    <div key={idx} className="rounded-lg border border-teal-100 bg-teal-50/30 p-3">
                      {/* Row 1: Produk + Jumlah + Remove */}
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_auto] sm:items-end">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-teal-700/70">Produk</Label>
                          <Select value={row.productId} onValueChange={(v) => updateOutput(idx, 'productId', v)}>
                            <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Pilih produk..." /></SelectTrigger>
                            <SelectContent>
                              {products.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} <span className="text-teal-600/60">· stok {formatNumber(toNumber(p.stock), 0)} · {formatRupiah(toNumber(p.price))}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-teal-700/70">Jumlah ({product?.unit || 'pcs'})</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={row.quantity}
                            onChange={(e) => updateOutput(idx, 'quantity', e.target.value)}
                            className="bg-white"
                          />
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeOutput(idx)}
                          disabled={outputs.length === 1}
                          className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                          title="Hapus baris"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {/* Row 2: Harga Jual (auto) + Total Nilai Jual */}
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-end">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-teal-700/70">Harga Jual/pcs (dari master produk)</Label>
                          <div className="flex h-9 items-center rounded-md border border-teal-200 bg-teal-50 px-3 text-sm font-medium text-teal-900">
                            {row.productId ? formatRupiah(hargaJual) : '—'}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-teal-700/70">Total Nilai Jual</Label>
                          <div className="flex h-9 items-center rounded-md border border-teal-200 bg-teal-50 px-3 text-sm font-bold text-teal-900">
                            {row.productId && outQty > 0 ? formatRupiah(totalNilaiJual) : 'Rp 0'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <Separator className="bg-emerald-100" />

            {/* Summary + notes */}
            {(() => {
              const totalModalBahan = inputs.reduce((s, r) => {
                const hb = getHargaBeli(r.wasteItemId, r.source)
                return s + hb * (parseFloat(r.quantity) || 0)
              }, 0)
              const totalNilaiJual = outputs.reduce((s, r) => {
                const p = products.find((pp) => pp.id === r.productId)
                return s + (p ? toNumber(p.price) * (parseFloat(r.quantity) || 0) : 0)
              }, 0)
              const estUntung = totalNilaiJual - totalModalBahan
              return (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
                    <p className="text-xs text-emerald-700/70">Total Berat Input</p>
                    <p className="text-lg font-bold text-emerald-900">{formatNumber(totalInputWeight, 2)} kg</p>
                  </div>
                  <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-3">
                    <p className="text-xs text-amber-700/70">Modal Bahan</p>
                    <p className="text-lg font-bold text-amber-900">{formatRupiah(totalModalBahan)}</p>
                  </div>
                  <div className="rounded-lg border border-teal-100 bg-teal-50/40 p-3">
                    <p className="text-xs text-teal-700/70">Total Output & Nilai Jual</p>
                    <p className="text-lg font-bold text-teal-900">{formatNumber(totalOutputQty, 0)} pcs</p>
                    <p className="text-xs text-teal-600">{formatRupiah(totalNilaiJual)}</p>
                  </div>
                  <div className={cn('rounded-lg border p-3', estUntung >= 0 ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/60')}>
                    <p className={cn('text-xs', estUntung >= 0 ? 'text-emerald-700/70' : 'text-rose-700/70')}>Estimasi Untung</p>
                    <p className={cn('text-lg font-bold', estUntung >= 0 ? 'text-emerald-900' : 'text-rose-900')}>{formatRupiah(estUntung)}</p>
                    {totalModalBahan > 0 && (
                      <p className={cn('text-xs', estUntung >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                        Margin {((estUntung / totalNilaiJual) * 100).toFixed(0)}%
                      </p>
                    )}
                    {totalModalBahan === 0 && totalNilaiJual > 0 && (
                      <p className="text-xs text-emerald-600">Full profit (bahan sedekah)</p>
                    )}
                  </div>
                </div>
              )
            })()}

            <div className="space-y-1.5">
              <Label htmlFor="proc-notes" className="text-emerald-800">Catatan</Label>
              <Textarea
                id="proc-notes"
                placeholder="Catatan opsional terkait pengolahan ini..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button
              onClick={submit}
              disabled={submitting}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Pengolahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-900">
              <Eye className="h-5 w-5 text-emerald-600" /> Detail Pengolahan
            </DialogTitle>
            <DialogDescription>
              {viewing ? formatDateTime(viewing.transactedAt) : ''}
            </DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
                  <p className="text-xs text-emerald-700/70">Total Berat Input</p>
                  <p className="text-lg font-bold text-emerald-900">{formatNumber(toNumber(viewing.totalInputWeight), 2)} kg</p>
                </div>
                <div className="rounded-lg border border-teal-100 bg-teal-50/40 p-3">
                  <p className="text-xs text-teal-700/70">Jumlah Produk Output</p>
                  <p className="text-lg font-bold text-teal-900">{viewing.outputs.length}</p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-emerald-800">Bahan Baku (Input)</p>
                <div className="overflow-hidden rounded-lg border border-emerald-100">
                  <Table>
                    <TableHeader className="bg-emerald-50/70">
                      <TableRow className="border-emerald-100 hover:bg-transparent">
                        <TableHead className="text-emerald-800">Kode</TableHead>
                        <TableHead className="text-emerald-800">Nama</TableHead>
                        <TableHead className="text-emerald-800">Kategori</TableHead>
                        <TableHead className="text-right text-emerald-800">Jumlah</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewing.inputs.map((inp) => (
                        <TableRow key={inp.id} className="border-emerald-50">
                          <TableCell className="font-mono text-xs text-emerald-700">{inp.itemCodeSnapshot}</TableCell>
                          <TableCell className="font-medium text-emerald-900">{inp.itemNameSnapshot}</TableCell>
                          <TableCell className="text-emerald-700/80">{inp.categoryNameSnapshot}</TableCell>
                          <TableCell className="text-right font-semibold text-emerald-900">
                            {formatNumber(toNumber(inp.quantity), 2)} {inp.unitSnapshot}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-teal-800">Produk Hasil (Output)</p>
                <div className="overflow-hidden rounded-lg border border-teal-100">
                  <Table>
                    <TableHeader className="bg-teal-50/70">
                      <TableRow className="border-teal-100 hover:bg-transparent">
                        <TableHead className="text-teal-800">Nama Produk</TableHead>
                        <TableHead className="text-right text-teal-800">Jumlah</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewing.outputs.map((out) => (
                        <TableRow key={out.id} className="border-teal-50">
                          <TableCell className="font-medium text-teal-900">{out.productNameSnapshot}</TableCell>
                          <TableCell className="text-right font-semibold text-teal-900">
                            {formatNumber(toNumber(out.quantity), 2)} {out.unitSnapshot}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {viewing.notes && (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
                  <p className="text-xs text-emerald-700/70">Catatan</p>
                  <p className="mt-1 text-sm text-emerald-900">{viewing.notes}</p>
                </div>
              )}
              <p className="text-xs text-emerald-700/60">Dibuat oleh: {viewing.createdBy?.name ?? '-'}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ----------------------------------------------------------------------------
// 3. PENJUALAN KE MITRA
// ----------------------------------------------------------------------------
interface MitraItemRow {
  wasteItemId: string
  source: string // 'nabung' | 'sedekah'
  pricePerUnit: string // harga jual ke mitra (editable)
  quantity: string
}

function PenjualanMitraTab() {
  const [list, setList] = React.useState<SalesTx[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  const [partners, setPartners] = React.useState<PartnerRow[]>([])
  const [inventory, setInventory] = React.useState<StokRow[]>([])

  const [partnerId, setPartnerId] = React.useState('')
  const [itemRows, setItemRows] = React.useState<MitraItemRow[]>([{ wasteItemId: '', source: '', pricePerUnit: '', quantity: '' }])
  const [notes, setNotes] = React.useState('')

  // ---- Filter state ----
  const [dariInput, setDariInput] = React.useState('')
  const [sampaiInput, setSampaiInput] = React.useState('')
  const [qInput, setQInput] = React.useState('')
  const [dari, setDari] = React.useState('')
  const [sampai, setSampai] = React.useState('')
  const [q, setQ] = React.useState('')
  const [partnerFilter, setPartnerFilter] = React.useState<string>('all')

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.inventaris.penjualanMitraList({
        partnerId: partnerFilter === 'all' ? '' : partnerFilter,
        dari,
        sampai,
        q,
      })
      setList(res as SalesTx[])
    } catch (e: any) {
      toast.error('Gagal memuat penjualan mitra', { description: e.message })
    } finally {
      setLoading(false)
    }
  }, [partnerFilter, dari, sampai, q])

  React.useEffect(() => { load() }, [load])

  // Fetch partners list on mount for the filter dropdown
  React.useEffect(() => {
    api.mitra
      .list()
      .then((p) => setPartners(p as PartnerRow[]))
      .catch((e) => toast.error('Gagal memuat daftar mitra', { description: e.message }))
  }, [])

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
    setPartnerFilter('all')
  }

  const openCreate = async () => {
    setPartnerId('')
    setItemRows([{ wasteItemId: '', source: '', pricePerUnit: '', quantity: '' }])
    setNotes('')
    setDialogOpen(true)
    try {
      const [p, inv] = await Promise.all([api.mitra.list(), api.inventaris.stok()])
      setPartners(p as PartnerRow[])
      setInventory(inv as StokRow[])
    } catch (e: any) {
      toast.error('Gagal memuat data mitra & stok', { description: e.message })
    }
  }

  // Find inventory row + selected source for a given item row
  const findInv = (wasteItemId: string) => inventory.find((it) => it.wasteItemId === wasteItemId)
  const findSource = (inv: StokRow | undefined, source: string) =>
    inv?.bySource.find((s) => s.source === source)

  const hargaBeliForRow = (row: MitraItemRow): number => {
    if (!row.source) return 0
    if (row.source === 'sedekah') return 0
    const inv = findInv(row.wasteItemId)
    return toNumber(inv?.hargaAcuan)
  }
  const availableStockForRow = (row: MitraItemRow): number => {
    if (!row.wasteItemId || !row.source) return 0
    return toNumber(findSource(findInv(row.wasteItemId), row.source)?.stock)
  }

  const updateRow = (idx: number, field: keyof MitraItemRow, val: string) => {
    setItemRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)))
    // When wasteItem is selected: auto-pick source (prefer 'nabung') + pre-fill harga jual with harga acuan
    if (field === 'wasteItemId' && val) {
      const inv = inventory.find((it) => it.wasteItemId === val)
      const sources = (inv?.bySource ?? []).filter((s) => toNumber(s.stock) > 0)
      const nabung = sources.find((s) => s.source === 'nabung')
      const firstSrc = nabung ?? sources[0] ?? null
      const hargaAcuan = toNumber(inv?.hargaAcuan)
      setItemRows((prev) => prev.map((r, i) => (i === idx ? {
        ...r,
        source: firstSrc?.source ?? '',
        pricePerUnit: String(hargaAcuan || 0),
        quantity: '',
      } : r)))
    }
  }
  const addRow = () => setItemRows((p) => [...p, { wasteItemId: '', source: '', pricePerUnit: '', quantity: '' }])
  const removeRow = (idx: number) => setItemRows((p) => p.filter((_, i) => i !== idx))

  const totalWeight = itemRows.reduce((s, r) => s + (parseFloat(r.quantity) || 0), 0)
  const totalJual = itemRows.reduce((s, r) => {
    const price = parseFloat(r.pricePerUnit) || 0
    const qty = parseFloat(r.quantity) || 0
    return s + price * qty
  }, 0)
  const totalModal = itemRows.reduce((s, r) => {
    const qty = parseFloat(r.quantity) || 0
    return s + hargaBeliForRow(r) * qty
  }, 0)
  const totalMargin = totalJual - totalModal
  const totalMarginPersen = totalModal > 0 ? (totalMargin / totalModal) * 100 : 0
  const anyRowError = itemRows.some((r) => {
    if (!r.wasteItemId || !r.source || !r.quantity) return false
    const qty = parseFloat(r.quantity) || 0
    return qty > availableStockForRow(r)
  })
  const anyNegativeMargin = itemRows.some((r) => {
    if (!r.pricePerUnit || !r.quantity) return false
    const qty = parseFloat(r.quantity) || 0
    return qty > 0 && (parseFloat(r.pricePerUnit) || 0) < hargaBeliForRow(r)
  })

  const submit = async () => {
    if (!partnerId) {
      toast.error('Pilih mitra terlebih dahulu')
      return
    }
    const cleanItems = itemRows
      .filter((r) => r.wasteItemId && r.quantity)
      .map((r) => ({
        wasteItemId: r.wasteItemId,
        source: r.source,
        pricePerUnit: parseFloat(r.pricePerUnit) || 0,
        quantity: parseFloat(r.quantity),
      }))
    if (cleanItems.length === 0) {
      toast.error('Minimal 1 item harus diisi')
      return
    }
    if (cleanItems.some((r) => !r.source)) {
      toast.error('Setiap item harus memilih sumber stok (nabung/sedekah)')
      return
    }
    if (anyRowError) {
      toast.error('Jumlah melebihi stok tersedia untuk salah satu item')
      return
    }
    setSubmitting(true)
    try {
      await api.inventaris.penjualanMitraCreate({
        partnerId,
        items: cleanItems,
        notes: notes || undefined,
      })
      toast.success('Penjualan ke mitra berhasil dibuat', {
        description: `${formatNumber(totalWeight, 2)} kg · ${formatRupiah(totalJual)}`,
      })
      setDialogOpen(false)
      load()
    } catch (e: any) {
      toast.error('Gagal membuat penjualan', { description: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-emerald-100">
      <CardHeader className="border-b border-emerald-100/70">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-emerald-900">
              <Truck className="h-5 w-5 text-emerald-600" />
              Penjualan ke Mitra
            </CardTitle>
            <CardDescription className="text-emerald-700/70">
              Jual sampah mentah ke mitra pengepul. Stok gudang akan berkurang otomatis.
            </CardDescription>
          </div>
          <Button onClick={openCreate} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700">
            <Plus className="h-4 w-4" /> Buat Penjualan
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Filter bar */}
        <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
          <div className="w-52">
            <Label className="text-xs text-zinc-500">Mitra</Label>
            <Select value={partnerFilter} onValueChange={setPartnerFilter}>
              <SelectTrigger className="h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Mitra</SelectItem>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
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
          <div className="w-56">
            <Label className="text-xs text-zinc-500">Cari Mitra/Item</Label>
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyFilters()
              }}
              placeholder="Nama mitra / item..."
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
          {(dari || sampai || q || partnerFilter !== 'all') && (
            <div className="ml-auto text-xs text-emerald-800">
              Aktif: <span className="font-medium">{dari || '…'} — {sampai || '…'}</span>
              {partnerFilter !== 'all' && ` · mitra: ${partners.find((p) => p.id === partnerFilter)?.name ?? partnerFilter}`}
              {q && ` · "${q}"`}
            </div>
          )}
        </div>

        {loading ? (
          <TableSkeleton rows={6} />
        ) : list.length === 0 ? (
          <EmptyState message="Belum ada transaksi penjualan ke mitra" />
        ) : (
          (() => {
            // Period totals (computed client-side from enriched list)
            const sumBeli = list.reduce((s, tx) => s + toNumber(tx.totalBeliNasabah), 0)
            const sumJual = list.reduce((s, tx) => s + toNumber(tx.totalJualMitra ?? tx.totalValue), 0)
            const sumMargin = list.reduce((s, tx) => s + toNumber(tx.totalMargin), 0)
            const sumMarginPersen = sumBeli > 0 ? (sumMargin / sumBeli) * 100 : 0
            const anyLoss = list.some((tx) => tx.isProfit === false)
            const periodProfit = sumMargin >= 0
            return (
              <>
                {/* Summary: period totals */}
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-3">
                    <p className="text-[11px] text-amber-700/80">Modal (Beli ke Nasabah)</p>
                    <p className="text-sm font-bold text-amber-900">{formatRupiah(sumBeli)}</p>
                  </div>
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
                    <p className="text-[11px] text-emerald-700/80">Jual ke Mitra</p>
                    <p className="text-sm font-bold text-emerald-900">{formatRupiah(sumJual)}</p>
                  </div>
                  <div className={cn(
                    'rounded-lg border p-3',
                    periodProfit ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50',
                  )}>
                    <p className={cn('text-[11px]', periodProfit ? 'text-emerald-700/80' : 'text-rose-700/80')}>Margin/Laba</p>
                    <p className={cn('text-sm font-bold', periodProfit ? 'text-emerald-900' : 'text-rose-900')}>
                      {formatRupiah(sumMargin)}
                    </p>
                  </div>
                  <div className={cn(
                    'rounded-lg border p-3',
                    periodProfit ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50',
                  )}>
                    <p className={cn('text-[11px]', periodProfit ? 'text-emerald-700/80' : 'text-rose-700/80')}>Margin %</p>
                    <p className={cn('text-sm font-bold', periodProfit ? 'text-emerald-900' : 'text-rose-900')}>
                      {sumMarginPersen.toFixed(2)}%
                    </p>
                  </div>
                </div>

                {/* Warning if any transaction is loss */}
                {anyLoss && (
                  <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                    <span>
                      Ada transaksi penjualan mitra yang <span className="font-bold">RUGI</span> — harga jual ke mitra lebih rendah dari harga beli ke nasabah. Tinjau kembali harga jual.
                    </span>
                  </div>
                )}

                {/* Transaction cards */}
                <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                  {list.map((tx) => {
                    const txBeli = toNumber(tx.totalBeliNasabah)
                    const txJual = toNumber(tx.totalJualMitra ?? tx.totalValue)
                    const txMargin = toNumber(tx.totalMargin)
                    const txMarginPersen = toNumber(tx.totalMarginPersen)
                    const profit = tx.isProfit !== false
                    return (
                      <Collapsible key={tx.id}>
                        <div className={cn(
                          'rounded-lg border p-3 transition-colors',
                          profit ? 'border-emerald-100 bg-white' : 'border-rose-200 bg-rose-50/30',
                        )}>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-emerald-900">{tx.partner?.name ?? '-'}</span>
                                <span className="text-[11px] text-emerald-700/60">· {tx.partner?.type}</span>
                                {profit ? (
                                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                    <TrendingUp className="mr-1 h-3 w-3" /> Untung
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                                    <TrendingDown className="mr-1 h-3 w-3" /> Rugi
                                  </Badge>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-emerald-700/70">
                                {formatDateTime(tx.transactedAt)} · {formatNumber(toNumber(tx.totalWeight), 2)} kg · {tx.items?.length ?? 0} item
                              </p>
                            </div>
                            <CollapsibleTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              >
                                <ChevronDown className="h-3.5 w-3.5" /> Detail
                              </Button>
                            </CollapsibleTrigger>
                          </div>

                          {/* Margin breakdown row */}
                          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <div className="rounded-md border border-amber-100 bg-amber-50/40 p-2">
                              <p className="text-[11px] text-amber-700/80">Modal (Beli ke Nasabah)</p>
                              <p className="text-sm font-bold text-amber-900">{formatRupiah(txBeli)}</p>
                            </div>
                            <div className="rounded-md border border-emerald-100 bg-emerald-50/40 p-2">
                              <p className="text-[11px] text-emerald-700/80">Jual ke Mitra</p>
                              <p className="text-sm font-bold text-emerald-900">{formatRupiah(txJual)}</p>
                            </div>
                            <div className={cn(
                              'rounded-md border p-2',
                              profit ? 'border-emerald-100 bg-emerald-50/40' : 'border-rose-100 bg-rose-50/40',
                            )}>
                              <p className={cn('text-[11px]', profit ? 'text-emerald-700/80' : 'text-rose-700/80')}>Margin/Laba</p>
                              <p className={cn('text-sm font-bold', profit ? 'text-emerald-900' : 'text-rose-900')}>
                                {formatRupiah(txMargin)}
                              </p>
                            </div>
                            <div className={cn(
                              'rounded-md border p-2',
                              profit ? 'border-emerald-100 bg-emerald-50/40' : 'border-rose-100 bg-rose-50/40',
                            )}>
                              <p className={cn('text-[11px]', profit ? 'text-emerald-700/80' : 'text-rose-700/80')}>Margin %</p>
                              <p className={cn('text-sm font-bold', profit ? 'text-emerald-900' : 'text-rose-900')}>
                                {txMarginPersen.toFixed(2)}%
                              </p>
                            </div>
                          </div>

                          {/* Item-level breakdown (expandable) */}
                          <CollapsibleContent>
                            <div className="mt-3 overflow-x-auto rounded-lg border border-emerald-100">
                              <Table>
                                <TableHeader className="bg-emerald-50/70">
                                  <TableRow className="border-emerald-100 hover:bg-transparent">
                                    <TableHead className="text-emerald-800">Kode</TableHead>
                                    <TableHead className="text-emerald-800">Nama</TableHead>
                                    <TableHead className="text-right text-emerald-800">Qty</TableHead>
                                    <TableHead className="text-right text-emerald-800">Hrg Beli/kg</TableHead>
                                    <TableHead className="text-right text-emerald-800">Hrg Jual/kg</TableHead>
                                    <TableHead className="text-right text-emerald-800">Margin/kg</TableHead>
                                    <TableHead className="text-right text-emerald-800">Sub. Beli</TableHead>
                                    <TableHead className="text-right text-emerald-800">Sub. Jual</TableHead>
                                    <TableHead className="text-right text-emerald-800">Margin</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {(tx.items ?? []).map((it) => {
                                    const itMargin = toNumber(it.margin)
                                    const itProfit = it.isProfit !== false
                                    const itHrgBeli = toNumber(it.hargaBeliNasabah ?? it.pricePerUnit)
                                    const itHrgJual = toNumber(it.hargaJualMitra ?? it.pricePerUnit)
                                    const itMarginPerUnit = toNumber(it.marginPerUnit ?? (itHrgJual - itHrgBeli))
                                    return (
                                      <TableRow key={it.id} className="border-emerald-50">
                                        <TableCell className="font-mono text-xs text-emerald-700">{it.itemCodeSnapshot}</TableCell>
                                        <TableCell className="font-medium text-emerald-900">
                                          {it.itemNameSnapshot}
                                          {it.categoryNameSnapshot && (
                                            <span className="block text-[11px] text-emerald-700/60">{it.categoryNameSnapshot}</span>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-right text-emerald-900">
                                          {formatNumber(toNumber(it.quantity), 2)} {it.unitSnapshot}
                                        </TableCell>
                                        <TableCell className="text-right text-amber-700/80">{formatRupiah(itHrgBeli)}</TableCell>
                                        <TableCell className="text-right text-emerald-700/80">{formatRupiah(itHrgJual)}</TableCell>
                                        <TableCell className={cn('text-right font-medium', itProfit ? 'text-emerald-700' : 'text-rose-700')}>
                                          {formatRupiah(itMarginPerUnit)}
                                        </TableCell>
                                        <TableCell className="text-right text-amber-700/80">{formatRupiah(it.subtotalBeli ?? it.subtotal)}</TableCell>
                                        <TableCell className="text-right text-emerald-700/80">{formatRupiah(it.subtotalJual ?? it.subtotal)}</TableCell>
                                        <TableCell className={cn('text-right font-bold', itProfit ? 'text-emerald-900' : 'text-rose-900')}>
                                          {formatRupiah(itMargin)}
                                        </TableCell>
                                      </TableRow>
                                    )
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                            {tx.notes && (
                              <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
                                <p className="text-xs text-emerald-700/70">Catatan</p>
                                <p className="mt-1 text-sm text-emerald-900">{tx.notes}</p>
                              </div>
                            )}
                            <p className="mt-2 text-xs text-emerald-700/60">Dibuat oleh: {tx.createdBy?.name ?? '-'}</p>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    )
                  })}
                </div>
              </>
            )
          })()
        )}
      </CardContent>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl lg:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-900">
              <Truck className="h-5 w-5 text-emerald-600" /> Buat Penjualan ke Mitra
            </DialogTitle>
            <DialogDescription>
              Pilih mitra, tambah item sampah, atur harga & jumlah.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-emerald-800">Mitra</Label>
                <Select value={partnerId} onValueChange={setPartnerId}>
                  <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Pilih mitra pengepul..." /></SelectTrigger>
                  <SelectContent>
                    {partners.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} <span className="text-emerald-600/60">· {p.type}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="bg-emerald-100" />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-emerald-800">Item Sampah</Label>
                <Button size="sm" variant="outline" onClick={addRow} className="h-7 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  <Plus className="h-3.5 w-3.5" /> Tambah Item
                </Button>
              </div>
              <div className="space-y-2">
                {itemRows.map((row, idx) => {
                  const qty = parseFloat(row.quantity) || 0
                  const hargaJual = parseFloat(row.pricePerUnit) || 0
                  const hargaBeli = hargaBeliForRow(row)
                  const availableStock = availableStockForRow(row)
                  const inv = findInv(row.wasteItemId)
                  const sources = (inv?.bySource ?? []).filter((s) => toNumber(s.stock) > 0)
                  const subtotalJual = hargaJual * qty
                  const subtotalBeli = hargaBeli * qty
                  const margin = subtotalJual - subtotalBeli
                  const qtyExceedsStock = row.wasteItemId && row.source && qty > availableStock
                  const negativeMargin = qty > 0 && row.pricePerUnit !== '' && hargaJual < hargaBeli
                  return (
                    <div key={idx} className="space-y-2 rounded-lg border border-emerald-100 bg-emerald-50/30 p-3">
                      {/* Row 1: Barang + Sumber + Remove */}
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_220px_auto] sm:items-end">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-emerald-700/70">Barang Sampah</Label>
                          <Select value={row.wasteItemId} onValueChange={(v) => updateRow(idx, 'wasteItemId', v)}>
                            <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Pilih barang..." /></SelectTrigger>
                            <SelectContent>
                              {inventory
                                .filter((it) => toNumber(it.totalStock) > 0)
                                .map((it) => (
                                  <SelectItem key={it.wasteItemId} value={it.wasteItemId}>
                                    {it.wasteItem.code} · {it.wasteItem.name} (Stok: {formatNumber(toNumber(it.totalStock), 2)} kg)
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-emerald-700/70">Sumber Stok</Label>
                          <Select
                            value={row.source}
                            onValueChange={(v) => updateRow(idx, 'source', v)}
                            disabled={!row.wasteItemId}
                          >
                            <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Pilih sumber..." /></SelectTrigger>
                            <SelectContent>
                              {sources.map((s) => (
                                <SelectItem key={s.source} value={s.source}>
                                  {s.source === 'nabung' ? 'Nabung (dari nasabah)' : 'Sedekah (donasi)'} ({formatNumber(toNumber(s.stock), 2)} kg)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeRow(idx)}
                          disabled={itemRows.length === 1}
                          className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                          title="Hapus baris"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Row 2: prices & qty & subtotals */}
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:items-end">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-emerald-700/70">Harga Beli/kg</Label>
                          <div
                            className={cn(
                              'flex h-9 items-center rounded-md border px-3 text-xs font-medium',
                              row.source === 'sedekah'
                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                : 'border-zinc-200 bg-zinc-50 text-zinc-600',
                            )}
                          >
                            {row.source === 'sedekah'
                              ? 'Rp 0 (donasi)'
                              : row.source === 'nabung'
                                ? formatRupiah(hargaBeli)
                                : '—'}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-emerald-700/70">Harga Jual/kg</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="1"
                            placeholder="0"
                            value={row.pricePerUnit}
                            onChange={(e) => updateRow(idx, 'pricePerUnit', e.target.value)}
                            className="bg-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-emerald-700/70">Jumlah (kg)</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={row.quantity}
                            onChange={(e) => updateRow(idx, 'quantity', e.target.value)}
                            className={cn('bg-white', qtyExceedsStock && 'border-rose-300 focus-visible:ring-rose-200')}
                          />
                          <p className="text-[10px] text-emerald-700/60">Max: {formatNumber(availableStock, 2)} kg</p>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-emerald-700/70">Subtotal Jual</Label>
                          <div className="flex h-9 items-center rounded-md border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-900">
                            {formatRupiah(subtotalJual)}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-emerald-700/70">Margin</Label>
                          <div
                            className={cn(
                              'flex h-9 items-center rounded-md border px-3 text-sm font-bold',
                              margin >= 0
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : 'border-rose-200 bg-rose-50 text-rose-800',
                            )}
                          >
                            {formatRupiah(margin)}
                          </div>
                        </div>
                      </div>

                      {/* Validation errors / warnings */}
                      {qtyExceedsStock && (
                        <p className="text-xs text-rose-600">⚠ Jumlah melebihi stok tersedia untuk sumber ini!</p>
                      )}
                      {!qtyExceedsStock && negativeMargin && (
                        <p className="text-xs text-rose-600">⚠ Harga jual lebih rendah dari harga beli!</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Summary totals */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
                <p className="text-xs text-emerald-700/70">Total Berat</p>
                <p className="text-lg font-bold text-emerald-900">{formatNumber(totalWeight, 2)} kg</p>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-3">
                <p className="text-xs text-amber-700/80">Total Modal (Beli)</p>
                <p className="text-lg font-bold text-amber-900">{formatRupiah(totalModal)}</p>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
                <p className="text-xs text-emerald-700/80">Total Pendapatan (Jual)</p>
                <p className="text-lg font-bold text-emerald-900">{formatRupiah(totalJual)}</p>
              </div>
              <div className={cn(
                'rounded-lg border p-3',
                totalMargin >= 0
                  ? 'border-emerald-200 bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                  : 'border-rose-200 bg-rose-100 text-rose-900',
              )}>
                <p className={cn('text-xs', totalMargin >= 0 ? 'text-emerald-50/90' : 'text-rose-700/80')}>
                  Total Margin{totalModal > 0 ? ` (${totalMarginPersen.toFixed(1)}%)` : ''}
                </p>
                <p className="text-lg font-bold">{formatRupiah(totalMargin)}</p>
              </div>
            </div>

            {anyNegativeMargin && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <span>⚠ Ada item dengan harga jual lebih rendah dari harga beli. Tinjau kembali harga jual.</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="mitra-notes" className="text-emerald-800">Catatan</Label>
              <Textarea
                id="mitra-notes"
                placeholder="Catatan opsional..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button
              onClick={submit}
              disabled={submitting || anyRowError}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Penjualan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ----------------------------------------------------------------------------
// 4. PENJUALAN PRODUK
// ----------------------------------------------------------------------------
interface ProdukItemRow { productId: string; pricePerUnit: string; quantity: string }

function PenjualanProdukTab() {
  const [list, setList] = React.useState<ProductSaleTx[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [viewing, setViewing] = React.useState<ProductSaleTx | null>(null)
  const [viewOpen, setViewOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  const [products, setProducts] = React.useState<ProductRow[]>([])
  const [buyerName, setBuyerName] = React.useState('')
  const [buyerPhone, setBuyerPhone] = React.useState('')
  const [paymentMethod, setPaymentMethod] = React.useState<'cash' | 'transfer'>('cash')
  const [itemRows, setItemRows] = React.useState<ProdukItemRow[]>([{ productId: '', pricePerUnit: '', quantity: '' }])

  // ---- Filter state ----
  const [dariInput, setDariInput] = React.useState('')
  const [sampaiInput, setSampaiInput] = React.useState('')
  const [qInput, setQInput] = React.useState('')
  const [dari, setDari] = React.useState('')
  const [sampai, setSampai] = React.useState('')
  const [q, setQ] = React.useState('')
  const [methodFilter, setMethodFilter] = React.useState<string>('all') // 'all' | 'cash' | 'transfer'

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.inventaris.penjualanProdukList({
        paymentMethod: methodFilter === 'all' ? '' : methodFilter,
        dari,
        sampai,
        q,
      })
      setList(res as ProductSaleTx[])
    } catch (e: any) {
      toast.error('Gagal memuat penjualan produk', { description: e.message })
    } finally {
      setLoading(false)
    }
  }, [methodFilter, dari, sampai, q])

  React.useEffect(() => { load() }, [load])

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
    setMethodFilter('all')
  }

  const openCreate = async () => {
    setBuyerName('')
    setBuyerPhone('')
    setPaymentMethod('cash')
    setItemRows([{ productId: '', pricePerUnit: '', quantity: '' }])
    setDialogOpen(true)
    try {
      const p = await api.produk.list()
      setProducts(p as ProductRow[])
    } catch (e: any) {
      toast.error('Gagal memuat daftar produk', { description: e.message })
    }
  }

  const updateRow = (idx: number, field: keyof ProdukItemRow, val: string) => {
    setItemRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)))
    if (field === 'productId' && val) {
      const p = products.find((x) => x.id === val)
      const price = p?.prices?.[0]?.pricePerUnit ?? p?.price ?? 0
      setItemRows((prev) => prev.map((r, i) => (i === idx ? { ...r, pricePerUnit: String(toNumber(price)) } : r)))
    }
  }
  const addRow = () => setItemRows((p) => [...p, { productId: '', pricePerUnit: '', quantity: '' }])
  const removeRow = (idx: number) => setItemRows((p) => p.filter((_, i) => i !== idx))

  const grandTotal = itemRows.reduce((s, r) => {
    return s + (parseFloat(r.pricePerUnit) || 0) * (parseFloat(r.quantity) || 0)
  }, 0)
  const totalQty = itemRows.reduce((s, r) => s + (parseFloat(r.quantity) || 0), 0)

  const submit = async () => {
    if (!buyerName.trim() || !buyerPhone.trim()) {
      toast.error('Nama & telepon pembeli wajib diisi')
      return
    }
    const cleanItems: { productId: string; pricePerUnit: number; quantity: number }[] = []
    for (const r of itemRows) {
      if (!r.productId || !r.quantity) continue
      const qty = parseFloat(r.quantity)
      const product = products.find((p) => p.id === r.productId)
      const stock = toNumber(product?.stock ?? 0)
      if (qty > stock) {
        toast.error(`Jumlah melebihi stok untuk ${product?.name ?? 'produk'}`, {
          description: `Stok tersedia: ${formatNumber(stock, 0)}`,
        })
        return
      }
      cleanItems.push({
        productId: r.productId,
        pricePerUnit: parseFloat(r.pricePerUnit) || 0,
        quantity: qty,
      })
    }
    if (cleanItems.length === 0) {
      toast.error('Minimal 1 item harus diisi')
      return
    }
    setSubmitting(true)
    try {
      await api.inventaris.penjualanProdukCreate({
        items: cleanItems,
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim(),
        paymentMethod,
      })
      toast.success('Penjualan produk berhasil dibuat', {
        description: `${formatNumber(totalQty, 0)} item · ${formatRupiah(grandTotal)}`,
      })
      setDialogOpen(false)
      load()
    } catch (e: any) {
      toast.error('Gagal membuat penjualan produk', { description: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-emerald-100">
      <CardHeader className="border-b border-emerald-100/70">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-emerald-900">
              <ShoppingBag className="h-5 w-5 text-emerald-600" />
              Penjualan Produk
            </CardTitle>
            <CardDescription className="text-emerald-700/70">
              Jual produk upcycle ke pelanggan. Stok produk akan berkurang otomatis.
            </CardDescription>
          </div>
          <Button onClick={openCreate} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700">
            <Plus className="h-4 w-4" /> Buat Penjualan
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Filter bar */}
        <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
          <div className="w-40">
            <Label className="text-xs text-zinc-500">Metode Bayar</Label>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
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
          <div className="w-56">
            <Label className="text-xs text-zinc-500">Cari Pembeli</Label>
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyFilters()
              }}
              placeholder="Nama / telepon pembeli..."
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
          {(dari || sampai || q || methodFilter !== 'all') && (
            <div className="ml-auto text-xs text-emerald-800">
              Aktif: <span className="font-medium">{dari || '…'} — {sampai || '…'}</span>
              {methodFilter !== 'all' && ` · ${methodFilter}`}
              {q && ` · "${q}"`}
            </div>
          )}
        </div>

        {loading ? (
          <TableSkeleton rows={6} />
        ) : list.length === 0 ? (
          <EmptyState message="Belum ada transaksi penjualan produk" />
        ) : (
          <div className="max-h-[480px] overflow-auto rounded-lg border border-emerald-100/70">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-emerald-50/95 backdrop-blur">
                <TableRow className="border-emerald-100 hover:bg-transparent">
                  <TableHead className="text-emerald-800">Tanggal</TableHead>
                  <TableHead className="text-emerald-800">Pembeli</TableHead>
                  <TableHead className="text-emerald-800">Telepon</TableHead>
                  <TableHead className="text-right text-emerald-800">Total Qty</TableHead>
                  <TableHead className="text-right text-emerald-800">Total Nilai</TableHead>
                  <TableHead className="text-center text-emerald-800">Metode</TableHead>
                  <TableHead className="text-right text-emerald-800">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((tx) => (
                  <TableRow key={tx.id} className="border-emerald-50">
                    <TableCell className="text-emerald-900">{formatDateTime(tx.transactedAt)}</TableCell>
                    <TableCell className="font-medium text-emerald-900">{tx.buyerName}</TableCell>
                    <TableCell className="text-emerald-700/80">{tx.buyerPhone || '-'}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-900">
                      {formatNumber(toNumber(tx.totalQuantity), 0)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-900">
                      {formatRupiah(tx.totalValue)}
                    </TableCell>
                    <TableCell className="text-center">
                      {tx.paymentMethod === 'transfer' ? (
                        <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100">Transfer</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Cash</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => { setViewing(tx); setViewOpen(true) }}
                      >
                        <Eye className="h-3.5 w-3.5" /> Lihat
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl lg:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-900">
              <ShoppingBag className="h-5 w-5 text-emerald-600" /> Buat Penjualan Produk
            </DialogTitle>
            <DialogDescription>
              Isi data pembeli dan item produk yang dibeli.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="buyer-name" className="text-emerald-800">Nama Pembeli</Label>
                <Input
                  id="buyer-name"
                  placeholder="Nama pembeli..."
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="buyer-phone" className="text-emerald-800">Telepon</Label>
                <Input
                  id="buyer-phone"
                  placeholder="08xxxx"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-emerald-800">Metode Bayar</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'cash' | 'transfer')}>
                  <SelectTrigger className="w-full bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="bg-emerald-100" />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-emerald-800">Item Produk</Label>
                <Button size="sm" variant="outline" onClick={addRow} className="h-7 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  <Plus className="h-3.5 w-3.5" /> Tambah Item
                </Button>
              </div>
              <div className="space-y-2">
                {itemRows.map((row, idx) => {
                  const subtotal = (parseFloat(row.pricePerUnit) || 0) * (parseFloat(row.quantity) || 0)
                  const product = products.find((p) => p.id === row.productId)
                  const stock = toNumber(product?.stock ?? 0)
                  const qty = parseFloat(row.quantity) || 0
                  const overStock = row.productId && qty > stock
                  return (
                    <div key={idx} className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_100px_120px_auto] sm:items-end">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-emerald-700/70">Produk</Label>
                          <Select value={row.productId} onValueChange={(v) => updateRow(idx, 'productId', v)}>
                            <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Pilih produk..." /></SelectTrigger>
                            <SelectContent>
                              {products.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} <span className="text-emerald-600/60">· stok {formatNumber(toNumber(p.stock), 0)}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-emerald-700/70">Harga</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="1"
                            placeholder="0"
                            value={row.pricePerUnit}
                            onChange={(e) => updateRow(idx, 'pricePerUnit', e.target.value)}
                            className="bg-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-emerald-700/70">Jumlah</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="1"
                            placeholder="0"
                            value={row.quantity}
                            onChange={(e) => updateRow(idx, 'quantity', e.target.value)}
                            className={`bg-white ${overStock ? 'border-rose-400 focus-visible:ring-rose-300' : ''}`}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-emerald-700/70">Subtotal</Label>
                          <div className="flex h-9 items-center rounded-md border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-900">
                            {formatRupiah(subtotal)}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeRow(idx)}
                          disabled={itemRows.length === 1}
                          className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                          title="Hapus baris"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {overStock && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600">
                          <AlertTriangle className="h-3 w-3" /> Jumlah melebihi stok tersedia ({formatNumber(stock, 0)})
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
                <p className="text-xs text-emerald-700/70">Total Qty</p>
                <p className="text-lg font-bold text-emerald-900">{formatNumber(totalQty, 0)}</p>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-gradient-to-br from-emerald-500 to-teal-600 p-3 text-white">
                <p className="text-xs text-emerald-50/90">Grand Total</p>
                <p className="text-lg font-bold">{formatRupiah(grandTotal)}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button
              onClick={submit}
              disabled={submitting}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Penjualan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-900">
              <Eye className="h-5 w-5 text-emerald-600" /> Detail Penjualan Produk
            </DialogTitle>
            <DialogDescription>
              {viewing ? formatDateTime(viewing.transactedAt) : ''}
            </DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
                  <p className="text-xs text-emerald-700/70">Pembeli</p>
                  <p className="text-sm font-bold text-emerald-900">{viewing.buyerName}</p>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
                  <p className="text-xs text-emerald-700/70">Telepon</p>
                  <p className="text-sm font-bold text-emerald-900">{viewing.buyerPhone || '-'}</p>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
                  <p className="text-xs text-emerald-700/70">Metode</p>
                  <p className="text-sm font-bold capitalize text-emerald-900">{viewing.paymentMethod}</p>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
                  <p className="text-xs text-emerald-700/70">Status</p>
                  <p className="text-sm font-bold capitalize text-emerald-900">{viewing.paymentStatus}</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-emerald-100">
                <Table>
                  <TableHeader className="bg-emerald-50/70">
                    <TableRow className="border-emerald-100 hover:bg-transparent">
                      <TableHead className="text-emerald-800">Produk</TableHead>
                      <TableHead className="text-right text-emerald-800">Harga</TableHead>
                      <TableHead className="text-right text-emerald-800">Qty</TableHead>
                      <TableHead className="text-right text-emerald-800">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewing.items.map((it) => (
                      <TableRow key={it.id} className="border-emerald-50">
                        <TableCell className="font-medium text-emerald-900">{it.productNameSnapshot}</TableCell>
                        <TableCell className="text-right text-emerald-700/80">{formatRupiah(it.pricePerUnitSnapshot)}</TableCell>
                        <TableCell className="text-right text-emerald-900">
                          {formatNumber(toNumber(it.quantity), 0)} {it.unitSnapshot}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-emerald-900">{formatRupiah(it.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-emerald-100 bg-gradient-to-br from-emerald-500 to-teal-600 p-3 text-white">
                <div>
                  <p className="text-xs text-emerald-50/90">Total Nilai</p>
                  <p className="text-lg font-bold">{formatRupiah(viewing.totalValue)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-emerald-50/90">Total Qty</p>
                  <p className="text-lg font-bold">{formatNumber(toNumber(viewing.totalQuantity), 0)}</p>
                </div>
              </div>
              <p className="text-xs text-emerald-700/60">Dibuat oleh: {viewing.createdBy?.name ?? '-'}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ----------------------------------------------------------------------------
// Main module
// ----------------------------------------------------------------------------
export function Inventaris() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="stok" className="w-full">
        <TabsList className="h-auto flex-wrap gap-1 bg-emerald-100/60 p-1">
          <TabsTrigger
            value="stok"
            className="data-[state=active]:bg-white data-[state=active]:text-emerald-900 data-[state=active]:shadow-sm"
          >
            <Warehouse className="h-4 w-4" /> Stok Gudang
          </TabsTrigger>
          <TabsTrigger
            value="pengolahan"
            className="data-[state=active]:bg-white data-[state=active]:text-emerald-900 data-[state=active]:shadow-sm"
          >
            <Factory className="h-4 w-4" /> Pengolahan
          </TabsTrigger>
          <TabsTrigger
            value="mitra"
            className="data-[state=active]:bg-white data-[state=active]:text-emerald-900 data-[state=active]:shadow-sm"
          >
            <Truck className="h-4 w-4" /> Penjualan Mitra
          </TabsTrigger>
          <TabsTrigger
            value="produk"
            className="data-[state=active]:bg-white data-[state=active]:text-emerald-900 data-[state=active]:shadow-sm"
          >
            <ShoppingBag className="h-4 w-4" /> Penjualan Produk
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stok">
          <StokGudangTab />
        </TabsContent>
        <TabsContent value="pengolahan">
          <PengolahanTab />
        </TabsContent>
        <TabsContent value="mitra">
          <PenjualanMitraTab />
        </TabsContent>
        <TabsContent value="produk">
          <PenjualanProdukTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
