'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  ShoppingBag,
  Plus,
  Trash2,
  Eye,
  Package,
  Layers,
  Coins,
  AlertTriangle,
  Leaf,
  RefreshCw,
  Search,
  Filter,
  X,
  Minus,
  ShoppingCart,
  CreditCard,
  Receipt,
  Settings,
  ClipboardList,
  Tag,
  Truck,
  Globe,
  Store,
  CheckCircle2,
  Clock,
  ChevronRight,
  Printer,
  Upload,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react'

import { api } from '@/lib/api'
import {
  formatRupiah,
  formatNumber,
  formatDateTime,
  toNumber,
} from '@/lib/format'
import { printStruk } from '@/lib/print-struk'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// ============================================================================
// Types
// ============================================================================
interface ProductCategory {
  id: string
  name: string
  slug: string
  description?: string
  productCount?: number
  aktif?: boolean
}

interface TokoProduk {
  id: string
  nama: string
  slug: string
  deskripsi?: string
  kategoriId?: string
  kategori?: ProductCategory
  hargaJual: string | number
  satuan: string
  stok: string | number
  beratGram: string | number
  panjangCm?: string | number
  lebarCm?: string | number
  tinggiCm?: string | number
  dijualOnline: boolean
  dijualOffline: boolean
  minOrderQty: string | number
  maxOrderQty?: string | number
  aktif: boolean
  gambarUrl?: string
  createdAt: string
}

interface CartItem {
  produk: TokoProduk
  qty: number
}

interface OrderItem {
  id: string
  produkId: string
  namaProduk: string
  hargaSatuan: string | number
  qty: string | number
  subtotal: string | number
}

interface OrderRow {
  id: string
  orderNumber: string
  channel: 'online' | 'offline'
  statusPesanan: string
  statusPembayaran: string
  total: string | number
  ongkir?: string | number
  namaPembeli: string
  telpPembeli?: string
  alamatPengiriman?: string
  items: OrderItem[]
  createdAt: string
  kurirNama?: string
  noResi?: string
  statusHistory?: { status: string; createdAt: string; catatan?: string }[]
}

interface AturanRow {
  id: string
  kategoriId?: string
  kategori?: { name: string }
  kategoriNama?: string
  minPembelian: string | number
  maxPembelian?: string | number
  berlakuOffline: boolean
  berlakuOnline: boolean
}

interface TokoSettings {
  tokoOnlineAktif: boolean
  ongkirPerKg: string | number
  ongkirPerKm: string | number
  ongkirTetap: string | number
  beratMinimumDianggap: string | number
  alamatAsalPengiriman: string
  midtransServerKey: string
  midtransClientKey: string
  midtransSandbox: boolean
  ambangBatasStokRendah: string | number
}

const SATUAN_OPTIONS = ['pcs', 'kg', 'pack', 'set', 'lusin'] as const

/** Map API response (English field names) to internal TokoProduk (Indonesian field names) */
function mapProduk(r: any): TokoProduk {
  return {
    id: r.id,
    nama: r.name,
    slug: r.slug,
    deskripsi: r.description,
    kategoriId: r.productCategoryId,
    kategori: r.category,
    hargaJual: r.price,
    satuan: r.unit || 'pcs',
    stok: r.stock,
    beratGram: r.weightGram || 0,
    panjangCm: r.lengthCm,
    lebarCm: r.widthCm,
    tinggiCm: r.heightCm,
    dijualOnline: !!r.dijualOnline,
    dijualOffline: !!r.dijualOffline,
    minOrderQty: r.minOrderQty || 1,
    maxOrderQty: r.maxOrderQty,
    aktif: !!r.isActive,
    gambarUrl: r.image || r.images?.[0] || undefined,
    createdAt: r.createdAt,
  }
}

function mapOrderRow(r: any): OrderRow {
  const isOnline = r.channel === 'online'
  return {
    id: r.id,
    orderNumber: r.orderNumber || r.refNumber || '',
    channel: r.channel || (isOnline ? 'online' : 'offline'),
    statusPesanan: r.orderStatus || r.status || '',
    statusPembayaran: r.paymentStatus || '',
    total: r.totalBayar || r.totalValue || 0,
    ongkir: r.ongkir,
    namaPembeli: r.buyerName || '',
    telpPembeli: r.buyerPhone,
    alamatPengiriman: r.buyerAddress,
    items: (r.items || []).map((it: any) => ({
      id: it.id,
      produkId: it.productId,
      namaProduk: it.productNameSnapshot || it.productName || '',
      hargaSatuan: it.pricePerUnitSnapshot || it.price || 0,
      qty: it.quantity,
      subtotal: it.subtotal,
    })),
    createdAt: r.createdAt || r.transactedAt,
    kurirNama: r.kurirNama,
    noResi: r.noResi,
    statusHistory: r.statusHistory || [],
  }
}

function mapSettings(r: any): TokoSettings {
  return {
    tokoOnlineAktif: !!r.tokoOnlineAktif,
    ongkirPerKg: r.ongkirRatePerKg || 0,
    ongkirPerKm: r.ongkirRatePerKm || 0,
    ongkirTetap: r.ongkirTetap || 0,
    beratMinimumDianggap: r.beratMinimumKg || 1,
    alamatAsalPengiriman: r.originAddress || '',
    midtransServerKey: r.midtransServerKey || '',
    midtransClientKey: r.midtransClientKey || '',
    midtransSandbox: !r.midtransIsProduction,
    ambangBatasStokRendah: r.stokRendahThreshold || 5,
  }
}

function mapAturan(r: any): AturanRow {
  return {
    id: r.id,
    kategoriId: r.productCategoryId,
    kategori: r.category,
    kategoriNama: r.category?.name || '',
    minPembelian: r.minPembelian,
    maxPembelian: r.maxPembelian,
    berlakuOffline: !!r.berlakuOffline,
    berlakuOnline: !!r.berlakuOnline,
  }
}

function unmapProduk(p: TokoProduk) {
  return {
    name: p.nama,
    slug: p.slug,
    description: p.deskripsi,
    productCategoryId: p.kategoriId || null,
    price: Number(p.hargaJual) || 0,
    unit: p.satuan || 'pcs',
    stock: Number(p.stok) || 0,
    weightGram: Number(p.beratGram) || 0,
    lengthCm: p.panjangCm ? Number(p.panjangCm) : undefined,
    widthCm: p.lebarCm ? Number(p.lebarCm) : undefined,
    heightCm: p.tinggiCm ? Number(p.tinggiCm) : undefined,
    dijualOnline: p.dijualOnline,
    dijualOffline: p.dijualOffline,
    minOrderQty: Number(p.minOrderQty) || 1,
    maxOrderQty: p.maxOrderQty ? Number(p.maxOrderQty) : undefined,
    isActive: p.aktif,
    image: p.gambarUrl || null,
  }
}

function unmapSettings(s: TokoSettings) {
  return {
    tokoOnlineAktif: s.tokoOnlineAktif,
    ongkirRatePerKg: Number(s.ongkirPerKg) || 0,
    ongkirRatePerKm: Number(s.ongkirPerKm) || 0,
    ongkirTetap: Number(s.ongkirTetap) || 0,
    beratMinimumKg: Number(s.beratMinimumDianggap) || 1,
    originAddress: s.alamatAsalPengiriman,
    midtransServerKey: s.midtransServerKey || null,
    midtransClientKey: s.midtransClientKey || null,
    midtransIsProduction: !s.midtransSandbox,
    stokRendahThreshold: Number(s.ambangBatasStokRendah) || 5,
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// ============================================================================
// Shared helpers
// ============================================================================
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

// ============================================================================
// TAB 1: Manajemen Produk
// ============================================================================
function ManajemenProdukTab() {
  const [data, setData] = React.useState<TokoProduk[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [filterKategori, setFilterKategori] = React.useState('')
  const [filterChannel, setFilterChannel] = React.useState('semua')

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<TokoProduk | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const [kategoriList, setKategoriList] = React.useState<ProductCategory[]>([])

  // Form fields
  const [fNama, setFNama] = React.useState('')
  const [fSlug, setFSlug] = React.useState('')
  const [fDeskripsi, setFDeskripsi] = React.useState('')
  const [fKategoriId, setFKategoriId] = React.useState('')
  const [fHargaJual, setFHargaJual] = React.useState('')
  const [fSatuan, setFSatuan] = React.useState('pcs')
  const [fStok, setFStok] = React.useState('')
  const [fBeratGram, setFBeratGram] = React.useState('')
  const [fPanjang, setFPanjang] = React.useState('')
  const [fLebar, setFLebar] = React.useState('')
  const [fTinggi, setFTinggi] = React.useState('')
  const [fDijualOnline, setFDijualOnline] = React.useState(false)
  const [fDijualOffline, setFDijualOffline] = React.useState(true)
  const [fMinOrder, setFMinOrder] = React.useState('1')
  const [fMaxOrder, setFMaxOrder] = React.useState('')
  const [fAktif, setFAktif] = React.useState(true)
  const [fGambarUrl, setFGambarUrl] = React.useState<string>('')
  const [uploadingImage, setUploadingImage] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [settings, setSettings] = React.useState<TokoSettings | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.toko.adminProduk()
      setData((res as any[]).map(mapProduk))
    } catch (e: any) {
      toast.error('Gagal memuat produk', { description: e.message })
    } finally {
      setLoading(false)
    }
  }, [])

  const loadKategori = React.useCallback(async () => {
    try {
      const res = await api.toko.adminKategori()
      setKategoriList(res as ProductCategory[])
    } catch {}
  }, [])

  const loadSettings = React.useCallback(async () => {
    try {
      const res = await api.toko.adminSettings()
      setSettings(mapSettings(res))
    } catch {}
  }, [])

  React.useEffect(() => { load(); loadKategori(); loadSettings() }, [load, loadKategori, loadSettings])

  const resetForm = () => {
    setFNama(''); setFSlug(''); setFDeskripsi(''); setFKategoriId('')
    setFHargaJual(''); setFSatuan('pcs'); setFStok('')
    setFBeratGram(''); setFPanjang(''); setFLebar(''); setFTinggi('')
    setFDijualOnline(false); setFDijualOffline(true)
    setFMinOrder('1'); setFMaxOrder(''); setFAktif(true)
    setFGambarUrl('')
  }

  const openCreate = () => {
    setEditing(null); resetForm(); setDialogOpen(true)
  }

  const openEdit = (p: TokoProduk) => {
    setEditing(p)
    setFNama(p.nama)
    setFSlug(p.slug)
    setFDeskripsi(p.deskripsi || '')
    setFKategoriId(p.kategoriId || '')
    setFHargaJual(String(toNumber(p.hargaJual)))
    setFSatuan(p.satuan || 'pcs')
    setFStok(String(toNumber(p.stok)))
    setFBeratGram(String(toNumber(p.beratGram)))
    setFPanjang(p.panjangCm ? String(toNumber(p.panjangCm)) : '')
    setFLebar(p.lebarCm ? String(toNumber(p.lebarCm)) : '')
    setFTinggi(p.tinggiCm ? String(toNumber(p.tinggiCm)) : '')
    setFDijualOnline(!!p.dijualOnline)
    setFDijualOffline(!!p.dijualOffline)
    setFMinOrder(String(toNumber(p.minOrderQty) || 1))
    setFMaxOrder(p.maxOrderQty ? String(toNumber(p.maxOrderQty)) : '')
    setFAktif(p.aktif !== false)
    setFGambarUrl(p.gambarUrl || '')
    setDialogOpen(true)
  }

  const handleNamaChange = (val: string) => {
    setFNama(val)
    if (!editing) setFSlug(generateSlug(val))
  }

  const handleImageUpload = async (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipe file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.')
      return
    }
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file terlalu besar. Maksimal 2MB.')
      return
    }

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/toko/admin/produk/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Gagal mengupload gambar')
        return
      }
      setFGambarUrl(data.url)
      toast.success('Gambar berhasil diupload')
    } catch (e: any) {
      toast.error('Gagal mengupload gambar: ' + (e.message || 'Unknown error'))
    } finally {
      setUploadingImage(false)
      // Reset file input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = () => {
    setFGambarUrl('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const submit = async () => {
    if (!fNama.trim()) { toast.error('Nama produk wajib diisi'); return }
    if (!fHargaJual || Number(fHargaJual) <= 0) { toast.error('Harga jual wajib diisi'); return }
    if (!fBeratGram || Number(fBeratGram) <= 0) { toast.error('Berat produk wajib diisi'); return }
    if (!fSlug.trim()) { toast.error('Slug produk wajib diisi'); return }

    const payload = unmapProduk({
      id: editing?.id || '',
      nama: fNama.trim(),
      slug: fSlug.trim(),
      deskripsi: fDeskripsi.trim() || undefined,
      kategoriId: fKategoriId || undefined,
      hargaJual: Number(fHargaJual),
      satuan: fSatuan,
      stok: Number(fStok) || 0,
      beratGram: Number(fBeratGram),
      panjangCm: fPanjang ? Number(fPanjang) : undefined,
      lebarCm: fLebar ? Number(fLebar) : undefined,
      tinggiCm: fTinggi ? Number(fTinggi) : undefined,
      dijualOnline: fDijualOnline,
      dijualOffline: fDijualOffline,
      minOrderQty: Number(fMinOrder) || 1,
      maxOrderQty: fMaxOrder ? Number(fMaxOrder) : undefined,
      aktif: fAktif,
      gambarUrl: fGambarUrl || undefined,
      createdAt: editing?.createdAt || new Date().toISOString(),
    })

    setSubmitting(true)
    try {
      if (editing) {
        await api.toko.adminProdukUpdate(editing.id, payload)
        toast.success('Produk berhasil diperbarui')
      } else {
        await api.toko.adminProdukCreate(payload)
        toast.success('Produk berhasil dibuat')
      }
      setDialogOpen(false)
      load()
    } catch (e: any) {
      toast.error('Gagal menyimpan produk', { description: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (p: TokoProduk) => {
    if (!confirm(`Hapus produk "${p.nama}"?`)) return
    try {
      await api.toko.adminProdukDelete(p.id)
      toast.success('Produk berhasil dihapus')
      load()
    } catch (e: any) {
      toast.error('Gagal menghapus produk', { description: e.message })
    }
  }

  // Filtered data
  const filtered = data.filter((p) => {
    if (search && !p.nama.toLowerCase().includes(search.toLowerCase()) && !p.slug.toLowerCase().includes(search.toLowerCase())) return false
    if (filterKategori && p.kategoriId !== filterKategori) return false
    if (filterChannel === 'online' && !p.dijualOnline) return false
    if (filterChannel === 'offline' && !p.dijualOffline) return false
    return true
  })

  const totalProduk = data.length
  const totalStok = data.reduce((s, p) => s + toNumber(p.stok), 0)
  const dijualOnline = data.filter((p) => p.dijualOnline).length
  const stokRendah = settings ? data.filter((p) => toNumber(p.stok) <= toNumber(settings.ambangBatasStokRendah)).length : 0

  return (
    <Card className="border-emerald-100">
      <CardHeader className="border-b border-emerald-100/70">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-emerald-900">
              <Package className="h-5 w-5 text-emerald-600" />
              Manajemen Produk
            </CardTitle>
            <CardDescription className="text-emerald-700/70">
              Kelola produk toko, stok, harga, dan channel penjualan.
            </CardDescription>
          </div>
          <Button onClick={openCreate} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700">
            <Plus className="h-4 w-4" /> Tambah Produk
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Package} label="Total Produk" value={formatNumber(totalProduk, 0)} accent="emerald" />
          <StatCard icon={Layers} label="Stok Tersedia" value={formatNumber(totalStok, 0)} sub="unit total" accent="teal" />
          <StatCard icon={Globe} label="Dijual Online" value={formatNumber(dijualOnline, 0)} sub="produk aktif online" accent="teal" />
          <StatCard icon={AlertTriangle} label="Stok Rendah" value={formatNumber(stokRendah, 0)} sub={`< ${settings ? formatNumber(toNumber(settings.ambangBatasStokRendah), 0) : '?'} unit`} accent="amber" />
        </div>

        <Separator className="my-4 bg-emerald-100" />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-emerald-500" />
            <Input
              placeholder="Cari nama atau slug produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 border-emerald-200 bg-white"
            />
          </div>
          <Select value={filterKategori} onValueChange={(v) => setFilterKategori(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-[180px] border-emerald-200 bg-white"><SelectValue placeholder="Semua Kategori" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Semua Kategori</SelectItem>
              {kategoriList.map((k) => (
                <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterChannel} onValueChange={setFilterChannel}>
            <SelectTrigger className="w-[150px] border-emerald-200 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Channel</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <TableSkeleton rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState message="Belum ada data produk" />
        ) : (
          <div className="mt-4 max-h-[480px] overflow-auto rounded-lg border border-emerald-100/70">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-emerald-50/95 backdrop-blur">
                <TableRow className="border-emerald-100 hover:bg-transparent">
                  <TableHead className="w-12 text-emerald-800"></TableHead>
                  <TableHead className="text-emerald-800">Nama</TableHead>
                  <TableHead className="text-emerald-800">Kategori</TableHead>
                  <TableHead className="text-right text-emerald-800">Harga</TableHead>
                  <TableHead className="text-right text-emerald-800">Stok</TableHead>
                  <TableHead className="text-right text-emerald-800">Berat</TableHead>
                  <TableHead className="text-right text-emerald-800">Min Order</TableHead>
                  <TableHead className="text-center text-emerald-800">Channel</TableHead>
                  <TableHead className="text-center text-emerald-800">Status</TableHead>
                  <TableHead className="text-right text-emerald-800">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const lowStock = settings ? toNumber(p.stok) <= toNumber(settings.ambangBatasStokRendah) : false
                  return (
                    <TableRow key={p.id} className="border-emerald-50">
                      <TableCell>
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50/60">
                          {p.gambarUrl ? (
                            <img src={p.gambarUrl} alt={p.nama} className="h-10 w-10 rounded-lg object-cover" />
                          ) : (
                            <Package className="h-4 w-4 text-emerald-400" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-emerald-900">{p.nama}</p>
                          <p className="text-[11px] text-emerald-700/60 font-mono">{p.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-emerald-200 text-emerald-700">
                          {p.kategori?.name || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-900">
                        {formatRupiah(toNumber(p.hargaJual))}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${lowStock ? 'text-amber-600' : 'text-emerald-900'}`}>
                        {formatNumber(toNumber(p.stok), 0)}
                        {lowStock && (
                          <Badge variant="outline" className="ml-1 border-amber-300 bg-amber-50 text-amber-700 text-[9px] px-1 py-0">
                            <AlertTriangle className="h-2.5 w-2.5" />
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-emerald-700/80">
                        {formatNumber(toNumber(p.beratGram), 0)}g
                      </TableCell>
                      <TableCell className="text-right text-emerald-700/80">
                        {formatNumber(toNumber(p.minOrderQty), 0)} {p.satuan}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {p.dijualOnline && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px]">Online</Badge>}
                          {p.dijualOffline && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px]">Offline</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {p.aktif !== false ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Aktif</Badge>
                        ) : (
                          <Badge variant="outline" className="text-zinc-500">Nonaktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="outline" className="h-7 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => openEdit(p)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(p)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-900">
              <Package className="h-5 w-5 text-emerald-600" />
              {editing ? 'Edit Produk' : 'Tambah Produk Baru'}
            </DialogTitle>
            <DialogDescription>
              {editing ? 'Ubah informasi produk toko.' : 'Isi detail produk baru untuk ditambahkan ke katalog.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Row 1: Nama + Slug */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-emerald-800">Nama Produk <span className="text-rose-500">*</span></Label>
                <Input value={fNama} onChange={(e) => handleNamaChange(e.target.value)} placeholder="Nama produk" className="border-emerald-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-emerald-800">Slug</Label>
                <Input value={fSlug} onChange={(e) => setFSlug(e.target.value)} placeholder="slug-produk" className="border-emerald-200 font-mono text-xs" />
              </div>
            </div>

            {/* Deskripsi */}
            <div className="space-y-1.5">
              <Label className="text-emerald-800">Deskripsi</Label>
              <Textarea value={fDeskripsi} onChange={(e) => setFDeskripsi(e.target.value)} placeholder="Deskripsi singkat produk..." rows={3} className="border-emerald-200" />
            </div>

            {/* Gambar Produk */}
            <div className="space-y-1.5">
              <Label className="text-emerald-800">Gambar Produk</Label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                {/* Preview */}
                <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/40">
                  {fGambarUrl ? (
                    <>
                      <img src={fGambarUrl} alt="Preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm transition-colors hover:bg-rose-600"
                        title="Hapus gambar"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-emerald-300">
                      <ImageIcon className="h-8 w-8" />
                      <span className="mt-1 text-[9px] font-medium uppercase">No Image</span>
                    </div>
                  )}
                </div>

                {/* Upload area */}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file)
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-4 text-center transition-colors hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                        <span className="text-xs font-medium text-emerald-600">Mengupload...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-emerald-500" />
                        <span className="text-xs font-medium text-emerald-700">
                          {fGambarUrl ? 'Ganti Gambar' : 'Klik untuk Upload Gambar'}
                        </span>
                        <span className="text-[10px] text-emerald-500/70">JPG, PNG, WebP, GIF · Maks 2MB</span>
                      </>
                    )}
                  </button>
                  {fGambarUrl && (
                    <p className="mt-1.5 truncate text-[10px] text-zinc-400" title={fGambarUrl}>
                      File: {fGambarUrl.split('/').pop()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Kategori + Harga */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-emerald-800">Kategori</Label>
                <Select value={fKategoriId} onValueChange={setFKategoriId}>
                  <SelectTrigger className="border-emerald-200 bg-white"><SelectValue placeholder="Pilih kategori..." /></SelectTrigger>
                  <SelectContent>
                    {kategoriList.map((k) => (
                      <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-emerald-800">Harga Jual (Rp) <span className="text-rose-500">*</span></Label>
                <Input type="number" inputMode="numeric" min="0" value={fHargaJual} onChange={(e) => setFHargaJual(e.target.value)} placeholder="0" className="border-emerald-200" />
              </div>
            </div>

            {/* Satuan + Stok + Berat */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-emerald-800">Satuan</Label>
                <Select value={fSatuan} onValueChange={setFSatuan}>
                  <SelectTrigger className="border-emerald-200 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SATUAN_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-emerald-800">Stok Tersedia</Label>
                <Input type="number" inputMode="numeric" min="0" value={fStok} onChange={(e) => setFStok(e.target.value)} placeholder="0" className="border-emerald-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-emerald-800">Berat Produk (gram) <span className="text-rose-500">*</span></Label>
                <Input type="number" inputMode="numeric" min="1" value={fBeratGram} onChange={(e) => setFBeratGram(e.target.value)} placeholder="0" className="border-emerald-200" />
              </div>
            </div>

            {/* Dimensi */}
            <div className="space-y-1.5">
              <Label className="text-emerald-800">Dimensi (cm) — opsional</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input type="number" inputMode="numeric" min="0" value={fPanjang} onChange={(e) => setFPanjang(e.target.value)} placeholder="Panjang" className="border-emerald-200" />
                <Input type="number" inputMode="numeric" min="0" value={fLebar} onChange={(e) => setFLebar(e.target.value)} placeholder="Lebar" className="border-emerald-200" />
                <Input type="number" inputMode="numeric" min="0" value={fTinggi} onChange={(e) => setFTinggi(e.target.value)} placeholder="Tinggi" className="border-emerald-200" />
              </div>
            </div>

            <Separator className="bg-emerald-100" />

            {/* Channel */}
            <div className="space-y-1.5">
              <Label className="text-emerald-800">Channel Penjualan</Label>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox checked={fDijualOnline} onCheckedChange={(c) => setFDijualOnline(!!c)} />
                  <Label className="text-sm text-emerald-700/80 cursor-pointer">Dijual Online</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={fDijualOffline} onCheckedChange={(c) => setFDijualOffline(!!c)} />
                  <Label className="text-sm text-emerald-700/80 cursor-pointer">Dijual Offline</Label>
                </div>
              </div>
            </div>

            {/* Min/Max Order */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-emerald-800">Min Order Qty</Label>
                <Input type="number" inputMode="numeric" min="1" value={fMinOrder} onChange={(e) => setFMinOrder(e.target.value)} placeholder="1" className="border-emerald-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-emerald-800">Max Order Qty</Label>
                <Input type="number" inputMode="numeric" min="0" value={fMaxOrder} onChange={(e) => setFMaxOrder(e.target.value)} placeholder="Kosongkan = tidak terbatas" className="border-emerald-200" />
              </div>
            </div>

            {/* Status Aktif */}
            <div className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
              <div>
                <Label className="text-emerald-800">Status Aktif</Label>
                <p className="text-[11px] text-emerald-700/60">Produk nonaktif tidak akan tampil di katalog</p>
              </div>
              <Switch checked={fAktif} onCheckedChange={setFAktif} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-emerald-200 text-emerald-700">Batal</Button>
            <Button onClick={submit} disabled={submitting} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700">
              {submitting ? 'Menyimpan...' : editing ? 'Perbarui Produk' : 'Tambah Produk'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ============================================================================
// TAB 2: Kategori Produk
// ============================================================================
function KategoriProdukTab() {
  const [data, setData] = React.useState<ProductCategory[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ProductCategory | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const [fNama, setFNama] = React.useState('')
  const [fDeskripsi, setFDeskripsi] = React.useState('')

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.toko.adminKategori()
      setData(res as ProductCategory[])
    } catch (e: any) {
      toast.error('Gagal memuat kategori', { description: e.message })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null); setFNama(''); setFDeskripsi(''); setDialogOpen(true)
  }

  const openEdit = (k: ProductCategory) => {
    setEditing(k); setFNama(k.name); setFDeskripsi(k.description || ''); setDialogOpen(true)
  }

  const submit = async () => {
    if (!fNama.trim()) { toast.error('Nama kategori wajib diisi'); return }
    setSubmitting(true)
    try {
     const payload = { name: fNama.trim(), description: fDeskripsi.trim() || undefined }
      if (editing) {
        await api.toko.adminKategoriUpdate(editing.id, payload)
        toast.success('Kategori berhasil diperbarui')
      } else {
        await api.toko.adminKategoriCreate(payload)
        toast.success('Kategori berhasil dibuat')
      }
      setDialogOpen(false); load()
    } catch (e: any) {
      toast.error('Gagal menyimpan kategori', { description: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (k: ProductCategory) => {
    if (!confirm(`Hapus kategori "${k.name}"?`)) return
    try {
      await api.toko.adminKategoriDelete(k.id)
      toast.success('Kategori berhasil dihapus'); load()
    } catch (e: any) {
      toast.error('Gagal menghapus kategori', { description: e.message })
    }
  }

  return (
    <Card className="border-emerald-100">
      <CardHeader className="border-b border-emerald-100/70">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-emerald-900">
              <Tag className="h-5 w-5 text-emerald-600" />
              Kategori Produk
            </CardTitle>
            <CardDescription className="text-emerald-700/70">
              Kelola kategori untuk mengorganisir produk toko.
            </CardDescription>
          </div>
          <Button onClick={openCreate} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700">
            <Plus className="h-4 w-4" /> Tambah Kategori
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {loading ? (
          <TableSkeleton rows={4} />
        ) : data.length === 0 ? (
          <EmptyState message="Belum ada kategori produk" />
        ) : (
          <div className="max-h-[480px] overflow-auto rounded-lg border border-emerald-100/70">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-emerald-50/95 backdrop-blur">
                <TableRow className="border-emerald-100 hover:bg-transparent">
                  <TableHead className="text-emerald-800">Nama</TableHead>
                  <TableHead className="text-emerald-800">Slug</TableHead>
                  <TableHead className="text-emerald-800">Deskripsi</TableHead>
                  <TableHead className="text-right text-emerald-800">Jumlah Produk</TableHead>
                  <TableHead className="text-center text-emerald-800">Status</TableHead>
                  <TableHead className="text-right text-emerald-800">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((k) => (
                  <TableRow key={k.id} className="border-emerald-50">
                    <TableCell className="font-medium text-emerald-900">{k.name}</TableCell>
                    <TableCell className="font-mono text-xs text-emerald-700/60">{k.slug}</TableCell>
                    <TableCell className="text-emerald-700/80 text-sm max-w-[200px] truncate">{k.description || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="border-emerald-200 text-emerald-700">
                        {k.productCount ?? 0} produk
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {k.aktif !== false ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Aktif</Badge>
                      ) : (
                        <Badge variant="outline" className="text-zinc-500">Nonaktif</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="outline" className="h-7 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => openEdit(k)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(k)}>
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-900">
              <Tag className="h-5 w-5 text-emerald-600" />
              {editing ? 'Edit Kategori' : 'Tambah Kategori Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-emerald-800">Nama Kategori <span className="text-rose-500">*</span></Label>
              <Input value={fNama} onChange={(e) => setFNama(e.target.value)} placeholder="Nama kategori" className="border-emerald-200" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-emerald-800">Deskripsi</Label>
              <Textarea value={fDeskripsi} onChange={(e) => setFDeskripsi(e.target.value)} placeholder="Deskripsi kategori..." rows={3} className="border-emerald-200" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-emerald-200 text-emerald-700">Batal</Button>
            <Button onClick={submit} disabled={submitting} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700">
              {submitting ? 'Menyimpan...' : editing ? 'Perbarui' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ============================================================
// Helper: Print POS receipt via new window (avoids CSS conflicts)
// ============================================================
function printPosReceipt(receiptData: any) {
  if (!receiptData) return
  let html = ''
  // Header
  html += `<div class="struk-header">
    <div class="icon">🛒</div>
    <h2>Bank Sampah</h2>
    <div class="sub">Sukamaju Sejahtera</div>
    <div class="desc">Toko Offline (Kasir)</div>
    <div class="badge">STRUK PENJUALAN PRODUK</div>
  </div>`
  // Info
  html += `<div class="struk-section">
    <div class="info-row"><span class="key">No. Transaksi</span><span class="val mono">${receiptData.orderNumber || receiptData.id}</span></div>
    <div class="info-row"><span class="key">Tanggal</span><span class="val">${formatDateTime(receiptData.createdAt)}</span></div>
    <div class="info-row"><span class="key">Pembeli</span><span class="val bold">${receiptData.buyerName || '-'}</span></div>
    <div class="info-row"><span class="key">Metode Bayar</span><span class="val" style="text-transform:capitalize">${receiptData.paymentMethod || '-'}</span></div>
  </div>`
  // Items
  if (receiptData.items && receiptData.items.length > 0) {
    html += `<div class="struk-section">
      <div class="label">Detail Pembelian</div>
      <table class="items-table">
        <thead><tr>
          <th>Produk</th>
          <th class="center">Qty</th>
          <th class="right">Subtotal</th>
        </tr></thead>
        <tbody>`
    for (const item of receiptData.items) {
      html += `<tr>
        <td>${item.namaProduk}</td>
        <td class="center">${toNumber(item.qty)}</td>
        <td class="right">${formatRupiah(toNumber(item.subtotal))}</td>
      </tr>`
    }
    html += `</tbody></table></div>`
  }
  // Summary
  html += `<div class="struk-section">
    <div class="label">Ringkasan Pembayaran</div>
    <div class="summary-row"><span class="key">Subtotal</span><span class="val">${formatRupiah(toNumber(receiptData.subtotal))}</span></div>`
  if (toNumber(receiptData.discount) > 0) {
    html += `<div class="summary-row"><span class="key">Diskon</span><span class="val" style="color:#dc2626">-${formatRupiah(toNumber(receiptData.discount))}</span></div>`
  }
  html += `<div class="summary-row highlight"><span class="key">Total</span><span class="val">${formatRupiah(toNumber(receiptData.total))}</span></div>
    <div class="summary-row"><span class="key">Dibayar</span><span class="val">${formatRupiah(toNumber(receiptData.amountPaid))}</span></div>`
  if (toNumber(receiptData.change) > 0) {
    html += `<div class="summary-row"><span class="key">Kembalian</span><span class="val" style="font-weight:700;color:#047857">${formatRupiah(toNumber(receiptData.change))}</span></div>`
  }
  html += `</div>`
  // Footer
  html += `<div class="struk-footer">
    <div class="thanks">Terima kasih atas pembelian Anda</div>
    <div class="sub-thanks">Barang yang sudah dibeli tidak dapat dikembalikan</div>
    <div class="signature-area">
      <div class="sig"><div class="line"></div><div class="label">Pembeli</div></div>
      <div class="sig"><div class="line"></div><div class="label">Kasir</div></div>
    </div>
  </div>`
  printStruk(html)
}

// ============================================================================
// TAB 3: Mini-POS (Kasir Offline)
// ============================================================================
function MiniPosTab() {
  const [produkList, setProdukList] = React.useState<TokoProduk[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')

  const [cart, setCart] = React.useState<CartItem[]>([])
  const [discount, setDiscount] = React.useState('')
  const [payMethod, setPayMethod] = React.useState<'tunai' | 'transfer'>('tunai')
  const [payAmount, setPayAmount] = React.useState('')
  const [buyerName, setBuyerName] = React.useState('')
  const [buyerPhone, setBuyerPhone] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  const [receiptOpen, setReceiptOpen] = React.useState(false)
  const [receiptData, setReceiptData] = React.useState<any>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.toko.adminProduk()
      const all = (res as any[]).map(mapProduk).filter((p) => p.aktif !== false && p.dijualOffline)
      setProdukList(all)
    } catch (e: any) {
      toast.error('Gagal memuat produk', { description: e.message })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const filteredProduk = produkList.filter((p) =>
    p.nama.toLowerCase().includes(search.toLowerCase())
  )

  const addToCart = (produk: TokoProduk) => {
    const existing = cart.find((c) => c.produk.id === produk.id)
    if (existing) {
      const maxQty = toNumber(produk.maxOrderQty) || 9999
      if (existing.qty + 1 > maxQty) {
        toast.warning(`Maksimal order ${maxQty} ${produk.satuan}`)
        return
      }
      if (existing.qty + 1 > toNumber(produk.stok)) {
        toast.warning('Stok tidak mencukupi')
        return
      }
      setCart((prev) => prev.map((c) => c.produk.id === produk.id ? { ...c, qty: c.qty + 1 } : c))
    } else {
      setCart((prev) => [...prev, { produk, qty: 1 }])
    }
  }

  const updateQty = (produkId: string, delta: number) => {
    setCart((prev) => prev.map((c) => {
      if (c.produk.id !== produkId) return c
      const newQty = c.qty + delta
      if (newQty <= 0) return c
      const maxQty = toNumber(c.produk.maxOrderQty) || 9999
      if (newQty > maxQty) return c
      if (newQty > toNumber(c.produk.stok)) return c
      return { ...c, qty: newQty }
    }))
  }

  const removeFromCart = (produkId: string) => {
    setCart((prev) => prev.filter((c) => c.produk.id !== produkId))
  }

  const subtotal = cart.reduce((s, c) => s + toNumber(c.produk.hargaJual) * c.qty, 0)
  const discountVal = Number(discount) || 0
  const total = Math.max(0, subtotal - discountVal)
  const payAmountVal = Number(payAmount) || 0
  const change = payAmountVal - total

  const canProcess = cart.length > 0 && total > 0 && buyerName.trim() && (payMethod === 'transfer' || payAmountVal >= total)

  const processTransaction = async () => {
    if (!canProcess) return
    setSubmitting(true)
    try {
      const items = cart.map((c) => ({
  productId: c.produk.id,
  quantity: c.qty,
  pricePerUnit: toNumber(c.produk.hargaJual),
  subtotal: toNumber(c.produk.hargaJual) * c.qty,
}))
      const res = await api.toko.adminPos({
        items,
        discount: discountVal,
        total,
        paymentMethod: payMethod,
        amountPaid: payMethod === 'tunai' ? payAmountVal : total,
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim() || undefined,
      })
      setReceiptData(res)
      setReceiptOpen(true)
      toast.success('Transaksi berhasil diproses')
      // Reset cart
      setCart([]); setDiscount(''); setPayAmount('')
      setBuyerName(''); setBuyerPhone('')
      load()
    } catch (e: any) {
      toast.error('Gagal memproses transaksi', { description: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* Left Panel: Product Grid */}
      <Card className="border-emerald-100 lg:col-span-3">
        <CardHeader className="border-b border-emerald-100/70 pb-3">
          <CardTitle className="flex items-center gap-2 text-emerald-900 text-base">
            <Store className="h-5 w-5 text-emerald-600" />
            Produk Tersedia (Offline)
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-emerald-500" />
            <Input
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 border-emerald-200 bg-white"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-lg" />
              ))}
            </div>
          ) : filteredProduk.length === 0 ? (
            <EmptyState message="Tidak ada produk offline ditemukan" />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredProduk.map((p) => {
                const inCart = cart.find((c) => c.produk.id === p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="group relative flex flex-col items-start rounded-lg border border-emerald-100 bg-white p-3 text-left transition hover:border-emerald-300 hover:shadow-sm"
                  >
                    {inCart && (
                      <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white shadow-sm">
                        {inCart.qty}
                      </div>
                    )}
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-50 self-center mb-2">
                      {p.gambarUrl ? (
                        <img src={p.gambarUrl} alt={p.nama} className="h-14 w-14 rounded-lg object-cover" />
                      ) : (
                        <Package className="h-6 w-6 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-emerald-900 line-clamp-2 leading-tight">{p.nama}</p>
                    <p className="mt-1 text-sm font-bold text-emerald-700">{formatRupiah(toNumber(p.hargaJual))}</p>
                    <p className={`mt-0.5 text-[11px] ${toNumber(p.stok) <= 5 ? 'text-amber-600 font-semibold' : 'text-emerald-700/60'}`}>
                      Stok: {formatNumber(toNumber(p.stok), 0)} {p.satuan}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right Panel: Cart */}
      <Card className="border-emerald-100 lg:col-span-2">
        <CardHeader className="border-b border-emerald-100/70 pb-3">
          <CardTitle className="flex items-center gap-2 text-emerald-900 text-base">
            <ShoppingCart className="h-5 w-5 text-emerald-600" />
            Keranjang
            {cart.length > 0 && (
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 ml-1">{cart.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Cart Items */}
          <div className="max-h-[240px] overflow-y-auto space-y-2 pr-1">
            {cart.length === 0 && (
              <p className="text-center text-sm text-emerald-700/50 py-6">Keranjang kosong. Klik produk untuk menambahkan.</p>
            )}
            {cart.map((c) => (
              <div key={c.produk.id} className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/30 p-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-900 truncate">{c.produk.nama}</p>
                  <p className="text-xs text-emerald-700/60">{formatRupiah(toNumber(c.produk.hargaJual))} / {c.produk.satuan}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="h-7 w-7 border-emerald-200 text-emerald-700" onClick={() => updateQty(c.produk.id, -1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm font-semibold text-emerald-900">{c.qty}</span>
                  <Button size="icon" variant="outline" className="h-7 w-7 border-emerald-200 text-emerald-700" onClick={() => updateQty(c.produk.id, 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <p className="w-20 text-right text-sm font-semibold text-emerald-900">{formatRupiah(toNumber(c.produk.hargaJual) * c.qty)}</p>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 hover:bg-rose-50" onClick={() => removeFromCart(c.produk.id)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <Separator className="bg-emerald-100" />

          {/* Summary */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-emerald-700/70">Subtotal</span>
              <span className="font-semibold text-emerald-900">{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm text-emerald-700/70">Diskon (Rp)</Label>
              <Input type="number" inputMode="numeric" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" className="w-28 h-8 text-sm border-emerald-200 text-right" />
            </div>
            <Separator className="bg-emerald-100" />
            <div className="flex justify-between text-base">
              <span className="font-semibold text-emerald-900">Total</span>
              <span className="font-bold text-emerald-900">{formatRupiah(total)}</span>
            </div>
          </div>

          <Separator className="bg-emerald-100" />

          {/* Payment */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-emerald-800">Metode Pembayaran</Label>
              <div className="flex gap-2">
                <Button size="sm" variant={payMethod === 'tunai' ? 'default' : 'outline'} onClick={() => setPayMethod('tunai')} className={payMethod === 'tunai' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-emerald-200 text-emerald-700'}>
                  <CreditCard className="h-3.5 w-3.5 mr-1" /> Tunai
                </Button>
                <Button size="sm" variant={payMethod === 'transfer' ? 'default' : 'outline'} onClick={() => setPayMethod('transfer')} className={payMethod === 'transfer' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-emerald-200 text-emerald-700'}>
                  <CreditCard className="h-3.5 w-3.5 mr-1" /> Transfer
                </Button>
              </div>
            </div>

            {payMethod === 'tunai' && (
              <div className="space-y-1.5">
                <Label className="text-sm text-emerald-800">Jumlah Dibayar</Label>
                <Input type="number" inputMode="numeric" min="0" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0" className="border-emerald-200" />
                {payAmountVal >= total && total > 0 && (
                  <p className="text-sm font-semibold text-emerald-700">
                    Kembalian: {formatRupiah(change)}
                  </p>
                )}
              </div>
            )}
          </div>

          <Separator className="bg-emerald-100" />

          {/* Buyer Info */}
          <div className="space-y-2">
            <div className="space-y-1.5">
              <Label className="text-sm text-emerald-800">Nama Pembeli <span className="text-rose-500">*</span></Label>
              <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Nama pembeli" className="border-emerald-200" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-emerald-800">No. Telepon</Label>
              <Input value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} placeholder="Opsional" className="border-emerald-200" />
            </div>
          </div>

          <Button
            onClick={processTransaction}
            disabled={!canProcess || submitting}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700"
          >
            {submitting ? 'Memproses...' : 'Proses Transaksi'}
          </Button>
        </CardContent>
      </Card>

      {/* Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogTitle className="sr-only">Struk Transaksi Penjualan</DialogTitle>
          {receiptData && (
            <div id="printable-struk" className="relative bg-white">
              {/* Header */}
              <div className="border-b-2 border-dashed border-zinc-300 bg-emerald-50 px-5 py-4 text-center">
                <div className="mb-1 text-2xl">🛒</div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-900">Bank Sampah</h2>
                <p className="text-xs font-semibold text-emerald-700">Sukamaju Sejahtera</p>
                <p className="mt-0.5 text-[10px] text-emerald-600/70">Toko Offline (Kasir)</p>
                <div className="mt-2 inline-block rounded-full bg-emerald-600 px-3 py-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white">STRUK PENJUALAN PRODUK</p>
                </div>
              </div>

              {/* Info Section */}
              <div className="space-y-1.5 border-b-2 border-dashed border-zinc-300 px-5 py-4">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="shrink-0 text-zinc-500">No. Transaksi</span>
                  <span className="text-right font-mono font-medium text-zinc-900">{receiptData.orderNumber || receiptData.id}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="shrink-0 text-zinc-500">Tanggal</span>
                  <span className="text-right font-medium text-zinc-900">{formatDateTime(receiptData.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="shrink-0 text-zinc-500">Pembeli</span>
                  <span className="text-right font-bold text-zinc-900">{receiptData.buyerName}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="shrink-0 text-zinc-500">Metode Bayar</span>
                  <span className="text-right font-medium capitalize text-zinc-900">{receiptData.paymentMethod}</span>
                </div>
              </div>

              {/* Items */}
              <div className="border-b-2 border-dashed border-zinc-300 px-5 py-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Detail Pembelian</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-[9px] uppercase text-zinc-400">
                      <th className="pb-1.5 font-semibold">Produk</th>
                      <th className="pb-1.5 text-center font-semibold">Qty</th>
                      <th className="pb-1.5 text-right font-semibold">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(receiptData.items || []).map((item: any, i: number) => (
                      <tr key={i} className="border-b border-dashed border-zinc-100 last:border-0">
                        <td className="py-1.5 text-zinc-700">{item.namaProduk}</td>
                        <td className="py-1.5 text-center text-zinc-600">{toNumber(item.qty)}</td>
                        <td className="py-1.5 text-right font-medium text-zinc-900">{formatRupiah(toNumber(item.subtotal))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="border-b-2 border-dashed border-zinc-300 px-5 py-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Ringkasan Pembayaran</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Subtotal</span>
                    <span className="font-medium text-zinc-900">{formatRupiah(toNumber(receiptData.subtotal))}</span>
                  </div>
                  {toNumber(receiptData.discount) > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Diskon</span>
                      <span className="font-medium text-rose-600">-{formatRupiah(toNumber(receiptData.discount))}</span>
                    </div>
                  )}
                  <div className="flex justify-between rounded-md bg-emerald-50 px-2 py-1.5 text-sm font-bold">
                    <span className="text-emerald-900">Total</span>
                    <span className="text-emerald-700">{formatRupiah(toNumber(receiptData.total))}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Dibayar</span>
                    <span className="font-medium text-zinc-900">{formatRupiah(toNumber(receiptData.amountPaid))}</span>
                  </div>
                  {toNumber(receiptData.change) > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Kembalian</span>
                      <span className="font-bold text-emerald-700">{formatRupiah(toNumber(receiptData.change))}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 text-center">
                <p className="text-[11px] font-medium text-zinc-500">Terima kasih atas pembelian Anda</p>
                <p className="text-[10px] text-zinc-400">Barang yang sudah dibeli tidak dapat dikembalikan</p>
                <div className="mt-4 flex justify-between gap-4 text-[10px] text-zinc-400">
                  <div className="flex-1 text-center">
                    <p className="h-8">&nbsp;</p>
                    <p className="border-t border-zinc-300 pt-0.5 font-medium text-zinc-500">Pembeli</p>
                  </div>
                  <div className="flex-1 text-center">
                    <p className="h-8">&nbsp;</p>
                    <p className="border-t border-zinc-300 pt-0.5 font-medium text-zinc-500">Kasir</p>
                  </div>
                </div>
              </div>
            </div>
          )}
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
              onClick={() => printPosReceipt(receiptData)}
              className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Printer className="mr-1.5 h-4 w-4" /> Cetak Struk
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================================
// TAB 4: Data Penjualan (Sales Center)
// ============================================================================
function DataPenjualanTab() {
  const [data, setData] = React.useState<{ orders: OrderRow[]; stats: any }>({ orders: [], stats: {} })
  const [loading, setLoading] = React.useState(true)
  const [filterChannel, setFilterChannel] = React.useState('semua')
  const [filterStatus, setFilterStatus] = React.useState('')
  const [filterDari, setFilterDari] = React.useState('')
  const [filterSampai, setFilterSampai] = React.useState('')
  const [search, setSearch] = React.useState('')

  const [detailOpen, setDetailOpen] = React.useState(false)
  const [viewing, setViewing] = React.useState<OrderRow | null>(null)

  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false)
  const [newStatus, setNewStatus] = React.useState('')
  const [kurirNama, setKurirNama] = React.useState('')
  const [noResi, setNoResi] = React.useState('')
  const [updatingStatus, setUpdatingStatus] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterChannel !== 'semua') params.set('channel', filterChannel)
      if (filterStatus) params.set('status', filterStatus)
      if (filterDari) params.set('dari', filterDari)
      if (filterSampai) params.set('sampai', filterSampai)
      if (search) params.set('q', search)
      const res = await api.toko.adminPenjualan(params.toString())
      setData({
        orders: ((res as any).orders || []).map(mapOrderRow),
        stats: (res as any).stats || {},
      })
    } catch (e: any) {
      toast.error('Gagal memuat data penjualan', { description: e.message })
    } finally {
      setLoading(false)
    }
  }, [filterChannel, filterStatus, filterDari, filterSampai, search])

  React.useEffect(() => { load() }, [load])

  const openDetail = (order: OrderRow) => {
    setViewing(order)
    setDetailOpen(true)
  }

  const openStatusDialog = (order: OrderRow) => {
    setViewing(order)
    setNewStatus('')
    setKurirNama(order.kurirNama || '')
    setNoResi(order.noResi || '')
    setStatusDialogOpen(true)
  }

  const updateStatus = async () => {
    if (!viewing || !newStatus) return
    setUpdatingStatus(true)
    try {
      const payload: any = { status: newStatus }
      if (newStatus === 'dikirim') {
        payload.kurirNama = kurirNama.trim()
        payload.noResi = noResi.trim()
      }
      await api.toko.adminOrderStatus(viewing.id, payload)
      toast.success('Status pesanan berhasil diperbarui')
      setStatusDialogOpen(false)
      setDetailOpen(false)
      load()
    } catch (e: any) {
      toast.error('Gagal update status', { description: e.message })
    } finally {
      setUpdatingStatus(false)
    }
  }

  const stats = data.stats || {}
  const orders = data.orders || []

  const channelBadge = (channel: string) => {
    if (channel === 'online') return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Online</Badge>
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Offline</Badge>
  }

  const statusPembayaranBadge = (status: string) => {
    switch (status) {
      case 'lunas':
      case 'paid':
      case 'dibayar': return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Dibayar</Badge>
      case 'belum_bayar':
      case 'menunggu': return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100">Belum Bayar</Badge>
      case 'pending': return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>
      case 'gagal': return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Gagal</Badge>
      case 'expired': return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Expired</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const statusPesananBadge = (status: string) => {
    switch (status) {
      case 'baru':
      case 'selesai': return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{status === 'baru' ? 'Baru' : 'Selesai'}</Badge>
      case 'menunggu_pembayaran': return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Menunggu Bayar</Badge>
      case 'dibayar': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Dibayar</Badge>
      case 'diproses': return <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100">Diproses</Badge>
      case 'dikirim': return <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100">Dikirim</Badge>
      case 'diterima': return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Diterima</Badge>
      case 'dibatalkan': return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100">Dibatalkan</Badge>
      case 'expired': return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Expired</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Card className="border-emerald-100">
      <CardHeader className="border-b border-emerald-100/70">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-emerald-900">
              <ClipboardList className="h-5 w-5 text-emerald-600" />
              Data Penjualan
            </CardTitle>
            <CardDescription className="text-emerald-700/70">
              Semua transaksi penjualan online dan offline.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            <RefreshCw className="h-4 w-4" /> Muat Ulang
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Coins} label="Total Penjualan" value={formatRupiah(toNumber(stats.totalPenjualan))} accent="emerald" />
          <StatCard icon={Globe} label="Penjualan Online" value={formatRupiah(toNumber(stats.totalOnline))} sub={`${stats.countOnline || 0} transaksi`} accent="teal" />
          <StatCard icon={Store} label="Penjualan Offline" value={formatRupiah(toNumber(stats.totalOffline))} sub={`${stats.countOffline || 0} transaksi`} accent="amber" />
          <StatCard icon={ShoppingBag} label="Rata-rata / Transaksi" value={formatRupiah(toNumber(stats.avgPerTransaction))} accent="emerald" />
        </div>

        <Separator className="my-4 bg-emerald-100" />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterChannel} onValueChange={setFilterChannel}>
            <SelectTrigger className="w-[150px] border-emerald-200 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Channel</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-[150px] border-emerald-200 bg-white"><SelectValue placeholder="Semua Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Semua Status</SelectItem>
              <SelectItem value="baru">Baru</SelectItem>
              <SelectItem value="diproses">Diproses</SelectItem>
              <SelectItem value="dikirim">Dikirim</SelectItem>
              <SelectItem value="diterima">Diterima</SelectItem>
              <SelectItem value="dibatalkan">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={filterDari} onChange={(e) => setFilterDari(e.target.value)} className="w-[160px] border-emerald-200 bg-white" />
          <Input type="date" value={filterSampai} onChange={(e) => setFilterSampai(e.target.value)} className="w-[160px] border-emerald-200 bg-white" />
          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-emerald-500" />
            <Input placeholder="Cari no. order / pembeli..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 border-emerald-200 bg-white" />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <TableSkeleton rows={6} />
        ) : orders.length === 0 ? (
          <EmptyState message="Belum ada data penjualan" />
        ) : (
          <div className="mt-4 max-h-[480px] overflow-auto rounded-lg border border-emerald-100/70">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-emerald-50/95 backdrop-blur">
                <TableRow className="border-emerald-100 hover:bg-transparent">
                  <TableHead className="text-emerald-800">No. Order</TableHead>
                  <TableHead className="text-emerald-800">Tanggal</TableHead>
                  <TableHead className="text-center text-emerald-800">Channel</TableHead>
                  <TableHead className="text-emerald-800">Pembeli</TableHead>
                  <TableHead className="text-center text-emerald-800">Produk</TableHead>
                  <TableHead className="text-right text-emerald-800">Total</TableHead>
                  <TableHead className="text-center text-emerald-800">Bayar</TableHead>
                  <TableHead className="text-center text-emerald-800">Pesanan</TableHead>
                  <TableHead className="text-right text-emerald-800">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id} className="border-emerald-50">
                    <TableCell className="font-mono text-xs font-semibold text-emerald-900">{o.orderNumber}</TableCell>
                    <TableCell className="text-sm text-emerald-700/80">{formatDateTime(o.createdAt)}</TableCell>
                    <TableCell className="text-center">{channelBadge(o.channel)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-emerald-900">{o.namaPembeli}</p>
                        {o.telpPembeli && <p className="text-[11px] text-emerald-700/60">{o.telpPembeli}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="border-emerald-200 text-emerald-700">
                        {o.items?.length || 0} item
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-900">{formatRupiah(toNumber(o.total))}</TableCell>
                    <TableCell className="text-center">{statusPembayaranBadge(o.statusPembayaran)}</TableCell>
                    <TableCell className="text-center">{statusPesananBadge(o.statusPesanan)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="outline" className="h-7 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => openDetail(o)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {o.channel === 'online' && !['dibatalkan', 'diterima'].includes(o.statusPesanan) && (
                          <Button size="sm" variant="outline" className="h-7 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => openStatusDialog(o)}>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
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
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-900">
              <Receipt className="h-5 w-5 text-emerald-600" />
              Detail Pesanan {viewing?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
                <div>
                  <p className="text-[11px] text-emerald-700/60">No. Order</p>
                  <p className="font-mono text-sm font-semibold text-emerald-900">{viewing.orderNumber}</p>
                </div>
                <div>
                  <p className="text-[11px] text-emerald-700/60">Tanggal</p>
                  <p className="text-sm text-emerald-900">{formatDateTime(viewing.createdAt)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-emerald-700/60">Channel</p>
                  {channelBadge(viewing.channel)}
                </div>
                <div>
                  <p className="text-[11px] text-emerald-700/60">Status Pesanan</p>
                  {statusPesananBadge(viewing.statusPesanan)}
                </div>
              </div>

              {/* Items */}
              <div className="space-y-1.5">
                <Label className="text-emerald-800">Item Pesanan</Label>
                <div className="overflow-x-auto rounded-lg border border-emerald-100">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-emerald-100 hover:bg-transparent">
                        <TableHead className="text-emerald-800">Produk</TableHead>
                        <TableHead className="text-right text-emerald-800">Harga</TableHead>
                        <TableHead className="text-right text-emerald-800">Qty</TableHead>
                        <TableHead className="text-right text-emerald-800">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewing.items?.map((item, idx) => (
                        <TableRow key={item.id || `item-${idx}`} className="border-emerald-50">
                          <TableCell className="text-sm text-emerald-900">{item.namaProduk}</TableCell>
                          <TableCell className="text-right text-sm text-emerald-700/80">{formatRupiah(toNumber(item.hargaSatuan))}</TableCell>
                          <TableCell className="text-right text-sm text-emerald-900">{formatNumber(toNumber(item.qty), 0)}</TableCell>
                          <TableCell className="text-right text-sm font-semibold text-emerald-900">{formatRupiah(toNumber(item.subtotal))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Buyer Info */}
              <div className="space-y-1.5">
                <Label className="text-emerald-800">Info Pembeli</Label>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-emerald-700/70">Nama</span>
                    <span className="text-emerald-900">{viewing.namaPembeli}</span>
                  </div>
                  {viewing.telpPembeli && (
                    <div className="flex justify-between">
                      <span className="text-emerald-700/70">Telepon</span>
                      <span className="text-emerald-900">{viewing.telpPembeli}</span>
                    </div>
                  )}
                  {viewing.alamatPengiriman && (
                    <div>
                      <span className="text-emerald-700/70">Alamat Pengiriman</span>
                      <p className="text-emerald-900 mt-0.5">{viewing.alamatPengiriman}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ongkir (online) */}
              {viewing.channel === 'online' && toNumber(viewing.ongkir) > 0 && (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-emerald-700/70">Ongkos Kirim</span>
                    <span className="font-semibold text-emerald-900">{formatRupiah(toNumber(viewing.ongkir))}</span>
                  </div>
                </div>
              )}

              {/* Status Timeline (online) */}
              {viewing.channel === 'online' && viewing.statusHistory && viewing.statusHistory.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-emerald-800">Riwayat Status</Label>
                  <div className="space-y-2 rounded-lg border border-emerald-100 bg-emerald-50/30 p-3">
                    {viewing.statusHistory.map((h, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-emerald-900 capitalize">{h.status}</span>
                            <span className="text-[11px] text-emerald-700/60">{formatDateTime(h.createdAt)}</span>
                          </div>
                          {h.catatan && <p className="text-xs text-emerald-700/60 mt-0.5">{h.catatan}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Kurir info for shipped orders */}
              {viewing.statusPesanan === 'dikirim' && (
                <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-teal-700/70">Kurir</span>
                    <span className="font-medium text-teal-900">{viewing.kurirNama || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-teal-700/70">No. Resi</span>
                    <span className="font-mono font-medium text-teal-900">{viewing.noResi || '-'}</span>
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-100/50 p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-700/70">Subtotal</span>
                  <span className="text-emerald-900">{formatRupiah(viewing.items?.reduce((s, i) => s + toNumber(i.subtotal), 0) || 0)}</span>
                </div>
                {toNumber(viewing.ongkir) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-700/70">Ongkir</span>
                    <span className="text-emerald-900">{formatRupiah(toNumber(viewing.ongkir))}</span>
                  </div>
                )}
                <Separator className="bg-emerald-200" />
                <div className="flex justify-between font-bold text-base">
                  <span className="text-emerald-900">Total</span>
                  <span className="text-emerald-900">{formatRupiah(toNumber(viewing.total))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-700/70">Status Pembayaran</span>
                  {statusPembayaranBadge(viewing.statusPembayaran)}
                </div>
              </div>

              {/* Actions */}
              {viewing.channel === 'online' && !['dibatalkan', 'diterima'].includes(viewing.statusPesanan) && (
                <Button onClick={() => { setDetailOpen(false); openStatusDialog(viewing) }} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700">
                  Update Status Pesanan
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-900">
              <ChevronRight className="h-5 w-5 text-emerald-600" />
              Update Status Pesanan
            </DialogTitle>
            <DialogDescription>Order: {viewing?.orderNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-emerald-800">Status Baru</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="border-emerald-200 bg-white"><SelectValue placeholder="Pilih status..." /></SelectTrigger>
                <SelectContent>
                  {/* Show only valid next transitions based on current status */}
                  {viewing?.statusPesanan === 'menunggu_pembayaran' && (
                    <>
                      <SelectItem value="dibayar">Dibayar (Konfirmasi Pembayaran)</SelectItem>
                      <SelectItem value="diproses">Diproses (Konfirmasi + Proses Langsung)</SelectItem>
                      <SelectItem value="dibatalkan">Batalkan</SelectItem>
                    </>
                  )}
                  {viewing?.statusPesanan === 'dibayar' && (
                    <>
                      <SelectItem value="diproses">Diproses</SelectItem>
                      <SelectItem value="dibatalkan">Batalkan</SelectItem>
                    </>
                  )}
                  {viewing?.statusPesanan === 'diproses' && (
                    <SelectItem value="dikirim">Dikirim</SelectItem>
                  )}
                  {viewing?.statusPesanan === 'dikirim' && (
                    <SelectItem value="diterima">Diterima</SelectItem>
                  )}
                  {!['menunggu_pembayaran', 'dibayar', 'diproses', 'dikirim'].includes(viewing?.statusPesanan || '') && (
                    <>
                      <SelectItem value="diproses">Diproses</SelectItem>
                      <SelectItem value="dikirim">Dikirim</SelectItem>
                      <SelectItem value="diterima">Diterima</SelectItem>
                      <SelectItem value="dibatalkan">Batalkan</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-emerald-700/60">
                Status saat ini: <span className="font-semibold">{statusPesananBadge(viewing?.statusPesanan || '')}</span>
              </p>
            </div>

            {newStatus === 'dikirim' && (
              <div className="space-y-3 rounded-lg border border-teal-200 bg-teal-50/40 p-3">
                <p className="text-sm font-medium text-teal-800">Informasi Pengiriman</p>
                <div className="space-y-1.5">
                  <Label className="text-sm text-teal-800">Nama Kurir</Label>
                  <Input value={kurirNama} onChange={(e) => setKurirNama(e.target.value)} placeholder="Nama kurir" className="border-teal-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-teal-800">No. Resi</Label>
                  <Input value={noResi} onChange={(e) => setNoResi(e.target.value)} placeholder="Nomor resi pengiriman" className="border-teal-200" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)} className="border-emerald-200 text-emerald-700">Batal</Button>
            <Button onClick={updateStatus} disabled={updatingStatus || !newStatus} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700">
              {updatingStatus ? 'Menyimpan...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ============================================================================
// TAB 5: Pengaturan Toko
// ============================================================================
function PengaturanTokoTab() {
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [settings, setSettings] = React.useState<TokoSettings>({
    tokoOnlineAktif: false,
    ongkirPerKg: 0,
    ongkirPerKm: 0,
    ongkirTetap: 0,
    beratMinimumDianggap: 1000,
    alamatAsalPengiriman: '',
    midtransServerKey: '',
    midtransClientKey: '',
    midtransSandbox: true,
    ambangBatasStokRendah: 5,
  })

  const [aturanList, setAturanList] = React.useState<AturanRow[]>([])
  const [kategoriList, setKategoriList] = React.useState<ProductCategory[]>([])

  const [aturanDialogOpen, setAturanDialogOpen] = React.useState(false)
  const [aturanEditing, setAturanEditing] = React.useState<AturanRow | null>(null)
  const [aturanSubmitting, setAturanSubmitting] = React.useState(false)

  const [aKategoriId, setAKategoriId] = React.useState('')
  const [aMinPembelian, setAMinPembelian] = React.useState('')
  const [aMaxPembelian, setAMaxPembelian] = React.useState('')
  const [aBerlakuOffline, setABerlakuOffline] = React.useState(true)
  const [aBerlakuOnline, setABerlakuOnline] = React.useState(true)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [s, a, k] = await Promise.all([
        api.toko.adminSettings(),
        api.toko.adminAturan(),
        api.toko.adminKategori(),
      ])
      if (s) setSettings(mapSettings(s))
      setAturanList((a as any[]).map(mapAturan))
      setKategoriList(k as ProductCategory[])
    } catch (e: any) {
      toast.error('Gagal memuat pengaturan', { description: e.message })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true)
    try {
      await api.toko.adminSettingsUpdate(unmapSettings(settings))
      toast.success('Pengaturan toko berhasil disimpan')
    } catch (e: any) {
      toast.error('Gagal menyimpan pengaturan', { description: e.message })
    } finally {
      setSaving(false)
    }
  }

  const openAturanCreate = () => {
    setAturanEditing(null)
    setAKategoriId(''); setAMinPembelian('1'); setAMaxPembelian('')
    setABerlakuOffline(true); setABerlakuOnline(true)
    setAturanDialogOpen(true)
  }

  const openAturanEdit = (r: AturanRow) => {
    setAturanEditing(r)
    setAKategoriId(r.kategoriId || '')
    setAMinPembelian(String(toNumber(r.minPembelian)))
    setAMaxPembelian(r.maxPembelian ? String(toNumber(r.maxPembelian)) : '')
    setABerlakuOffline(r.berlakuOffline)
    setABerlakuOnline(r.berlakuOnline)
    setAturanDialogOpen(true)
  }

  const submitAturan = async () => {
    if (!aMinPembelian || Number(aMinPembelian) < 1) { toast.error('Min pembelian harus >= 1'); return }
    setAturanSubmitting(true)
    try {
      const payload = {
        productCategoryId: aKategoriId || undefined,
        minPembelian: Number(aMinPembelian),
        maxPembelian: aMaxPembelian ? Number(aMaxPembelian) : undefined,
        berlakuOffline: aBerlakuOffline,
        berlakuOnline: aBerlakuOnline,
      }
      if (aturanEditing) {
        await api.toko.adminAturanUpdate(aturanEditing.id, payload)
        toast.success('Aturan berhasil diperbarui')
      } else {
        await api.toko.adminAturanCreate(payload)
        toast.success('Aturan berhasil dibuat')
      }
      setAturanDialogOpen(false); load()
    } catch (e: any) {
      toast.error('Gagal menyimpan aturan', { description: e.message })
    } finally {
      setAturanSubmitting(false)
    }
  }

  const deleteAturan = async (r: AturanRow) => {
    if (!confirm('Hapus aturan ini?')) return
    try {
      await api.toko.adminAturanDelete(r.id)
      toast.success('Aturan berhasil dihapus'); load()
    } catch (e: any) {
      toast.error('Gagal menghapus aturan', { description: e.message })
    }
  }

  if (loading) {
    return (
      <Card className="border-emerald-100">
        <CardContent className="p-6 space-y-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toko Online */}
      <Card className="border-emerald-100">
        <CardHeader className="border-b border-emerald-100/70 pb-3">
          <CardTitle className="flex items-center gap-2 text-emerald-900 text-base">
            <Globe className="h-5 w-5 text-emerald-600" />
            Toko Online
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/40 p-4">
            <div>
              <Label className="text-emerald-800">Toko Online Aktif</Label>
              <p className="text-[11px] text-emerald-700/60 mt-0.5">
                Aktifkan agar produk dapat dibeli melalui website toko online.
              </p>
            </div>
            <Switch
              checked={settings.tokoOnlineAktif}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, tokoOnlineAktif: v }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ongkir */}
      <Card className="border-emerald-100">
        <CardHeader className="border-b border-emerald-100/70 pb-3">
          <CardTitle className="flex items-center gap-2 text-emerald-900 text-base">
            <Truck className="h-5 w-5 text-emerald-600" />
            Pengaturan Ongkir
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-emerald-800">Rate per Kg (Rp)</Label>
              <Input type="number" inputMode="numeric" min="0" value={String(settings.ongkirPerKg)} onChange={(e) => setSettings((s) => ({ ...s, ongkirPerKg: Number(e.target.value) || 0 }))} className="border-emerald-200" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-emerald-800">Rate per Km (Rp)</Label>
              <Input type="number" inputMode="numeric" min="0" value={String(settings.ongkirPerKm)} onChange={(e) => setSettings((s) => ({ ...s, ongkirPerKm: Number(e.target.value) || 0 }))} className="border-emerald-200" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-emerald-800">Ongkir Tetap (Rp)</Label>
              <Input type="number" inputMode="numeric" min="0" value={String(settings.ongkirTetap)} onChange={(e) => setSettings((s) => ({ ...s, ongkirTetap: Number(e.target.value) || 0 }))} className="border-emerald-200" />
            </div>
          </div>
          <div className="mt-3">
            <Label className="text-sm text-emerald-800">Berat Minimum Dihitung (gram)</Label>
            <Input type="number" inputMode="numeric" min="0" value={String(settings.beratMinimumDianggap)} onChange={(e) => setSettings((s) => ({ ...s, beratMinimumDianggap: Number(e.target.value) || 0 }))} className="border-emerald-200 max-w-xs" />
            <p className="text-[11px] text-emerald-700/60 mt-1">
              Prioritas: Ongkir Tetap → (Berat × Rate/Kg) + (Jarak × Rate/Km). Berat di bawah minimum akan dianggap sebagai berat minimum.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lokasi Pengiriman */}
      <Card className="border-emerald-100">
        <CardHeader className="border-b border-emerald-100/70 pb-3">
          <CardTitle className="flex items-center gap-2 text-emerald-900 text-base">
            <Store className="h-5 w-5 text-emerald-600" />
            Lokasi Pengiriman
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-emerald-800">Alamat Asal Pengiriman</Label>
            <Textarea
              value={settings.alamatAsalPengiriman}
              onChange={(e) => setSettings((s) => ({ ...s, alamatAsalPengiriman: e.target.value }))}
              placeholder="Masukkan alamat lengkap asal pengiriman..."
              rows={3}
              className="border-emerald-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* Midtrans */}
      <Card className="border-emerald-100">
        <CardHeader className="border-b border-emerald-100/70 pb-3">
          <CardTitle className="flex items-center gap-2 text-emerald-900 text-base">
            <CreditCard className="h-5 w-5 text-emerald-600" />
            Midtrans Payment Gateway
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm text-emerald-800">Server Key</Label>
              <Input
                type="password"
                value={settings.midtransServerKey}
                onChange={(e) => setSettings((s) => ({ ...s, midtransServerKey: e.target.value }))}
                placeholder="SB-Mid-server-..."
                className="border-emerald-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-emerald-800">Client Key</Label>
              <Input
                value={settings.midtransClientKey}
                onChange={(e) => setSettings((s) => ({ ...s, midtransClientKey: e.target.value }))}
                placeholder="SB-Mid-client-..."
                className="border-emerald-200"
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
            <div>
              <Label className="text-emerald-800">Mode Sandbox</Label>
              <p className="text-[11px] text-emerald-700/60 mt-0.5">
                Matikan untuk menggunakan mode production (transaksi nyata).
              </p>
            </div>
            <Switch
              checked={settings.midtransSandbox}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, midtransSandbox: v }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stok */}
      <Card className="border-emerald-100">
        <CardHeader className="border-b border-emerald-100/70 pb-3">
          <CardTitle className="flex items-center gap-2 text-emerald-900 text-base">
            <Layers className="h-5 w-5 text-emerald-600" />
            Pengaturan Stok
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-emerald-800">Ambang Batas Stok Rendah</Label>
            <Input
              type="number"
              inputMode="numeric"
              min="0"
              value={String(settings.ambangBatasStokRendah)}
              onChange={(e) => setSettings((s) => ({ ...s, ambangBatasStokRendah: Number(e.target.value) || 0 }))}
              className="border-emerald-200 max-w-xs"
            />
            <p className="text-[11px] text-emerald-700/60">Produk dengan stok di bawah angka ini akan ditandai sebagai stok rendah.</p>
          </div>
        </CardContent>
      </Card>

      {/* Aturan Penjualan */}
      <Card className="border-emerald-100">
        <CardHeader className="border-b border-emerald-100/70">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-emerald-900 text-base">
                <ClipboardList className="h-5 w-5 text-emerald-600" />
                Aturan Penjualan
              </CardTitle>
              <CardDescription className="text-emerald-700/70">
                Atur minimum & maksimum pembelian per kategori atau global.
              </CardDescription>
            </div>
            <Button onClick={openAturanCreate} size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700">
              <Plus className="h-4 w-4" /> Tambah Aturan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {aturanList.length === 0 ? (
            <EmptyState message="Belum ada aturan penjualan" />
          ) : (
            <div className="max-h-[300px] overflow-auto rounded-lg border border-emerald-100/70">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-emerald-50/95 backdrop-blur">
                  <TableRow className="border-emerald-100 hover:bg-transparent">
                    <TableHead className="text-emerald-800">Kategori</TableHead>
                    <TableHead className="text-right text-emerald-800">Min</TableHead>
                    <TableHead className="text-right text-emerald-800">Max</TableHead>
                    <TableHead className="text-center text-emerald-800">Offline</TableHead>
                    <TableHead className="text-center text-emerald-800">Online</TableHead>
                    <TableHead className="text-right text-emerald-800">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aturanList.map((r) => (
                    <TableRow key={r.id} className="border-emerald-50">
                      <TableCell className="font-medium text-emerald-900">
                        {r.kategori?.name || r.kategoriNama || <span className="text-emerald-700/60 italic">Global (semua)</span>}
                      </TableCell>
                      <TableCell className="text-right text-emerald-900">{formatNumber(toNumber(r.minPembelian), 0)}</TableCell>
                      <TableCell className="text-right text-emerald-700/80">{r.maxPembelian ? formatNumber(toNumber(r.maxPembelian), 0) : '∞'}</TableCell>
                      <TableCell className="text-center">
                        {r.berlakuOffline ? <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" /> : <span className="text-zinc-300">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        {r.berlakuOnline ? <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" /> : <span className="text-zinc-300">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="outline" className="h-7 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => openAturanEdit(r)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => deleteAturan(r)}>
                            <Trash2 className="h-3.5 w-3.5" />
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
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 px-8">
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </Button>
      </div>

      {/* Aturan Dialog */}
      <Dialog open={aturanDialogOpen} onOpenChange={setAturanDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-900">
              <ClipboardList className="h-5 w-5 text-emerald-600" />
              {aturanEditing ? 'Edit Aturan' : 'Tambah Aturan Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-emerald-800">Kategori (kosongkan = global)</Label>
              <Select value={aKategoriId} onValueChange={setAKategoriId}>
                <SelectTrigger className="border-emerald-200 bg-white"><SelectValue placeholder="Global (semua kategori)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__global__">Global (semua kategori)</SelectItem>
                  {kategoriList.map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-emerald-800">Min Pembelian</Label>
                <Input type="number" inputMode="numeric" min="1" value={aMinPembelian} onChange={(e) => setAMinPembelian(e.target.value)} className="border-emerald-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-emerald-800">Max Pembelian</Label>
                <Input type="number" inputMode="numeric" min="0" value={aMaxPembelian} onChange={(e) => setAMaxPembelian(e.target.value)} placeholder="Kosongkan = ∞" className="border-emerald-200" />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox checked={aBerlakuOffline} onCheckedChange={(c) => setABerlakuOffline(!!c)} />
                <Label className="text-sm text-emerald-700/80 cursor-pointer">Berlaku Offline</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={aBerlakuOnline} onCheckedChange={(c) => setABerlakuOnline(!!c)} />
                <Label className="text-sm text-emerald-700/80 cursor-pointer">Berlaku Online</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAturanDialogOpen(false)} className="border-emerald-200 text-emerald-700">Batal</Button>
            <Button onClick={submitAturan} disabled={aturanSubmitting} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700">
              {aturanSubmitting ? 'Menyimpan...' : aturanEditing ? 'Perbarui' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================================
// TAB 6: Aturan Penjualan (Standalone)
// ============================================================================
function AturanPenjualanTab() {
  const [data, setData] = React.useState<AturanRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [kategoriList, setKategoriList] = React.useState<ProductCategory[]>([])

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<AturanRow | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const [aKategoriId, setAKategoriId] = React.useState('')
  const [aMinPembelian, setAMinPembelian] = React.useState('')
  const [aMaxPembelian, setAMaxPembelian] = React.useState('')
  const [aBerlakuOffline, setABerlakuOffline] = React.useState(true)
  const [aBerlakuOnline, setABerlakuOnline] = React.useState(true)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [a, k] = await Promise.all([api.toko.adminAturan(), api.toko.adminKategori()])
      setData((a as any[]).map(mapAturan))
      setKategoriList(k as ProductCategory[])
    } catch (e: any) {
      toast.error('Gagal memuat aturan', { description: e.message })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setAKategoriId(''); setAMinPembelian('1'); setAMaxPembelian('')
    setABerlakuOffline(true); setABerlakuOnline(true)
    setDialogOpen(true)
  }

  const openEdit = (r: AturanRow) => {
    setEditing(r)
    setAKategoriId(r.kategoriId || '')
    setAMinPembelian(String(toNumber(r.minPembelian)))
    setAMaxPembelian(r.maxPembelian ? String(toNumber(r.maxPembelian)) : '')
    setABerlakuOffline(r.berlakuOffline)
    setABerlakuOnline(r.berlakuOnline)
    setDialogOpen(true)
  }

  const submit = async () => {
    if (!aMinPembelian || Number(aMinPembelian) < 1) { toast.error('Min pembelian harus >= 1'); return }
    setSubmitting(true)
    try {
      const payload: any = {
        kategoriId: aKategoriId === '__global__' ? undefined : (aKategoriId || undefined),
        minPembelian: Number(aMinPembelian),
        maxPembelian: aMaxPembelian ? Number(aMaxPembelian) : undefined,
        berlakuOffline: aBerlakuOffline,
        berlakuOnline: aBerlakuOnline,
      }
      if (editing) {
        await api.toko.adminAturanUpdate(editing.id, payload)
        toast.success('Aturan berhasil diperbarui')
      } else {
        await api.toko.adminAturanCreate(payload)
        toast.success('Aturan berhasil dibuat')
      }
      setDialogOpen(false); load()
    } catch (e: any) {
      toast.error('Gagal menyimpan aturan', { description: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (r: AturanRow) => {
    if (!confirm('Hapus aturan ini?')) return
    try {
      await api.toko.adminAturanDelete(r.id)
      toast.success('Aturan berhasil dihapus'); load()
    } catch (e: any) {
      toast.error('Gagal menghapus aturan', { description: e.message })
    }
  }

  return (
    <Card className="border-emerald-100">
      <CardHeader className="border-b border-emerald-100/70">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-emerald-900">
              <ClipboardList className="h-5 w-5 text-emerald-600" />
              Aturan Penjualan
            </CardTitle>
            <CardDescription className="text-emerald-700/70">
              Atur minimum & maksimum pembelian per kategori atau global.
            </CardDescription>
          </div>
          <Button onClick={openCreate} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700">
            <Plus className="h-4 w-4" /> Tambah Aturan
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {loading ? (
          <TableSkeleton rows={4} />
        ) : data.length === 0 ? (
          <EmptyState message="Belum ada aturan penjualan" />
        ) : (
          <div className="max-h-[480px] overflow-auto rounded-lg border border-emerald-100/70">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-emerald-50/95 backdrop-blur">
                <TableRow className="border-emerald-100 hover:bg-transparent">
                  <TableHead className="text-emerald-800">Kategori</TableHead>
                  <TableHead className="text-right text-emerald-800">Min Pembelian</TableHead>
                  <TableHead className="text-right text-emerald-800">Max Pembelian</TableHead>
                  <TableHead className="text-center text-emerald-800">Berlaku Offline</TableHead>
                  <TableHead className="text-center text-emerald-800">Berlaku Online</TableHead>
                  <TableHead className="text-right text-emerald-800">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={r.id} className="border-emerald-50">
                    <TableCell className="font-medium text-emerald-900">
                      {r.kategori?.name || r.kategoriNama || <span className="text-emerald-700/60 italic">Global (semua kategori)</span>}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-900">{formatNumber(toNumber(r.minPembelian), 0)}</TableCell>
                    <TableCell className="text-right text-emerald-700/80">{r.maxPembelian ? formatNumber(toNumber(r.maxPembelian), 0) : 'Tidak terbatas'}</TableCell>
                    <TableCell className="text-center">
                      {r.berlakuOffline ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Ya</Badge>
                      ) : (
                        <Badge variant="outline" className="text-zinc-500">Tidak</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.berlakuOnline ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Ya</Badge>
                      ) : (
                        <Badge variant="outline" className="text-zinc-500">Tidak</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="outline" className="h-7 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => openEdit(r)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(r)}>
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-900">
              <ClipboardList className="h-5 w-5 text-emerald-600" />
              {editing ? 'Edit Aturan' : 'Tambah Aturan Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-emerald-800">Kategori (kosongkan = global)</Label>
              <Select value={aKategoriId} onValueChange={setAKategoriId}>
                <SelectTrigger className="border-emerald-200 bg-white"><SelectValue placeholder="Global (semua kategori)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__global__">Global (semua kategori)</SelectItem>
                  {kategoriList.map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-emerald-800">Min Pembelian <span className="text-rose-500">*</span></Label>
                <Input type="number" inputMode="numeric" min="1" value={aMinPembelian} onChange={(e) => setAMinPembelian(e.target.value)} className="border-emerald-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-emerald-800">Max Pembelian</Label>
                <Input type="number" inputMode="numeric" min="0" value={aMaxPembelian} onChange={(e) => setAMaxPembelian(e.target.value)} placeholder="Kosongkan = ∞" className="border-emerald-200" />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox checked={aBerlakuOffline} onCheckedChange={(c) => setABerlakuOffline(!!c)} />
                <Label className="text-sm text-emerald-700/80 cursor-pointer">Berlaku Offline</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={aBerlakuOnline} onCheckedChange={(c) => setABerlakuOnline(!!c)} />
                <Label className="text-sm text-emerald-700/80 cursor-pointer">Berlaku Online</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-emerald-200 text-emerald-700">Batal</Button>
            <Button onClick={submit} disabled={submitting} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700">
              {submitting ? 'Menyimpan...' : editing ? 'Perbarui' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function PenjualanProduk() {
  return (
    <Tabs defaultValue="produk" className="w-full">
      <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-emerald-50 p-1 rounded-xl border border-emerald-100">
        <TabsTrigger value="produk" className="flex items-center gap-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg px-3 py-2 text-sm">
          <Package className="h-4 w-4" />
          <span className="hidden sm:inline">Produk</span>
        </TabsTrigger>
        <TabsTrigger value="kategori" className="flex items-center gap-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg px-3 py-2 text-sm">
          <Tag className="h-4 w-4" />
          <span className="hidden sm:inline">Kategori</span>
        </TabsTrigger>
        <TabsTrigger value="pos" className="flex items-center gap-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg px-3 py-2 text-sm">
          <ShoppingCart className="h-4 w-4" />
          <span className="hidden sm:inline">Mini-POS</span>
        </TabsTrigger>
        <TabsTrigger value="penjualan" className="flex items-center gap-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg px-3 py-2 text-sm">
          <ClipboardList className="h-4 w-4" />
          <span className="hidden sm:inline">Penjualan</span>
        </TabsTrigger>
        <TabsTrigger value="pengaturan" className="flex items-center gap-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg px-3 py-2 text-sm">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Pengaturan</span>
        </TabsTrigger>
        <TabsTrigger value="aturan" className="flex items-center gap-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg px-3 py-2 text-sm">
          <ClipboardList className="h-4 w-4" />
          <span className="hidden sm:inline">Aturan</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="produk">
        <ManajemenProdukTab />
      </TabsContent>
      <TabsContent value="kategori">
        <KategoriProdukTab />
      </TabsContent>
      <TabsContent value="pos">
        <MiniPosTab />
      </TabsContent>
      <TabsContent value="penjualan">
        <DataPenjualanTab />
      </TabsContent>
      <TabsContent value="pengaturan">
        <PengaturanTokoTab />
      </TabsContent>
      <TabsContent value="aturan">
        <AturanPenjualanTab />
      </TabsContent>
    </Tabs>
  )
}