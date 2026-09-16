'use client'
// trigger rebuild
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
  Printer,
  Handshake,
  Users,
  Phone,
  Mail,
  MapPin,
  Edit2,
  ArrowRight,
  Pencil,
  Sparkles,
} from 'lucide-react'
import { printStruk } from '@/lib/print-struk'

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
import { Switch } from '@/components/ui/switch'
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
  email?: string | null
  notes?: string | null
}

interface StokBySource {
  source: string
  stock: number
  id?: string
  hargaBeliNasabah?: number
}
interface StokRow {
  jenisSampahId: string
  jenisSampah: WasteItemRow
  totalStock: number
  hargaAcuan?: number
  bySource: StokBySource[]
}

interface ProcessingInputItem {
  id: string
  jenisSampahId: string
  itemCodeSnapshot: string
  itemNameSnapshot: string
  categoryNameSnapshot: string
  unitSnapshot: string
  quantity: string | number
  source?: string
  hargaSatuan?: string | number
  subtotal?: string | number
  jenisSampah?: WasteItemRow
}
interface ProcessingOutputItem {
  id: string
  produkId: string
  productNameSnapshot: string
  unitSnapshot: string
  quantity: string | number
  produk?: ProductRow
}
interface BiayaPengolahanItem {
  id?: string
  kategori: string
  keterangan: string
  jumlah: string | number
}
interface ProcessingTx {
  id: string
  totalInputWeight: string | number
  totalHppBahanBaku?: string | number
  totalBiayaOperasional?: string | number
  totalBiayaProduksi?: string | number
  status?: string
  notes?: string | null
  transactedAt: string
  createdBy?: { name: string } | null
  inputs: ProcessingInputItem[]
  outputs: ProcessingOutputItem[]
  biayaItems?: BiayaPengolahanItem[]
}

interface SalesTxItem {
  id: string
  jenisSampahId: string
  itemCodeSnapshot: string
  itemNameSnapshot: string
  categoryNameSnapshot: string
  unitSnapshot: string
  pricePerUnit: string | number
  quantity: string | number
  subtotal: string | number
  jenisSampah?: WasteItemRow
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
  invoiceNumber?: string | null
  mitraId: string
  totalWeight: string | number
  totalValue: string | number
  notes?: string | null
  transactedAt: string
  mitra?: PartnerRow
  items: SalesTxItem[]
  createdBy?: { name: string } | null
  // Margin detail (added in API update)
  totalBeliNasabah?: string | number
  totalJualMitra?: string | number
  totalMargin?: string | number
  totalMarginPersen?: string | number
  isProfit?: boolean
}

interface ItemPenjualanProduk {
  id: string
  produkId: string
  productNameSnapshot: string
  unitSnapshot: string
  pricePerUnitSnapshot: string | number
  quantity: string | number
  subtotal: string | number
  produk?: ProductRow
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
  items: ItemPenjualanProduk[]
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
                    <TableRow key={row.jenisSampahId} className="border-emerald-50">
                      <TableCell className="font-mono text-xs text-emerald-700">{row.jenisSampah?.code ?? '-'}</TableCell>
                      <TableCell className="font-medium text-emerald-900">{row.jenisSampah?.name ?? '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-emerald-200 text-emerald-700">
                          {row.jenisSampah?.category?.name ?? '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-emerald-700/80">{row.jenisSampah?.unit ?? 'kg'}</TableCell>
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
interface InputRow { jenisSampahId: string; source: string; quantity: string }
interface OutputRow {
  produkId: string
  quantity: string
}

interface RecipeRow {
  id: string
  produkId: string
  productName: string
  productUnit: string
  jenisSampahId: string
  wasteItemName: string
  wasteItemCode: string
  wasteItemUnit: string
  quantityPerUnit: number
  source: string
  isActive: boolean
  notes: string | null
  currentStock?: number
  maxProducible?: number
  stockStatus?: 'tersedia' | 'rendah' | 'kosong'
}

function PengolahanTab() {
  const [list, setList] = React.useState<ProcessingTx[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [viewing, setViewing] = React.useState<ProcessingTx | null>(null)
  const [viewOpen, setViewOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [recipeOpen, setRecipeOpen] = React.useState(false)
  const [recipes, setRecipes] = React.useState<RecipeRow[]>([])

  const [jenisSampahs, setWasteItems] = React.useState<WasteItemRow[]>([])
  const [produks, setProducts] = React.useState<ProductRow[]>([])
  const [inventaris, setInventory] = React.useState<StokRow[]>([])

  const [inputs, setInputs] = React.useState<InputRow[]>([{ jenisSampahId: '', source: '', quantity: '' }])
  const [outputs, setOutputs] = React.useState<OutputRow[]>([{ produkId: '', quantity: '' }])
  const [biayaItems, setBiayaItems] = React.useState<BiayaPengolahanItem[]>([])
  const [notes, setNotes] = React.useState('')
  const [selectedRecipeProductId, setSelectedRecipeProductId] = React.useState('')

  // Load recipes
  const loadRecipes = React.useCallback(async () => {
    try {
      const res = await fetch('/api/inventaris/resep')
      if (res.ok) {
        const data = await res.json()
        setRecipes(data as RecipeRow[])
      }
    } catch {}
  }, [])

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
      if (Array.isArray(w)) setWasteItems(w as WasteItemRow[])
      if (Array.isArray(p)) setProducts(p as ProductRow[])
    } catch (e: any) {
      console.error('Gagal memuat katalog bahan & produk', e)
    }
  }, [])

  const loadInventory = React.useCallback(async () => {
    try {
      const inv = await api.inventaris.stok()
      if (Array.isArray(inv)) setInventory(inv as StokRow[])
    } catch (e: any) {
      console.error('Gagal memuat stok gudang', e)
    }
  }, [])

  React.useEffect(() => {
    load()
    loadCatalog()
    loadRecipes()
    loadInventory()
  }, [load, loadCatalog, loadRecipes, loadInventory])

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
    setSelectedRecipeProductId('')
    setInputs([{ jenisSampahId: '', source: '', quantity: '' }])
    setOutputs([{ produkId: '', quantity: '' }])
    setBiayaItems([])
    setNotes('')
    setDialogOpen(true)
    // Refresh data in background
    loadCatalog()
    loadRecipes()
    loadInventory()
  }

  // Resep yang sudah dikelompokkan per produk untuk fitur Pakai Resep
  const groupedActiveRecipes = React.useMemo(() => {
    const map = new Map<string, { produkId: string; productName: string; items: RecipeRow[] }>()
    recipes.filter((r) => r.isActive).forEach((r) => {
      if (!map.has(r.produkId)) {
        map.set(r.produkId, {
          produkId: r.produkId,
          productName: r.productName || produks.find((p) => p.id === r.produkId)?.name || 'Produk',
          items: [],
        })
      }
      map.get(r.produkId)!.items.push(r)
    })
    return Array.from(map.values())
  }, [recipes, produks])

  // Terapkan resep tersimpan ke form pengolahan (bisa 1 produk maupun gabungan multi-produk)
  const applyRecipeToForm = (produkId: string) => {
    if (!produkId || produkId === '_empty') return
    const recipeItems = recipes.filter((r) => r.produkId === produkId && r.isActive)
    if (recipeItems.length === 0) {
      toast.error('Resep tidak ditemukan atau tidak aktif untuk produk ini')
      return
    }

    // Blok jika ada bahan baku yang kosong
    const hasKosong = recipeItems.some((r) => r.stockStatus === 'kosong')
    if (hasKosong) {
      toast.error('Gagal memuat resep', {
        description: 'Terdapat bahan baku yang stoknya kosong.'
      })
      return
    }

    const prod = produks.find((p) => p.id === produkId)
    setSelectedRecipeProductId(produkId)

    // Cek apakah form output saat ini masih kosong
    const isFirstOutputEmpty = outputs.length === 1 && (!outputs[0].produkId || outputs[0].produkId === '')

    let newOutputs: OutputRow[] = []

    if (isFirstOutputEmpty) {
      // Form masih kosong: isi produk pertama
      newOutputs = [{ produkId, quantity: '1' }]
      setOutputs(newOutputs)
      recalculateInputsFromOutputs(newOutputs, false)
      toast.success(`Resep Diterapkan: ${prod?.name || 'Produk'}`, {
        description: `Produk & bahan baku terisi otomatis (1 pcs). Klik resep lain untuk menggabungkan ke batch ini.`,
      })
    } else {
      // Cek apakah produk ini sudah ada di daftar output
      const existingIdx = outputs.findIndex((o) => o.produkId === produkId)
      if (existingIdx >= 0) {
        // Tambah kuantitas produk yang sudah ada +1
        newOutputs = outputs.map((o, idx) => {
          if (idx === existingIdx) {
            const cur = parseFloat(o.quantity) || 0
            return { ...o, quantity: String(cur + 1) }
          }
          return o
        })
        setOutputs(newOutputs)
        recalculateInputsFromOutputs(newOutputs, false)
        toast.info(`Jumlah ${prod?.name} Ditambah (+1 pcs)`, {
          description: `Total takaran bahan baku otomatis dihitung ulang.`,
        })
      } else {
        // Tambahkan sebagai produk ke-2 (atau ke-N) dalam 1 batch pengolahan (Multi-Produk)
        newOutputs = [...outputs, { produkId, quantity: '1' }]
        setOutputs(newOutputs)
        recalculateInputsFromOutputs(newOutputs, false)
        toast.success(`Produk Ditambahkan ke Batch: ${prod?.name || 'Produk'}`, {
          description: `Batch pengolahan kini menghasilkan ${newOutputs.length} jenis produk dengan bahan baku terakumulasi.`,
        })
      }
    }
  }

  // Find inventaris item by jenisSampahId
  const findInv = (jenisSampahId: string) => inventaris.find((i) => i.jenisSampahId === jenisSampahId)
  // Find source stock for a jenisSampahId + source
  const findSourceStock = (jenisSampahId: string, source: string) => {
    const inv = findInv(jenisSampahId)
    if (!inv) return 0
    if (source === 'all' || !source) return inv.totalStock
    return inv.bySource.find((s) => s.source === source)?.stock ?? 0
  }
  // Get harga beli for a source (0 for sedekah, hargaAcuan for nabung)
  const getHargaBeli = (jenisSampahId: string, source: string) => {
    const inv = findInv(jenisSampahId)
    if (!inv) return 0
    if (source === 'sedekah') return 0
    return inv.hargaAcuan ?? 0
  }
  // Get available sources for a jenisSampahId (only those with stock > 0)
  const getAvailableSources = (jenisSampahId: string) => {
    const inv = findInv(jenisSampahId)
    if (!inv) return []
    return inv.bySource.filter((s) => s.stock > 0)
  }

  const updateInput = (idx: number, field: keyof InputRow, val: string) => {
    setInputs((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)))
    // Auto-select source when jenisSampahId is chosen
    if (field === 'jenisSampahId' && val) {
      const sources = getAvailableSources(val)
      const autoSource = sources.find((s) => s.source === 'nabung')?.source || sources[0]?.source || ''
      setInputs((prev) => prev.map((r, i) => (i === idx ? { ...r, source: autoSource, quantity: '' } : r)))
    }
  }
  const addInput = () => setInputs((p) => [...p, { jenisSampahId: '', source: '', quantity: '' }])
  const removeInput = (idx: number) => setInputs((p) => p.filter((_, i) => i !== idx))

  const recalculateInputsFromOutputs = (currentOutputs: OutputRow[], showToast = false) => {
    // Cek apakah ada minimal 1 resep aktif dari produk yang dipilih
    const activeRecipesFound = currentOutputs.some((out) =>
      recipes.some((r) => r.produkId === out.produkId && r.isActive)
    )

    if (!activeRecipesFound) return

    const inputMap = new Map<string, number>()
    let recipesApplied = 0

    currentOutputs.forEach((out) => {
      if (!out.produkId) return
      const rawQty = out.quantity
      const outQtyCalc = rawQty === '' || rawQty === '0' ? 1 : parseFloat(rawQty) || 0

      const productRecipes = recipes.filter((r) => r.produkId === out.produkId && r.isActive)
      productRecipes.forEach((r) => {
        recipesApplied++
        const key = `${r.jenisSampahId}_${r.source || 'nabung'}`
        const currentVal = inputMap.get(key) || 0
        inputMap.set(key, currentVal + (toNumber(r.quantityPerUnit) * outQtyCalc))
      })
    })

    if (inputMap.size > 0) {
      const newInputs = Array.from(inputMap.entries()).map(([key, totalQty]) => {
        const [jenisSampahId, source] = key.split('_')
        return {
          jenisSampahId,
          source,
          quantity: String(Number(totalQty.toFixed(2))),
        }
      })
      
      // Gunakan requestAnimationFrame atau microtask agar tidak terjadi render cycle conflict 
      // (meskipun di React 18 setState dari timeout/event handler sudah dibatch)
      queueMicrotask(() => {
        setInputs(newInputs)
        if (showToast && recipesApplied > 0) {
          toast.info(`Akumulasi Resep: ${newInputs.length} jenis bahan baku dihitung ulang`, {
            description: 'Sistem otomatis menjumlahkan kebutuhan bahan baku berdasarkan seluruh produk hasil Anda.',
          })
        }
      })
    }
  }

  const updateOutput = (idx: number, field: keyof OutputRow, val: string) => {
    setOutputs((prev) => {
      const newOutputs = prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r))
      if (field === 'produkId' || field === 'quantity') {
        recalculateInputsFromOutputs(newOutputs, field === 'produkId' && !!val)
      }
      return newOutputs
    })
  }
  const addOutput = () => setOutputs((p) => [...p, { produkId: '', quantity: '' }])
  const removeOutput = (idx: number) => {
    setOutputs((prev) => {
      const newOutputs = prev.filter((_, i) => i !== idx)
      recalculateInputsFromOutputs(newOutputs)
      return newOutputs
    })
  }

  const addBiaya = () => setBiayaItems((p) => [...p, { kategori: 'tenaga_kerja', keterangan: '', jumlah: '' }])
  const updateBiaya = (idx: number, field: keyof BiayaPengolahanItem, val: string) => {
    setBiayaItems((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)))
  }
  const removeBiaya = (idx: number) => setBiayaItems((p) => p.filter((_, i) => i !== idx))

  const totalInputWeight = inputs.reduce((s, r) => s + (parseFloat(r.quantity) || 0), 0)
  const totalOutputQty = outputs.reduce((s, r) => s + (parseFloat(r.quantity) || 0), 0)

  const submit = async () => {
    const cleanInputs = inputs
      .filter((r) => r.jenisSampahId && r.quantity && r.source)
      .map((r) => ({ jenisSampahId: r.jenisSampahId, quantity: parseFloat(r.quantity), source: r.source }))
    const cleanOutputs = outputs
      .filter((r) => r.produkId && r.quantity)
      .map((r) => ({ produkId: r.produkId, quantity: parseFloat(r.quantity) }))

    if (cleanInputs.length === 0) {
      toast.error('Minimal 1 bahan baku harus diisi')
      return
    }
    if (cleanOutputs.length === 0) {
      toast.error('Minimal 1 produk hasil harus diisi')
      return
    }

    // Pre-submit validation: check if any required quantity exceeds stock
    let hasError = false
    for (const inp of cleanInputs) {
      const stock = findSourceStock(inp.jenisSampahId, inp.source || 'nabung')
      if (inp.quantity > stock) {
        toast.error('Stok bahan baku tidak mencukupi', {
          description: `Kebutuhan melebihi stok yang tersedia.`,
        })
        hasError = true
        break
      }
    }
    if (hasError) return

    setSubmitting(true)
    try {
      await api.inventaris.pengolahanCreate({
        inputs: cleanInputs,
        outputs: cleanOutputs,
        biayaItems: biayaItems,
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
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                loadCatalog()
                loadRecipes()
                loadInventory()
                setRecipeOpen(true)
              }}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <Layers className="h-4 w-4" /> Pengaturan Resep
            </Button>
            <Button onClick={openCreate} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700">
              <Plus className="h-4 w-4" /> Buat Pengolahan
            </Button>
          </div>
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
          <div className="max-h-[520px] overflow-auto rounded-lg border border-emerald-100/70 shadow-sm">
            <Table className="min-w-[1020px] w-full table-fixed">
              <TableHeader className="sticky top-0 z-10 bg-emerald-50/95 backdrop-blur border-b border-emerald-100">
                <TableRow className="border-emerald-100 hover:bg-transparent">
                  <TableHead className="w-[150px] text-emerald-800 font-semibold">Tanggal</TableHead>
                  <TableHead className="w-[280px] text-emerald-800 font-semibold">Bahan Baku (Jenis Sampah)</TableHead>
                  <TableHead className="w-[110px] text-right text-emerald-800 font-semibold">Total Input</TableHead>
                  <TableHead className="w-[280px] text-emerald-800 font-semibold">Produk Hasil</TableHead>
                  <TableHead className="w-[110px] text-right text-emerald-800 font-semibold">Total Output</TableHead>
                  <TableHead className="w-[120px] text-emerald-800 font-semibold">Dibuat oleh</TableHead>
                  <TableHead className="w-[90px] text-right text-emerald-800 font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((tx) => {
                  const totalOutputQty = (tx.outputs ?? []).reduce((s: number, o: any) => s + toNumber(o.quantity), 0)
                  return (
                    <TableRow key={tx.id} className="border-emerald-50 hover:bg-emerald-50/40 transition-colors">
                      <TableCell className="text-xs text-emerald-950 font-medium whitespace-nowrap align-top py-3">
                        {formatDateTime(tx.transactedAt)}
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {(tx.inputs ?? []).map((inp: any, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-50/80 px-2 py-0.5 text-[11px] font-medium text-emerald-800 border border-emerald-200/60"
                            >
                              <span className="truncate max-w-[140px]">{inp.itemNameSnapshot}</span>
                              <span className="font-bold text-emerald-700">
                                {formatNumber(toNumber(inp.quantity), 0)} {inp.unitSnapshot || 'kg'}
                              </span>
                            </span>
                          ))}
                          {(!tx.inputs || tx.inputs.length === 0) && <span className="text-xs text-zinc-400">-</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold text-emerald-900 whitespace-nowrap align-top py-3">
                        {formatNumber(toNumber(tx.totalInputWeight), 2)} kg
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {(tx.outputs ?? []).map((out: any, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded-md bg-teal-50/80 px-2 py-0.5 text-[11px] font-medium text-teal-800 border border-teal-200/60"
                            >
                              <span className="truncate max-w-[140px]">{out.productNameSnapshot}</span>
                              <span className="font-bold text-teal-700">
                                {formatNumber(toNumber(out.quantity), 0)} {out.unitSnapshot || 'pcs'}
                              </span>
                            </span>
                          ))}
                          {(!tx.outputs || tx.outputs.length === 0) && <span className="text-xs text-zinc-400">-</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold text-teal-900 whitespace-nowrap align-top py-3">
                        {formatNumber(totalOutputQty, 0)} pcs
                      </TableCell>
                      <TableCell className="text-xs text-zinc-600 whitespace-nowrap align-top py-3">
                        {tx.createdBy?.name ?? '-'}
                      </TableCell>
                      <TableCell className="text-right align-top py-2.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 text-xs font-medium"
                          onClick={() => { setViewing(tx); setViewOpen(true) }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Lihat
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
            {/* Banner: Gunakan Resep yang Sudah Dibuat */}
            <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50/30 p-3.5 shadow-xs">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                    <Sparkles className="size-4.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-950">Gunakan Formula Resep Tersimpan</span>
                      <span className="rounded-full border border-emerald-300 bg-emerald-100/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                        {groupedActiveRecipes.length} Resep Siap Pakai
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700/80">
                      Pilih produk untuk otomatis mengisi takaran bahan baku &amp; produk hasil sesuai formula.
                    </p>
                  </div>
                </div>

                {/* Dropdown Selector + Reset */}
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedRecipeProductId}
                    onValueChange={(prodId) => applyRecipeToForm(prodId)}
                  >
                    <SelectTrigger className="h-9 w-full sm:w-64 bg-white border-emerald-300 text-xs font-semibold text-emerald-950 shadow-xs focus:ring-emerald-500">
                      <SelectValue placeholder="⚡ Tambah / Pakai Resep..." />
                    </SelectTrigger>
                    <SelectContent>
                      {groupedActiveRecipes.length === 0 ? (
                        <SelectItem value="_empty" disabled>Belum ada resep aktif</SelectItem>
                      ) : (
                        groupedActiveRecipes.map((gr) => (
                          <SelectItem key={gr.produkId} value={gr.produkId} className="text-xs">
                            <div className="flex items-center justify-between gap-3 w-full">
                              <span className="font-semibold text-emerald-900">{gr.productName}</span>
                              <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                {gr.items.length} bahan
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {outputs.some((o) => o.produkId) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setInputs([{ jenisSampahId: '', source: '', quantity: '' }])
                        setOutputs([{ produkId: '', quantity: '' }])
                        setSelectedRecipeProductId('')
                        toast.info('Form pengolahan telah di-reset')
                      }}
                      className="h-9 text-xs text-zinc-500 hover:text-rose-600 hover:bg-rose-50"
                      title="Kosongkan form untuk mulai baru"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              {/* Quick Chips untuk Terapkan Resep dalam 1 Klik */}
              {groupedActiveRecipes.length > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-emerald-200/60 pt-2">
                  <span className="text-[10px] font-semibold text-emerald-800/70">Klik untuk Gabung ke Batch:</span>
                  {groupedActiveRecipes.map((gr) => {
                    const existingOutput = outputs.find((o) => o.produkId === gr.produkId)
                    const isSelected = !!existingOutput
                    const qty = existingOutput ? parseFloat(existingOutput.quantity) || 0 : 0
                    return (
                      <button
                        key={gr.produkId}
                        type="button"
                        onClick={() => applyRecipeToForm(gr.produkId)}
                        className={cn(
                          "rounded-md border px-2 py-0.5 text-[11px] font-medium transition-all active:scale-95 flex items-center gap-1",
                          isSelected
                            ? "border-emerald-600 bg-emerald-600 text-white shadow-xs font-semibold"
                            : "border-emerald-200 bg-white text-emerald-800 hover:border-emerald-400 hover:bg-emerald-50"
                        )}
                        title={isSelected ? `Klik untuk tambah jumlah ${gr.productName} (+1 pcs)` : `Klik untuk tambah ${gr.productName} ke batch`}
                      >
                        <Sparkles className="size-2.5" />
                        <span>{gr.productName}</span>
                        {isSelected ? (
                          <span className="rounded bg-emerald-700/80 px-1 text-[9px] text-emerald-100">
                            {qty} pcs
                          </span>
                        ) : (
                          <span className="text-[9px] text-emerald-500">
                            ({gr.items.length} bahan)
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Inputs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-emerald-800 font-semibold">Bahan Baku (Input)</Label>
                  {selectedRecipeProductId && (
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="size-2.5 text-emerald-600" /> Terisi Dari Resep
                    </span>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={addInput} disabled={!!selectedRecipeProductId} className="h-7 border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-30">
                  <Plus className="h-3.5 w-3.5" /> Tambah Input
                </Button>
              </div>
              <div className="space-y-2">
                {inputs.map((row, idx) => {
                  const availableStock = findSourceStock(row.jenisSampahId, row.source)
                  const hargaBeli = getHargaBeli(row.jenisSampahId, row.source)
                  const qty = parseFloat(row.quantity) || 0
                  const modalBahan = hargaBeli * qty
                  const exceedsStock = row.jenisSampahId && row.source && qty > availableStock
                  return (
                    <div key={idx} className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-3">
                      {/* Row 1: Sumber Stok + Barang + Remove */}
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[160px_1fr_auto] sm:items-end">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-emerald-700/70">Sumber Stok</Label>
                          <Select 
                            value={row.source} 
                            onValueChange={(v) => {
                              setInputs((prev) => prev.map((r, i) => i === idx ? {
                                ...r,
                                source: v,
                                jenisSampahId: '',
                                quantity: ''
                              } : r))
                            }}
                            disabled={!!selectedRecipeProductId}
                          >
                            <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Pilih sumber..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nabung">Nabung</SelectItem>
                              <SelectItem value="sedekah">Sedekah</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-emerald-700/70">Bahan Baku Gudang</Label>
                          <Select 
                            value={row.jenisSampahId} 
                            onValueChange={(v) => {
                              setInputs((prev) => prev.map((r, i) => i === idx ? {
                                ...r,
                                jenisSampahId: v,
                                quantity: ''
                              } : r))
                            }}
                            disabled={!row.source || !!selectedRecipeProductId}
                          >
                            <SelectTrigger className="w-full bg-white">
                              <SelectValue placeholder={row.source ? "Pilih bahan baku..." : "Pilih sumber stok dulu..."} />
                            </SelectTrigger>
                            <SelectContent>
                              {inventaris.length === 0 && jenisSampahs.length === 0 ? (
                                <SelectItem value="_loading" disabled>Memuat stok gudang...</SelectItem>
                              ) : inventaris.length === 0 ? (
                                <SelectItem value="_empty" disabled>Gudang kosong</SelectItem>
                              ) : (
                                inventaris
                                  .map((inv) => {
                                    const stock = inv.bySource?.find(s => s.source === row.source)?.stock || 0
                                    let status = 'Tersedia'
                                    if (stock === 0) status = 'Kosong'
                                    else if (stock < 10) status = 'Stok Rendah'
                                    
                                    return (
                                      <SelectItem key={inv.jenisSampahId} value={inv.jenisSampahId} disabled={stock === 0}>
                                        {inv.jenisSampah.code} · {inv.jenisSampah.name} ({status}: {formatNumber(stock, 0)} kg)
                                      </SelectItem>
                                    )
                                  })
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeInput(idx)}
                          disabled={inputs.length === 1 || !!selectedRecipeProductId}
                          className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
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
                            disabled={!!selectedRecipeProductId}
                          />
                          {row.jenisSampahId && row.source && (
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
                  const produk = produks.find((p) => p.id === row.produkId)
                  const hargaJual = produk ? toNumber(produk.price) : 0
                  const outQty = parseFloat(row.quantity) || 0
                  const totalNilaiJual = hargaJual * outQty
                  const productUnit = produk?.unit || 'pcs'
                  return (
                    <div key={idx} className="rounded-lg border border-teal-100 bg-teal-50/30 p-3">
                      {/* Row 1: Produk/Jumlah/Remove */}
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_auto] sm:items-end">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-teal-700/70">Produk Hasil</Label>
                            {(() => {
                              const pRecipes = recipes.filter((r) => r.produkId === row.produkId && r.isActive)
                              if (pRecipes.length === 0) return null
                              return (
                                <span className="text-[10px] font-semibold text-teal-700 bg-teal-100/70 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Sparkles className="size-2.5 text-teal-600" /> Formula: {pRecipes.length} bahan baku
                                </span>
                              )
                            })()}
                          </div>
                          <Select value={row.produkId} onValueChange={(v) => updateOutput(idx, 'produkId', v)}>
                            <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Pilih produk hasil..." /></SelectTrigger>
                            <SelectContent>
                              {produks.length === 0 ? (
                                <SelectItem value="_loading" disabled>Memuat daftar produk...</SelectItem>
                              ) : (
                                produks.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name} <span className="text-teal-600/60">· stok {formatNumber(toNumber(p.stock), 0)} · {formatRupiah(toNumber(p.price))}</span>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-teal-700/70">Jumlah ({productUnit})</Label>
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

                      {/* Row 2: Harga Jual + Total Nilai Jual */}
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-end">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-teal-700/70">
                            Harga Jual/{productUnit} (dari master produk)
                          </Label>
                          <div className="flex h-9 items-center rounded-md border border-teal-200 bg-teal-50 px-3 text-sm font-medium text-teal-900">
                            {row.produkId ? formatRupiah(hargaJual) : '—'}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-teal-700/70">Total Nilai Jual</Label>
                          <div className="flex h-9 items-center rounded-md border border-teal-200 bg-teal-50 px-3 text-sm font-bold text-teal-900">
                            {row.produkId && outQty > 0 ? formatRupiah(totalNilaiJual) : 'Rp 0'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <Separator className="bg-emerald-100" />

            {/* Biaya Produksi */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-emerald-800">Biaya Operasional Produksi</Label>
                  <p className="text-xs text-zinc-500">Catat biaya tambahan (upah, lem, listrik, dll)</p>
                </div>
                <Button size="sm" variant="outline" onClick={addBiaya} className="h-8 border-emerald-300 text-emerald-700">
                  <Plus className="mr-1 h-3.5 w-3.5" /> Tambah Biaya
                </Button>
              </div>

              {biayaItems.length === 0 ? (
                <div className="rounded border border-dashed border-zinc-200 bg-zinc-50 p-4 text-center text-sm text-zinc-500">
                  Tidak ada biaya tambahan.
                </div>
              ) : (
                <div className="space-y-2 rounded-lg border border-emerald-50 bg-emerald-50/20 p-3">
                  {biayaItems.map((row, idx) => (
                    <div key={idx} className="flex flex-col gap-2 rounded border border-emerald-100 bg-white p-3 sm:flex-row sm:items-end">
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-xs text-emerald-700">Kategori</Label>
                        <Select value={row.kategori} onValueChange={(v) => updateBiaya(idx, 'kategori', v)}>
                          <SelectTrigger className="h-9 border-emerald-100 bg-emerald-50/30">
                            <SelectValue placeholder="Pilih..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tenaga_kerja">Tenaga Kerja / Upah</SelectItem>
                            <SelectItem value="bahan_pendukung">Bahan Pendukung (Lem, Benang, dll)</SelectItem>
                            <SelectItem value="transportasi">Transportasi</SelectItem>
                            <SelectItem value="listrik">Listrik / Air</SelectItem>
                            <SelectItem value="lainnya">Lainnya</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-[2] space-y-1.5">
                        <Label className="text-xs text-emerald-700">Keterangan</Label>
                        <Input
                          placeholder="Mis: Upah jahit 2 orang"
                          value={row.keterangan}
                          onChange={(e) => updateBiaya(idx, 'keterangan', e.target.value)}
                          className="h-9 border-emerald-100 bg-emerald-50/30"
                        />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-xs text-emerald-700">Jumlah (Rp)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={row.jumlah}
                          onChange={(e) => updateBiaya(idx, 'jumlah', e.target.value)}
                          className="h-9 border-emerald-100 bg-emerald-50/30 font-medium"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBiaya(idx)}
                        className="h-9 w-9 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                        title="Hapus biaya"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator className="bg-emerald-100" />

            {/* Summary + notes */}
            {(() => {
              const totalModalBahan = inputs.reduce((s, r) => {
                const hb = getHargaBeli(r.jenisSampahId, r.source)
                return s + hb * (parseFloat(r.quantity) || 0)
              }, 0)
              const totalBiayaOperasional = biayaItems.reduce((s, r) => s + (parseFloat(String(r.jumlah)) || 0), 0)
              const totalBiayaProduksi = totalModalBahan + totalBiayaOperasional
              
              const totalNilaiJual = outputs.reduce((s, r) => {
                const p = produks.find((pp) => pp.id === r.produkId)
                return s + (p ? toNumber(p.price) * (parseFloat(r.quantity) || 0) : 0)
              }, 0)
              const estUntung = totalNilaiJual - totalBiayaProduksi
              return (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
                    <p className="text-xs text-emerald-700/70">Total Berat Input</p>
                    <p className="text-lg font-bold text-emerald-900">{formatNumber(totalInputWeight, 2)} kg</p>
                  </div>
                  <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-3">
                    <p className="text-xs text-amber-700/70">Biaya Produksi (HPP)</p>
                    <p className="text-lg font-bold text-amber-900">{formatRupiah(totalBiayaProduksi)}</p>
                    <p className="text-[10px] text-amber-700/70">Bahan: {formatRupiah(totalModalBahan)} | Ops: {formatRupiah(totalBiayaOperasional)}</p>
                  </div>
                  <div className="rounded-lg border border-teal-100 bg-teal-50/40 p-3">
                    <p className="text-xs text-teal-700/70">Total Output & Nilai Jual</p>
                    <p className="text-lg font-bold text-teal-900">{formatNumber(totalOutputQty, 0)} pcs</p>
                    <p className="text-xs text-teal-600">{formatRupiah(totalNilaiJual)}</p>
                  </div>
                  <div className={cn('rounded-lg border p-3', estUntung >= 0 ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/60')}>
                    <p className={cn('text-xs', estUntung >= 0 ? 'text-emerald-700/70' : 'text-rose-700/70')}>Estimasi Laba</p>
                    <p className={cn('text-lg font-bold', estUntung >= 0 ? 'text-emerald-900' : 'text-rose-900')}>{formatRupiah(estUntung)}</p>
                    {totalBiayaProduksi > 0 && (
                      <p className={cn('text-[10px]', estUntung >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                        Margin {((estUntung / totalNilaiJual) * 100).toFixed(0)}%
                      </p>
                    )}
                    {totalBiayaProduksi === 0 && totalNilaiJual > 0 && (
                      <p className="text-[10px] text-emerald-600">Full profit (bahan sedekah, 0 biaya)</p>
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

      {/* === RESEP PENGOLAHAN MODAL === */}
      <RecipeSettingsDialog
        open={recipeOpen}
        onOpenChange={setRecipeOpen}
        recipes={recipes}
        produks={produks}
        jenisSampahs={jenisSampahs}
        inventaris={inventaris}
        onRefresh={() => {
          loadRecipes()
          loadCatalog()
          loadInventory()
        }}
      />

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
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
                  <p className="text-xs text-emerald-700/70">Total Berat Input</p>
                  <p className="text-lg font-bold text-emerald-900">{formatNumber(toNumber(viewing.totalInputWeight), 2)} kg</p>
                </div>
                <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-3">
                  <p className="text-xs text-amber-700/70">HPP Bahan Baku</p>
                  <p className="text-lg font-bold text-amber-900">{formatRupiah(toNumber(viewing.totalHppBahanBaku || 0))}</p>
                </div>
                <div className="rounded-lg border border-orange-100 bg-orange-50/40 p-3">
                  <p className="text-xs text-orange-700/70">Biaya Operasional</p>
                  <p className="text-lg font-bold text-orange-900">{formatRupiah(toNumber(viewing.totalBiayaOperasional || 0))}</p>
                </div>
                <div className="rounded-lg border border-teal-100 bg-teal-50/40 p-3">
                  <p className="text-xs text-teal-700/70">Jumlah Produk Output</p>
                  <p className="text-lg font-bold text-teal-900">{viewing.outputs.length}</p>
                </div>
              </div>

              {viewing.biayaItems && viewing.biayaItems.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-orange-800">Rincian Biaya Operasional</p>
                  <div className="overflow-hidden rounded-lg border border-orange-100">
                    <Table>
                      <TableHeader className="bg-orange-50/70">
                        <TableRow className="border-orange-100 hover:bg-transparent">
                          <TableHead className="text-orange-800">Kategori</TableHead>
                          <TableHead className="text-orange-800">Keterangan</TableHead>
                          <TableHead className="text-right text-orange-800">Jumlah (Rp)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewing.biayaItems.map((b) => (
                          <TableRow key={b.id || b.keterangan} className="border-orange-50">
                            <TableCell className="font-medium text-orange-900">
                              {b.kategori === 'tenaga_kerja' ? 'Tenaga Kerja' : 
                               b.kategori === 'bahan_pendukung' ? 'Bahan Pendukung' : 
                               b.kategori === 'transportasi' ? 'Transportasi' : 
                               b.kategori === 'listrik' ? 'Listrik / Air' : 'Lainnya'}
                            </TableCell>
                            <TableCell className="text-orange-700/80">{b.keterangan}</TableCell>
                            <TableCell className="text-right font-semibold text-orange-900">
                              {formatRupiah(toNumber(b.jumlah))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

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
// 2.5 RESEP PENGOLAHAN (Pengaturan otomatis: 1 produk = N kg bahan baku)
// ----------------------------------------------------------------------------
function RecipeSettingsDialog({
  open,
  onOpenChange,
  recipes,
  produks,
  jenisSampahs,
  inventaris,
  onRefresh,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  recipes: RecipeRow[]
  produks: ProductRow[]
  jenisSampahs: WasteItemRow[]
  inventaris?: StokRow[]
  onRefresh: () => void
}) {
  const [saving, setSaving] = React.useState(false)
  const [localProducts, setLocalProducts] = React.useState<ProductRow[]>(produks || [])
  const [localWasteItems, setLocalWasteItems] = React.useState<WasteItemRow[]>(jenisSampahs || [])
  const [localInventory, setLocalInventory] = React.useState<StokRow[]>(inventaris || [])
  const [loadingData, setLoadingData] = React.useState(false)

  // Sync props to local state
  React.useEffect(() => {
    if (produks && produks.length > 0) setLocalProducts(produks)
  }, [produks])

  React.useEffect(() => {
    if (jenisSampahs && jenisSampahs.length > 0) setLocalWasteItems(jenisSampahs)
  }, [jenisSampahs])

  React.useEffect(() => {
    if (inventaris && inventaris.length > 0) setLocalInventory(inventaris)
  }, [inventaris])

  // Self-heal: when modal opens, if items are empty, fetch automatically
  React.useEffect(() => {
    if (open) {
      if (localProducts.length === 0 || localWasteItems.length === 0 || localInventory.length === 0) {
        setLoadingData(true)
        Promise.all([
          api.barang.list().catch(() => []),
          api.produk.list().catch(() => []),
          api.inventaris.stok().catch(() => []),
        ])
          .then(([w, p, inv]) => {
            if (Array.isArray(w) && w.length > 0) setLocalWasteItems(w as WasteItemRow[])
            if (Array.isArray(p) && p.length > 0) setLocalProducts(p as ProductRow[])
            if (Array.isArray(inv) && inv.length > 0) setLocalInventory(inv as StokRow[])
          })
          .finally(() => {
            setLoadingData(false)
          })
      }
    }
  }, [open, localProducts.length, localWasteItems.length, localInventory.length])

  // Multi-ingredient recipe form state
  interface RecipeIngredientFormRow {
    jenisSampahId: string
    wasteQty: string
    source: string
  }

  const [fProductId, setFProductId] = React.useState('')
  const [fProductQty, setFProductQty] = React.useState('1')
  const [fIngredients, setFIngredients] = React.useState<RecipeIngredientFormRow[]>([
    { jenisSampahId: '', wasteQty: '1', source: 'nabung' }
  ])
  const [fNotes, setFNotes] = React.useState('')

  // Handle produk selection - if it already has recipes, prefill ingredients
  const handleProductChange = (prodId: string) => {
    setFProductId(prodId)
    const existing = recipes.filter((r) => r.produkId === prodId)
    if (existing.length > 0) {
      setFIngredients(
        existing.map((r) => ({
          jenisSampahId: r.jenisSampahId,
          wasteQty: String(Number(toNumber(r.quantityPerUnit).toFixed(4))),
          source: r.source || 'nabung',
        }))
      )
      setFProductQty('1')
      setFNotes(existing[0]?.notes || '')
      toast.info(`Memuat resep yang sudah ada (${existing.length} bahan baku)`, {
        description: 'Anda dapat menambah bahan baku lain (mix) atau mengubah takarannya.',
      })
    } else {
      setFIngredients([{ jenisSampahId: '', wasteQty: '1', source: 'nabung' }])
      setFProductQty('1')
      setFNotes('')
    }
  }

  const addIngredientRow = () => {
    setFIngredients((prev) => [...prev, { jenisSampahId: '', wasteQty: '1', source: 'nabung' }])
  }

  const removeIngredientRow = (idx: number) => {
    setFIngredients((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateIngredientRow = (idx: number, field: keyof RecipeIngredientFormRow, val: string) => {
    setFIngredients((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item)))
  }

  const submit = async () => {
    if (!fProductId) {
      toast.error('Produk hasil wajib dipilih')
      return
    }
    const pq = parseFloat(fProductQty) || 0
    if (pq <= 0) {
      toast.error('Jumlah produk hasil harus lebih dari 0')
      return
    }

    if (fIngredients.length === 0) {
      toast.error('Minimal 1 bahan baku harus diisi')
      return
    }

    for (let i = 0; i < fIngredients.length; i++) {
      const ing = fIngredients[i]
      if (!ing.jenisSampahId) {
        toast.error(`Pilih bahan baku pada baris ke-${i + 1}`)
        return
      }
      const wq = parseFloat(ing.wasteQty) || 0
      if (wq <= 0) {
        toast.error(`Jumlah bahan baku pada baris ke-${i + 1} harus lebih dari 0`)
        return
      }
    }

    // Cek duplikasi bahan baku
    const wasteIds = fIngredients.map((i) => i.jenisSampahId)
    if (new Set(wasteIds).size !== wasteIds.length) {
      toast.error('Terdapat bahan baku yang sama di beberapa baris. Silakan gabungkan takarannya.')
      return
    }

    setSaving(true)
    try {
      const itemsPayload = fIngredients.map((ing) => ({
        jenisSampahId: ing.jenisSampahId,
        quantityPerUnit: (parseFloat(ing.wasteQty) || 0) / pq,
        source: ing.source || 'nabung',
        isActive: true,
        notes: fNotes || undefined,
      }))

      const res = await fetch('/api/inventaris/resep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produkId: fProductId,
          items: itemsPayload,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan resep')

      const prodObj = localProducts.find((p) => p.id === fProductId)
      const ingSummary = fIngredients.map((ing) => {
        const wi = localWasteItems.find((w) => w.id === ing.jenisSampahId)
        return `${ing.wasteQty} ${wi?.unit || 'kg'} ${wi?.name || ''}`
      }).join(' + ')

      toast.success('Resep berhasil disimpan!', {
        description: `Formula: ${pq} ${prodObj?.unit || 'pcs'} ${prodObj?.name || ''} = ${ingSummary}`,
      })

      setFProductId('')
      setFIngredients([{ jenisSampahId: '', wasteQty: '1', source: 'nabung' }])
      setFProductQty('1')
      setFNotes('')
      onRefresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await fetch('/api/inventaris/resep', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !isActive }),
      })
      onRefresh()
      toast.success(isActive ? 'Bahan baku resep dinonaktifkan' : 'Bahan baku resep diaktifkan')
    } catch {
      toast.error('Gagal mengubah status resep')
    }
  }

  const deleteRecipe = async (id: string) => {
    if (!confirm('Hapus bahan baku ini dari resep?')) return
    try {
      await fetch(`/api/inventaris/resep?id=${id}`, { method: 'DELETE' })
      onRefresh()
      toast.success('Bahan resep dihapus')
    } catch {
      toast.error('Gagal menghapus resep')
    }
  }

  const deleteProductRecipe = async (prodId: string, prodName: string) => {
    if (!confirm(`Hapus seluruh formula resep untuk produk "${prodName}"?`)) return
    try {
      await fetch(`/api/inventaris/resep?produkId=${prodId}`, { method: 'DELETE' })
      onRefresh()
      toast.success(`Formula produk "${prodName}" dihapus`)
      if (fProductId === prodId) {
        setFProductId('')
        setFIngredients([{ jenisSampahId: '', wasteQty: '1', source: 'nabung' }])
      }
    } catch {
      toast.error('Gagal menghapus formula')
    }
  }

  // Load produk recipe into form for easy editing
  const loadProductIntoForm = (prodId: string) => {
    handleProductChange(prodId)
    toast.info('Formula dimuat ke form di atas', {
      description: 'Anda dapat menambah/mengurangi bahan baku atau mengubah takarannya.',
    })
  }

  // Group recipes by produk
  const groupedRecipes = React.useMemo(() => {
    const groups: {
      produkId: string
      productName: string
      productUnit: string
      items: RecipeRow[]
      allActive: boolean
    }[] = []

    recipes.forEach((r) => {
      let g = groups.find((x) => x.produkId === r.produkId)
      if (!g) {
        g = {
          produkId: r.produkId,
          productName: r.productName,
          productUnit: r.productUnit || 'pcs',
          items: [],
          allActive: true,
        }
        groups.push(g)
      }
      g.items.push(r)
      if (!r.isActive) g.allActive = false
    })

    return groups
  }, [recipes])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-900">
            <Layers className="h-5 w-5 text-emerald-600" /> Pengaturan Resep Pengolahan (Bisa Mix Bahan Baku)
          </DialogTitle>
          <DialogDescription>
            Atur komposisi bahan baku per produk. Anda bisa memadukan (mix) beberapa jenis bahan baku sekaligus (misal: 1 pcs Meja = 1 kg Multilayer + 1 kg Besi). Saat produk dipilih di menu Pengolahan, seluruh bahan otomatis terisi.
          </DialogDescription>
        </DialogHeader>

        {/* Form tambah resep */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-emerald-900">Form Pembuatan & Pengaturan Resep</p>
              <p className="text-xs text-emerald-700/80">Kombinasikan beberapa bahan baku sampah untuk menghasilkan produk daur ulang</p>
            </div>
            {fProductId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setFProductId('')
                  setFIngredients([{ jenisSampahId: '', wasteQty: '1', source: 'nabung' }])
                  setFProductQty('1')
                  setFNotes('')
                }}
                className="h-7 text-xs text-zinc-500 hover:text-zinc-800"
              >
                Reset Form
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-emerald-800">1. Produk Hasil (dari Master Produk)</Label>
              <Select value={fProductId} onValueChange={handleProductChange}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder={loadingData ? "Memuat produk..." : "Pilih produk..."} />
                </SelectTrigger>
                <SelectContent>
                  {localProducts.length === 0 ? (
                    <SelectItem value="_empty" disabled>
                      {loadingData ? 'Sedang memuat data...' : 'Belum ada data produk terdaftar'}
                    </SelectItem>
                  ) : (
                    localProducts.map((p) => {
                      const hasRec = recipes.some((r) => r.produkId === p.id)
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} {hasRec ? '⭐ (Sudah ada resep)' : ''}
                        </SelectItem>
                      )
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-emerald-800">
                2. Jumlah Produk Dihasilkan ({fProductId ? (localProducts.find((p) => p.id === fProductId)?.unit || 'pcs') : 'pcs'})
              </Label>
              <Input
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                placeholder="Contoh: 1"
                value={fProductQty}
                onChange={(e) => setFProductQty(e.target.value)}
                className="bg-white font-bold"
              />
            </div>
          </div>

          {/* Bahan Baku Section (Multi-Ingredients / Mix) */}
          <div className="space-y-2.5 rounded-lg border border-emerald-100 bg-white p-3.5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-50 pb-2">
              <div>
                <Label className="text-xs font-bold text-emerald-900">
                  3. Bahan Baku yang Dibutuhkan ({fIngredients.length} jenis bahan)
                </Label>
                <p className="text-[11px] text-emerald-600/80">
                  Gunakan tombol di samping untuk memadukan (mix) beberapa bahan baku sekaligus
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addIngredientRow}
                className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-medium"
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> + Tambah Bahan Baku (Mix)
              </Button>
            </div>

            <div className="space-y-2">
              {fIngredients.map((row, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50/70 p-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-800">
                    {idx + 1}
                  </span>

                  {/* Pilihan Sumber Stok */}
                  <div className="w-full sm:w-36">
                    <Select
                      value={row.source}
                      onValueChange={(val) => {
                        setFIngredients((prev) => prev.map((item, i) => i === idx ? {
                          ...item,
                          source: val,
                          jenisSampahId: ''
                        } : item))
                      }}
                    >
                      <SelectTrigger className="w-full bg-white h-9">
                        <SelectValue placeholder="Pilih sumber..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nabung">Nabung</SelectItem>
                        <SelectItem value="sedekah">Sedekah</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pilihan Bahan Baku */}
                  <div className="w-full sm:flex-1">
                    <Select
                      value={row.jenisSampahId}
                      onValueChange={(val) => {
                        setFIngredients((prev) => prev.map((item, i) => i === idx ? {
                          ...item,
                          jenisSampahId: val
                        } : item))
                      }}
                      disabled={!row.source}
                    >
                      <SelectTrigger className="w-full bg-white h-9">
                        <SelectValue placeholder={row.source ? "Pilih bahan baku..." : "Pilih sumber stok dulu..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {localWasteItems.length === 0 ? (
                          <SelectItem value="_empty" disabled>Belum ada bahan baku terdaftar</SelectItem>
                        ) : (
                          localWasteItems.map((w) => {
                            const inv = localInventory.find((i) => i.jenisSampahId === w.id)
                            const sources = inv ? (inv.bySource ?? []) : []
                            const stock = sources.find(s => s.source === row.source)?.stock || 0
                            return (
                              <SelectItem key={w.id} value={w.id}>
                                {w.code} · {w.name} (Stok: {formatNumber(stock, 0)} {w.unit || 'kg'})
                              </SelectItem>
                            )
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Input Jumlah */}
                  <div className="w-full sm:w-32">
                    <div className="relative">
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0.01"
                        step="0.01"
                        placeholder="Jumlah"
                        value={row.wasteQty}
                        onChange={(e) => updateIngredientRow(idx, 'wasteQty', e.target.value)}
                        className="bg-white h-9 font-bold pr-7"
                      />
                      <span className="absolute right-2 top-2 text-xs text-zinc-400 font-medium">
                        {row.jenisSampahId ? (localWasteItems.find((w) => w.id === row.jenisSampahId)?.unit || 'kg') : 'kg'}
                      </span>
                    </div>
                  </div>

                  {/* Tombol Hapus Baris */}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeIngredientRow(idx)}
                    disabled={fIngredients.length === 1}
                    className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 h-9 w-9 shrink-0"
                    title="Hapus bahan ini"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Formula Preview */}
            {fProductId && fIngredients.some((i) => i.jenisSampahId) && (
              <div className="mt-2 rounded-md border border-teal-200 bg-teal-50/70 p-2.5 text-xs text-teal-900">
                <span className="font-bold">✨ Simulasi Formula:</span>{' '}
                <span>
                  {fProductQty} {localProducts.find((p) => p.id === fProductId)?.unit || 'pcs'} {localProducts.find((p) => p.id === fProductId)?.name || ''}
                </span>{' '}
                <span className="font-bold text-teal-700">membutuhkan</span>{' '}
                <span className="font-semibold text-emerald-900">
                  {fIngredients.filter((i) => i.jenisSampahId).map((i) => {
                    const wi = localWasteItems.find((w) => w.id === i.jenisSampahId)
                    return `${i.wasteQty} ${wi?.unit || 'kg'} ${wi?.name || ''} (${i.source === 'sedekah' ? 'Sedekah' : 'Nabung'})`
                  }).join(' + ')}
                </span>
              </div>
            )}
          </div>

          <div className="mt-3 space-y-1.5">
            <Label className="text-xs text-emerald-700/70">Catatan Formula (opsional)</Label>
            <Input
              placeholder="Contoh: Meja menggunakan kombinasi multilayer dan besi..."
              value={fNotes}
              onChange={(e) => setFNotes(e.target.value)}
              className="bg-white h-9 text-xs"
            />
          </div>

          <Button
            onClick={submit}
            disabled={saving}
            className="mt-3 w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 font-semibold"
          >
            <Plus className="mr-2 h-4 w-4" />
            {saving ? 'Menyimpan Resep...' : `Simpan Resep (${fIngredients.filter((i) => i.jenisSampahId).length} Bahan Baku)`}
          </Button>
        </div>

        {/* Daftar resep */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-emerald-800">
              Daftar Formula Resep Terdaftar ({groupedRecipes.length} Produk)
            </p>
            <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-200">
              Total {recipes.length} Komposisi Bahan
            </Badge>
          </div>

          {groupedRecipes.length === 0 ? (
            <EmptyState message="Belum ada resep. Tambahkan resep di atas." />
          ) : (
            <div className="space-y-2.5">
              {groupedRecipes.map((g) => {
                const totalWeight = g.items.reduce((s, it) => s + toNumber(it.quantityPerUnit), 0)
                return (
                  <div key={g.produkId} className={cn(
                    'rounded-lg border p-3.5 transition-colors',
                    g.allActive ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-200 bg-gray-50/40'
                  )}>
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-emerald-100/60 pb-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-emerald-950">{g.productName}</span>
                          <Badge className={g.items.length > 1 ? 'bg-teal-100 text-teal-800 hover:bg-teal-100' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-100'}>
                            {g.items.length > 1 ? `Mix ${g.items.length} Bahan Baku` : '1 Bahan Baku'}
                          </Badge>
                          <Badge className={g.allActive ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : 'bg-amber-100 text-amber-800 hover:bg-amber-100'}>
                            {g.allActive ? 'Aktif (auto)' : 'Nonaktif'}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Setiap 1 {g.productUnit} membutuhkan total <strong>{formatNumber(totalWeight, 2)} kg</strong> bahan baku
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadProductIntoForm(g.produkId)}
                          className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          title="Muat formula ke form untuk diedit / ditambah bahan"
                        >
                          <Edit2 className="h-3 w-3 mr-1" /> Edit Formula
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteProductRecipe(g.produkId, g.productName)}
                          className="h-7 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                          title="Hapus seluruh formula produk ini"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus Semua
                        </Button>
                      </div>
                    </div>

                    {/* Bahan-bahan detail */}
                    <div className="space-y-1.5 pl-1">
                      {g.items.map((r, itemIdx) => (
                        <div key={r.id} className="flex items-center justify-between text-xs rounded bg-white/70 border border-emerald-100/70 px-2.5 py-1.5">
                          <div className="flex items-center gap-2">
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                              {itemIdx + 1}
                            </span>
                            <span className="font-semibold text-emerald-900">
                              {formatNumber(r.quantityPerUnit, 4)} {r.wasteItemUnit || 'kg'} {r.wasteItemName} ({r.wasteItemCode})
                            </span>
                            <span className="text-[11px] text-emerald-600/70">
                              · Sumber: {r.source === 'sedekah' ? 'Sedekah' : 'Nabung'}
                            </span>
                            {r.notes && <span className="text-[11px] italic text-zinc-400">({r.notes})</span>}
                            {r.stockStatus && (
                              <Badge variant="outline" className={cn(
                                'ml-1 h-5 text-[10px] leading-none px-1.5 py-0',
                                r.stockStatus === 'tersedia' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 
                                r.stockStatus === 'rendah' ? 'border-amber-200 text-amber-700 bg-amber-50' : 
                                'border-rose-200 text-rose-700 bg-rose-50'
                              )}>
                                {r.stockStatus === 'tersedia' ? 'Stok Aman' : r.stockStatus === 'rendah' ? 'Stok Rendah' : 'Stok Kosong'}
                                {r.maxProducible !== undefined && ` (< ${r.maxProducible} unit)`}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleActive(r.id, r.isActive)}
                              className={cn(
                                'h-6 text-[11px] px-2',
                                r.isActive ? 'text-amber-700 hover:bg-amber-50' : 'text-emerald-700 hover:bg-emerald-50'
                              )}
                            >
                              {r.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteRecipe(r.id)}
                              className="h-6 w-6 p-0 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                              title="Hapus bahan ini saja"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ----------------------------------------------------------------------------
// 3. PENJUALAN KE MITRA
// ----------------------------------------------------------------------------
interface MitraItemRow {
  jenisSampahId: string
  source: string // 'nabung' | 'sedekah'
  pricePerUnit: string // harga jual ke mitra (editable)
  quantity: string
}

function PenjualanMitraTab() {
  const [list, setList] = React.useState<SalesTx[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  const [mitras, setPartners] = React.useState<PartnerRow[]>([])
  const [inventaris, setInventory] = React.useState<StokRow[]>([])

  const [mitraId, setPartnerId] = React.useState('')
  const [itemRows, setItemRows] = React.useState<MitraItemRow[]>([{ jenisSampahId: '', source: '', pricePerUnit: '', quantity: '' }])
  const [notes, setNotes] = React.useState('')

  // ---- Mitra management state ----
  const [mitraModalOpen, setMitraModalOpen] = React.useState(false)
  const [mitraManagerOpen, setMitraManagerOpen] = React.useState(false)
  const [editingMitra, setEditingMitra] = React.useState<PartnerRow | null>(null)
  const [mitraSaving, setMitraSaving] = React.useState(false)
  const [mitraForm, setMitraForm] = React.useState({
    name: '', type: 'Pengepul', phone: '', address: '', email: '', notes: ''
  })

  const openAddMitra = () => {
    setEditingMitra(null)
    setMitraForm({ name: '', type: 'Pengepul', phone: '', address: '', email: '', notes: '' })
    setMitraModalOpen(true)
  }

  const openEditMitra = (mitra: PartnerRow) => {
    setEditingMitra(mitra)
    setMitraForm({
      name: mitra.name,
      type: mitra.type || 'Pengepul',
      phone: mitra.phone || '',
      address: mitra.address || '',
      email: mitra.email || '',
      notes: mitra.notes || ''
    })
    setMitraModalOpen(true)
  }

  const deleteMitra = (mitra: PartnerRow) => {
    if (confirm(`Hapus mitra ${mitra.name}?`)) {
      api.mitra.delete(mitra.id).then(() => {
        setPartners(mitras.filter((p) => p.id !== mitra.id))
      })
    }
  }

  const saveMitra = async (e: React.FormEvent) => {
    e.preventDefault()
    setMitraSaving(true)
    try {
      if (editingMitra) {
        const updated = await api.mitra.update(editingMitra.id, mitraForm)
        setPartners(mitras.map((p) => (p.id === editingMitra.id ? updated : p)))
      } else {
        const created = await api.mitra.create(mitraForm)
        setPartners([...mitras, created])
      }
      setMitraModalOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setMitraSaving(false)
    }
  }
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
        mitraId: partnerFilter === 'all' ? '' : partnerFilter,
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

  // Fetch mitras list on mount for the filter dropdown
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
    setItemRows([{ jenisSampahId: '', source: '', pricePerUnit: '', quantity: '' }])
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

  // Find inventaris row + selected source for a given item row
  const findInv = (jenisSampahId: string) => inventaris.find((it) => it.jenisSampahId === jenisSampahId)
  const findSource = (inv: StokRow | undefined, source: string) =>
    inv?.bySource.find((s) => s.source === source)

  const hargaBeliForRow = (row: MitraItemRow): number => {
    if (!row.source) return 0
    if (row.source === 'sedekah') return 0
    const inv = findInv(row.jenisSampahId)
    return toNumber(inv?.hargaAcuan)
  }
  const availableStockForRow = (row: MitraItemRow): number => {
    if (!row.jenisSampahId || !row.source) return 0
    return toNumber(findSource(findInv(row.jenisSampahId), row.source)?.stock)
  }

  const updateRow = (idx: number, field: keyof MitraItemRow, val: string) => {
    setItemRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)))
    // When jenisSampah is selected: auto-pick source (prefer 'nabung') + pre-fill harga jual with harga acuan
    if (field === 'jenisSampahId' && val) {
      const inv = inventaris.find((it) => it.jenisSampahId === val)
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
  const addRow = () => setItemRows((p) => [...p, { jenisSampahId: '', source: '', pricePerUnit: '', quantity: '' }])
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
    if (!r.jenisSampahId || !r.source || !r.quantity) return false
    const qty = parseFloat(r.quantity) || 0
    return qty > availableStockForRow(r)
  })
  const anyNegativeMargin = itemRows.some((r) => {
    if (!r.pricePerUnit || !r.quantity) return false
    const qty = parseFloat(r.quantity) || 0
    return qty > 0 && (parseFloat(r.pricePerUnit) || 0) < hargaBeliForRow(r)
  })

  const submit = async () => {
    if (!mitraId) {
      toast.error('Pilih mitra terlebih dahulu')
      return
    }
    const cleanItems = itemRows
      .filter((r) => r.jenisSampahId && r.quantity)
      .map((r) => ({
        jenisSampahId: r.jenisSampahId,
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
        mitraId,
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
                {mitras.map((p) => (
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
              {partnerFilter !== 'all' && ` · mitra: ${mitras.find((p) => p.id === partnerFilter)?.name ?? partnerFilter}`}
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

                {anyLoss && (
                  <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                    <div>
                      <span className="font-semibold">Perhatian:</span> Ada transaksi dengan margin negatif (harga jual &lt; harga beli ke nasabah). Cek baris dengan label merah.
                    </div>
                  </div>
                )}

                {/* Transactions list */}
                <div className="space-y-3">
                  {list.map((tx) => {
                    const txBeli = toNumber(tx.totalBeliNasabah)
                    const txJual = toNumber(tx.totalJualMitra ?? tx.totalValue)
                    const txMargin = toNumber(tx.totalMargin)
                    const txMarginPersen = txBeli > 0 ? (txMargin / txBeli) * 100 : 0
                    const profit = tx.isProfit !== false

                    return (
                      <Collapsible key={tx.id}>
                        <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm transition hover:shadow-md">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                <Truck className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-emerald-950">{tx.mitra?.name ?? '-'}</p>
                                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700">
                                    {tx.mitra?.type ?? 'pengepul'}
                                  </Badge>
                                  <Badge variant="outline" className="border-zinc-200 font-mono text-[10px] text-zinc-600">
                                    {tx.invoiceNumber || tx.id.slice(-8).toUpperCase()}
                                  </Badge>
                                </div>
                                <p className="text-xs text-emerald-700/60">
                                  {formatDateTime(tx.transactedAt)} · {tx.items?.length ?? 0} jenis barang · {formatNumber(toNumber(tx.totalWeight))} kg
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-xs text-emerald-700/60">Total Penjualan</p>
                                <p className="text-base font-bold text-emerald-900">{formatRupiah(txJual)}</p>
                              </div>

                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="gap-1 text-emerald-700 hover:bg-emerald-50">
                                  Detail <ChevronDown className="h-4 w-4" />
                                </Button>
                              </CollapsibleTrigger>

                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                onClick={() => {
                                  let html = `<div class="struk-header">
                                    <div class="icon">🚛</div>
                                    <h2>Bank Sampah</h2>
                                    <div class="sub">Sukamaju Sejahtera</div>
                                    <div class="desc">Penjualan Sampah ke Mitra Pengepul</div>
                                    <div class="badge">INVOICE PENJUALAN MITRA</div>
                                  </div>`
                                  // ... (impl detail)
                                  printStruk(html)
                                }}
                              >
                                <Printer className="h-3.5 w-3.5" /> Cetak
                              </Button>
                            </div>
                          </div>
                          {/* ... more content */}
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

      {/* Dialog Tambah / Edit Mitra */}
      <Dialog open={mitraModalOpen} onOpenChange={setMitraModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-900">
              <Handshake className="size-5 text-emerald-600" />
              {editingMitra ? 'Edit Data Mitra' : 'Tambah Mitra Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingMitra ? 'Perbarui data kontak atau jenis mitra pengepul.' : 'Daftarkan mitra pengepul, pabrik daur ulang, atau distributor pembeli sampah.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={saveMitra} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-700">Nama Mitra / Usaha <span className="text-rose-500">*</span></Label>
              <Input
                value={mitraForm.name}
                onChange={(e) => setMitraForm({ ...mitraForm, name: e.target.value })}
                placeholder="Contoh: PT Daur Ulang Mandiri, Pengepul Berkah"
                className="text-xs bg-white"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-700">Tipe / Kategori Mitra</Label>
              <Select
                value={mitraForm.type}
                onValueChange={(v) => setMitraForm({ ...mitraForm, type: v })}
              >
                <SelectTrigger className="w-full text-xs bg-white">
                  <SelectValue placeholder="Pilih tipe mitra" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pengepul" className="text-xs">Pengepul / Bandol</SelectItem>
                  <SelectItem value="pabrik" className="text-xs">Pabrik Daur Ulang</SelectItem>
                  <SelectItem value="pengrajin" className="text-xs">Pengrajin / Komunitas</SelectItem>
                  <SelectItem value="distributor" className="text-xs">Distributor / Pembeli Lain</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-zinc-700">No. Telepon / WA</Label>
                <Input
                  value={mitraForm.phone}
                  onChange={(e) => setMitraForm({ ...mitraForm, phone: e.target.value })}
                  placeholder="08123456789"
                  className="text-xs bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-zinc-700">Email (Struk Invoice)</Label>
                <Input
                  type="email"
                  value={mitraForm.email}
                  onChange={(e) => setMitraForm({ ...mitraForm, email: e.target.value })}
                  placeholder="mitra@usaha.com"
                  className="text-xs bg-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-700">Alamat Lengkap</Label>
              <Input
                value={mitraForm.address}
                onChange={(e) => setMitraForm({ ...mitraForm, address: e.target.value })}
                placeholder="Jl. Raya Daur Ulang No. 10"
                className="text-xs bg-white"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-700">Catatan Tambahan (Opsional)</Label>
              <Textarea
                rows={2}
                value={mitraForm.notes}
                onChange={(e) => setMitraForm({ ...mitraForm, notes: e.target.value })}
                placeholder="Jenis sampah yang diterima, jadwal jemput, dll."
                className="text-xs bg-white"
              />
            </div>

            <DialogFooter className="gap-2 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMitraModalOpen(false)}
                disabled={mitraSaving}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={mitraSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
              >
                {mitraSaving ? 'Menyimpan...' : (editingMitra ? 'Simpan Perubahan' : 'Tambah Mitra')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Kelola Semua Mitra */}
      <Dialog open={mitraManagerOpen} onOpenChange={setMitraManagerOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl lg:max-w-3xl">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle className="flex items-center gap-2 text-emerald-900">
                  <Users className="size-5 text-emerald-600" />
                  Daftar & Manajemen Mitra
                </DialogTitle>
                <DialogDescription>
                  Kelola mitra pengepul, pabrik daur ulang, dan pihak ketiga pembeli sampah.
                </DialogDescription>
              </div>
              <Button
                size="sm"
                onClick={openAddMitra}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-semibold"
              >
                <Plus className="size-3.5" /> Tambah Mitra
              </Button>
            </div>
          </DialogHeader>

          <div className="pt-2">
            {mitras.length === 0 ? (
              <div className="py-12 text-center text-sm text-zinc-400 border border-dashed rounded-xl border-zinc-200">
                <Handshake className="size-10 mx-auto mb-2 opacity-30 text-emerald-600" />
                <p className="font-semibold text-zinc-600">Belum Ada Data Mitra</p>
                <p className="text-xs text-zinc-400 mt-1">Klik tombol &quot;Tambah Mitra&quot; di atas untuk mendaftarkan mitra pertama Anda.</p>
                <Button onClick={openAddMitra} size="sm" className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5">
                  <Plus className="size-3.5" /> Tambah Mitra Sekarang
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-zinc-200">
                <Table>
                  <TableHeader className="bg-zinc-50">
                    <TableRow>
                      <TableHead className="text-xs font-semibold text-zinc-700">Nama Mitra</TableHead>
                      <TableHead className="text-xs font-semibold text-zinc-700">Tipe</TableHead>
                      <TableHead className="text-xs font-semibold text-zinc-700">Kontak</TableHead>
                      <TableHead className="text-xs font-semibold text-zinc-700">Alamat</TableHead>
                      <TableHead className="text-xs font-semibold text-zinc-700 text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mitras.map((p) => (
                      <TableRow key={p.id} className="hover:bg-zinc-50/70">
                        <TableCell className="font-semibold text-emerald-950 text-xs">
                          {p.name}
                          {p.notes && <p className="text-[11px] font-normal text-zinc-400 italic">{p.notes}</p>}
                        </TableCell>
                        <TableCell className="text-xs capitalize">
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px]">
                            {p.type || 'Pengepul'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-zinc-600">
                          {p.phone && <div className="text-[11px] text-zinc-700">{p.phone}</div>}
                          {p.email && <div className="text-[10px] text-zinc-400 font-mono">{p.email}</div>}
                          {!p.phone && !p.email && <span className="text-zinc-400">-</span>}
                        </TableCell>
                        <TableCell className="text-xs text-zinc-600 max-w-[200px] truncate">
                          {p.address || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditMitra(p)}
                              className="h-7 w-7 p-0 text-zinc-600 hover:text-emerald-700 hover:bg-emerald-50"
                              title="Edit mitra"
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteMitra(p)}
                              className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              title="Hapus mitra"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Sale dialog */}
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
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-emerald-800 font-semibold text-xs">Mitra Pengepul / Pembeli <span className="text-rose-500">*</span></Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={openAddMitra}
                    className="h-6 text-xs text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 gap-1 p-1"
                  >
                    <Plus className="size-3.5" /> Tambah Mitra Baru
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select value={mitraId} onValueChange={setPartnerId}>
                      <SelectTrigger className="w-full bg-white border-emerald-200">
                        <SelectValue placeholder="Pilih mitra pengepul..." />
                      </SelectTrigger>
                      <SelectContent>
                        {mitras.length === 0 ? (
                          <div className="p-3 text-center text-xs text-zinc-500">
                            Belum ada mitra. Klik &quot;+ Mitra Baru&quot; di samping.
                          </div>
                        ) : (
                          mitras.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} <span className="text-emerald-600/70 font-mono text-[11px]">· {p.type}</span>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openAddMitra}
                    className="shrink-0 h-10 border-emerald-300 text-emerald-800 hover:bg-emerald-50 gap-1.5 text-xs font-semibold"
                  >
                    <Plus className="size-3.5" /> Mitra Baru
                  </Button>
                </div>
              </div>
            </div>

            <Separator className="bg-emerald-100" />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-emerald-800 font-semibold text-xs">Item Sampah yang Dijual</Label>
                <Button size="sm" variant="outline" onClick={addRow} className="h-7 border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Tambah Item
                </Button>
              </div>
              <div className="space-y-2">
                {itemRows.map((row, idx) => {
                  const qty = parseFloat(row.quantity) || 0
                  const hargaJual = parseFloat(row.pricePerUnit) || 0
                  const hargaBeli = hargaBeliForRow(row)
                  const availableStock = availableStockForRow(row)
                  const inv = findInv(row.jenisSampahId)
                  const sources = (inv?.bySource ?? []).filter((s) => toNumber(s.stock) > 0)
                  const subtotalJual = hargaJual * qty
                  const subtotalBeli = hargaBeli * qty
                  const margin = subtotalJual - subtotalBeli
                  const qtyExceedsStock = row.jenisSampahId && row.source && qty > availableStock
                  const negativeMargin = qty > 0 && row.pricePerUnit !== '' && hargaJual < hargaBeli
                  return (
                    <div key={idx} className="space-y-2 rounded-lg border border-emerald-100 bg-emerald-50/30 p-3">
                      {/* Row 1: Sumber + Barang + Remove */}
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[160px_1fr_auto] sm:items-end">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-emerald-700/70">Sumber Stok</Label>
                          <Select 
                            value={row.source} 
                            onValueChange={(v) => {
                              setItemRows((prev) => prev.map((r, i) => i === idx ? {
                                ...r,
                                source: v,
                                jenisSampahId: '',
                                pricePerUnit: '',
                                quantity: ''
                              } : r))
                            }}
                          >
                            <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Pilih sumber..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nabung">Nabung</SelectItem>
                              <SelectItem value="sedekah">Sedekah</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-emerald-700/70">Barang Sampah</Label>
                          <Select 
                            value={row.jenisSampahId} 
                            onValueChange={(v) => {
                              const inv = inventaris.find((it) => it.jenisSampahId === v)
                              const hargaAcuan = toNumber(inv?.hargaAcuan)
                              setItemRows((prev) => prev.map((r, i) => i === idx ? {
                                ...r,
                                jenisSampahId: v,
                                pricePerUnit: String(hargaAcuan || 0),
                                quantity: ''
                              } : r))
                            }}
                            disabled={!row.source}
                          >
                            <SelectTrigger className="w-full bg-white">
                              <SelectValue placeholder={row.source ? "Pilih barang..." : "Pilih sumber stok dulu..."} />
                            </SelectTrigger>
                            <SelectContent>
                              {inventaris
                                .filter((it) => {
                                  const srcStock = it.bySource?.find(s => s.source === row.source)?.stock || 0
                                  return toNumber(srcStock) > 0
                                })
                                .map((it) => {
                                  const stock = it.bySource?.find(s => s.source === row.source)?.stock || 0
                                  return (
                                    <SelectItem key={it.jenisSampahId} value={it.jenisSampahId}>
                                      {it.jenisSampah.code} · {it.jenisSampah.name} (Stok: {formatNumber(toNumber(stock), 2)} kg)
                                    </SelectItem>
                                  )
                                })
                              }
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
interface ProdukItemRow { produkId: string; pricePerUnit: string; quantity: string }

function PenjualanProdukTab() {
  const [list, setList] = React.useState<ProductSaleTx[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [viewing, setViewing] = React.useState<ProductSaleTx | null>(null)
  const [viewOpen, setViewOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  const [produks, setProducts] = React.useState<ProductRow[]>([])
  const [buyerName, setBuyerName] = React.useState('')
  const [buyerPhone, setBuyerPhone] = React.useState('')
  const [paymentMethod, setPaymentMethod] = React.useState<'cash' | 'transfer'>('cash')
  const [itemRows, setItemRows] = React.useState<ProdukItemRow[]>([{ produkId: '', pricePerUnit: '', quantity: '' }])

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
    setItemRows([{ produkId: '', pricePerUnit: '', quantity: '' }])
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
    if (field === 'produkId' && val) {
      const p = produks.find((x) => x.id === val)
      const price = p?.prices?.[0]?.pricePerUnit ?? p?.price ?? 0
      setItemRows((prev) => prev.map((r, i) => (i === idx ? { ...r, pricePerUnit: String(toNumber(price)) } : r)))
    }
  }
  const addRow = () => setItemRows((p) => [...p, { produkId: '', pricePerUnit: '', quantity: '' }])
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
    const cleanItems: { produkId: string; pricePerUnit: number; quantity: number }[] = []
    for (const r of itemRows) {
      if (!r.produkId || !r.quantity) continue
      const qty = parseFloat(r.quantity)
      const produk = produks.find((p) => p.id === r.produkId)
      const stock = toNumber(produk?.stock ?? 0)
      if (qty > stock) {
        toast.error(`Jumlah melebihi stok untuk ${produk?.name ?? 'produk'}`, {
          description: `Stok tersedia: ${formatNumber(stock, 0)}`,
        })
        return
      }
      cleanItems.push({
        produkId: r.produkId,
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
                  const produk = produks.find((p) => p.id === row.produkId)
                  const stock = toNumber(produk?.stock ?? 0)
                  const qty = parseFloat(row.quantity) || 0
                  const overStock = row.produkId && qty > stock
                  return (
                    <div key={idx} className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_100px_120px_auto] sm:items-end">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-emerald-700/70">Produk</Label>
                          <Select value={row.produkId} onValueChange={(v) => updateRow(idx, 'produkId', v)}>
                            <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Pilih produk..." /></SelectTrigger>
                            <SelectContent>
                              {produks.map((p) => (
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
// Mitra Tab
// ----------------------------------------------------------------------------
const MITRA_TYPES = [
  { value: 'pengepul', label: 'Pengepul' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'pengrajin', label: 'Pengrajin' },
  { value: 'pabrik', label: 'Pabrik' },
  { value: 'lainnya', label: 'Lainnya' },
]

function MitraTab() {
  const [data, setData] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<any | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState<any>({
    name: '', type: 'pengepul', phone: '', email: '', address: '', notes: '', isActive: true,
  })

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      setData(await api.mitra.list())
    } catch (e: any) {
      toast.error(e?.message || 'Gagal memuat mitra')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', type: 'pengepul', phone: '', email: '', address: '', notes: '', isActive: true })
    setOpen(true)
  }
  const openEdit = (m: any) => {
    setEditing(m)
    setForm({
      name: m.name || '',
      type: m.type || 'pengepul',
      phone: m.phone || '',
      email: m.email || '',
      address: m.address || '',
      notes: m.notes || '',
      isActive: m.isActive ?? true,
    })
    setOpen(true)
  }
  const save = async () => {
    if (!form.name) {
      toast.error('Nama mitra wajib diisi')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await api.mitra.update(editing.id, form)
        toast.success('Mitra diperbarui')
      } else {
        await api.mitra.create(form)
        toast.success('Mitra ditambahkan')
      }
      setOpen(false)
      load()
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menyimpan mitra')
    } finally {
      setSaving(false)
    }
  }
  const remove = async (m: any) => {
    if (!confirm(`Hapus mitra "${m.name}"?`)) return
    try {
      await api.mitra.delete(m.id)
      toast.success('Mitra dihapus')
      load()
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menghapus mitra')
    }
  }

  const inputCls = "h-9 border-emerald-200 bg-emerald-50/30 focus-visible:ring-emerald-500"
  const triggerCls = "h-9 border-emerald-200 bg-emerald-50/30"

  return (
    <Card className="border-emerald-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-emerald-900">
              <Handshake className="h-5 w-5 text-emerald-600" /> Mitra
            </CardTitle>
            <CardDescription>
              Mitra pengepul / distributor / pengrajin untuk transaksi penjualan sampah.
            </CardDescription>
          </div>
          <Button onClick={openAdd} className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-700">
            <Plus className="size-4 mr-1.5" /> Tambah Mitra
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-emerald-200 p-8 text-center bg-emerald-50/30">
            <div className="rounded-full bg-emerald-100 p-3 mb-3">
              <Handshake className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-emerald-900">Belum ada mitra</p>
          </div>
        ) : (
          <div className="overflow-auto rounded-lg border border-emerald-100">
            <Table>
              <TableHeader>
                <TableRow className="bg-emerald-50/60 hover:bg-emerald-50/60">
                  <TableHead className="text-emerald-900">Nama</TableHead>
                  <TableHead className="text-emerald-900">Tipe</TableHead>
                  <TableHead className="text-emerald-900">Telepon</TableHead>
                  <TableHead className="text-emerald-900">Alamat</TableHead>
                  <TableHead className="text-emerald-900">Status</TableHead>
                  <TableHead className="text-right text-emerald-900">Jumlah Transaksi</TableHead>
                  <TableHead className="text-right text-emerald-900">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize border-emerald-200 text-emerald-700">
                        {m.type || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>{m.phone || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{m.address || '-'}</TableCell>
                    <TableCell>
                      {m.isActive ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Aktif</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-600">Nonaktif</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {m._count?.transaksiPenjualanMitras ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          size="icon" variant="ghost"
                          className="size-8 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => openEdit(m)} aria-label="Edit mitra"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className="size-8 text-red-600 hover:bg-red-50"
                          onClick={() => remove(m)} aria-label="Hapus mitra"
                        >
                          <Trash2 className="size-4" />
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-emerald-900">
              {editing ? 'Edit Mitra' : 'Tambah Mitra'}
            </DialogTitle>
            <DialogDescription>Mitra untuk transaksi penjualan sampah ke pihak luar.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Nama Mitra</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="cth. CV Pengepul Maju"
                className={inputCls}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Tipe Mitra</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className={triggerCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MITRA_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Telepon</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="08xx..."
                className={inputCls}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@contoh.com"
                className={inputCls}
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Alamat</Label>
              <Textarea
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Alamat mitra"
                className={inputCls}
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Catatan</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Catatan internal"
                className={inputCls}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-emerald-100 bg-emerald-50/30 p-3 sm:col-span-2">
              <div>
                <Label>Aktif</Label>
                <p className="text-xs text-muted-foreground">Mitra nonaktif tidak dapat dipilih di transaksi.</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={save} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
              {saving ? <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              {editing ? 'Simpan Perubahan' : 'Tambah'}
            </Button>
          </DialogFooter>
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
        <TabsList className="h-auto flex-wrap gap-1 bg-emerald-100/60 dark:bg-zinc-900 p-1 border border-emerald-200/50 dark:border-zinc-800">
          <TabsTrigger
            value="stok"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-emerald-600 data-[state=active]:text-emerald-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm text-zinc-700 dark:text-zinc-400"
          >
            <Warehouse className="h-4 w-4" /> Stok Gudang
          </TabsTrigger>
          <TabsTrigger
            value="pengolahan"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-emerald-600 data-[state=active]:text-emerald-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm text-zinc-700 dark:text-zinc-400"
          >
            <Factory className="h-4 w-4" /> Pengolahan
          </TabsTrigger>
          <TabsTrigger
            value="penjualan-mitra"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-emerald-600 data-[state=active]:text-emerald-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm text-zinc-700 dark:text-zinc-400"
          >
            <Truck className="h-4 w-4" /> Penjualan Mitra
          </TabsTrigger>
          <TabsTrigger
            value="mitra"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-emerald-600 data-[state=active]:text-emerald-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm text-zinc-700 dark:text-zinc-400"
          >
            <Handshake className="h-4 w-4" /> Data Mitra
          </TabsTrigger>
          <TabsTrigger
            value="produk"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-emerald-600 data-[state=active]:text-emerald-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm text-zinc-700 dark:text-zinc-400"
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
        <TabsContent value="penjualan-mitra">
          <PenjualanMitraTab />
        </TabsContent>
        <TabsContent value="mitra">
          <MitraTab />
        </TabsContent>
        <TabsContent value="produk">
          <PenjualanProdukTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
