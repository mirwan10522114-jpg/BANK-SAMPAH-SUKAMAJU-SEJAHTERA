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
  HandHeart,
  UserPlus,
  CheckCircle,
  PiggyBank,
  Landmark,
  Coins,
  Box,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'

import { api } from '@/lib/api'
import { formatNumber, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { WhatsAppBubble } from '@/components/ui/whatsapp-bubble'

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
        src="/logo.png"
        alt="Logo Bank Sampah Sukamaju Sejahtera"
        className={cn('rounded-full object-cover', logoSize)}
      />
            <div className="hidden leading-tight sm:block">
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
    totalNabung?: number
    totalSedekah?: number
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
  const totalNabung = stats?.totalNabung ?? 0
  const totalSedekah = stats?.totalSedekah ?? 0
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

          <nav className="flex items-center gap-0.5 sm:gap-1.5 md:gap-5 lg:gap-6">            
                       <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label="Beranda"
              className="flex flex-col items-center gap-0.5 rounded-md px-1 py-1 text-[9px] font-medium leading-tight text-white/90 transition-colors hover:bg-white/10 hover:text-white sm:flex-row sm:gap-1.5 sm:px-2 sm:py-1.5 sm:text-sm"
            >
              <Home className="size-4 shrink-0" />
              <span>Beranda</span>
            </button>
                        <button
              type="button"
              onClick={() => onEdukasi?.()}
              aria-label="Edukasi"
              className="flex flex-col items-center gap-0.5 rounded-md px-1 py-1 text-[9px] font-medium leading-tight text-white/90 transition-colors hover:bg-white/10 hover:text-white sm:flex-row sm:gap-1.5 sm:px-2 sm:py-1.5 sm:text-sm"
            >
              <BookOpen className="size-4 shrink-0" />
              <span>Edukasi</span>
            </button>
                        <button
              type="button"
              onClick={() => onKegiatan?.()}
              aria-label="Dokumentasi Kegiatan"
              className="flex flex-col items-center gap-0.5 rounded-md px-1 py-1 text-[9px] font-medium leading-tight text-white/90 transition-colors hover:bg-white/10 hover:text-white sm:flex-row sm:gap-1.5 sm:px-2 sm:py-1.5 sm:text-sm"
            >
              <Camera className="size-4 shrink-0" />
              <span className="sm:hidden">Kegiatan</span>
              <span className="hidden sm:inline">Dokumentasi Kegiatan</span>
            </button>
                        <button
              type="button"
              onClick={onMerchandise}
              aria-label="Merchandise"
              className="flex flex-col items-center gap-0.5 rounded-md px-1 py-1 text-[9px] font-medium leading-tight text-white/90 transition-colors hover:bg-white/10 hover:text-white sm:flex-row sm:gap-1.5 sm:px-2 sm:py-1.5 sm:text-sm"
            >
              <ShoppingBag className="size-4 shrink-0" />
              <span>Merchandise</span>
            </button>
                        <button
              type="button"
              onClick={onLacakPesanan || onMerchandise}
              aria-label="Lacak Pesanan"
              className="flex flex-col items-center gap-0.5 rounded-md px-1 py-1 text-[9px] font-medium leading-tight text-white/90 transition-colors hover:bg-white/10 hover:text-white sm:flex-row sm:gap-1.5 sm:px-2 sm:py-1.5 sm:text-sm"
            >
              <PackageSearch className="size-4 shrink-0" />
              <span className="sm:hidden">Lacak</span>
              <span className="hidden sm:inline">Lacak Pesanan</span>
            </button>
          </nav>

          <Button
            type="button"
            onClick={onLogin}
            variant="outline"
                        className="border-white/40 bg-transparent px-2 text-[10px] font-semibold tracking-wide text-white hover:bg-white/10 hover:text-white sm:px-4 sm:text-sm"
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
            src="/logo.png"
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
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-3.5 px-4 pb-16 sm:grid-cols-2 lg:grid-cols-5 sm:px-6">
          <StatCard
            label="Nasabah Terdaftar"
            value={loading ? null : formatNumber(nasabahCount, 0)}
            unit="Nasabah"
            accent="green"
            icon={Users}
          />
          <StatCard
            label="Sampah Nabung"
            value={loading ? null : formatNumber(totalNabung, 2)}
            unit="kg"
            accent="dark"
            icon={Sprout}
          />
          <StatCard
            label="Sampah Sedekah"
            value={loading ? null : formatNumber(totalSedekah, 2)}
            unit="kg"
            accent="dark"
            icon={HandHeart}
          />
          <StatCard
            label="Konten Edukasi"
            value={loading ? null : formatNumber(edukasiCount, 0)}
            unit="Artikel"
            accent="yellow"
            icon={BookOpen}
            onClick={onEdukasi}
          />
          <StatCard
            label="Dokumentasi Kegiatan"
            value={loading ? null : formatNumber(kegiatanCount, 0)}
            unit="Kegiatan"
            accent="blue"
            icon={Camera}
            onClick={onKegiatan}
          />
        </div>
      </section>

      {/* ===== Panduan & Tata Cara ===== */}
      <section className="w-full bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-12 text-center">
            <Badge
              variant="outline"
              className="mb-3 border-[#4caf50]/40 bg-[#4caf50]/10 text-[#2d5016]"
            >
              Panduan Lengkap
            </Badge>
            <h2 className="text-2xl font-bold text-[#2d5016] sm:text-3xl">
              Tata Cara Menabung Sampah & Koperasi
            </h2>
            <p className="mt-2 text-sm text-emerald-900/70">
              Ikuti langkah-langkah berikut untuk mulai berkontribusi dan menikmati berbagai layanan kami.
            </p>
          </div>

          <div className="space-y-16">
            {/* Proses Pendaftaran */}
            <div>
              <div className="mb-6 flex items-center gap-3 border-b border-emerald-100 pb-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#4caf50] text-white">
                  <UserPlus className="size-5" />
                </div>
                <h3 className="text-xl font-bold text-emerald-900">1. Pendaftaran Anggota & Nasabah</h3>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <HowItWorksCard
                  step="1"
                  icon={UserPlus}
                  title="Daftar Akun"
                  description="Registrasi akun baru melalui halaman aplikasi web ini dengan mengisi data diri Anda."
                />
                <HowItWorksCard
                  step="2"
                  icon={Phone}
                  title="Verifikasi OTP"
                  description="Masukkan kode verifikasi (OTP) yang dikirimkan sistem melalui WhatsApp ke nomor Anda."
                />
                <HowItWorksCard
                  step="3"
                  icon={CheckCircle}
                  title="Verifikasi Pengurus"
                  description="Datang ke kantor Bank Sampah untuk verifikasi data tatap muka agar akun Anda diaktifkan secara resmi."
                />
              </div>
            </div>

            {/* Menabung Sampah */}
            <div>
              <div className="mb-6 flex items-center gap-3 border-b border-emerald-100 pb-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#4caf50] text-white">
                  <Recycle className="size-5" />
                </div>
                <h3 className="text-xl font-bold text-emerald-900">2. Menabung Sampah</h3>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <HowItWorksCard
                  step="1"
                  icon={Box}
                  title="Pilah Sampah"
                  description="Pisahkan sampah dari rumah sesuai kategori (plastik, kertas, logam, dll) agar lebih mudah ditimbang."
                />
                <HowItWorksCard
                  step="2"
                  icon={Scale}
                  title="Timbang di Lokasi"
                  description="Bawa sampah ke Bank Sampah. Petugas kami akan melakukan QC (Quality Control) dan menimbangnya."
                />
                <HowItWorksCard
                  step="3"
                  icon={Wallet}
                  title="Saldo Bertambah"
                  description="Hasil konversi timbangan akan otomatis masuk menjadi Saldo Kas dan Poin di akun Anda."
                />
              </div>
            </div>

            {/* Koperasi */}
            <div>
              <div className="mb-6 flex items-center gap-3 border-b border-emerald-100 pb-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#4caf50] text-white">
                  <Landmark className="size-5" />
                </div>
                <h3 className="text-xl font-bold text-emerald-900">3. Layanan Koperasi</h3>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <HowItWorksCard
                  step="1"
                  icon={PiggyBank}
                  title="Simpanan"
                  description="Saldo dari hasil menabung sampah dapat Anda alokasikan untuk Simpanan Pokok, Wajib, dan Sukarela."
                />
                <HowItWorksCard
                  step="2"
                  icon={Banknote}
                  title="Pinjaman"
                  description="Anggota koperasi aktif berhak mengajukan pinjaman uang tunai atau bahan bangunan (perbaikan rumah)."
                />
                <HowItWorksCard
                  step="3"
                  icon={Coins}
                  title="Bayar Angsuran"
                  description="Angsuran pinjaman dapat dibayar dengan uang tunai, atau dipotong langsung dari saldo sampah Anda."
                />
              </div>
            </div>
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
                  onClick={() => onKegiatan?.()}
                  className="text-white/80 transition-colors hover:text-white"
                >
                  Dokumentasi Kegiatan
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

      {/* WhatsApp Admin Floating Chat Bubble */}
      <WhatsAppBubble />
    </div>
  )
}

function StatCard({
  label,
  value,
  unit,
  accent,
  icon: Icon,
  onClick,
}: {
  label: string
  value: string | number | null
  unit?: string
  accent: 'green' | 'dark' | 'yellow' | 'blue'
  icon: React.ComponentType<{ className?: string }>
  onClick?: () => void
}) {
  const accentBg =
    accent === 'green'
      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10'
      : accent === 'dark'
        ? 'bg-[#2d5016]/10 text-[#2d5016] ring-1 ring-[#2d5016]/15'
        : accent === 'blue'
          ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10'
          : 'bg-amber-50 text-amber-800 ring-1 ring-amber-600/10'
  const clickable = !!onClick

  let displayVal: React.ReactNode = value
  let displayUnit = unit

  if (!unit && typeof value === 'string' && value.includes(' ')) {
    const parts = value.split(' ')
    displayVal = parts[0]
    displayUnit = parts.slice(1).join(' ')
  }

  return (
    <Card
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm transition-all duration-200',
        clickable
          ? 'cursor-pointer hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md'
          : 'hover:shadow-md',
      )}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick!() } } : undefined}
    >
      <CardContent className="flex h-full flex-col justify-between p-0">
        {/* Top: Icon + Optional clickable pill */}
        <div className="flex items-center justify-between">
          <div
            className={cn(
              'flex size-11 items-center justify-center rounded-xl shadow-xs transition-transform duration-200 group-hover:scale-105',
              accentBg,
            )}
          >
            <Icon className="size-5" />
          </div>
          {clickable && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 opacity-80 transition-colors group-hover:bg-emerald-100 group-hover:opacity-100">
              Lihat <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
        </div>

        {/* Bottom: Label & Metric Value */}
        <div className="mt-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-900/60">
            {label}
          </div>
          {value === null ? (
            <Skeleton className="mt-2 h-8 w-24" />
          ) : (
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-[#2d5016]">
                {displayVal}
              </span>
              {displayUnit && (
                <span className="text-xs font-bold text-emerald-800/70">
                  {displayUnit}
                </span>
              )}
            </div>
          )}
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
  onLoginSuccess: (token: string, pengguna: any) => void
  onRegister: () => void
}) {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [remember, setRemember] = React.useState(true)
  const [showPassword, setShowPassword] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  
  const [pendingOtpId, setPendingOtpId] = React.useState<string | null>(null)
  const [otp, setOtp] = React.useState('')
  const [verifying, setVerifying] = React.useState(false)
  const [resending, setResending] = React.useState(false)

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
      onLoginSuccess(res.token, res.pengguna)
    } catch (err: any) {
      if (err.requireOtp) {
        toast.info('Akun Anda belum verifikasi OTP.')
        setPendingOtpId(err.penggunaId)
      } else {
        toast.error(err?.message || 'Gagal masuk. Periksa email & password Anda.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length !== 6) return
    setVerifying(true)
    try {
      const res = await api.auth.verifyOtp(pendingOtpId!, otp)
      toast.success('Verifikasi berhasil! Mengalihkan...')
      onLoginSuccess(res.token, res.pengguna)
    } catch (e: any) {
      toast.error('Gagal verifikasi OTP: ' + e.message)
    } finally {
      setVerifying(false)
    }
  }

  async function handleResendOtp() {
    if (!pendingOtpId) return
    setResending(true)
    try {
      await api.auth.resendOtp(pendingOtpId)
      toast.success('OTP baru telah dikirim ke email Anda')
    } catch (e: any) {
      toast.error('Gagal mengirim ulang OTP: ' + e.message)
    } finally {
      setResending(false)
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
            {pendingOtpId ? (
              <form onSubmit={handleVerifyOtp} className="space-y-6 flex flex-col items-center mt-4">
                <p className="text-sm text-center text-emerald-900/80 max-w-xs mx-auto">
                  Silakan masukkan 6 digit kode OTP yang telah kami kirimkan ke email Anda untuk melanjutkan.
                </p>
                <InputOTP maxLength={6} value={otp} onChange={setOtp} disabled={verifying}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <div className="flex flex-col gap-2 w-full mt-4 px-6">
                  <Button type="submit" disabled={otp.length !== 6 || verifying} className="w-full bg-[#2d5016] text-white hover:bg-[#2d5016]/90">
                    {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Verifikasi OTP
                  </Button>
                  <Button type="button" variant="ghost" disabled={resending || verifying} onClick={handleResendOtp} className="w-full text-xs text-[#2d5016]">
                    {resending ? 'Mengirim ulang...' : 'Kirim Ulang Kode OTP'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => {setPendingOtpId(null); setOtp('')}} className="w-full text-xs text-zinc-500">
                    Kembali
                  </Button>
                </div>
              </form>
            ) : (
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
            )}

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
  onRegisterSuccess: (token: string, pengguna: any) => void
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
  const [penggunaId, setUserId] = React.useState<string | null>(null)
  const [demoOtp, setDemoOtp] = React.useState<string | null>(null)
  const [otp, setOtp] = React.useState('')
  const [verifying, setVerifying] = React.useState(false)

  // Simpanan Pokok Modal step for Koperasi members
  const [simpananPokokModalOpen, setSimpananPokokModalOpen] = React.useState(false)
  const [simpananPokokData, setSimpananPokokData] = React.useState<{
    token: string
    pengguna: any
    nominal: number
    nomorAnggota: string
  } | null>(null)

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
      if (!res?.penggunaId) {
        throw new Error('Respons registrasi tidak valid')
      }
      setUserId(res.penggunaId)
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
    if (!penggunaId) {
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
      const res = await api.auth.verifyOtp(penggunaId, otp)
      if (res.mustPaySimpananPokok || form.isKoperasi) {
        setSimpananPokokData({
          token: res.token,
          pengguna: res.pengguna,
          nominal: res.nominalSimpananPokok || 50000,
          nomorAnggota: res.nomorAnggotaKoperasi || res.pengguna?.nomorAnggota || 'KP001',
        })
        setSimpananPokokModalOpen(true)
      } else {
        toast.success('Verifikasi berhasil. Mengalihkan...')
        onRegisterSuccess(res.token, res.pengguna)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Kode OTP salah atau sudah kedaluwarsa.')
    } finally {
      setVerifying(false)
    }
  }

  async function handleResend() {
    if (!penggunaId) {
      toast.error('Sesi tidak valid. Silakan daftar ulang.')
      setStep('form')
      return
    }
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ penggunaId }),
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

  const renderSimpananPokokDialog = () => (
    <Dialog open={simpananPokokModalOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md border-emerald-200 bg-white p-6 sm:rounded-2xl" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center sm:text-left">
          <div className="mx-auto sm:mx-0 flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 mb-2 shadow-xs">
            <Building2 className="size-6" />
          </div>
          <DialogTitle className="text-lg font-black text-emerald-950">
            Pendaftaran Anggota Koperasi Berhasil!
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-600 leading-relaxed pt-1">
            Akun Anda telah terverifikasi dan resmi terdaftar di Koperasi Simpan Pinjam Sukamaju Sejahtera.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Alert Box Simpanan Pokok Wajib */}
          <div className="rounded-xl border-2 border-emerald-400/80 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white p-4 shadow-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="size-5 shrink-0 text-emerald-700 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Kewajiban Pembayaran Simpanan Pokok
                </h4>
                <p className="text-sm font-black text-zinc-900 mt-1 leading-snug">
                  Anda harus melakukan pembayaran simpanan pokok terlebih dahulu sebesar{' '}
                  <span className="text-emerald-700 underline underline-offset-2">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(simpananPokokData?.nominal || 50000)}
                  </span>{' '}
                  (sesuai aturan koperasi).
                </p>
              </div>
            </div>
          </div>

          {/* Member Details */}
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-zinc-500">Nama Lengkap:</span>
              <span className="font-semibold text-zinc-900">{simpananPokokData?.pengguna?.name || form.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Nomor Anggota Koperasi:</span>
              <span className="font-mono font-bold text-emerald-700">{simpananPokokData?.nomorAnggota}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-200/60 pt-1.5">
              <span className="text-zinc-500">Biaya Registrasi (Simpanan Pokok):</span>
              <span className="font-bold text-emerald-800">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(simpananPokokData?.nominal || 50000)}
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-amber-50/80 border border-amber-200/80 p-3 text-[11px] text-amber-900 leading-relaxed">
            💡 <strong>Catatan:</strong> Pembayaran simpanan pokok ini merupakan biaya registrasi/deposit awal keanggotaan koperasi. Pembayaran ini wajib diselesaikan terlebih dahulu agar Anda dapat melakukan simpanan-simpanan selanjutnya (Simpanan Wajib & Sukarela) maupun pengajuan pinjaman.
          </div>

          <p className="text-[11px] text-zinc-500 text-center">
            📧 Rincian dan instruksi pembayaran ini juga telah dikirimkan ke email Anda: <strong>{form.email}</strong>
          </p>
        </div>

        <DialogFooter>
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 shadow-xs"
            onClick={() => {
              if (simpananPokokData) {
                setSimpananPokokModalOpen(false)
                toast.success('Pendaftaran selesai. Selamat datang!')
                onRegisterSuccess(simpananPokokData.token, simpananPokokData.pengguna)
              }
            }}
          >
            Saya Mengerti & Lanjutkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  // ============ Render ============
  if (step === 'otp') {
    return (
      <>
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
        {renderSimpananPokokDialog()}
      </>
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
