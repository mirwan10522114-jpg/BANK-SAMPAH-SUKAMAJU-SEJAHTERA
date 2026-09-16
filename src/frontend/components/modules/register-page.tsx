'use client'

import React, { useState } from 'react'
import { Check, ChevronLeft, ChevronRight, CheckCircle2, User, Landmark, Building2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatRupiah } from '@/lib/format'

export function RegisterPage({
  onBack,
  onRegisterSuccess,
  onLogin,
}: {
  onBack: () => void
  onRegisterSuccess: (token: string, pengguna: any) => void
  onLogin: () => void
}) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [uploadingKtp, setUploadingKtp] = useState(false)
  const [showKoperasiPopup, setShowKoperasiPopup] = useState(false)
  const [agree, setAgree] = useState(false)
  const [koperasiSettings, setKoperasiSettings] = useState<any>(null)
  
  const [otp, setOtp] = useState('')
  const [penggunaId, setPenggunaId] = useState('')
  const [verifying, setVerifying] = useState(false)

  React.useEffect(() => {
    fetch('/api/master/koperasi-setting')
      .then(res => res.json())
      .then(data => setKoperasiSettings(data))
      .catch(console.error)
  }, [])

  const [form, setForm] = useState({
    jenisPendaftaran: '', // nasabah, koperasi, keduanya
    nik: '',
    name: '',
    tempatLahir: '',
    tanggalLahir: '',
    jenisKelamin: '',
    alamat: '',
    rt: '',
    rw: '',
    desaKelurahan: '',
    kecamatan: '',
    phone: '',
    pekerjaan: '',
    fotoKtp: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const handleChange = (field: string, val: string) => {
    setForm((p) => ({ ...p, [field]: val }))
  }

  const handleUploadKtp = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return toast.error('Ukuran maksimal file 5MB')
    
    setUploadingKtp(true)
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const res = await fetch('/api/auth/register/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal upload')
      handleChange('fotoKtp', data.url)
      toast.success('KTP berhasil diunggah')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploadingKtp(false)
    }
  }

  const validateStep = (s: number) => {
    if (s === 1) {
      if (!form.jenisPendaftaran) {
        toast.error('Pilih jenis pendaftaran terlebih dahulu')
        return false
      }
      return true
    }
    if (s === 2) {
      if (!form.nik || form.nik.length !== 16) {
        toast.error('NIK wajib diisi 16 digit angka')
        return false
      }
      if (!form.name.trim()) { toast.error('Nama lengkap wajib diisi'); return false }
      if (!form.tempatLahir.trim()) { toast.error('Tempat lahir wajib diisi'); return false }
      if (!form.tanggalLahir) { toast.error('Tanggal lahir wajib diisi'); return false }
      if (!form.jenisKelamin) { toast.error('Jenis kelamin wajib dipilih'); return false }
      if (!form.pekerjaan.trim()) { toast.error('Pekerjaan wajib diisi'); return false }
      if (!form.fotoKtp) { toast.error('Scan KTP wajib diunggah'); return false }
      if (!form.alamat.trim()) { toast.error('Alamat lengkap wajib diisi'); return false }
      if (!form.rt.trim()) { toast.error('RT wajib diisi'); return false }
      if (!form.rw.trim()) { toast.error('RW wajib diisi'); return false }
      if (!form.desaKelurahan.trim()) { toast.error('Desa/Kelurahan wajib diisi'); return false }
      if (!form.kecamatan.trim()) { toast.error('Kecamatan wajib diisi'); return false }
      if (!form.phone.trim()) { toast.error('Nomor HP/WA wajib diisi'); return false }
      return true
    }
    if (s === 3) {
      return true // Info dinamis, tidak ada input wajib
    }
    if (s === 4) {
      if (!form.email.trim()) { toast.error('Email wajib diisi'); return false }
      if (!form.password || form.password.length < 6) { toast.error('Password minimal 6 karakter'); return false }
      if (form.password !== form.confirmPassword) { toast.error('Konfirmasi password tidak cocok'); return false }
      return true
    }
    if (s === 5) {
      if (!agree) { toast.error('Anda harus menyetujui syarat & ketentuan'); return false }
      return true
    }
    return true
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((p) => p + 1)
    }
  }
  const handlePrev = () => setStep((p) => Math.max(1, p - 1))

  const submitToServer = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Pendaftaran gagal')
      
      toast.success(data.message)
      setPenggunaId(data.userId)
      // Switch to OTP view
      setStep(6)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
      setShowKoperasiPopup(false)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(5)) return
    if (form.jenisPendaftaran === 'koperasi' || form.jenisPendaftaran === 'keduanya') {
      setShowKoperasiPopup(true)
    } else {
      submitToServer()
    }
  }

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return
    setVerifying(true)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ penggunaId, otp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verifikasi OTP gagal')
      
      toast.success('Pendaftaran dan verifikasi berhasil!')
      onRegisterSuccess(data.token, data.pengguna)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setVerifying(false)
    }
  }

  const handleResendOtp = async () => {
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ penggunaId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim ulang OTP')
      toast.success('OTP baru telah dikirim ke email Anda')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const STEPS = ['Jenis Pendaftaran', 'Data Identitas', 'Data Keanggotaan', 'Akun', 'Konfirmasi']

  if (step === 6) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
        <Card className="w-full max-w-md p-8 text-center shadow-lg">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-zinc-900">Verifikasi OTP</h2>
          <p className="mb-6 text-sm text-zinc-600">
            Kode OTP telah dikirim ke <b>{form.email}</b>.<br />
            Silakan masukkan 6 digit kode OTP untuk mengaktifkan akun Anda.
          </p>
          
          <div className="mb-8 flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp} disabled={verifying}>
              <InputOTPGroup className="gap-2">
                <InputOTPSlot index={0} className="h-12 w-12 text-lg" />
                <InputOTPSlot index={1} className="h-12 w-12 text-lg" />
                <InputOTPSlot index={2} className="h-12 w-12 text-lg" />
                <InputOTPSlot index={3} className="h-12 w-12 text-lg" />
                <InputOTPSlot index={4} className="h-12 w-12 text-lg" />
                <InputOTPSlot index={5} className="h-12 w-12 text-lg" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button onClick={handleVerifyOtp} disabled={otp.length !== 6 || verifying} className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
            {verifying ? 'Memverifikasi...' : 'Verifikasi Akun'}
          </Button>

          <p className="mt-4 text-sm text-zinc-500">
            Belum menerima kode?{' '}
            <button onClick={handleResendOtp} className="font-semibold text-emerald-600 hover:underline">
              Kirim Ulang
            </button>
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 pb-20 md:p-8">
      <div className="mx-auto max-w-4xl">
        <button onClick={onBack} className="mb-6 flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700">
          <ChevronLeft className="mr-1 h-4 w-4" /> Kembali ke Beranda
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900">Form Pendaftaran Anggota</h1>
          <p className="mt-2 text-zinc-600">Daftarkan diri Anda untuk menjadi Nasabah Bank Sampah dan/atau Anggota Koperasi Simpan Pinjam.</p>
        </div>

        {/* Progress */}
        <div className="mb-8 overflow-hidden rounded-full bg-zinc-200">
          <div 
            className="h-2 rounded-full bg-emerald-500 transition-all duration-300" 
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
        <div className="mb-8 hidden justify-between md:flex">
          {STEPS.map((s, i) => (
            <div key={s} className={cn("text-xs font-semibold uppercase tracking-wider", step > i ? "text-emerald-600" : "text-zinc-400")}>
              {i + 1}. {s}
            </div>
          ))}
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-6 md:p-10">
            {/* STEP 1: Jenis */}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="mb-6 text-xl font-bold text-zinc-900">Pilih Jenis Pendaftaran</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  <div 
                    onClick={() => handleChange('jenisPendaftaran', 'nasabah')}
                    className={cn("cursor-pointer rounded-2xl border-2 p-6 transition-all hover:border-emerald-300", form.jenisPendaftaran === 'nasabah' ? "border-emerald-500 bg-emerald-50/50" : "border-zinc-200 bg-white")}
                  >
                    <User className={cn("mb-4 h-8 w-8", form.jenisPendaftaran === 'nasabah' ? "text-emerald-600" : "text-zinc-400")} />
                    <h3 className="font-semibold text-zinc-900">Nasabah Bank Sampah</h3>
                    <p className="mt-2 text-xs text-zinc-500">Nabung sampah, tukar poin, dan ikut serta dalam pelestarian lingkungan.</p>
                  </div>
                  <div 
                    onClick={() => handleChange('jenisPendaftaran', 'koperasi')}
                    className={cn("cursor-pointer rounded-2xl border-2 p-6 transition-all hover:border-blue-300", form.jenisPendaftaran === 'koperasi' ? "border-blue-500 bg-blue-50/50" : "border-zinc-200 bg-white")}
                  >
                    <Landmark className={cn("mb-4 h-8 w-8", form.jenisPendaftaran === 'koperasi' ? "text-blue-600" : "text-zinc-400")} />
                    <h3 className="font-semibold text-zinc-900">Anggota Koperasi</h3>
                    <p className="mt-2 text-xs text-zinc-500">Akses layanan simpan pinjam, sisa hasil usaha, dan pembiayaan syariah.</p>
                  </div>
                  <div 
                    onClick={() => handleChange('jenisPendaftaran', 'keduanya')}
                    className={cn("cursor-pointer rounded-2xl border-2 p-6 transition-all hover:border-violet-300", form.jenisPendaftaran === 'keduanya' ? "border-violet-500 bg-violet-50/50" : "border-zinc-200 bg-white")}
                  >
                    <Building2 className={cn("mb-4 h-8 w-8", form.jenisPendaftaran === 'keduanya' ? "text-violet-600" : "text-zinc-400")} />
                    <h3 className="font-semibold text-zinc-900">Daftar Keduanya</h3>
                    <p className="mt-2 text-xs text-zinc-500">Satu akun untuk layanan Bank Sampah sekaligus Koperasi Simpan Pinjam.</p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Identitas */}
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="mb-6 text-xl font-bold text-zinc-900">Data Identitas Pribadi</h2>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>NIK (KTP) <span className="text-red-500">*</span></Label>
                    <Input required placeholder="16 digit angka NIK" value={form.nik} onChange={(e) => handleChange('nik', e.target.value.replace(/\D/g, '').slice(0, 16))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nama Lengkap <span className="text-red-500">*</span></Label>
                    <Input required placeholder="Sesuai KTP" value={form.name} onChange={(e) => handleChange('name', e.target.value)} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tempat Lahir <span className="text-red-500">*</span></Label>
                    <Input required placeholder="Kota/Kabupaten" value={form.tempatLahir} onChange={(e) => handleChange('tempatLahir', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tanggal Lahir <span className="text-red-500">*</span></Label>
                    <Input required type="date" value={form.tanggalLahir} onChange={(e) => handleChange('tanggalLahir', e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Jenis Kelamin <span className="text-red-500">*</span></Label>
                    <Select required value={form.jenisKelamin} onValueChange={(v) => handleChange('jenisKelamin', v)}>
                      <SelectTrigger><SelectValue placeholder="Pilih Jenis Kelamin" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                        <SelectItem value="Perempuan">Perempuan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Pekerjaan <span className="text-red-500">*</span></Label>
                    <Input required placeholder="Pekerjaan saat ini" value={form.pekerjaan} onChange={(e) => handleChange('pekerjaan', e.target.value)} />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Scan/Foto KTP <span className="text-red-500">*</span></Label>
                    <div className="flex items-center gap-4">
                      <Input required type="file" accept="image/*" onChange={handleUploadKtp} disabled={uploadingKtp} />
                      {uploadingKtp && <span className="text-sm text-zinc-500">Mengunggah...</span>}
                      {form.fotoKtp && !uploadingKtp && <span className="text-sm font-medium text-emerald-600">Terunggah ✓</span>}
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Alamat Lengkap <span className="text-red-500">*</span></Label>
                    <Input required placeholder="Jalan, Gang, Blok, No Rumah" value={form.alamat} onChange={(e) => handleChange('alamat', e.target.value)} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 md:col-span-2">
                    <div className="space-y-2">
                      <Label>RT <span className="text-red-500">*</span></Label>
                      <Input required placeholder="001" value={form.rt} onChange={(e) => handleChange('rt', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>RW <span className="text-red-500">*</span></Label>
                      <Input required placeholder="002" value={form.rw} onChange={(e) => handleChange('rw', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Desa / Kelurahan <span className="text-red-500">*</span></Label>
                      <Input required placeholder="Desa Sukamaju" value={form.desaKelurahan} onChange={(e) => handleChange('desaKelurahan', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Kecamatan <span className="text-red-500">*</span></Label>
                      <Input required placeholder="Kecamatan Sejahtera" value={form.kecamatan} onChange={(e) => handleChange('kecamatan', e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>No. Handphone / WhatsApp <span className="text-red-500">*</span></Label>
                    <Input required placeholder="0812xxxxxx" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Keanggotaan */}
            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="mb-6 text-xl font-bold text-zinc-900">Informasi Keanggotaan</h2>
                
                {(form.jenisPendaftaran === 'nasabah' || form.jenisPendaftaran === 'keduanya') && (
                  <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
                    <h3 className="flex items-center text-sm font-semibold text-emerald-800">
                      <User className="mr-2 h-5 w-5" /> Info Bank Sampah
                    </h3>
                    <ul className="mt-4 space-y-3 text-sm text-emerald-900/80">
                      <li className="flex items-start">
                        <Check className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>Nomor Nasabah (BSxxx) akan dibuat otomatis oleh sistem setelah verifikasi email & admin.</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>Buku rekening virtual untuk menabung sampah akan otomatis aktif.</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>Anda dapat mulai memilah sampah dan menyetorkannya ke bank sampah terdekat.</span>
                      </li>
                    </ul>
                  </div>
                )}

                {(form.jenisPendaftaran === 'koperasi' || form.jenisPendaftaran === 'keduanya') && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5">
                    <h3 className="flex items-center text-sm font-semibold text-blue-800">
                      <Landmark className="mr-2 h-5 w-5" /> Info Keanggotaan Koperasi
                    </h3>
                    <ul className="mt-4 space-y-3 text-sm text-blue-900/80">
                      <li className="flex items-start">
                        <Check className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                        <span>Nomor Anggota (KPxxx) akan diterbitkan setelah persetujuan oleh Pengurus Koperasi.</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                        <div>
                          <p>Pembayaran simpanan awal disetorkan saat Anda mendatangi kantor secara fisik:</p>
                          <ul className="mt-2 ml-4 list-disc space-y-1 font-medium text-blue-800">
                            <li>Simpanan Pokok (sekali bayar): {koperasiSettings ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(koperasiSettings.nominalSimpananPokok || 0) : 'Rp ...'}</li>
                            <li>Simpanan Wajib (per bulan): {koperasiSettings ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(koperasiSettings.nominalSimpananWajib || 0) : 'Rp ...'}</li>
                          </ul>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                        <span>Sistem akan membuatkan saldo awal Rp 0 pada buku simpanan Anda.</span>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: Akun */}
            {step === 4 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-md duration-500">
                <h2 className="mb-6 text-xl font-bold text-zinc-900">Keamanan Akun</h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email <span className="text-red-500">*</span></Label>
                    <Input type="email" placeholder="Gunakan email yang aktif" value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
                    <p className="text-[10px] text-zinc-500">Email ini akan digunakan untuk proses Login dan Verifikasi (OTP).</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Password <span className="text-red-500">*</span></Label>
                    <Input type="password" placeholder="Minimal 6 karakter" value={form.password} onChange={(e) => handleChange('password', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Konfirmasi Password <span className="text-red-500">*</span></Label>
                    <Input type="password" placeholder="Ketik ulang password" value={form.confirmPassword} onChange={(e) => handleChange('confirmPassword', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Konfirmasi */}
            {step === 5 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="mb-6 text-xl font-bold text-zinc-900">Konfirmasi Data</h2>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6">
                  <dl className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold text-zinc-500">Jenis Pendaftaran</dt>
                      <dd className="mt-1 text-sm font-medium uppercase text-zinc-900">{form.jenisPendaftaran}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-zinc-500">NIK</dt>
                      <dd className="mt-1 text-sm font-medium text-zinc-900">{form.nik}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-zinc-500">Nama Lengkap</dt>
                      <dd className="mt-1 text-sm font-medium text-zinc-900">{form.name}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-zinc-500">Email (Username)</dt>
                      <dd className="mt-1 text-sm font-medium text-zinc-900">{form.email}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-zinc-500">Nomor HP</dt>
                      <dd className="mt-1 text-sm font-medium text-zinc-900">{form.phone}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-zinc-500">Alamat</dt>
                      <dd className="mt-1 text-sm font-medium text-zinc-900">{form.alamat} {form.rt ? `RT ${form.rt}` : ''} {form.rw ? `/ RW ${form.rw}` : ''}</dd>
                    </div>
                  </dl>
                </div>
                
                <div className="mt-6 flex items-start space-x-3 rounded-lg bg-blue-50/50 p-4">
                  <Checkbox id="terms" checked={agree} onCheckedChange={(c) => setAgree(c as boolean)} className="mt-1" />
                  <div className="grid gap-1.5 leading-none">
                    <label htmlFor="terms" className="text-sm font-medium leading-relaxed text-zinc-900">
                      Saya menyatakan bahwa data yang saya isi adalah benar. Saya memahami bahwa keanggotaan ini tunduk pada syarat dan ketentuan yang berlaku di Bank Sampah & Koperasi.
                    </label>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/50 p-6 px-6 md:px-10">
            <Button variant="outline" onClick={handlePrev} disabled={step === 1 || loading}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Kembali
            </Button>
            {step < 5 ? (
              <Button onClick={handleNext} className="bg-emerald-600 text-white hover:bg-emerald-700">
                Selanjutnya <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!agree || loading} className="bg-emerald-600 text-white hover:bg-emerald-700">
                {loading ? 'Memproses...' : 'Kirim Pendaftaran'} <Check className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>
      </div>

      <Dialog open={showKoperasiPopup} onOpenChange={setShowKoperasiPopup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Informasi Pendaftaran Koperasi</DialogTitle>
            <DialogDescription>
              Sebagai syarat keanggotaan Koperasi, Anda diwajibkan untuk membayar Simpanan Pokok dan rutin menyetor Simpanan Wajib.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex justify-between border-b pb-2">
              <span className="text-zinc-600">Simpanan Pokok (Dibayar sekali)</span>
              <span className="font-bold">{formatRupiah(koperasiSettings?.simpananPokok || 50000)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-zinc-600">Simpanan Wajib (Per bulan)</span>
              <span className="font-bold">{formatRupiah(koperasiSettings?.simpananWajib || 10000)}</span>
            </div>
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              Silakan lakukan pembayaran Simpanan Pokok setelah proses verifikasi pendaftaran selesai. Informasi lebih lanjut akan dikirim ke email Anda.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKoperasiPopup(false)}>Batal</Button>
            <Button onClick={submitToServer} disabled={loading} className="bg-emerald-600 text-white hover:bg-emerald-700">
              {loading ? 'Memproses...' : 'Mengerti & Lanjutkan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
