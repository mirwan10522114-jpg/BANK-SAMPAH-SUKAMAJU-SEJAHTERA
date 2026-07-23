'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Package,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ShoppingBag,
  MapPin,
  Phone,
  User,
  Mail,
  Truck,
  Clock,
  XCircle,
  CreditCard,
  Copy,
  Star,
  PackageCheck,
  Box,
  Weight,
  Tag,
  Recycle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { formatRupiah } from '@/lib/format'
import { cn } from '@/lib/utils'

// =====================================================================
// Theme palette (matches public-pages.tsx)
// =====================================================================
const COLORS = {
  darkGreen: '#2d5016',
  beige: '#f5f5dc',
  green: '#4caf50',
  yellow: '#ffc107',
  teal: '#0d9488',
  footerDark: '#2d2d2d',
} as const

// =====================================================================
// Types
// =====================================================================
type MerchView = 'catalog' | 'detail' | 'cart' | 'checkout' | 'payment' | 'success' | 'tracking'

interface CartItem {
  productId: string
  name: string
  price: number
  image: string
  quantity: number
  weightGram: number
  minOrderQty: number
  stock: number
  unit: string
  slug: string
}

interface Product {
  id: string
  slug: string
  name: string
  description: string
  price: number
  images: string[]
  category: string | null
  stock: number
  minOrderQty: number
  weightGram: number
  unit: string
}

// Defensive normalizer: API may return images as string or object
function normalizeProduct(p: any): Product {
  let images: string[] = []
  if (p.images) {
    if (Array.isArray(p.images)) {
      images = p.images
    } else if (typeof p.images === 'string') {
      try { images = JSON.parse(p.images) } catch { images = [] }
    }
  }
  const category = typeof p.category === 'object' && p.category?.name
    ? p.category.name
    : (p.category || null)
  return { ...p, images, category } as Product
}

interface OrderData {
  orderNumber: string
  items: CartItem[]
  total: number
  buyerName: string
  buyerPhone: string
  buyerEmail: string
  address: string
  province: string
  city: string
  district: string
  postalCode: string
}

// =====================================================================
// Fallback API (safe direct fetch)
// =====================================================================
async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers as any) },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// =====================================================================
// Cart helpers (localStorage persistence)
// =====================================================================
const CART_KEY = 'toko-cart'

function getCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CART_KEY, JSON.stringify(items))
}

function addToCart(product: Product, qty: number) {
  const cart = getCart()
  const existing = cart.find((c) => c.productId === product.id)
  if (existing) {
    existing.quantity = Math.min(existing.quantity + qty, product.stock)
  } else {
    cart.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0] || '',
      quantity: qty,
      weightGram: product.weightGram || 0,
      minOrderQty: product.minOrderQty || 1,
      stock: product.stock,
      unit: product.unit || 'pcs',
      slug: product.slug,
    })
  }
  saveCart(cart)
  return cart
}

function updateQuantity(productId: string, qty: number) {
  let cart = getCart()
  const item = cart.find((c) => c.productId === productId)
  if (!item) return cart
  if (qty <= 0) {
    cart = cart.filter((c) => c.productId !== productId)
  } else {
    item.quantity = Math.min(qty, item.stock)
  }
  saveCart(cart)
  return cart
}

function removeFromCart(productId: string) {
  const cart = getCart().filter((c) => c.productId !== productId)
  saveCart(cart)
  return cart
}

function clearCart() {
  saveCart([])
}

function getCartTotal(cart: CartItem[]) {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

function getCartCount(cart: CartItem[]) {
  return cart.reduce((sum, item) => sum + item.quantity, 0)
}

// =====================================================================
// Wilayah types & helpers (Provinsi / Kota / Kecamatan)
// =====================================================================
// Sebelumnya pakai array hardcoded PROVINSI[]. Sekarang fetch dinamis
// dari /api/province, /api/cities, /api/district (master data Kemendagri).
interface Province { id: string; name: string }
interface City { id: string; name: string; provinceId: string }
interface District { id: string; name: string; cityId: string }

// =====================================================================
// Category types & helpers
// =====================================================================
interface Category {
  id: string
  name: string
  slug: string
  image: string | null
  productCount: number
}

// "Semua" is always the first pill; the rest are populated dynamically
// from /api/toko/kategori (matching whatever categories exist in the DB).
const ALL_CATEGORY_PILL = { value: '', label: 'Semua' }

// =====================================================================
// Animation variants
// =====================================================================
const fadeSlide = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.25, ease: 'easeOut' },
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } },
}

const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
}

// =====================================================================
// Placeholder product images (using SVG data URIs with colored backgrounds)
// =====================================================================
function getProductPlaceholder(name: string, index: number) {
  const colors = ['#4caf50', '#0d9488', '#2d5016', '#ffc107', '#45a049', '#00897b']
  const bg = colors[index % colors.length]
  const initial = name.charAt(0).toUpperCase()
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect fill="${bg}" width="400" height="400" rx="16"/><text x="200" y="220" text-anchor="middle" fill="white" font-size="120" font-family="sans-serif" font-weight="bold">${initial}</text></svg>`)}`
}

// =====================================================================
// Main MerchandisePage component
// =====================================================================
export function MerchandisePage({ onBack, initialView }: { onBack: () => void; initialView?: MerchView }) {
  const [view, setView] = React.useState<MerchView>(initialView || 'catalog')
  const [cart, setCart] = React.useState<CartItem[]>([])
  const [selectedSlug, setSelectedSlug] = React.useState<string>('')
  const [orderData, setOrderData] = React.useState<OrderData | null>(null)

  // Sync cart from localStorage on mount
  React.useEffect(() => {
    setCart(getCart())
  }, [])

  const refreshCart = React.useCallback((newCart?: CartItem[]) => {
    setCart(newCart ?? getCart())
  }, [])

  const handleAddToCart = React.useCallback((product: Product, qty: number) => {
    const newCart = addToCart(product, qty)
    refreshCart(newCart)
    toast.success(`${product.name} ditambahkan ke keranjang`)
  }, [refreshCart])

  const handleUpdateQty = React.useCallback((productId: string, qty: number) => {
    const newCart = updateQuantity(productId, qty)
    refreshCart(newCart)
  }, [refreshCart])

  const handleRemoveItem = React.useCallback((productId: string) => {
    const newCart = removeFromCart(productId)
    refreshCart(newCart)
  }, [refreshCart])

  const handleClearCart = React.useCallback(() => {
    clearCart()
    refreshCart([])
  }, [refreshCart])

  const handleGotoDetail = React.useCallback((slug: string) => {
    setSelectedSlug(slug)
    setView('detail')
  }, [])

  const handleGotoCart = React.useCallback(() => {
    setView('cart')
  }, [])

  const handleGotoCheckout = React.useCallback(() => {
    setView('checkout')
  }, [])

  const handleGotoPayment = React.useCallback((data: OrderData) => {
    setOrderData(data)
    setView('payment')
  }, [])

  const handleGotoSuccess = React.useCallback(() => {
    clearCart()
    refreshCart([])
    setView('success')
  }, [refreshCart])

  const handleGotoTracking = React.useCallback(() => {
    setView('tracking')
  }, [])

  const handleGotoCatalog = React.useCallback(() => {
    setView('catalog')
  }, [])

  const cartCount = getCartCount(cart)

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Shared Header */}
      <MerchHeader
        view={view}
        cartCount={cartCount}
        onBack={view === 'catalog' ? onBack : () => setView('catalog')}
        onCart={handleGotoCart}
        onGotoCatalog={handleGotoCatalog}
        onGotoTracking={handleGotoTracking}
      />

      {/* Main content area */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          {view === 'catalog' && (
            <motion.div key="catalog" {...fadeSlide}>
              <CatalogView onGotoDetail={handleGotoDetail} onAddToCart={handleAddToCart} />
            </motion.div>
          )}
          {view === 'detail' && (
            <motion.div key="detail" {...fadeSlide}>
              <DetailView
                slug={selectedSlug}
                onBack={() => setView('catalog')}
                onAddToCart={handleAddToCart}
                onGotoDetail={handleGotoDetail}
              />
            </motion.div>
          )}
          {view === 'cart' && (
            <motion.div key="cart" {...fadeSlide}>
              <CartView
                cart={cart}
                onUpdateQty={handleUpdateQty}
                onRemoveItem={handleRemoveItem}
                onClearCart={handleClearCart}
                onCheckout={handleGotoCheckout}
                onGotoCatalog={handleGotoCatalog}
              />
            </motion.div>
          )}
          {view === 'checkout' && (
            <motion.div key="checkout" {...fadeSlide}>
              <CheckoutView
                cart={cart}
                onBack={() => setView('cart')}
                onGotoPayment={handleGotoPayment}
              />
            </motion.div>
          )}
          {view === 'payment' && (
            <motion.div key="payment" {...fadeSlide}>
              <PaymentView
                orderData={orderData}
                onBack={() => setView('checkout')}
                onSuccess={handleGotoSuccess}
              />
            </motion.div>
          )}
          {view === 'success' && (
            <motion.div key="success" {...fadeSlide}>
              <SuccessView
                orderData={orderData}
                onGotoCatalog={handleGotoCatalog}
                onGotoTracking={handleGotoTracking}
              />
            </motion.div>
          )}
          {view === 'tracking' && (
            <motion.div key="tracking" {...fadeSlide}>
              <TrackingView onGotoCatalog={handleGotoCatalog} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer (only on catalog) */}
      {view === 'catalog' && <MerchFooter />}
    </div>
  )
}

// =====================================================================
// Shared Header
// =====================================================================
function MerchHeader({
  view,
  cartCount,
  onBack,
  onCart,
  onGotoCatalog,
  onGotoTracking,
}: {
  view: MerchView
  cartCount: number
  onBack: () => void
  onCart: () => void
  onGotoCatalog: () => void
  onGotoTracking: () => void
}) {
  const isRoot = view === 'catalog'
  const title =
    view === 'cart'
      ? 'Keranjang Belanja'
      : view === 'checkout'
        ? 'Checkout'
        : view === 'payment'
          ? 'Pembayaran'
          : view === 'success'
            ? 'Pesanan Berhasil'
            : view === 'tracking'
              ? 'Lacak Pesanan'
              : 'Merchandise Bank Sampah'

  return (
    <header
      className="sticky top-0 z-30 w-full"
      style={{ backgroundColor: COLORS.darkGreen }}
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Kembali"
          >
            <ArrowLeft className="size-5" />
          </button>
          {isRoot ? (
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-white/15">
                <ShoppingBag className="size-4 text-white" />
              </div>
              <h1 className="text-sm font-bold tracking-wide text-white sm:text-base">
                Merchandise
              </h1>
            </div>
          ) : (
            <h1 className="text-sm font-bold text-white sm:text-base">{title}</h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isRoot && (
            <button
              type="button"
              onClick={onGotoTracking}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Lacak Pesanan"
            >
              <Truck className="size-3.5" />
              <span className="hidden sm:inline">Lacak Pesanan</span>
            </button>
          )}
          {!isRoot && view !== 'cart' && (
            <button
              type="button"
              onClick={onGotoCatalog}
              className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:flex"
            >
              <ShoppingBag className="size-3.5" />
              Katalog
            </button>
          )}
          <button
            type="button"
            onClick={onCart}
            className="relative flex items-center justify-center rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Keranjang"
          >
            <ShoppingCart className="size-5" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-[#ffc107] text-[10px] font-bold text-emerald-950">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}

// =====================================================================
// Catalog View
// =====================================================================
function CatalogView({
  onGotoDetail,
  onAddToCart,
}: {
  onGotoDetail: (slug: string) => void
  onAddToCart: (product: Product, qty: number) => void
}) {
  const [products, setProducts] = React.useState<Product[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [category, setCategory] = React.useState('')
  const [sort, setSort] = React.useState<'terbaru' | 'termurah' | 'termahal'>('terbaru')

  // Fetch product categories from DB once on mount so the filter pills
  // always match whatever categories actually exist (e.g. "Daur Ulang Plastik").
  React.useEffect(() => {
    let mounted = true
    fetchApi<Category[]>('/toko/kategori')
      .then((res) => {
        if (mounted) setCategories(Array.isArray(res) ? res : [])
      })
      .catch(() => {
        // Silent fail — pills will fall back to just "Semua"
        if (mounted) setCategories([])
      })
    return () => { mounted = false }
  }, [])

  React.useEffect(() => {
    let mounted = true
    setLoading(true)
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (sort === 'termurah') params.set('sort', 'price_asc')
    if (sort === 'termahal') params.set('sort', 'price_desc')

    fetchApi<{ data: Product[] } | Product[]>(`/toko/katalog?${params.toString()}`)
      .then((res) => {
        if (!mounted) return
        const arr = Array.isArray(res) ? res : (res as any).data || []
        setProducts(arr.map(normalizeProduct))
      })
      .catch(() => {
        if (mounted) {
          // Fallback: show demo products for showcase
          setProducts(getDemoProducts())
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [category, sort])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Client-side search handles filtering via the `filtered` memo.
    // If search was cleared, re-fetch to get full product list from server.
    if (!search.trim()) {
      setLoading(true)
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (sort === 'termurah') params.set('sort', 'price_asc')
      if (sort === 'termahal') params.set('sort', 'price_desc')

      fetchApi<{ data: Product[] } | Product[]>(`/toko/katalog?${params.toString()}`)
        .then((res) => {
          const arr = Array.isArray(res) ? res : (res as any).data || []
          setProducts(arr.map(normalizeProduct))
        })
        .catch(() => {
          setProducts(getDemoProducts())
        })
        .finally(() => setLoading(false))
    }
    // If search has text, the client-side `filtered` memo handles it
  }

  // Client-side search filter
  const filtered = React.useMemo(() => {
    let result = [...products]
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (typeof p.category === 'string' && p.category.toLowerCase().includes(q))
      )
    }
    if (sort === 'termurah') result.sort((a, b) => a.price - b.price)
    if (sort === 'termahal') result.sort((a, b) => b.price - a.price)
    return result
  }, [products, search, sort])

  return (
    <div>
      {/* Search & Filter Bar */}
      <div
        className="border-b border-emerald-900/10"
        style={{ backgroundColor: COLORS.beige }}
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
          {/* Search */}
          <form onSubmit={handleSearch} className="mb-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-700/50" />
              <Input
                type="text"
                placeholder="Cari produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-emerald-900/15 bg-white pl-9 focus-visible:border-[#4caf50] focus-visible:ring-[#4caf50]/30"
              />
            </div>
            <Button
              type="submit"
              className="bg-[#4caf50] text-white hover:bg-[#43a047]"
              style={{ backgroundColor: COLORS.green }}
            >
              <Search className="size-4 sm:mr-0" />
              <span className="hidden sm:inline">Cari</span>
            </Button>
          </form>

          {/* Category pills + Sort */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {[
                ALL_CATEGORY_PILL,
                ...categories.map((c) => ({ value: c.name, label: c.name })),
              ].map((cat) => (
                <button
                  key={cat.value || 'all'}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={cn(
                    'shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
                    category === cat.value
                      ? 'bg-[#2d5016] text-white shadow-sm'
                      : 'bg-white text-emerald-900/70 border border-emerald-900/15 hover:bg-emerald-900/5'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <Select
              value={sort}
              onValueChange={(v) => setSort(v as typeof sort)}
            >
              <SelectTrigger className="w-[140px] shrink-0 border-emerald-900/15 bg-white text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="terbaru">Terbaru</SelectItem>
                <SelectItem value="termurah">Termurah</SelectItem>
                <SelectItem value="termahal">Termahal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100">
              <Package className="size-8 text-emerald-600" />
            </div>
            <h3 className="mb-1 text-lg font-bold text-[#2d5016]">
              Produk tidak ditemukan
            </h3>
            <p className="text-sm text-emerald-900/60">
              Coba ubah filter atau kata kunci pencarian Anda
            </p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {filtered.map((product, idx) => (
              <motion.div key={product.id} variants={staggerItem}>
                <ProductCard
                  product={product}
                  placeholderIndex={idx}
                  onClick={() => onGotoDetail(product.slug)}
                  onAddToCart={(qty) => onAddToCart(product, qty)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}

// =====================================================================
// Product Card (Catalog)
// =====================================================================
function ProductCard({
  product,
  placeholderIndex,
  onClick,
  onAddToCart,
}: {
  product: Product
  placeholderIndex: number
  onClick: () => void
  onAddToCart: (qty: number) => void
}) {
  const [adding, setAdding] = React.useState(false)
  const isOutOfStock = product.stock <= 0
  const imageSrc = product.images?.[0] || getProductPlaceholder(product.name, placeholderIndex)

  const handleAdd = () => {
    const qty = product.minOrderQty || 1
    setAdding(true)
    onAddToCart(qty)
    setTimeout(() => setAdding(false), 600)
  }

  return (
    <Card
      className="group cursor-pointer overflow-hidden rounded-xl border-emerald-900/10 transition-all hover:shadow-lg hover:-translate-y-0.5"
      onClick={onClick}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={imageSrc}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = getProductPlaceholder(product.name, placeholderIndex)
          }}
        />
        {product.category && (
          <Badge className="absolute left-2 top-2 rounded-full bg-[#2d5016]/80 text-[10px] font-semibold text-white backdrop-blur-sm">
            {typeof product.category === 'object' ? product.category.name : product.category}
          </Badge>
        )}
        {product.weightGram > 0 && (
          <Badge className="absolute right-2 top-2 rounded-full bg-white/90 text-[10px] font-medium text-emerald-900 backdrop-blur-sm">
            <Weight className="mr-0.5 size-2.5" />
            {product.weightGram >= 1000
              ? `${(product.weightGram / 1000).toFixed(1)} kg`
              : `${product.weightGram} g`}
          </Badge>
        )}
      </div>
      <CardContent className="p-3 sm:p-4">
        <h3 className="mb-1 line-clamp-2 text-xs font-bold text-[#2d5016] sm:text-sm leading-snug">
          {product.name}
        </h3>
        <p className="mb-2 text-sm font-extrabold text-[#0d9488] sm:text-base">
          {formatRupiah(product.price)}
        </p>
        <div className="mb-3 flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
              isOutOfStock
                ? 'bg-red-50 text-red-600'
                : 'bg-emerald-50 text-emerald-700'
            )}
          >
            <span
              className={cn(
                'size-1.5 rounded-full',
                isOutOfStock ? 'bg-red-500' : 'bg-emerald-500'
              )}
            />
            {isOutOfStock ? 'Habis' : 'Tersedia'}
          </span>
          {!isOutOfStock && (
            <span className="text-[10px] text-emerald-900/50">
              Stok: {product.stock}
            </span>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          disabled={isOutOfStock || adding}
          onClick={(e) => {
            e.stopPropagation()
            handleAdd()
          }}
          className={cn(
            'w-full text-xs font-semibold shadow-sm transition-all sm:text-sm',
            isOutOfStock
              ? 'cursor-not-allowed bg-gray-200 text-gray-500'
              : 'bg-[#4caf50] text-white hover:bg-[#43a047] active:scale-[0.97]'
          )}
        >
          {adding ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : isOutOfStock ? (
            'Stok Habis'
          ) : (
            <>
              <ShoppingCart className="mr-1 size-3.5" />
              Tambah
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

// =====================================================================
// Detail View
// =====================================================================
function DetailView({
  slug,
  onBack,
  onAddToCart,
  onGotoDetail,
}: {
  slug: string
  onBack: () => void
  onAddToCart: (product: Product, qty: number) => void
  onGotoDetail: (slug: string) => void
}) {
  const [product, setProduct] = React.useState<Product | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [qty, setQty] = React.useState(1)
  const [adding, setAdding] = React.useState(false)
  const [selectedImage, setSelectedImage] = React.useState(0)

  React.useEffect(() => {
    let mounted = true
    setLoading(true)
    setQty(1)
    setSelectedImage(0)

    fetchApi<any>(`/toko/produk/${encodeURIComponent(slug)}`)
      .then((data) => {
        if (mounted) setProduct(normalizeProduct(data))
      })
      .catch(() => {
        if (mounted) {
          // Fallback to demo product
          const demo = getDemoProducts().find((p) => p.slug === slug) || getDemoProducts()[0]
          setProduct(demo)
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [slug])

  const handleAdd = () => {
    if (!product) return
    setAdding(true)
    onAddToCart(product, qty)
    setTimeout(() => setAdding(false), 600)
  }

  const decreaseQty = () => {
    setQty((q) => Math.max((product?.minOrderQty || 1), q - 1))
  }

  const increaseQty = () => {
    if (!product) return
    setQty((q) => Math.min(product.stock, q + 1))
  }

  // Related products (same category, different product) — fetched from API
  const [related, setRelated] = React.useState<Product[]>([])

  React.useEffect(() => {
    if (!product?.category) { setRelated([]); return }
    let mounted = true
    fetchApi<Product[]>(`/toko/katalog?category=${encodeURIComponent(product.category)}`)
      .then((arr) => {
        if (!mounted) return
        setRelated(
          (Array.isArray(arr) ? arr : [])
            .map(normalizeProduct)
            .filter((p) => p.slug !== product!.slug)
            .slice(0, 4)
        )
      })
      .catch(() => { if (mounted) setRelated([]) })
    return () => { mounted = false }
  }, [product?.category, product?.slug])

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) return null

  const images = product.images?.length > 0
    ? product.images
    : [getProductPlaceholder(product.name, 0)]
  const isOutOfStock = product.stock <= 0

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
      {/* Breadcrumb */}
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-emerald-900/70 transition-colors hover:text-[#2d5016]"
      >
        <ArrowLeft className="size-3.5" />
        Kembali ke Katalog
      </button>

      <div className="grid gap-6 md:grid-cols-2 lg:gap-10">
        {/* Image Gallery */}
        <div className="space-y-3">
          <div className="aspect-square overflow-hidden rounded-xl bg-gray-100">
            <img
              src={images[selectedImage] || images[0]}
              alt={product.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                ;(e.target as HTMLImageElement).src = getProductPlaceholder(product.name, 0)
              }}
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImage(i)}
                  className={cn(
                    'shrink-0 overflow-hidden rounded-lg border-2 transition-all',
                    selectedImage === i
                      ? 'border-[#4caf50] ring-2 ring-[#4caf50]/30'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  )}
                >
                  <img
                    src={img}
                    alt={`${product.name} ${i + 1}`}
                    className="size-16 object-cover sm:size-20"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = getProductPlaceholder(product.name, i)
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          {product.category && (
            <Badge className="mb-2 w-fit rounded-full bg-[#4caf50]/15 text-[#2d5016] text-xs font-semibold">
              <Tag className="mr-1 size-3" />
              {typeof product.category === 'object' ? product.category.name : product.category}
            </Badge>
          )}

          <h1 className="mb-2 text-xl font-extrabold text-[#2d5016] sm:text-2xl lg:text-3xl">
            {product.name}
          </h1>

          <p className="mb-4 text-2xl font-extrabold text-[#0d9488] sm:text-3xl">
            {formatRupiah(product.price)}
          </p>

          {product.description && (
            <p className="mb-4 text-sm leading-relaxed text-emerald-900/70">
              {product.description}
            </p>
          )}

          <div className="mb-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
              <Box className="size-4 text-emerald-700" />
              <div>
                <div className="text-[10px] font-medium text-emerald-900/50 uppercase tracking-wide">Stok</div>
                <div className={cn('text-sm font-bold', isOutOfStock ? 'text-red-600' : 'text-emerald-800')}>
                  {isOutOfStock ? 'Habis' : `${product.stock} ${product.unit || 'pcs'}`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
              <Weight className="size-4 text-emerald-700" />
              <div>
                <div className="text-[10px] font-medium text-emerald-900/50 uppercase tracking-wide">Berat</div>
                <div className="text-sm font-bold text-emerald-800">
                  {product.weightGram >= 1000
                    ? `${(product.weightGram / 1000).toFixed(1)} kg`
                    : `${product.weightGram} g`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
              <Star className="size-4 text-emerald-700" />
              <div>
                <div className="text-[10px] font-medium text-emerald-900/50 uppercase tracking-wide">Min. Order</div>
                <div className="text-sm font-bold text-emerald-800">
                  {product.minOrderQty || 1} {product.unit || 'pcs'}
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-4 bg-emerald-900/10" />

          {/* Quantity Selector */}
          <div className="mb-6">
            <div className="text-sm font-semibold text-emerald-950 mb-2">Jumlah</div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={decreaseQty}
                disabled={qty <= (product.minOrderQty || 1)}
                className="flex size-10 items-center justify-center rounded-lg border border-emerald-900/15 text-emerald-900/70 transition-colors hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Minus className="size-4" />
              </button>
              <Input
                type="number"
                value={qty}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || 1
                  setQty(Math.max(product.minOrderQty || 1, Math.min(product.stock, v)))
                }}
                className="h-10 w-20 text-center border-emerald-900/15 font-bold text-emerald-950"
                min={product.minOrderQty || 1}
                max={product.stock}
              />
              <button
                type="button"
                onClick={increaseQty}
                disabled={qty >= product.stock}
                className="flex size-10 items-center justify-center rounded-lg border border-emerald-900/15 text-emerald-900/70 transition-colors hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-emerald-900/50">
              Minimal pembelian: {product.minOrderQty || 1} {product.unit || 'pcs'}
            </p>
          </div>

          {/* Add to Cart */}
          <Button
            type="button"
            size="lg"
            disabled={isOutOfStock || adding}
            onClick={handleAdd}
            className={cn(
              'w-full text-base font-bold shadow-lg transition-all sm:text-lg',
              isOutOfStock
                ? 'cursor-not-allowed bg-gray-200 text-gray-500 shadow-none'
                : adding
                  ? 'bg-[#43a047]'
                  : 'bg-[#4caf50] text-white hover:bg-[#43a047] active:scale-[0.98]'
            )}
          >
            {adding ? (
              <>
                <Loader2 className="mr-2 size-5 animate-spin" />
                Menambahkan...
              </>
            ) : isOutOfStock ? (
              'Stok Habis'
            ) : (
              <>
                <ShoppingCart className="mr-2 size-5" />
                Tambah ke Keranjang
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div className="mt-10 sm:mt-14">
          <h2 className="mb-4 text-lg font-bold text-[#2d5016] sm:text-xl">
            Produk Terkait
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {related.map((p, idx) => (
              <ProductCard
                key={p.id}
                product={p}
                placeholderIndex={idx}
                onClick={() => onGotoDetail(p.slug)}
                onAddToCart={(q) => onAddToCart(p, q)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// =====================================================================
// Cart View
// =====================================================================
function CartView({
  cart,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onCheckout,
  onGotoCatalog,
}: {
  cart: CartItem[]
  onUpdateQty: (productId: string, qty: number) => void
  onRemoveItem: (productId: string) => void
  onClearCart: () => void
  onCheckout: () => void
  onGotoCatalog: () => void
}) {
  const subtotal = getCartTotal(cart)

  // Validation
  const hasBelowMin = cart.some((item) => item.quantity < item.minOrderQty)
  const hasOutOfStock = cart.some((item) => item.stock <= 0)
  const canCheckout = cart.length > 0 && !hasBelowMin && !hasOutOfStock

  if (cart.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-emerald-100">
          <ShoppingCart className="size-10 text-emerald-500" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-[#2d5016]">
          Keranjang kosong
        </h2>
        <p className="mb-6 text-sm text-emerald-900/60">
          Belum ada produk di keranjang belanja Anda
        </p>
        <Button
          type="button"
          onClick={onGotoCatalog}
          className="bg-[#4caf50] text-white hover:bg-[#43a047]"
        >
          <ShoppingBag className="mr-2 size-4" />
          Mulai Belanja
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-4 sm:px-6 sm:py-6">
      {/* Warnings */}
      {hasBelowMin && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div>
            Beberapa produk belum memenuhi jumlah minimal pembelian. Silakan sesuaikan sebelum checkout.
          </div>
        </div>
      )}
      {hasOutOfStock && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div>
            Beberapa produk sudah tidak tersedia. Silakan hapus dari keranjang.
          </div>
        </div>
      )}

      {/* Cart Items */}
      <div className="space-y-3">
        {cart.map((item) => (
          <CartItemRow
            key={item.productId}
            item={item}
            onUpdateQty={onUpdateQty}
            onRemove={onRemoveItem}
          />
        ))}
      </div>

      {/* Cart Summary (sticky bottom on mobile) */}
      <div className="sticky bottom-0 z-10 mt-4 -mx-4 border-t border-emerald-900/10 bg-white px-4 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] sm:static sm:mx-0 sm:rounded-xl sm:border sm:shadow-md">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-emerald-900/70">
            Subtotal ({getCartCount(cart)} item)
          </span>
          <span className="text-lg font-extrabold text-[#2d5016]">
            {formatRupiah(subtotal)}
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onGotoCatalog}
            className="flex-1 border-emerald-900/15 text-emerald-900 hover:bg-emerald-50"
          >
            Lanjut Belanja
          </Button>
          <Button
            type="button"
            disabled={!canCheckout}
            onClick={onCheckout}
            className="flex-[2] bg-[#4caf50] text-white hover:bg-[#43a047] disabled:bg-gray-200 disabled:text-gray-400"
          >
            {hasBelowMin || hasOutOfStock ? (
              'Perbaiki Keranjang'
            ) : (
              <>
                Lanjut Checkout
                <ArrowRight className="ml-2 size-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// Cart Item Row
// =====================================================================
function CartItemRow({
  item,
  onUpdateQty,
  onRemove,
}: {
  item: CartItem
  onUpdateQty: (productId: string, qty: number) => void
  onRemove: (productId: string) => void
}) {
  const isBelowMin = item.quantity < item.minOrderQty
  const isOutOfStock = item.stock <= 0

  return (
    <div className={cn(
      'flex gap-3 rounded-xl border bg-white p-3 sm:p-4 transition-all',
      isOutOfStock ? 'border-red-200 bg-red-50/50' : 'border-emerald-900/10'
    )}>
      {/* Image */}
      <div
        className="size-20 shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:size-24"
        onClick={() => onRemove(item.productId)}
        role="button"
        tabIndex={0}
      >
        <img
          src={item.image || getProductPlaceholder(item.name, 0)}
          alt={item.name}
          className="h-full w-full object-cover"
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = getProductPlaceholder(item.name, 0)
          }}
        />
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-bold text-[#2d5016]">
              {item.name}
            </h3>
            <button
              type="button"
              onClick={() => onRemove(item.productId)}
              className="shrink-0 rounded-lg p-1 text-emerald-900/40 transition-colors hover:bg-red-50 hover:text-red-500"
              aria-label="Hapus"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
          <p className="mt-0.5 text-sm font-bold text-[#0d9488]">
            {formatRupiah(item.price)}
          </p>
          {isBelowMin && (
            <Badge variant="outline" className="mt-1 w-fit border-amber-300 bg-amber-50 text-[10px] text-amber-700">
              Min. {item.minOrderQty} {item.unit}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          {/* Qty Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onUpdateQty(item.productId, item.quantity - 1)}
              className="flex size-7 items-center justify-center rounded-md border border-emerald-900/15 text-emerald-900/60 hover:bg-emerald-50"
            >
              <Minus className="size-3" />
            </button>
            <span className="w-8 text-center text-sm font-bold text-emerald-950">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => onUpdateQty(item.productId, item.quantity + 1)}
              disabled={item.quantity >= item.stock}
              className="flex size-7 items-center justify-center rounded-md border border-emerald-900/15 text-emerald-900/60 hover:bg-emerald-50 disabled:opacity-30"
            >
              <Plus className="size-3" />
            </button>
          </div>

          {/* Subtotal */}
          <p className="text-sm font-extrabold text-[#2d5016]">
            {formatRupiah(item.price * item.quantity)}
          </p>
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// Checkout View
// =====================================================================
function CheckoutView({
  cart,
  onBack,
  onGotoPayment,
}: {
  cart: CartItem[]
  onBack: () => void
  onGotoPayment: (data: OrderData) => void
}) {
  const [step, setStep] = React.useState<1 | 2 | 3>(1)
  const [loading, setLoading] = React.useState(false)
  const [form, setForm] = React.useState({
    nama: '',
    hp: '',
    email: '',
    // ID Kemendagri (string) untuk provinsi/kota/kecamatan
    provinsiId: '',
    kotaId: '',
    kecamatanId: '',
    // Nama (untuk display & payload shipping)
    provinsiNama: '',
    kotaNama: '',
    kecamatanNama: '',
    kodePos: '',
    alamat: '',
  })

  // Master wilayah (fetch dinamis dari /api/province, /api/cities, /api/district)
  const [provinces, setProvinces] = React.useState<Province[]>([])
  const [cities, setCities] = React.useState<City[]>([])
  const [districts, setDistricts] = React.useState<District[]>([])
  const [loadingProvinces, setLoadingProvinces] = React.useState(false)
  const [loadingCities, setLoadingCities] = React.useState(false)
  const [loadingDistricts, setLoadingDistricts] = React.useState(false)

  // Ongkir live (RajaOngkir + fallback)
  const [ongkir, setOngkir] = React.useState<number>(0)
  const [ongkirSource, setOngkirSource] = React.useState<'rajaongkir' | 'fallback' | null>(null)
  const [ongkirMessage, setOngkirMessage] = React.useState<string>('')
  const [loadingOngkir, setLoadingOngkir] = React.useState(false)
  const [courierOptions, setCourierOptions] = React.useState<
    { serviceDisplay: string; cost: number; etd: string }[]
  >([])

  // Tracking untuk mencegah duplicate order & double-click
  // - submitting: true saat proses pembuatan order + buka Snap popup (disable tombol)
  // - lastCreatedOrderRef: cache order terakhir di sesi ini, supaya kalau user klik
  //   "Bayar" lagi dalam waktu singkat tanpa perubahan form, kita reuse Snap token
  //   yang sama alih-alih buat order baru (yang akan bentrok di Midtrans).
  //   Tapi token TIDAK boleh di-reuse kalau sudah lebih dari 10 menit — karena
  //   walau kita set expiry 24 jam, mending bikin order baru supaya jelas.
  const [submitting, setSubmitting] = React.useState(false)
  const lastCreatedOrderRef = React.useRef<{
    formHash: string
    orderId: string
    snapToken: string
    grossAmount: number
    createdAt: number // timestamp ketika token dibuat
  } | null>(null)

  // Token dianggap stale setelah 23 jam — setelah itu, bikin order baru
  // supaya popup selalu fresh. 23 jam < 24 jam (Midtrans expiry) supaya
  // token cache tidak pernah expired saat dipakai ulang.
  // User boleh bayar kapan saja dalam 24 jam, tidak terburu-buru.
  const TOKEN_STALE_MS = 23 * 60 * 60 * 1000 // 23 jam

  // Fetch provinces on mount
  React.useEffect(() => {
    setLoadingProvinces(true)
    fetch('/api/province')
      .then((r) => r.json())
      .then((data: Province[]) => setProvinces(Array.isArray(data) ? data : []))
      .catch(() => setProvinces([]))
      .finally(() => setLoadingProvinces(false))
  }, [])

  // Fetch cities when province changes
  React.useEffect(() => {
    setCities([])
    setDistricts([])
    setForm((prev) => ({ ...prev, kotaId: '', kotaNama: '', kecamatanId: '', kecamatanNama: '' }))
    if (!form.provinsiId) return
    setLoadingCities(true)
    fetch(`/api/cities?provinceId=${encodeURIComponent(form.provinsiId)}`)
      .then((r) => r.json())
      .then((data: City[]) => setCities(Array.isArray(data) ? data : []))
      .catch(() => setCities([]))
      .finally(() => setLoadingCities(false))
  }, [form.provinsiId])

  // Fetch districts when city changes
  React.useEffect(() => {
    setDistricts([])
    setForm((prev) => ({ ...prev, kecamatanId: '', kecamatanNama: '' }))
    if (!form.kotaId) return
    setLoadingDistricts(true)
    fetch(`/api/district?cityId=${encodeURIComponent(form.kotaId)}`)
      .then((r) => r.json())
      .then((data: District[]) => setDistricts(Array.isArray(data) ? data : []))
      .catch(() => setDistricts([]))
      .finally(() => setLoadingDistricts(false))
  }, [form.kotaId])

  const subtotal = getCartTotal(cart)
  const totalWeightGram = cart.reduce(
    (sum, item) => sum + (item.weightGram || 0) * item.quantity,
    0
  )

  // Fetch ongkir live when district selected & cart has weight
  React.useEffect(() => {
    if (!form.kecamatanId || !form.kecamatanNama || !form.kotaNama || totalWeightGram <= 0) {
      setOngkir(0)
      setOngkirSource(null)
      setOngkirMessage('')
      setCourierOptions([])
      return
    }
    let cancelled = false
    setLoadingOngkir(true)
    fetch('/api/shipping/cost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        districtId: form.kecamatanId,
        districtName: form.kecamatanNama,
        cityName: form.kotaNama,
        weightGram: totalWeightGram,
      }),
    })
      .then((r) => r.json())
      .then((data: any) => {
        if (cancelled) return
        const cost = Number(data.cheapestCost) || 0
        setOngkir(cost)
        setOngkirSource(data.source || 'fallback')
        setOngkirMessage(data.message || '')
        const opts = Array.isArray(data.options) ? data.options : []
        setCourierOptions(
          opts.map((o: any) => ({
            serviceDisplay: o.serviceDisplay,
            cost: Number(o.cost) || 0,
            etd: o.etd || '-',
          }))
        )
      })
      .catch(() => {
        if (cancelled) return
        // Fallback lokal supaya UI tetap jalan walai shipping API error
        setOngkir(15000)
        setOngkirSource('fallback')
        setOngkirMessage('Gagal menghitung ongkir, pakai tarif default.')
        setCourierOptions([])
      })
      .finally(() => {
        if (!cancelled) setLoadingOngkir(false)
      })
    return () => {
      cancelled = true
    }
  }, [form.kecamatanId, form.kecamatanNama, form.kotaNama, totalWeightGram])

  const total = subtotal + ongkir

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const isValidForm =
    form.nama.trim() !== '' &&
    form.hp.trim() !== '' &&
    form.provinsiId !== '' &&
    form.kotaId !== '' &&
    form.kecamatanId !== '' &&
    form.kodePos.trim() !== '' &&
    form.alamat.trim() !== ''

  const handleSubmit = async () => {
    // ====== Cegah double-click & duplicate order ======
    // Tombol disable saat submitting=true. Kalau user klik berkali-kali
    // cepat, hanya klik pertama yang akan diproses.
    if (submitting) {
      return
    }

    // ====== Frontend validation (sebelum hit API) ======
    // Validasi awal supaya user langsung tahu field mana yang bermasalah,
    // bukan dapat response 400 generik dari backend.
    if (!form.nama.trim()) {
      toast.error('Nama lengkap wajib diisi')
      return
    }
    if (!form.hp.trim()) {
      toast.error('No. HP wajib diisi')
      return
    }
    // Phone: minimal 6 digit (bisa dengan +62 atau 08)
    const phoneDigits = form.hp.replace(/\D/g, '')
    if (phoneDigits.length < 6) {
      toast.error(`No. HP tidak valid (minimal 6 digit). Anda memasukkan: "${form.hp}"`)
      return
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error('Format email tidak valid')
      return
    }
    if (!form.provinsiId || !form.kotaId || !form.kecamatanId) {
      toast.error('Provinsi, Kota, dan Kecamatan wajib dipilih')
      return
    }
    if (!form.kodePos.trim()) {
      toast.error('Kode pos wajib diisi')
      return
    }
    if (!form.alamat.trim()) {
      toast.error('Detail alamat wajib diisi')
      return
    }
    if (cart.length === 0) {
      toast.error('Keranjang belanja kosong')
      return
    }

    // ====== Reuse order yang sama jika form & cart belum berubah ======
    // Kalau user klik "Bayar" lagi tanpa perubahan, kita buka ulang Snap popup
    // dengan token yang sama — TIDAK membuat order baru. Ini mencegah race
    // condition di Midtrans (yang akan reject order_id duplikat) dan juga
    // mencegah popup "tertutup sendiri" karena token lama di-replace.
    const formHash = JSON.stringify({
      n: form.nama, p: form.hp, e: form.email,
      pv: form.provinsiId, c: form.kotaId, d: form.kecamatanId,
      kp: form.kodePos, a: form.alamat,
      cart: cart.map((i) => `${i.productId}:${i.quantity}`).sort(),
    })

    setSubmitting(true)
    setLoading(true)

    try {
      let data: {
        orderId: string
        snapToken: string
        redirectUrl?: string
        grossAmount: number
        breakdown?: {
          subtotal: number
          ongkir: number
          ongkirSource: string
          grandTotal: number
        }
      }

      const cached = lastCreatedOrderRef.current
      const isCacheFresh =
        cached &&
        cached.formHash === formHash &&
        Date.now() - cached.createdAt < TOKEN_STALE_MS

      if (isCacheFresh && cached) {
        // Reuse Snap token yang masih valid (< 10 menit) — buka ulang popup
        // tanpa buat order baru. Kalau sudah > 10 menit, bikin order baru
        // supaya popup selalu fresh & tidak menampilkan error "expired".
        toast.info('Membuka ulang popup pembayaran...')
        data = {
          orderId: cached.orderId,
          snapToken: cached.snapToken,
          grossAmount: cached.grossAmount,
        }
      } else {
        // Buat order baru + Snap token
        const orderItems = cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        }))

        const createRes = await fetch('/api/payment/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: orderItems,
            buyer: {
              name: form.nama,
              phone: form.hp,
              email: form.email || undefined,
            },
            shipping: {
              provinceId: form.provinsiId,
              province: form.provinsiNama,
              cityId: form.kotaId,
              city: form.kotaNama,
              districtId: form.kecamatanId,
              district: form.kecamatanNama,
              postalCode: form.kodePos,
              address: form.alamat,
            },
          }),
        })

        // Selalu parse response, bahkan saat error — backend mengirim detail errornya
        const responseData: {
          orderId?: string
          snapToken?: string
          redirectUrl?: string
          grossAmount?: number
          breakdown?: {
            subtotal: number
            ongkir: number
            ongkirSource: string
            grandTotal: number
          }
          error?: string
          details?: Array<{
            path: string
            message: string
          }>
        } = await createRes.json().catch(() => ({}))

        if (!createRes.ok || !responseData.snapToken) {
          // ====== Tampilkan error SPESIFIK dari backend ======
          if (responseData.details && responseData.details.length > 0) {
            const firstError = responseData.details[0]
            const fieldLabels: Record<string, string> = {
              'buyer.name': 'Nama',
              'buyer.phone': 'No. HP',
              'buyer.email': 'Email',
              'shipping.province': 'Provinsi',
              'shipping.city': 'Kota',
              'shipping.district': 'Kecamatan',
              'shipping.postalCode': 'Kode Pos',
              'shipping.address': 'Alamat',
              'items': 'Item',
            }
            const fieldLabel = fieldLabels[firstError.path] || firstError.path
            toast.error(`${fieldLabel}: ${firstError.message}`)
          } else if (responseData.error) {
            toast.error(responseData.error)
          } else {
            toast.error(`Gagal membuat Snap Token (HTTP ${createRes.status})`)
          }
          return
        }

        data = {
          orderId: responseData.orderId!,
          snapToken: responseData.snapToken!,
          redirectUrl: responseData.redirectUrl,
          grossAmount: responseData.grossAmount!,
          breakdown: responseData.breakdown,
        }

        // Cache untuk reuse kalau user klik Bayar lagi dalam < 10 menit
        // tanpa perubahan form. Setelah 10 menit, token dianggap stale
        // dan order baru akan dibuat supaya popup selalu fresh.
        lastCreatedOrderRef.current = {
          formHash,
          orderId: data.orderId,
          snapToken: data.snapToken,
          grossAmount: data.grossAmount,
          createdAt: Date.now(),
        }
      }

      setStep(2)

      const finalTotal =
        data.grossAmount ||
        data.breakdown?.grandTotal ||
        total

      const orderData: OrderData = {
        orderNumber: data.orderId,
        items: cart,
        total: finalTotal,
        buyerName: form.nama,
        buyerPhone: form.hp,
        buyerEmail: form.email,
        address: form.alamat,
        province: form.provinsiNama,
        city: form.kotaNama,
        district: form.kecamatanNama,
        postalCode: form.kodePos,
      }

      // =====================================================================
      // REDIRECT MODE (bukan popup) — lebih reliable, no caching issue
      // ---------------------------------------------------------------------
      // Sebelumnya pakai window.snap.pay(token) yang buka popup di halaman
      // yang sama. Masalahnya: popup lama yang expired bisa tertinggal di DOM,
      // dan saat user klik Bayar lagi, popup LAMA yang tampil (yang sudah
      // expired), bukan popup baru.
      //
      // Solusi: REDIRECT user ke URL Midtrans. User bayar di halaman Midtrans,
      // setelah selesai di-redirect balik ke halaman kita dengan parameter
      // order_id & status. Halaman return akan poll status & tampilkan hasil.
      //
      // Token selalu fresh karena redirect URL di-generate saat user klik Bayar.
      // =====================================================================
      const returnUrl = `${window.location.origin}/payment/return?orderNumber=${encodeURIComponent(orderData.orderNumber)}`
      void returnUrl // akan dipakai saat callback Midtrans redirect balik

      if (data.redirectUrl) {
        // Redirect user ke halaman Midtrans Snap
        // Setelah bayar, Midtrans akan redirect balik ke finish_url (kalau ada)
        // atau user bisa klik "Return to merchant" di Midtrans
        toast.info('Mengarahkan ke halaman pembayaran Midtrans...')
        // Simpan orderData ke sessionStorage supaya halaman return bisa akses
        try {
          sessionStorage.setItem('pendingOrderData', JSON.stringify(orderData))
        } catch {}
        // Redirect ke Midtrans
        window.location.href = data.redirectUrl
      } else {
        // Fallback: kalau redirectUrl tidak ada, tetap pakai popup mode
        toast.info('Membuka popup pembayaran...')
        const snapJsUrl = await fetch('/api/payment/config')
          .then((r) => r.json())
          .then((cfg: { snapJsUrl: string }) => cfg.snapJsUrl)
          .catch(() => 'https://app.sandbox.midtrans.com/snap/snap.js')

        await new Promise<void>((resolve, reject) => {
          const w = window as unknown as { snap?: { pay: (token: string, callbacks: unknown) => void } }
          if (w.snap) {
            resolve()
            return
          }
          const existing = document.getElementById('midtrans-snap-script')
          if (existing) {
            existing.addEventListener('load', () => resolve())
            existing.addEventListener('error', () => reject(new Error('Gagal memuat Snap.js')))
            return
          }
          const script = document.createElement('script')
          script.id = 'midtrans-snap-script'
          script.src = snapJsUrl
          script.async = true
          script.setAttribute('data-client-key', '')
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Gagal memuat Midtrans Snap'))
          document.head.appendChild(script)
        })

        const w = window as unknown as {
          snap: {
            pay: (
              token: string,
              callbacks: {
                onSuccess: (result: unknown) => void
                onPending: (result: unknown) => void
                onError: (result: unknown) => void
                onClose: () => void
              }
            ) => void
          }
        }

        if (!w.snap) {
          throw new Error('Snap.js tidak terload')
        }

        w.snap.pay(data.snapToken, {
          onSuccess: () => {
            toast.success('Pembayaran berhasil!')
            onGotoPayment(orderData)
          },
          onPending: () => {
            toast.info('Menunggu pembayaran.')
            onGotoPayment(orderData)
          },
          onError: () => {
            toast.error('Pembayaran gagal. Silakan coba lagi.')
            onGotoPayment(orderData)
          },
          onClose: () => {
            toast.warning('Popup pembayaran ditutup.')
            onGotoPayment(orderData)
          },
        })
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Gagal memproses checkout. Silakan coba lagi.'
      toast.error(message)
    } finally {
      setLoading(false)
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-6">
      {/* Step Indicator */}
      <div className="mb-6 flex items-center justify-center gap-0">
        {[
          { num: 1, label: 'Data Pembeli' },
          { num: 2, label: 'Pembayaran' },
          { num: 3, label: 'Selesai' },
        ].map((s, i) => (
          <React.Fragment key={s.num}>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex size-8 items-center justify-center rounded-full text-xs font-bold transition-colors',
                  step >= s.num
                    ? 'bg-[#4caf50] text-white'
                    : 'bg-gray-200 text-gray-500'
                )}
              >
                {step > s.num ? <CheckCircle2 className="size-4" /> : s.num}
              </div>
              <span
                className={cn(
                  'hidden text-xs font-medium sm:inline',
                  step >= s.num ? 'text-[#2d5016]' : 'text-gray-400'
                )}
              >
                {s.label}
              </span>
            </div>
            {i < 2 && (
              <div
                className={cn(
                  'mx-2 h-0.5 w-8 sm:w-16 transition-colors',
                  step > s.num ? 'bg-[#4caf50]' : 'bg-gray-200'
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Buyer Form */}
        <div className="lg:col-span-3">
          <Card className="rounded-xl border-emerald-900/10 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <h2 className="mb-4 text-lg font-bold text-[#2d5016]">
                Data Pembeli
              </h2>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-emerald-950">
                      Nama Lengkap <span className="text-rose-600">*</span>
                    </Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-700/50" />
                      <Input
                        placeholder="Nama lengkap"
                        value={form.nama}
                        onChange={(e) => updateField('nama', e.target.value)}
                        className="border-emerald-900/15 pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-emerald-950">
                      No. HP <span className="text-rose-600">*</span>
                    </Label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-700/50" />
                      <Input
                        placeholder="08xxxxxxxxxx"
                        value={form.hp}
                        onChange={(e) => updateField('hp', e.target.value)}
                        className="border-emerald-900/15 pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-emerald-950">
                    Email <span className="text-xs text-emerald-900/40">(opsional)</span>
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-700/50" />
                    <Input
                      type="email"
                      placeholder="email@contoh.com"
                      value={form.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      className="border-emerald-900/15 pl-9"
                    />
                  </div>
                </div>

                <Separator className="bg-emerald-900/10" />

                <h3 className="flex items-center gap-2 text-sm font-bold text-[#2d5016]">
                  <MapPin className="size-4 text-emerald-600" />
                  Alamat Pengiriman
                </h3>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-emerald-950">
                    Provinsi <span className="text-rose-600">*</span>
                  </Label>
                  <Select
                    value={form.provinsiId}
                    onValueChange={(v) => {
                      const p = provinces.find((x) => x.id === v)
                      setForm((prev) => ({
                        ...prev,
                        provinsiId: v,
                        provinsiNama: p?.name || '',
                      }))
                    }}
                    disabled={loadingProvinces}
                  >
                    <SelectTrigger className="border-emerald-900/15">
                      <SelectValue placeholder={loadingProvinces ? 'Memuat provinsi...' : 'Pilih provinsi'} />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-emerald-950">
                      Kota/Kabupaten <span className="text-rose-600">*</span>
                    </Label>
                    <Select
                      value={form.kotaId}
                      onValueChange={(v) => {
                        const c = cities.find((x) => x.id === v)
                        setForm((prev) => ({
                          ...prev,
                          kotaId: v,
                          kotaNama: c?.name || '',
                        }))
                      }}
                      disabled={loadingCities || !form.provinsiId}
                    >
                      <SelectTrigger className="border-emerald-900/15">
                        <SelectValue
                          placeholder={
                            !form.provinsiId
                              ? 'Pilih provinsi dulu'
                              : loadingCities
                                ? 'Memuat kota...'
                                : 'Pilih kota/kabupaten'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-emerald-950">
                      Kecamatan <span className="text-rose-600">*</span>
                    </Label>
                    <Select
                      value={form.kecamatanId}
                      onValueChange={(v) => {
                        const d = districts.find((x) => x.id === v)
                        setForm((prev) => ({
                          ...prev,
                          kecamatanId: v,
                          kecamatanNama: d?.name || '',
                        }))
                      }}
                      disabled={loadingDistricts || !form.kotaId}
                    >
                      <SelectTrigger className="border-emerald-900/15">
                        <SelectValue
                          placeholder={
                            !form.kotaId
                              ? 'Pilih kota dulu'
                              : loadingDistricts
                                ? 'Memuat kecamatan...'
                                : 'Pilih kecamatan'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {districts.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="w-32 space-y-1.5">
                  <Label className="text-sm font-medium text-emerald-950">
                    Kode Pos <span className="text-rose-600">*</span>
                  </Label>
                  <Input
                    placeholder="40123"
                    value={form.kodePos}
                    onChange={(e) => updateField('kodePos', e.target.value)}
                    className="border-emerald-900/15"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-emerald-950">
                    Detail Alamat <span className="text-rose-600">*</span>
                  </Label>
                  <Textarea
                    placeholder="Nama jalan, RT/RW, nomor rumah, patokan..."
                    rows={3}
                    value={form.alamat}
                    onChange={(e) => updateField('alamat', e.target.value)}
                    className="border-emerald-900/15"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-2">
          <Card className="sticky top-20 rounded-xl border-emerald-900/10 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <h2 className="mb-4 text-lg font-bold text-[#2d5016]">
                Ringkasan Pesanan
              </h2>

              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-center gap-3">
                    <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      <img
                        src={item.image || getProductPlaceholder(item.name, 0)}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = getProductPlaceholder(item.name, 0)
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="line-clamp-1 text-xs font-semibold text-[#2d5016]">
                        {item.name}
                      </p>
                      <p className="text-xs text-emerald-900/50">{item.quantity}x</p>
                    </div>
                    <p className="text-xs font-bold text-[#2d5016]">
                      {formatRupiah(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <Separator className="mb-3 bg-emerald-900/10" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-emerald-900/70">
                  <span>Subtotal produk</span>
                  <span>{formatRupiah(subtotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-900/70">
                  <span className="flex items-center gap-1.5">
                    Ongkir
                    {ongkirSource === 'rajaongkir' && (
                      <Badge variant="outline" className="bg-emerald-50 px-1.5 py-0 text-[10px] font-medium text-emerald-700">
                        RajaOngkir
                      </Badge>
                    )}
                    {ongkirSource === 'fallback' && (
                      <Badge variant="outline" className="bg-amber-50 px-1.5 py-0 text-[10px] font-medium text-amber-700">
                        Estimasi
                      </Badge>
                    )}
                  </span>
                  {loadingOngkir ? (
                    <span className="flex items-center gap-1 text-xs italic text-emerald-900/50">
                      <Loader2 className="size-3 animate-spin" />
                      Menghitung...
                    </span>
                  ) : ongkir > 0 ? (
                    <span className="font-medium text-emerald-900/80">
                      {formatRupiah(ongkir)}
                    </span>
                  ) : (
                    <span className="text-xs italic text-emerald-900/50">
                      Pilih kecamatan dulu
                    </span>
                  )}
                </div>
                {courierOptions.length > 0 && (
                  <div className="rounded-md border border-emerald-900/10 bg-emerald-50/30 p-2">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      Opsi kurir (termurah dipakai)
                    </p>
                    <div className="max-h-28 space-y-0.5 overflow-y-auto text-[11px]">
                      {courierOptions.slice(0, 6).map((o, idx) => (
                        <div key={`${o.serviceDisplay}-${idx}`} className="flex justify-between text-emerald-900/70">
                          <span className="truncate pr-2">{o.serviceDisplay} · {o.etd}</span>
                          <span className="whitespace-nowrap font-medium">{formatRupiah(o.cost)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {ongkirMessage && ongkirSource === 'fallback' && (
                  <p className="text-[10px] italic text-amber-600">
                    {ongkirMessage}
                  </p>
                )}
                <Separator className="bg-emerald-900/10" />
                <div className="flex justify-between text-base font-extrabold text-[#2d5016]">
                  <span>Total Bayar</span>
                  <span>{formatRupiah(total)}</span>
                </div>
              </div>

              <Button
                type="button"
                size="lg"
                disabled={!isValidForm || loading || submitting}
                onClick={handleSubmit}
                className="mt-4 w-full bg-[#4caf50] text-white hover:bg-[#43a047] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed shadow-md"
              >
                {loading || submitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {submitting ? 'Memproses pembayaran...' : 'Memproses...'}
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 size-4" />
                    Bayar Sekarang
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// Payment View
// =====================================================================
function PaymentView({
  orderData,
  onBack,
  onSuccess,
}: {
  orderData: OrderData | null
  onBack: () => void
  onSuccess: () => void
}) {
  // State untuk status pembayaran real-time dari backend
  const [statusData, setStatusData] = React.useState<{
    paymentStatus: string
    dbPaymentStatus: string
    orderStatus: string
    secondsUntilExpiry: number
    isExpired: boolean
    hasSnapToken: boolean
    midtransPaymentType: string | null
    midtransVaNumber: string | null
    midtransIssuer: string | null
    midtransPdfUrl: string | null
    midtransTransactionId: string | null
    paidAt: string | null
    total: number
  } | null>(null)
  const [loadingStatus, setLoadingStatus] = React.useState(true)
  const [retrying, setRetrying] = React.useState(false)
  const [openingSnap, setOpeningSnap] = React.useState(false)
  const [localCountdown, setLocalCountdown] = React.useState(0)

  // Poll status setiap 3 detik supaya update real-time saat webhook diterima
  React.useEffect(() => {
    if (!orderData?.orderNumber) return
    let cancelled = false

    const pollStatus = async () => {
      try {
        const res = await fetch(
          `/api/payment/status?orderId=${encodeURIComponent(orderData.orderNumber)}`
        )
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) {
          setStatusData(data)
          setLocalCountdown(data.secondsUntilExpiry || 0)
          setLoadingStatus(false)

          // Kalau sudah dibayar → langsung panggil onSuccess (auto-redirect ke success page)
          if (data.paymentStatus === 'dibayar') {
            setTimeout(() => onSuccess(), 1500)
          }
        }
      } catch {
        // silent fail
      }
    }

    pollStatus()
    const interval = setInterval(pollStatus, 3000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [orderData?.orderNumber, onSuccess])

  // Local countdown tick (supaya timer update setiap detik, bukan tiap 3 detik)
  React.useEffect(() => {
    if (localCountdown <= 0) return
    const t = setInterval(() => {
      setLocalCountdown((c) => Math.max(0, c - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [localCountdown])

  // Load Snap.js (cached)
  const loadSnapJs = React.useCallback(async () => {
    const snapJsUrl = await fetch('/api/payment/config')
      .then((r) => r.json())
      .then((cfg: { snapJsUrl: string }) => cfg.snapJsUrl)
      .catch(() => 'https://app.sandbox.midtrans.com/snap/snap.js')

    await new Promise<void>((resolve, reject) => {
      const w = window as unknown as { snap?: unknown }
      if (w.snap) {
        resolve()
        return
      }
      const existing = document.getElementById('midtrans-snap-script')
      if (existing) {
        existing.addEventListener('load', () => resolve())
        existing.addEventListener('error', () => reject(new Error('Gagal memuat Snap.js')))
        return
      }
      const script = document.createElement('script')
      script.id = 'midtrans-snap-script'
      script.src = snapJsUrl
      script.async = true
      script.setAttribute('data-client-key', '')
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Gagal memuat Midtrans Snap'))
      document.head.appendChild(script)
    })
  }, [])

  // Buka Snap — SELALU buat token BARU via /api/payment/retry + REDIRECT ke Midtrans
  // ---------------------------------------------------------------
  // JANGAN pernah reuse token lama yang ada di DB, karena token Midtrans
  // Snap punya expiry. Kalau user buka halaman lama, token sudah expired.
  //
  // Strategi: setiap kali user klik "Bayar", panggil /api/payment/retry
  // untuk dapat token baru + redirect URL baru. Lalu REDIRECT user ke
  // halaman Midtrans (bukan popup). Ini lebih reliable karena:
  //   - Tidak ada popup caching issue
  //   - User bayar di halaman Midtrans yang fresh
  //   - Setelah bayar, redirect balik ke /payment/return
  const handleOpenSnap = async () => {
    if (!orderData?.orderNumber) return
    setOpeningSnap(true)
    try {
      toast.info('Menyiapkan pembayaran...')
      const retryRes = await fetch('/api/payment/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: orderData.orderNumber }),
      })
      const retryData = await retryRes.json()
      if (!retryRes.ok) {
        throw new Error(retryData.error || 'Gagal membuat token pembayaran')
      }

      // Update countdown reset ke 24 jam (sesuai expiry Midtrans)
      setStatusData((prev) => prev ? {
        ...prev,
        paymentStatus: 'menunggu',
        dbPaymentStatus: 'menunggu',
        secondsUntilExpiry: 24 * 60 * 60, // 24 jam dalam detik
        isExpired: false,
        hasSnapToken: true,
      } : prev)
      setLocalCountdown(24 * 60 * 60) // 24 jam

      // Simpan orderData ke sessionStorage supaya halaman return bisa akses
      try {
        sessionStorage.setItem('pendingOrderData', JSON.stringify(orderData))
      } catch {}

      // REDIRECT ke Midtrans (bukan popup)
      if (retryData.redirectUrl) {
        window.location.href = retryData.redirectUrl
      } else {
        throw new Error('Redirect URL tidak ditemukan')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal membuka halaman pembayaran'
      toast.error(message)
    } finally {
      setOpeningSnap(false)
    }
  }

  // Bayar Ulang — sama dengan handleOpenSnap
  const handleRetry = async () => {
    await handleOpenSnap()
  }

  if (!orderData) return null

  // Format countdown MM:SS
  const minutes = Math.floor(localCountdown / 60)
  const seconds = localCountdown % 60
  const countdownStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  // Determine display state
  const isLoading = loadingStatus && !statusData
  const paymentStatus = statusData?.paymentStatus || 'menunggu'
  const isPaid = paymentStatus === 'dibayar'
  const isExpired = statusData?.isExpired || paymentStatus === 'expired'
  const isPending = paymentStatus === 'menunggu' && !isExpired
  const isFailed = ['gagal', 'dibatalkan'].includes(paymentStatus)

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-[#4caf50]/15">
          <CreditCard className="size-7 text-[#2d5016]" />
        </div>
        <h2 className="text-xl font-bold text-[#2d5016]">Pembayaran</h2>
        <p className="mt-1 text-xs text-emerald-900/60">
          Pembayaran wajib via Midtrans. Status diperbarui otomatis.
        </p>
      </div>

      <Card className="rounded-xl border-emerald-900/10 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          {/* Order Info */}
          <div className="mb-4 rounded-lg bg-emerald-50 p-4">
            <div className="text-xs font-medium text-emerald-900/50 uppercase tracking-wide mb-1">
              Nomor Pesanan
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-extrabold text-[#2d5016]">
                {orderData.orderNumber}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(orderData.orderNumber)
                  toast.success('Nomor pesanan disalin')
                }}
                className="rounded-lg p-1.5 text-emerald-700/60 transition-colors hover:bg-emerald-100 hover:text-emerald-800"
              >
                <Copy className="size-4" />
              </button>
            </div>
          </div>

          {/* Status Banner — real-time dari DB */}
          {isLoading ? (
            <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-gray-50 px-4 py-3">
              <Loader2 className="size-4 animate-spin text-emerald-600" />
              <span className="text-xs text-emerald-900/60">Memuat status pembayaran...</span>
            </div>
          ) : isPaid ? (
            <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
              <CheckCircle2 className="size-5 text-green-600" />
              <span className="text-sm font-bold text-green-800">
                ✓ Pembayaran Berhasil (Lunas)
              </span>
            </div>
          ) : isExpired ? (
            <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <XCircle className="size-5 text-red-600" />
              <span className="text-sm font-bold text-red-800">
                ⌛ Waktu Pembayaran Habis (Expired)
              </span>
            </div>
          ) : isFailed ? (
            <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <XCircle className="size-5 text-red-600" />
              <span className="text-sm font-bold text-red-800">
                ✗ Pembayaran Gagal
              </span>
            </div>
          ) : isPending ? (
            <div className="mb-4 flex flex-col items-center justify-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">
                  Menunggu Pembayaran
                </span>
              </div>
              <p className="text-xs text-amber-600/80">
                Bayar kapan saja dalam 24 jam — tidak terburu-buru
              </p>
            </div>
          ) : null}

          {/* Midtrans transaction details — tampil kalau sudah ada data webhook */}
          {statusData?.midtransPaymentType && isPaid && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 text-xs">
              <p className="mb-2 font-semibold text-emerald-900">📋 Detail Pembayaran (dari Midtrans):</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-emerald-700/60">Metode:</span>
                  <span className="ml-1 font-medium text-emerald-900">
                    {statusData.midtransPaymentType}
                    {statusData.midtransIssuer ? ` (${statusData.midtransIssuer})` : ''}
                  </span>
                </div>
                {statusData.midtransVaNumber && (
                  <div>
                    <span className="text-emerald-700/60">VA/Code:</span>
                    <span className="ml-1 font-mono font-medium text-emerald-900">
                      {statusData.midtransVaNumber}
                    </span>
                  </div>
                )}
                {statusData.midtransTransactionId && (
                  <div className="col-span-2">
                    <span className="text-emerald-700/60">Transaction ID:</span>
                    <span className="ml-1 font-mono text-[10px] text-emerald-900">
                      {statusData.midtransTransactionId}
                    </span>
                  </div>
                )}
              </div>
              {statusData.midtransPdfUrl && (
                <a
                  href={statusData.midtransPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-semibold text-emerald-600 hover:underline"
                >
                  📄 Lihat PDF Instruksi Pembayaran
                </a>
              )}
            </div>
          )}

          {/* Order Items Summary */}
          <div className="mb-4 max-h-40 overflow-y-auto space-y-2">
            {orderData.items.map((item) => (
              <div key={item.productId} className="flex justify-between text-sm">
                <span className="text-emerald-900/70">
                  {item.name} x{item.quantity}
                </span>
                <span className="font-semibold text-[#2d5016]">
                  {formatRupiah(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <Separator className="mb-4 bg-emerald-900/10" />

          <div className="mb-4 flex justify-between text-base font-extrabold text-[#2d5016]">
            <span>Total Bayar</span>
            <span>{formatRupiah(orderData.total)}</span>
          </div>

          {/* === ACTION BUTTONS === */}
          {isPaid ? (
            <Button
              type="button"
              size="lg"
              disabled
              className="w-full bg-green-600 text-white"
            >
              <CheckCircle2 className="mr-2 size-5" />
              Pembayaran Lunas — Lanjut...
            </Button>
          ) : isExpired || isFailed ? (
            <Button
              type="button"
              size="lg"
              disabled={retrying}
              onClick={handleRetry}
              className="w-full bg-[#4caf50] text-white hover:bg-[#43a047] shadow-lg"
            >
              {retrying ? (
                <>
                  <Loader2 className="mr-2 size-5 animate-spin" />
                  Membuat token baru...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 size-5" />
                  Bayar Ulang via Midtrans
                </>
              )}
            </Button>
          ) : isPending ? (
            <Button
              type="button"
              size="lg"
              disabled={openingSnap}
              onClick={handleOpenSnap}
              className="w-full bg-[#4caf50] text-white hover:bg-[#43a047] shadow-lg"
            >
              {openingSnap ? (
                <>
                  <Loader2 className="mr-2 size-5 animate-spin" />
                  Membuka popup...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 size-5" />
                  Bayar via Midtrans Sekarang
                </>
              )}
            </Button>
          ) : null}

          {/* Info text */}
          <p className="mt-3 text-center text-xs text-emerald-900/50">
            {isPaid
              ? '✓ Pembayaran terkonfirmasi via Midtrans. Status pesanan: Dibayar.'
              : isExpired
                ? '⌛ Waktu pembayaran habis. Klik "Bayar Ulang" untuk membuat transaksi baru.'
                : isPending
                  ? '💡 Bayar kapan saja dalam 24 jam — tidak terburu-buru. Klik tombol di atas untuk membuka pembayaran.'
                  : 'Pembayaran wajib via Midtrans. Tidak ada konfirmasi manual.'}
          </p>

          {/* Back button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            className="mt-3 w-full border-emerald-900/15 text-emerald-700 hover:bg-emerald-50"
          >
            <ArrowLeft className="mr-2 size-4" />
            Kembali ke Katalog
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// =====================================================================
// Success View
// =====================================================================
function SuccessView({
  orderData,
  onGotoCatalog,
  onGotoTracking,
}: {
  orderData: OrderData | null
  onGotoCatalog: () => void
  onGotoTracking: () => void
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-12 text-center sm:px-6 sm:py-20">
      {/* Animated Success Icon */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        className="mb-6 flex size-24 items-center justify-center rounded-full bg-[#4caf50]/15 ring-8 ring-[#4caf50]/10"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.3 }}
        >
          <CheckCircle2 className="size-14 text-[#4caf50]" />
        </motion.div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-2 text-2xl font-extrabold text-[#2d5016] sm:text-3xl"
      >
        Pesanan Berhasil!
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-6 text-sm text-emerald-900/60"
      >
        Terima kasih atas pesanan Anda
      </motion.p>

      {orderData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-6 w-full rounded-xl border border-emerald-900/10 bg-emerald-50 p-4"
        >
          <p className="text-xs text-emerald-900/50 uppercase tracking-wide">Nomor Pesanan</p>
          <p className="mt-1 text-lg font-extrabold text-[#2d5016]">
            {orderData.orderNumber}
          </p>
          <Separator className="my-3 bg-emerald-900/10" />
          <div className="mb-3 flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2">
            <span className="text-xs font-medium text-blue-700/70 uppercase tracking-wide">Status Pesanan</span>
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 px-3 py-1 text-xs font-bold">
              Dibayar
            </Badge>
          </div>
          {orderData.items.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm mb-1">
              <span className="text-emerald-900/70">{item.name} x{item.quantity}</span>
              <span className="font-semibold text-[#2d5016]">{formatRupiah(item.price * item.quantity)}</span>
            </div>
          ))}
          <Separator className="my-3 bg-emerald-900/10" />
          <div className="flex justify-between font-extrabold text-[#2d5016]">
            <span>Total Dibayar</span>
            <span>{formatRupiah(orderData.total)}</span>
          </div>
        </motion.div>
      )}

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mb-6 flex items-center justify-center gap-1.5 text-xs text-emerald-900/50"
      >
        <Mail className="size-3.5" />
        Anda akan menerima notifikasi via email/SMS
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex w-full flex-col gap-2 sm:flex-row"
      >
        <Button
          type="button"
          variant="outline"
          onClick={onGotoTracking}
          className="flex-1 border-[#2d5016] text-[#2d5016] hover:bg-[#2d5016]/10"
        >
          <Truck className="mr-2 size-4" />
          Lacak Pesanan
        </Button>
        <Button
          type="button"
          onClick={onGotoCatalog}
          className="flex-1 bg-[#4caf50] text-white hover:bg-[#43a047]"
        >
          <ShoppingBag className="mr-2 size-4" />
          Belanja Lagi
        </Button>
      </motion.div>
    </div>
  )
}

// =====================================================================
// Tracking View
// =====================================================================
function TrackingView({
  onGotoCatalog,
}: {
  onGotoCatalog: () => void
}) {
  const [orderNumber, setOrderNumber] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [orderInfo, setOrderInfo] = React.useState<any>(null)
  const [notFound, setNotFound] = React.useState(false)
  const [retrying, setRetrying] = React.useState(false)

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderNumber.trim() || !phone.trim()) {
      toast.error('Nomor pesanan dan No. HP wajib diisi')
      return
    }
    setLoading(true)
    setNotFound(false)
    try {
      const data = await fetchApi<any>(
        `/toko/track?orderNumber=${encodeURIComponent(orderNumber.trim())}&phone=${encodeURIComponent(phone.trim())}`
      )
      setOrderInfo(data)
    } catch {
      setNotFound(true)
      setOrderInfo(null)
    } finally {
      setLoading(false)
    }
  }

  // Lakukan Pembayaran — muncul saat status masih menunggu_pembayaran
  // User bisa klik ini untuk buka Midtrans lagi & bayar pesanannya
  const handlePayment = async () => {
    if (!orderInfo?.orderNumber) return
    setRetrying(true)
    try {
      const res = await fetch('/api/payment/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: orderInfo.orderNumber }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Gagal membuat token pembayaran')
        return
      }
      // Simpan orderNumber ke sessionStorage supaya halaman return bisa akses
      try {
        sessionStorage.setItem('pendingOrderData', JSON.stringify({ orderNumber: orderInfo.orderNumber }))
      } catch {}
      // Redirect ke Midtrans
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
      } else {
        toast.error('URL pembayaran tidak ditemukan')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal membuka pembayaran'
      toast.error(message)
    } finally {
      setRetrying(false)
    }
  }

  // Status timeline config (includes Dibayar step after payment confirmation)
  const statusSteps = [
    { key: 'menunggu_pembayaran', label: 'Menunggu Pembayaran', icon: Clock, color: 'bg-gray-400' },
    { key: 'dibayar', label: 'Dibayar', icon: CheckCircle2, color: 'bg-blue-500' },
    { key: 'diproses', label: 'Diproses', icon: Package, color: 'bg-teal-500' },
    { key: 'dikirim', label: 'Dikirim', icon: Truck, color: 'bg-amber-500' },
    { key: 'diterima', label: 'Diterima', icon: PackageCheck, color: 'bg-emerald-500' },
  ]

  const currentStatusIndex = orderInfo
    ? statusSteps.findIndex((s) => s.key === (orderInfo.orderStatus || orderInfo.status))
    : -1

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-[#4caf50]/15">
          <Truck className="size-7 text-[#2d5016]" />
        </div>
        <h2 className="text-xl font-bold text-[#2d5016]">Lacak Pesanan</h2>
        <p className="mt-1 text-sm text-emerald-900/60">
          Masukkan nomor pesanan dan nomor HP untuk melacak
        </p>
      </div>

      <Card className="rounded-xl border-emerald-900/10 shadow-sm mb-6">
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleTrack} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-emerald-950">
                No. Pesanan <span className="text-rose-600">*</span>
              </Label>
              <Input
                placeholder="Contoh: TKO-20250101-0001"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="border-emerald-900/15"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-emerald-950">
                No. HP <span className="text-rose-600">*</span>
              </Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-700/50" />
                <Input
                  placeholder="08xxxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="border-emerald-900/15 pl-9"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4caf50] text-white hover:bg-[#43a047]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Mencari...
                </>
              ) : (
                <>
                  <Search className="mr-2 size-4" />
                  Lacak
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Not Found */}
      {notFound && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center rounded-xl border border-red-200 bg-red-50 p-6 text-center"
        >
          <XCircle className="mb-3 size-10 text-red-400" />
          <h3 className="mb-1 text-base font-bold text-red-700">
            Pesanan tidak ditemukan
          </h3>
          <p className="text-sm text-red-600/70">
            Pastikan nomor pesanan dan No. HP sudah benar
          </p>
        </motion.div>
      )}

      {/* Order Info */}
      {orderInfo && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Status Badge */}
          <div className="flex items-center justify-between rounded-xl border border-emerald-900/10 bg-white p-4 shadow-sm">
            <div>
              <p className="text-xs text-emerald-900/50 uppercase tracking-wide">Status Pesanan</p>
              <p className="mt-0.5 text-base font-bold text-[#2d5016]">
                {statusSteps[Math.max(0, currentStatusIndex)]?.label || orderInfo.orderStatus}
              </p>
            </div>
            <Badge
              className={cn(
                'rounded-full px-3 py-1 text-xs font-bold',
                currentStatusIndex >= 4
                  ? 'bg-emerald-100 text-emerald-700'
                  : currentStatusIndex >= 3
                    ? 'bg-amber-100 text-amber-700'
                    : currentStatusIndex >= 2
                      ? 'bg-teal-100 text-teal-700'
                      : currentStatusIndex >= 1
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
              )}
            >
              {statusSteps[Math.max(0, currentStatusIndex)]?.label || orderInfo.orderStatus}
            </Badge>
          </div>

          {/* Status Timeline */}
          <Card className="rounded-xl border-emerald-900/10 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <h3 className="mb-4 text-sm font-bold text-[#2d5016]">Riwayat Status</h3>
              <div className="space-y-0">
                {statusSteps.map((step, idx) => {
                  const isActive = idx <= currentStatusIndex
                  const isCurrent = idx === currentStatusIndex
                  const StepIcon = step.icon
                  return (
                    <div key={step.key} className="flex gap-3">
                      {/* Timeline dot + line */}
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            'flex size-8 shrink-0 items-center justify-center rounded-full transition-all',
                            isActive
                              ? `${step.color} text-white shadow-sm`
                              : 'bg-gray-200 text-gray-400'
                          )}
                        >
                          <StepIcon className="size-4" />
                        </div>
                        {idx < statusSteps.length - 1 && (
                          <div
                            className={cn(
                              'w-0.5 flex-1 min-h-[2rem] transition-colors',
                              idx < currentStatusIndex ? 'bg-[#4caf50]' : 'bg-gray-200'
                            )}
                          />
                        )}
                      </div>
                      {/* Label */}
                      <div className={cn('pb-6', isCurrent ? '' : '-mt-1')}>
                        <p className={cn(
                          'text-sm font-semibold',
                          isActive ? 'text-[#2d5016]' : 'text-gray-400'
                        )}>
                          {step.label}
                        </p>
                        {isCurrent && orderInfo.kurirNama && (
                          <p className="mt-1 text-xs text-emerald-900/60">
                            Kurir: {orderInfo.kurirNama}
                          </p>
                        )}
                        {isCurrent && orderInfo.noResi && (
                          <p className="text-xs text-emerald-900/60">
                            No. Resi: {orderInfo.noResi}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card className="rounded-xl border-emerald-900/10 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <h3 className="mb-3 text-sm font-bold text-[#2d5016]">Detail Pesanan</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-emerald-900/50">No. Pesanan</span>
                  <span className="font-semibold text-[#2d5016]">{orderInfo.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-900/50">Pembeli</span>
                  <span className="font-semibold text-[#2d5016]">{orderInfo.buyerName || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-900/50">No. HP</span>
                  <span className="font-semibold text-[#2d5016]">{orderInfo.buyerPhone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-900/50">Alamat</span>
                  <span className="max-w-[200px] text-right font-semibold text-[#2d5016]">
                    {orderInfo.buyerAddress
                      ? (() => { try { const a = JSON.parse(orderInfo.buyerAddress); return [a.detailAlamat || a.address, a.kecamatan || a.district, a.kota || a.city, a.provinsi || a.province, a.kodePos || a.postalCode].filter(Boolean).join(', ') } catch { return orderInfo.buyerAddress } })()
                      : '-'}
                  </span>
                </div>
                <Separator className="bg-emerald-900/10" />
                {orderInfo.items?.map((item: any, idx: number) => (
                  <div key={item.id || idx} className="flex justify-between">
                    <span className="text-emerald-900/70">{item.productNameSnapshot || item.name} x{item.quantity}</span>
                    <span className="font-semibold text-[#2d5016]">{formatRupiah((item.pricePerUnitSnapshot || item.price) * Number(item.quantity))}</span>
                  </div>
                ))}
                <Separator className="bg-emerald-900/10" />
                <div className="flex justify-between font-extrabold text-[#2d5016]">
                  <span>Total</span>
                  <span>{formatRupiah(orderInfo.totalBayar || orderInfo.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tombol "Lakukan Pembayaran" — muncul hanya saat status menunggu_pembayaran */}
          {/* User bisa bayar pesananannya nanti lewat halaman lacak pesanan ini */}
          {orderInfo.paymentStatus === 'menunggu' &&
           (orderInfo.orderStatus === 'menunggu_pembayaran' || !orderInfo.orderStatus) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-amber-300 bg-amber-50 p-4"
            >
              <div className="mb-3 text-center">
                <Clock className="mx-auto mb-1 size-8 text-amber-500" />
                <p className="text-sm font-bold text-amber-800">
                  Pesanan Belum Dibayar
                </p>
                <p className="mt-0.5 text-xs text-amber-700">
                  Selesaikan pembayaran sekarang agar pesanan dapat diproses
                </p>
              </div>
              <Button
                type="button"
                disabled={retrying}
                onClick={handlePayment}
                className="w-full bg-[#4caf50] text-white hover:bg-[#43a047] shadow-md disabled:opacity-50"
              >
                {retrying ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Menyiapkan pembayaran...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 size-4" />
                    Lakukan Pembayaran
                  </>
                )}
              </Button>
            </motion.div>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={onGotoCatalog}
            className="w-full border-emerald-900/15 text-emerald-900 hover:bg-emerald-50"
          >
            <ShoppingBag className="mr-2 size-4" />
            Belanja Lagi
          </Button>
        </motion.div>
      )}
    </div>
  )
}

// =====================================================================
// Footer (Catalog only)
// =====================================================================
function MerchFooter() {
  return (
    <footer
      className="mt-auto w-full text-white"
      style={{ backgroundColor: COLORS.footerDark }}
    >
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-white/15">
              <Recycle className="size-4 text-white" />
            </div>
            <div className="leading-tight">
              <div className="text-xs font-extrabold tracking-wide text-white">BANK SAMPAH</div>
              <div className="text-[10px] font-semibold tracking-[0.2em] text-white/70">MERCHANDISE</div>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-white/60">
            Produk daur ulang dan kerajinan dari Bank Sampah Sukamaju Sejahtera.
          </p>
        </div>
        <div>
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/50">
            Kontak
          </div>
          <ul className="space-y-2 text-sm text-white/70">
            <li className="flex items-center gap-2">
              <MapPin className="size-3.5 text-[#4caf50]" />
              <span>Jl. Melati No. 1, Bandung</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-3.5 text-[#4caf50]" />
              <span>+62 812-3456-7890</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-3.5 text-[#4caf50]" />
              <span>halo@banksampah.test</span>
            </li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/50">
            Bantuan
          </div>
          <ul className="space-y-2 text-sm text-white/70">
            <li>Cara Pemesanan</li>
            <li>Kebijakan Pengembalian</li>
            <li>FAQ</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto w-full max-w-5xl px-4 py-4 text-center text-xs text-white/40 sm:px-6">
          &copy; {new Date().getFullYear()} Bank Sampah Sukamaju Sejahtera. Semua hak dilindungi.
        </div>
      </div>
    </footer>
  )
}

// =====================================================================
// Demo Products (fallback when API is not available)
// =====================================================================
function getDemoProducts(): Product[] {
  return [
    {
      id: '1',
      slug: 'tas-daur-ulang-plastik',
      name: 'Tas Belanja Daur Ulang Plastik',
      description: 'Tas belanja ramah lingkungan terbuat dari plastik daur ulang berkualitas tinggi. Kuat, tahan lama, dan stylish untuk kegiatan sehari-hari Anda.',
      price: 45000,
      images: [],
      category: 'Daur Ulang',
      stock: 25,
      minOrderQty: 1,
      weightGram: 150,
      unit: 'pcs',
    },
    {
      id: '2',
      slug: 'vas-bunga-koran',
      name: 'Vas Bunga dari Koran Bekas',
      description: 'Vas bunga unik dan artistik yang dibuat dari anyaman koran bekas. Setiap produk dibuat tangan oleh pengrajin lokal.',
      price: 75000,
      images: [],
      category: 'Kerajinan',
      stock: 15,
      minOrderQty: 1,
      weightGram: 350,
      unit: 'pcs',
    },
    {
      id: '3',
      slug: 'kaos-bank-sampah',
      name: 'Kaos Premium Bank Sampah',
      description: 'Kaos katun combed 30s dengan desain eksklusif Bank Sampah Sukamaju Sejahtera. Nyaman dipakai sehari-hari.',
      price: 120000,
      images: [],
      category: 'Merchandise',
      stock: 50,
      minOrderQty: 1,
      weightGram: 200,
      unit: 'pcs',
    },
    {
      id: '4',
      slug: 'dompet-karet-daur-ulang',
      name: 'Dompet Karet Daur Ulang',
      description: 'Dompet praktis dari karet ban dalam daur ulang. Waterproof dan ringan untuk dibawa kemana saja.',
      price: 35000,
      images: [],
      category: 'Daur Ulang',
      stock: 40,
      minOrderQty: 2,
      weightGram: 80,
      unit: 'pcs',
    },
    {
      id: '5',
      slug: 'toples-hias-botol',
      name: 'Toples Hias dari Botol Bekas',
      description: 'Toples dekoratif yang dibuat dari botol bekas dengan sentuhan seni decoupage. Cocok untuk hiasan rumah.',
      price: 55000,
      images: [],
      category: 'Kerajinan',
      stock: 20,
      minOrderQty: 1,
      weightGram: 400,
      unit: 'pcs',
    },
    {
      id: '6',
      slug: 'totebag-kain-perca',
      name: 'Totebag Kain Perca',
      description: 'Totebag cantik dari kain perca dengan desain patchwork unik. Setiap piece berbeda dan limited edition.',
      price: 65000,
      images: [],
      category: 'Kerajinan',
      stock: 0,
      minOrderQty: 1,
      weightGram: 120,
      unit: 'pcs',
    },
    {
      id: '7',
      slug: 'pin-bank-sampah',
      name: 'Pin Logam Bank Sampah',
      description: 'Pin logam berkualitas dengan logo Bank Sampah. Cocok untuk koleksi atau hadiah kecil.',
      price: 15000,
      images: [],
      category: 'Merchandise',
      stock: 100,
      minOrderQty: 3,
      weightGram: 20,
      unit: 'pcs',
    },
    {
      id: '8',
      slug: 'pensil-daur-ulang-kertas',
      name: 'Set Pensil Daur Ulang Kertas',
      description: 'Set 5 pensil yang dibuat dari kertas koran bekas ramah lingkungan.',
      price: 25000,
      images: [],
      category: 'Daur Ulang',
      stock: 30,
      minOrderQty: 1,
      weightGram: 100,
      unit: 'set',
    },
  ]
}