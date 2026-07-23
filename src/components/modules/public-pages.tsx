'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  Recycle,
  Scale,
  Wallet,
  Banknote,
  Mail,
  Lock,
  User,
  Phone,
  MapPin,
  IdCard,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Send,
  RefreshCw,
  Building2,
  Mail as MailIcon,
  Phone as PhoneIcon,
  MapPin as MapPinIcon,
  ShoppingBag,
  Home,
  BookOpen,
  PackageSearch,
  Users,
  Camera,
  Sprout,
  CalendarDays,
  Calendar,
  Images,
  Image as ImageIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'

import { api } from '@/lib/api'
import { formatNumber, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

// =====================================================================
// Theme palette
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
// Shared bits
// =====================================================================

function BrandLogo({
  variant = 'light',
  size = 'md',
}: {
  variant?: 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg'
}) {
  const logoSize = size === 'lg' ? 'size-12' : size === 'sm' ? 'size-8' : 'size-10'
  const titleSize =
    size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-sm' : 'text-base'
  const titleColor = variant === 'light' ? 'text-white' : 'text-[#2d5016]'
  return (
    <div className="flex items-center gap-2">
      <img
        src="/logo-bank-sampah.png"
        alt="Logo Bank Sampah Sukamaju Sejahtera"
        className={cn('rounded-full object-cover', logoSize)}
      />
      <div className="leading-tight">
        <div className={cn('font-extrabold tracking-wide', titleSize, titleColor)}>
          BANK SAMPAH
        </div>
      </div>
    </div>
  )
}

function IconField({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-700/60" />
      {children}
    </div>
  )
}

function FieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: React.ReactNode
  required?: boolean
  htmlFor?: string
}) {
  return (
    <Label htmlFor={htmlFor} className="mb-1.5 text-sm font-medium text-emerald-950">
      {children}
      {required && <span className="ml-0.5 text-rose-600">*</span>}
    </Label>
  )
}

// =====================================================================
// LandingPage
// =====================================================================

export function LandingPage({
  onLogin,
  onRegister,
  onMerchandise,
  onLacakPesanan,
  onEdukasi,
  onKegiatan,
}: {
  onLogin: () => void
  onRegister: () => void
  onMerchandise?: () => void
  onLacakPesanan?: () => void
  onEdukasi?: () => void
  onKegiatan?: () => void
}) {
  const [stats, setStats] = React.useState<{
    nasabahCount: number
    totalSampah: number
    edukasiCount: number
    kegiatanCount: number
  } | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [kegiatanList, setKegiatanList] = React.useState<any[]>([])

  React.useEffect(() => {
    let mounted = true
    api
      .public
      .stats()
      .then((data) => {
        if (mounted) setStats(data)
      })
      .catch(() => {
        // silently fail — landing page still renders with 0
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    // Fetch kegiatan for gallery
    api.kegiatan.list()
      .then((data) => { if (mounted) setKegiatanList(data || []) })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  const nasabahCount = stats?.nasabahCount ?? 0
  const totalSampah = stats?.totalSampah ?? 0
  const edukasiCount = stats?.edukasiCount ?? 0
  const kegiatanCount = stats?.kegiatanCount ?? 0

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* ===== Header ===== */}
      <header
        className="sticky top-0 z-30 w-full"
        style={{ backgroundColor: COLORS.darkGreen }}
      >
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
          <BrandLogo variant="light" size="md" />

          <nav className="flex items-center gap-1 sm:gap-1.5 md:gap-5 lg:gap-6">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label="Beranda"
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Home className="size-4" />
              <span className="hidden sm:inline">Beranda</span>
            </button>
            <button
              type="button"
              onClick={() => onEdukasi?.()}
              aria-label="Edukasi"
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white"
            >
              <BookOpen className="size-4" />
              <span className="hidden sm:inline">Edukasi</span>
            </button>
            <button
              type="button"
              onClick={onMerchandise}
              aria-label="Merchandise"
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ShoppingBag className="size-4" />
              <span className="hidden sm:inline">Merchandise</span>
            </button>
            <button
              type="button"
              onClick={onLacakPesanan || onMerchandise}
              aria-label="Lacak Pesanan"
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white"
            >
              <PackageSearch className="size-4" />
              <span className="hidden sm:inline">Lacak Pesanan</span>
            </button>
          </nav>

          <Button
            type="button"
            onClick={onLogin}
            variant="outline"
            className="border-white/40 bg-transparent px-3 text-xs font-semibold tracking-wide text-white hover:bg-white/10 hover:text-white sm:px-4 sm:text-sm"
          >
            MASUK
          </Button>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section
        className="w-full"
        style={{ backgroundColor: COLORS.beige }}
      >
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-20">
          <img
            src="/logo-bank-sampah.png"
            alt="Logo Bank Sampah Sukamaju Sejahtera"
            className="mb-6 size-24 rounded-full object-cover ring-8 ring-[#4caf50]/10 sm:size-28"
          />

          <h1 className="mb-4 text-2xl font-extrabold leading-tight tracking-tight text-[#2d5016] sm:text-3xl md:text-4xl lg:text-5xl">
            Bank Sampah Sukamaju Sejahtera
          </h1>

          <p className="mb-8 max-w-2xl text-sm leading-relaxed text-emerald-900/80 sm:text-base">
            Sistem operasional pengumpulan dan daur ulang sampah masyarakat.
            Tabung sampah, dapatkan saldo &amp; poin, atau sedekahkan untuk bumi
            yang lebih baik.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              onClick={() => onEdukasi?.()}
              variant="outline"
              className="border-[#2d5016] bg-transparent text-[#2d5016] hover:bg-[#2d5016]/10"
              size="lg"
            >
              Baca Edukasi
            </Button>
            <Button
              type="button"
              onClick={onMerchandise || onRegister}
              className="text-emerald-950 shadow-md hover:opacity-90"
              style={{ backgroundColor: COLORS.yellow }}
              size="lg"
            >
              <ShoppingBag className="size-4" />
              Lihat Produk
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ===== Stats row ===== */}
      <section
        className="w-full border-t border-emerald-900/10"
        style={{ backgroundColor: COLORS.beige }}
      >
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-4 pb-16 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
          <StatCard
            label="Nasabah Terdaftar"
            value={loading ? null : `${formatNumber(nasabahCount, 0)} Nasabah`}
            accent="green"
            icon={Users}
          />
          <StatCard
            label="Total Sampah Tertabung"
            value={loading ? null : `${formatNumber(totalSampah, 2)} kg`}
            accent="dark"
            icon={Sprout}
          />
          <StatCard
            label="Konten Edukasi"
            value={loading ? null : `${formatNumber(edukasiCount, 0)} Artikel`}
            accent="yellow"
            icon={BookOpen}
            onClick={onEdukasi}
          />
          <StatCard
            label="Dokumentasi Kegiatan"
            value={loading ? null : `${formatNumber(kegiatanCount, 0)} Kegiatan`}
            accent="blue"
            icon={Camera}
            onClick={onKegiatan}
          />
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section className="w-full bg-white">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
          <div className="mb-10 text-center">
            <Badge
              variant="outline"
              className="mb-3 border-[#4caf50]/40 bg-[#4caf50]/10 text-[#2d5016]"
            >
              Proses Sederhana
            </Badge>
            <h2 className="text-2xl font-bold text-[#2d5016] sm:text-3xl">
              Cara Kerja
            </h2>
            <p className="mt-2 text-sm text-emerald-900/70">
              Tiga langkah mudah dari sampah jadi saldo.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <HowItWorksCard
              step="1"
              icon={Scale}
              title="Timbang & Catat"
              description="Bawa sampah Anda ke Bank Sampah. Admin akan timbang dan catat ke sistem sesuai harga berlaku."
            />
            <HowItWorksCard
              step="2"
              icon={Wallet}
              title="Saldo Terkumpul"
              description="Nilai sampah jadi saldo Anda. Member juga dapat poin untuk ditukar merchandise."
            />
            <HowItWorksCard
              step="3"
              icon={Banknote}
              title="Cairkan"
              description="Setelah dana siap, admin rilis saldo dan Anda bisa cairkan via cash atau transfer."
            />
          </div>
        </div>
      </section>

      {/* ===== Kegiatan Gallery ===== */}
      {kegiatanList.length > 0 && (
        <section className="w-full bg-[#f5f5dc]/30">
          <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
            <div className="mb-10 text-center">
              <Badge
                variant="outline"
                className="mb-3 border-[#4caf50]/40 bg-[#4caf50]/10 text-[#2d5016]"
              >
                <Camera className="mr-1 size-3" /> Galeri Kegiatan
              </Badge>
              <h2 className="text-2xl font-bold text-[#2d5016] sm:text-3xl">
                Dokumentasi Kegiatan
              </h2>
              <p className="mt-2 text-sm text-emerald-900/70">
                Aksi nyata bank sampah dalam menjaga lingkungan.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {kegiatanList.slice(0, 6).map((k) => (
                <div key={k.id} className="group overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm transition hover:shadow-md">
                  <div className="relative h-48 overflow-hidden bg-emerald-50">
                    {k.coverImage ? (
                      <img src={k.coverImage} alt={k.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : Array.isArray(k.images) && k.images.length > 0 ? (
                      <img src={k.images[0]} alt={k.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Camera className="size-10 text-emerald-300" />
                      </div>
                    )}
                    {Array.isArray(k.images) && k.images.length > 0 && (
                      <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                        <Images className="size-3" /> {k.images.length}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-1 text-sm font-bold text-[#2d5016]">{k.title}</h3>
                    {k.description && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-emerald-900/60">{k.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-zinc-400">
                      {k.activityDate && (
                        <span className="flex items-center gap-0.5">
                          <Calendar className="size-3" /> {formatDate(k.activityDate)}
                        </span>
                      )}
                      {k.location && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="size-3" /> {k.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== Footer ===== */}
      <footer
        className="mt-auto w-full text-white"
        style={{ backgroundColor: COLORS.footerDark }}
      >
        {/* CTA Band */}
        <div className="border-b border-white/10">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="max-w-md">
              <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#ffc107]">
                IKUT BERPARTISIPASI
              </div>
              <p className="text-sm text-white/80">
                Daftar jadi nasabah atau donasikan sampahmu. Setiap kg berharga.
              </p>
            </div>
            <Button
              type="button"
              onClick={onRegister}
              className="shrink-0 text-emerald-950 hover:opacity-90"
              style={{ backgroundColor: COLORS.yellow }}
              size="lg"
            >
              DAFTAR SEKARANG
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* Footer body */}
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-2">
            <BrandLogo variant="light" size="md" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
              Sistem operasional bank sampah Sukamaju Sejahtera — mengelola
              sampah jadi saldo, poin, dan produk olahan yang bernilai bagi
              masyarakat.
            </p>
          </div>

          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/60">
              Kontak
            </div>
            <ul className="space-y-2 text-sm text-white/80">
              <li className="flex items-start gap-2">
                <MapPinIcon className="mt-0.5 size-4 shrink-0 text-[#4caf50]" />
                <span>Jl. Melati No. 1, Bandung</span>
              </li>
              <li className="flex items-center gap-2">
                <PhoneIcon className="size-4 shrink-0 text-[#4caf50]" />
                <span>+62 812-3456-7890</span>
              </li>
              <li className="flex items-center gap-2">
                <MailIcon className="size-4 shrink-0 text-[#4caf50]" />
                <span>halo@banksampah.test</span>
              </li>
            </ul>
          </div>

          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/60">
              Navigasi
            </div>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  className="text-white/80 transition-colors hover:text-white"
                >
                  Beranda
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onEdukasi?.()}
                  className="text-white/80 transition-colors hover:text-white"
                >
                  Edukasi
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onLacakPesanan || onMerchandise}
                  className="text-white/80 transition-colors hover:text-white"
                >
                  Lacak Pesanan
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onMerchandise}
                  className="text-white/80 transition-colors hover:text-white"
                >
                  Merchandise
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onLogin}
                  className="text-white/80 transition-colors hover:text-white"
                >
                  Masuk
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onRegister}
                  className="text-white/80 transition-colors hover:text-white"
                >
                  Daftar
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto w-full max-w-5xl px-4 py-4 text-center text-xs text-white/50 sm:px-6">
            &copy; {new Date().getFullYear()} Bank Sampah Sukamaju Sejahtera.
            Semua hak dilindungi.
          </div>
        </div>
      </footer>
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
  icon: Icon,
  onClick,
}: {
  label: string
  value: string | null
  accent: 'green' | 'dark' | 'yellow' | 'blue'
  icon: React.ComponentType<{ className?: string }>
  onClick?: () => void
}) {
  const accentBg =
    accent === 'green'
      ? 'bg-[#4caf50]/15 text-[#2d5016]'
      : accent === 'dark'
        ? 'bg-[#2d5016]/10 text-[#2d5016]'
        : accent === 'blue'
          ? 'bg-blue-100 text-blue-700'
          : 'bg-[#ffc107]/20 text-emerald-950'
  const clickable = !!onClick
  return (
    <Card
      className={cn(
        'gap-0 rounded-2xl border-emerald-900/10 bg-white p-5 shadow-sm transition-all',
        clickable && 'cursor-pointer hover:border-emerald-300 hover:shadow-md hover:ring-1 hover:ring-emerald-200',
      )}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick!() } } : undefined}
    >
      <CardContent className="p-0">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex size-11 items-center justify-center rounded-xl',
              accentBg,
            )}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <div className="text-xs font-medium uppercase tracking-wide text-emerald-900/60">
                {label}
              </div>
              {clickable && (
                <ArrowRight className="size-3 text-emerald-400" />
              )}
            </div>
            {value === null ? (
              <Skeleton className="mt-1 h-6 w-28" />
            ) : (
              <div className="mt-0.5 truncate text-lg font-bold text-[#2d5016]">
                {value}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function HowItWorksCard({
  step,
  icon: Icon,
  title,
  description,
}: {
  step: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <Card className="group rounded-2xl border-emerald-900/10 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-0">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex size-12 items-center justify-center rounded-xl bg-[#4caf50]/15 text-[#2d5016] transition-colors group-hover:bg-[#4caf50] group-hover:text-white">
            <Icon className="size-6" />
          </div>
          <span className="text-3xl font-extrabold text-emerald-900/15">
            {step}
          </span>
        </div>
        <h3 className="mb-2 text-lg font-bold text-[#2d5016]">{title}</h3>
        <p className="text-sm leading-relaxed text-emerald-900/70">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

// =====================================================================
// LoginPage
// =====================================================================

export function LoginPage({
  onBack,
  onLoginSuccess,
  onRegister,
}: {
  onBack: () => void
  onLoginSuccess: (token: string, user: any) => void
  onRegister: () => void
}) {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [remember, setRemember] = React.useState(true)
  const [showPassword, setShowPassword] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error('Email dan password wajib diisi')
      return
    }
    setLoading(true)
    try {
      const res = await api.auth.login(email.trim(), password)
      toast.success('Berhasil masuk. Mengalihkan...')
      onLoginSuccess(res.token, res.user)
    } catch (err: any) {
      toast.error(err?.message || 'Gagal masuk. Periksa email & password Anda.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: COLORS.beige }}
    >
      {/* Breadcrumb */}
      <div className="mx-auto w-full max-w-md px-4 pt-6 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-900/70 transition-colors hover:text-[#2d5016]"
        >
          <ArrowLeft className="size-3.5" />
          Beranda
          <ChevronRight className="size-3" />
          <span className="text-[#2d5016]">Masuk</span>
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        <Card className="w-full max-w-md rounded-2xl border-emerald-900/10 bg-white p-6 shadow-lg sm:p-8">
          <CardHeader className="items-center px-0 text-center">
            <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-[#4caf50]/15">
              <Recycle className="size-7 text-[#2d5016]" />
            </div>
            <CardTitle className="text-lg font-bold text-[#2d5016]">
              Bank Sampah Sukamaju Sejahtera
            </CardTitle>
            <CardDescription className="mt-3 text-base font-semibold text-emerald-950">
              Masuk ke akun Anda
            </CardDescription>
            <p className="text-sm text-emerald-900/70">
              Masukkan email dan password untuk masuk
            </p>
          </CardHeader>

          <CardContent className="px-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="login-email" required>
                  Email
                </FieldLabel>
                <IconField icon={Mail}>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="email@contoh.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-emerald-900/15 bg-white pl-9 focus-visible:border-[#4caf50] focus-visible:ring-[#4caf50]/30"
                    disabled={loading}
                  />
                </IconField>
              </div>

              <div className="space-y-1.5">
                <FieldLabel htmlFor="login-password" required>
                  Password
                </FieldLabel>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-700/60" />
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-emerald-900/15 bg-white pl-9 pr-9 focus-visible:border-[#4caf50] focus-visible:ring-[#4caf50]/30"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-700/60 transition-colors hover:text-[#2d5016]"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-emerald-950">
                  <Checkbox
                    checked={remember}
                    onCheckedChange={(v) => setRemember(v === true)}
                    className="border-emerald-900/30 data-[state=checked]:bg-[#4caf50] data-[state=checked]:border-[#4caf50]"
                  />
                  Ingat saya
                </label>
                <button
                  type="button"
                  onClick={() =>
                    toast.info(
                      'Hubungi admin untuk reset password: halo@banksampah.test',
                    )
                  }
                  className="text-sm font-medium text-[#2d5016] underline-offset-2 hover:underline"
                >
                  Lupa password?
                </button>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full text-white shadow-md hover:opacity-90"
                style={{ backgroundColor: COLORS.green }}
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Masuk'
                )}
              </Button>
            </form>

            <Separator className="my-6 bg-emerald-900/10" />

            <p className="text-center text-sm text-emerald-900/80">
              Belum punya akun?{' '}
              <button
                type="button"
                onClick={onRegister}
                disabled={loading}
                className="font-semibold text-[#2d5016] underline-offset-2 hover:underline disabled:opacity-50"
              >
                Daftar
              </button>
            </p>
          </CardContent>

          <CardFooter className="justify-center px-0 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 text-xs text-emerald-900/60 transition-colors hover:text-[#2d5016]"
            >
              <ArrowLeft className="size-3" />
              Kembali ke beranda
            </button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

// =====================================================================
// RegisterPage (two-step: form -> OTP)
// =====================================================================

type RegisterStep = 'form' | 'otp'

interface RegisterFormState {
  name: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  address: string
  nik: string
  isNasabah: boolean
  isKoperasi: boolean
}

export function RegisterPage({
  onBack,
  onRegisterSuccess,
  onLogin,
}: {
  onBack: () => void
  onRegisterSuccess: (token: string, user: any) => void
  onLogin: () => void
}) {
  const [step, setStep] = React.useState<RegisterStep>('form')
  const [form, setForm] = React.useState<RegisterFormState>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    nik: '',
    isNasabah: true,
    isKoperasi: false,
  })
  const [loading, setLoading] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)

  // OTP step
  const [userId, setUserId] = React.useState<string | null>(null)
  const [demoOtp, setDemoOtp] = React.useState<string | null>(null)
  const [otp, setOtp] = React.useState('')
  const [verifying, setVerifying] = React.useState(false)

  function update<K extends keyof RegisterFormState>(
    key: K,
    value: RegisterFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function validateForm(): string | null {
    if (!form.name.trim()) return 'Nama lengkap wajib diisi'
    if (!form.email.trim()) return 'Email wajib diisi'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return 'Format email tidak valid'
    if (!form.phone.trim()) return 'No. telepon wajib diisi'
    if (form.password.length < 8) return 'Password minimal 8 karakter'
    if (form.password !== form.confirmPassword)
      return 'Konfirmasi password tidak cocok'
    if (!form.address.trim()) return 'Alamat lengkap wajib diisi'
    if (form.nik.trim().length !== 16) return 'NIK harus 16 digit'
    if (!/^\d{16}$/.test(form.nik.trim())) return 'NIK harus berupa 16 digit angka'
    if (!form.isNasabah && !form.isKoperasi) return 'Pilih minimal satu jenis keanggotaan (Bank Sampah atau Koperasi)'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validateForm()
    if (err) {
      toast.error(err)
      return
    }
    setLoading(true)
    try {
      const res = await api.auth.register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        address: form.address.trim(),
        nik: form.nik.trim(),
        isNasabah: form.isNasabah,
        isKoperasi: form.isKoperasi,
      })
      if (!res?.userId) {
        throw new Error('Respons registrasi tidak valid')
      }
      setUserId(res.userId)
      setOtp('')
      if (res.emailSent) {
        toast.success(`Kode OTP telah dikirim ke ${form.email}. Cek inbox email Anda.`)
      } else {
        toast.error('Akun dibuat, tapi email OTP gagal dikirim. Klik "Kirim Ulang" di bawah.')
      }
      setStep('otp')
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mendaftar. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) {
      toast.error('Sesi tidak valid. Silakan daftar ulang.')
      setStep('form')
      return
    }
    if (otp.length !== 6) {
      toast.error('Kode OTP harus 6 digit')
      return
    }
    setVerifying(true)
    try {
      const res = await api.auth.verifyOtp(userId, otp)
      toast.success('Verifikasi berhasil. Mengalihkan...')
      onRegisterSuccess(res.token, res.user)
    } catch (err: any) {
      toast.error(err?.message || 'Kode OTP salah atau sudah kedaluwarsa.')
    } finally {
      setVerifying(false)
    }
  }

  async function handleResend() {
    if (!userId) {
      toast.error('Sesi tidak valid. Silakan daftar ulang.')
      setStep('form')
      return
    }
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Gagal mengirim ulang OTP')
        return
      }
      toast.success(data.message || `Kode OTP baru telah dikirim ke ${form.email}`)
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengirim ulang OTP')
    }
  }

  // ============ Render ============
  if (step === 'otp') {
    return (
      <OtpVerifyView
        email={form.email}
        demoOtp={demoOtp}
        otp={otp}
        setOtp={setOtp}
        verifying={verifying}
        onVerify={handleVerify}
        onResend={handleResend}
        onBackToForm={() => {
          setStep('form')
          setOtp('')
        }}
        onBack={onBack}
      />
    )
  }

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: COLORS.beige }}
    >
      {/* Breadcrumb */}
      <div className="mx-auto w-full max-w-md px-4 pt-6 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-900/70 transition-colors hover:text-[#2d5016]"
        >
          <ArrowLeft className="size-3.5" />
          Beranda
          <ChevronRight className="size-3" />
          <span className="text-[#2d5016]">Daftar</span>
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        <Card className="w-full max-w-md rounded-2xl border-emerald-900/10 bg-white p-6 shadow-lg sm:p-8">
          <CardHeader className="items-center px-0 text-center">
            <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-[#4caf50]/15">
              <Recycle className="size-7 text-[#2d5016]" />
            </div>
            <CardTitle className="text-lg font-bold text-[#2d5016]">
              Bank Sampah Sukamaju Sejahtera
            </CardTitle>
            <CardDescription className="mt-3 text-base font-semibold text-emerald-950">
              Buat akun baru
            </CardDescription>
            <p className="text-sm text-emerald-900/70">
              Isi data lengkap di bawah untuk mendaftar
            </p>
          </CardHeader>

          <CardContent className="px-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nama Lengkap */}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="reg-name" required>
                  Nama Lengkap
                </FieldLabel>
                <IconField icon={User}>
                  <Input
                    id="reg-name"
                    name="name"
                    required
                    placeholder="Nama sesuai KTP"
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    className="border-emerald-900/15 bg-white pl-9 focus-visible:border-[#4caf50] focus-visible:ring-[#4caf50]/30"
                    disabled={loading}
                    autoComplete="name"
                  />
                </IconField>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="reg-email" required>
                  Email
                </FieldLabel>
                <IconField icon={Mail}>
                  <Input
                    id="reg-email"
                    name="email"
                    type="email"
                    required
                    placeholder="email@contoh.com"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    className="border-emerald-900/15 bg-white pl-9 focus-visible:border-[#4caf50] focus-visible:ring-[#4caf50]/30"
                    disabled={loading}
                    autoComplete="email"
                  />
                </IconField>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="reg-phone" required>
                  No. Telepon / WA
                </FieldLabel>
                <IconField icon={Phone}>
                  <Input
                    id="reg-phone"
                    name="phone"
                    type="tel"
                    required
                    placeholder="08xxx"
                    value={form.phone}
                    onChange={(e) =>
                      update('phone', e.target.value.replace(/[^\d+]/g, ''))
                    }
                    className="border-emerald-900/15 bg-white pl-9 focus-visible:border-[#4caf50] focus-visible:ring-[#4caf50]/30"
                    disabled={loading}
                    autoComplete="tel"
                  />
                </IconField>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="reg-password" required>
                  Password
                </FieldLabel>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-700/60" />
                  <Input
                    id="reg-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Min. 8 Karakter"
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    className="border-emerald-900/15 bg-white pl-9 pr-9 focus-visible:border-[#4caf50] focus-visible:ring-[#4caf50]/30"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-700/60 transition-colors hover:text-[#2d5016]"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Alamat */}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="reg-address" required>
                  Alamat Lengkap
                </FieldLabel>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-3 size-4 text-emerald-700/60" />
                  <Textarea
                    id="reg-address"
                    placeholder="Detail alamat domisili..."
                    value={form.address}
                    onChange={(e) => update('address', e.target.value)}
                    className="min-h-20 resize-y border-emerald-900/15 bg-white pl-9 pt-2 focus-visible:border-[#4caf50] focus-visible:ring-[#4caf50]/30"
                    disabled={loading}
                    autoComplete="street-address"
                  />
                </div>
              </div>

              {/* NIK */}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="reg-nik" required>
                  NIK
                </FieldLabel>
                <IconField icon={IdCard}>
                  <Input
                    id="reg-nik"
                    name="nik"
                    inputMode="numeric"
                    maxLength={16}
                    required
                    placeholder="Masukkan 16 Digit NIK"
                    value={form.nik}
                    onChange={(e) =>
                      update('nik', e.target.value.replace(/\D/g, '').slice(0, 16))
                    }
                    className="border-emerald-900/15 bg-white pl-9 focus-visible:border-[#4caf50] focus-visible:ring-[#4caf50]/30"
                    disabled={loading}
                  />
                </IconField>
                <p className="text-xs text-emerald-900/60">
                  {form.nik.length}/16 digit
                </p>
              </div>

              {/* Membership Type — Checkboxes (can pick one or both) */}
              <div className="space-y-2">
                <FieldLabel required>Pilih Jenis Keanggotaan</FieldLabel>
                <p className="text-xs text-emerald-900/60">Bisa pilih salah satu atau keduanya</p>
                <div className="space-y-2">
                  <MembershipCheckbox
                    title="Nasabah Bank Sampah"
                    description="Mulai menabung sampah, dapatkan saldo & poin"
                    checked={form.isNasabah}
                    onChange={(v) => update('isNasabah', v)}
                    disabled={loading}
                  />
                  <MembershipCheckbox
                    title="Anggota Koperasi Simpan Pinjam"
                    description="Akses simpanan, pinjaman, & angsuran koperasi"
                    checked={form.isKoperasi}
                    onChange={(v) => update('isKoperasi', v)}
                    disabled={loading}
                  />
                </div>
                {!form.isNasabah && !form.isKoperasi && (
                  <p className="text-xs text-rose-600">Pilih minimal satu jenis keanggotaan</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="reg-confirm" required>
                  Konfirmasi Password
                </FieldLabel>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-700/60" />
                  <Input
                    id="reg-confirm"
                    name="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    required
                    placeholder="Ulangi password"
                    value={form.confirmPassword}
                    onChange={(e) => update('confirmPassword', e.target.value)}
                    className="border-emerald-900/15 bg-white pl-9 pr-9 focus-visible:border-[#4caf50] focus-visible:ring-[#4caf50]/30"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-700/60 transition-colors hover:text-[#2d5016]"
                    tabIndex={-1}
                    aria-label={showConfirm ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showConfirm ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {form.confirmPassword.length > 0 &&
                  form.confirmPassword !== form.password && (
                    <p className="text-xs text-rose-600">
                      Konfirmasi password tidak cocok
                    </p>
                  )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full text-white shadow-md hover:opacity-90"
                style={{ backgroundColor: COLORS.green }}
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Daftar Sekarang'
                )}
              </Button>
            </form>

            <Separator className="my-6 bg-emerald-900/10" />

            <p className="text-center text-sm text-emerald-900/80">
              Sudah punya akun?{' '}
              <button
                type="button"
                onClick={onLogin}
                disabled={loading}
                className="font-semibold text-[#2d5016] underline-offset-2 hover:underline disabled:opacity-50"
              >
                Masuk
              </button>
            </p>
          </CardContent>

          <CardFooter className="justify-center px-0 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 text-xs text-emerald-900/60 transition-colors hover:text-[#2d5016]"
            >
              <ArrowLeft className="size-3" />
              Kembali ke beranda
            </button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

function MembershipCheckbox({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all',
        checked
          ? 'border-[#0d9488] bg-teal-50/60 ring-1 ring-[#0d9488]/30'
          : 'border-emerald-900/15 bg-white hover:border-emerald-900/30 hover:bg-emerald-50/40',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(!!v)}
        disabled={disabled}
        className="mt-0.5 border-emerald-900/30 data-[state=checked]:border-[#0d9488] data-[state=checked]:bg-[#0d9488] data-[state=checked]:text-white"
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-emerald-950">{title}</div>
        <div className="text-xs text-emerald-900/70">{description}</div>
      </div>
      {checked && (
        <CheckCircle2 className="size-4 shrink-0 text-[#0d9488]" />
      )}
    </label>
  )
}

function OtpVerifyView({
  email,
  demoOtp,
  otp,
  setOtp,
  verifying,
  onVerify,
  onResend,
  onBackToForm,
  onBack,
}: {
  email: string
  demoOtp: string | null
  otp: string
  setOtp: (v: string) => void
  verifying: boolean
  onVerify: (e: React.FormEvent) => void
  onResend: () => void
  onBackToForm: () => void
  onBack: () => void
}) {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: COLORS.beige }}
    >
      {/* Breadcrumb */}
      <div className="mx-auto w-full max-w-md px-4 pt-6 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-900/70 transition-colors hover:text-[#2d5016]"
        >
          <ArrowLeft className="size-3.5" />
          Beranda
          <ChevronRight className="size-3" />
          <span className="text-[#2d5016]">Daftar</span>
          <ChevronRight className="size-3" />
          <span className="text-[#2d5016]">Verifikasi</span>
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        <Card className="w-full max-w-md rounded-2xl border-emerald-900/10 bg-white p-6 shadow-lg sm:p-8">
          <CardHeader className="items-center px-0 text-center">
            <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-[#4caf50]/15">
              <Mail className="size-7 text-[#2d5016]" />
            </div>
            <CardTitle className="text-xl font-bold text-[#2d5016]">
              Verifikasi Email
            </CardTitle>
            <p className="mt-2 text-sm text-emerald-900/80">
              Kode OTP telah dikirim ke{' '}
              <span className="font-semibold text-emerald-950">{email}</span>.
              Masukkan 6 digit kode di bawah.
            </p>
          </CardHeader>

          <CardContent className="px-0">
            {/* Info box: OTP dikirim via email Resend (tidak ada lagi demo OTP) */}
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  Email Terkirim
                </div>
                <div className="text-sm text-emerald-900">
                  Kode OTP telah dikirim ke <strong>{email}</strong>. Cek inbox email Anda
                  (juga cek folder spam/promosi). Kode berlaku 10 menit.
                </div>
              </div>
            </div>

            <form onSubmit={onVerify} className="space-y-6">
              <div className="flex flex-col items-center gap-3">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(v) => setOtp(v)}
                  disabled={verifying}
                  containerClassName="justify-center"
                >
                  <InputOTPGroup className="gap-1 sm:gap-2">
                    <InputOTPSlot
                      index={0}
                      className="size-10 sm:size-12 text-base sm:text-lg first:rounded-l-lg last:rounded-r-lg border-emerald-900/20"
                    />
                    <InputOTPSlot
                      index={1}
                      className="size-10 sm:size-12 text-base sm:text-lg border-emerald-900/20"
                    />
                    <InputOTPSlot
                      index={2}
                      className="size-10 sm:size-12 text-base sm:text-lg border-emerald-900/20"
                    />
                    <InputOTPSlot
                      index={3}
                      className="size-10 sm:size-12 text-base sm:text-lg border-emerald-900/20"
                    />
                    <InputOTPSlot
                      index={4}
                      className="size-10 sm:size-12 text-base sm:text-lg border-emerald-900/20"
                    />
                    <InputOTPSlot
                      index={5}
                      className="size-10 sm:size-12 text-base sm:text-lg last:rounded-r-lg border-emerald-900/20"
                    />
                  </InputOTPGroup>
                </InputOTP>
                <p className="text-xs text-emerald-900/60">
                  {otp.length}/6 digit
                </p>
              </div>

              <Button
                type="submit"
                disabled={verifying || otp.length !== 6}
                className="w-full text-white shadow-md hover:opacity-90"
                style={{ backgroundColor: COLORS.green }}
                size="lg"
              >
                {verifying ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    Verifikasi
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={onResend}
                disabled={verifying}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2d5016] underline-offset-2 hover:underline disabled:opacity-50"
              >
                <RefreshCw className="size-3.5" />
                Kirim ulang kode
              </button>
              <button
                type="button"
                onClick={onBackToForm}
                disabled={verifying}
                className="inline-flex items-center gap-1 text-xs text-emerald-900/60 transition-colors hover:text-[#2d5016] disabled:opacity-50"
              >
                <ArrowLeft className="size-3" />
                Kembali ke formulir
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default LandingPage
