'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { formatRupiah, formatNumber, toNumber, formatDate } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Search, Plus, Trash2, Recycle, HandCoins, Wallet, CheckCircle2, XCircle, Printer, User, Scale, Landmark, CreditCard, Heart, ShieldCheck, ShieldX, AlertCircle, Info, Calendar, Clock, ChevronRight, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { printStruk } from '@/lib/print-struk'

type OpType = 'nabung' | 'sedekah_sampah' | 'setor_simpanan' | 'tarik_sukarela' | 'pengajuan_pinjaman' | 'bayar_angsuran'

interface Item {
  jenisSampahId: string
  quantityBeforeQc: number
  quantityAfterQc?: number
  qcReason?: string
}

interface SedekahItem {
  jenisSampahId: string
  quantityBeforeQc: number
  quantityAfterQc?: number
  qcReason?: string
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

function SimpananWajibChecklistPanel({
  anggota,
  koperasiSetting,
  op,
  onUpdateOp,
}: {
  anggota: any
  koperasiSetting: any
  op: any
  onUpdateOp: (patch: Record<string, any>) => void
}) {
  const nominalWajib = Number(koperasiSetting?.nominalSimpananWajib || 10000)
  const saldoWajib = toNumber(anggota?.simpananSaldos?.find((s: any) => s.jenisSimpanan === 'wajib')?.saldo || 0)
  const monthsCovered = nominalWajib > 0 ? Math.floor(saldoWajib / nominalWajib) : 0

  const saldoPokok = toNumber(anggota?.simpananSaldos?.find((s: any) => s.jenisSimpanan === 'pokok')?.saldo || 0)
  const nominalPokok = Number(koperasiSetting?.nominalSimpananPokok || 50000)
  const hasPaidPokok = saldoPokok > 0 && (nominalPokok <= 0 || saldoPokok >= nominalPokok)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const joinDate = anggota?.tanggalBergabung
    ? new Date(anggota.tanggalBergabung)
    : (anggota?.createdAt ? new Date(anggota.createdAt) : now)
  const joinYear = joinDate.getFullYear()
  const joinMonth = joinDate.getMonth() + 1

  // Buat urutan bulan minimal 16 bulan (mencakup bulan yang sudah lunas + 12 bulan ke depan)
  const totalMonthsToGenerate = Math.max(16, monthsCovered + 12)
  const allMonths = Array.from({ length: totalMonthsToGenerate }, (_, i) => {
    const mYear = joinYear + Math.floor((joinMonth - 1 + i) / 12)
    const mMonth = ((joinMonth - 1 + i) % 12) + 1
    const key = `${mYear}-${mMonth}`
    const isPaid = i < monthsCovered
    const label = `${MONTH_NAMES_ID[mMonth - 1]} ${mYear}`
    const isCurrent = mYear === currentYear && mMonth === currentMonth
    return {
      index: i,
      key,
      year: mYear,
      month: mMonth,
      label,
      isPaid,
      isCurrent,
    }
  })

  const unpaidMonths = allMonths.filter((m) => !m.isPaid)
  const selectedKeys: string[] = Array.isArray(op.selectedMonths) ? op.selectedMonths : []

  // Default: otomatis centang bulan pertama yang belum lunas
  useEffect(() => {
    if (!op.selectedMonths && unpaidMonths.length > 0) {
      const first = unpaidMonths[0]
      onUpdateOp({
        selectedMonths: [first.key],
        jumlah: nominalWajib,
        keterangan: `Setor simpanan wajib: ${first.label}`,
      })
    }
  }, [unpaidMonths.length])

  const handleApplySelection = (newSelected: string[]) => {
    const sorted = allMonths.filter((m) => newSelected.includes(m.key)).map((m) => m.key)
    const count = sorted.length
    const totalJumlah = count * nominalWajib

    const names = allMonths
      .filter((m) => sorted.includes(m.key))
      .map((m) => m.label)

    let ket = ''
    if (count === 1) {
      ket = `Setor simpanan wajib: ${names[0]}`
    } else if (count > 1) {
      ket = `Setor simpanan wajib ${count} bulan (${names.join(', ')})`
    }

    onUpdateOp({
      selectedMonths: sorted,
      jumlah: totalJumlah,
      keterangan: ket,
    })
  }

  const toggleMonth = (key: string) => {
    let next: string[]
    if (selectedKeys.includes(key)) {
      next = selectedKeys.filter((k) => k !== key)
    } else {
      next = [...selectedKeys, key]
    }
    handleApplySelection(next)
  }

  const selectCountUnpaid = (n: number) => {
    const toPick = unpaidMonths.slice(0, n).map((m) => m.key)
    handleApplySelection(toPick)
  }

  const selectUntilEndOfYear = () => {
    const toPick = unpaidMonths
      .filter((m) => m.year === currentYear || m.year < currentYear)
      .map((m) => m.key)
    handleApplySelection(toPick.length > 0 ? toPick : unpaidMonths.slice(0, 1).map((m) => m.key))
  }

  const resetSelection = () => {
    if (unpaidMonths.length > 0) {
      handleApplySelection([unpaidMonths[0].key])
    } else {
      handleApplySelection([])
    }
  }

  const selectedCount = selectedKeys.length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pt-1">
      {/* Kolom Kiri: Form Input & Rincian Nominal */}
      <div className="lg:col-span-5 space-y-3">
        <div>
          <Label className="text-[11px] font-semibold text-teal-800">Jenis Simpanan</Label>
          <Select
            value={op.jenisSimpanan}
            onValueChange={(v) => {
              const autoNominal = v === 'pokok'
                ? Number(koperasiSetting?.nominalSimpananPokok || 50000)
                : v === 'wajib'
                  ? Number(koperasiSetting?.nominalSimpananWajib || 10000)
                  : 0
              const autoKet = v === 'pokok'
                ? 'Simpanan Pokok awal pendaftaran/registrasi'
                : v === 'sukarela'
                  ? 'Setor simpanan sukarela'
                  : 'Setor simpanan wajib'
              onUpdateOp({ jenisSimpanan: v, jumlah: autoNominal, selectedMonths: undefined, keterangan: autoKet })
            }}
          >
            <SelectTrigger className="border-teal-200 bg-white font-medium text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pokok">Pokok</SelectItem>
              <SelectItem value="wajib" disabled={!hasPaidPokok}>
                Wajib {!hasPaidPokok ? '(Wajib Lunas Pokok Dahulu)' : ''}
              </SelectItem>
              <SelectItem value="sukarela" disabled={!hasPaidPokok}>
                Sukarela {!hasPaidPokok ? '(Wajib Lunas Pokok Dahulu)' : ''}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-[11px] font-semibold text-teal-800">Jumlah Setor (Rp)</Label>
          <div className="relative">
            <Input
              type="text"
              value={formatRupiah(op.jumlah || 0)}
              readOnly
              className="border-teal-300 bg-teal-50/80 font-mono text-base font-bold text-teal-900 shadow-xs cursor-default"
            />
          </div>
          <p className="text-[10px] text-teal-700 font-medium mt-1">
            {selectedCount > 0 ? (
              <span className="text-teal-800 font-semibold">
                ✓ Otomatis terhitung dari {selectedCount} bulan terpilih ({selectedCount} × {formatRupiah(nominalWajib)})
              </span>
            ) : (
              <span className="text-rose-600 font-semibold">
                ⚠️ Silakan ceklis minimal 1 bulan di sebelah kanan
              </span>
            )}
          </p>
        </div>

        <div>
          <Label className="text-[11px] font-semibold text-teal-800">Keterangan Transaksi</Label>
          <Input
            type="text"
            value={op.keterangan || ''}
            onChange={(e) => onUpdateOp({ keterangan: e.target.value })}
            placeholder="Keterangan transaksi..."
            className="border-teal-200 bg-white text-xs"
          />
        </div>

        {/* Ringkasan Saldo Wajib Saat Ini & Proyeksi */}
        <div className="rounded-xl border border-teal-200/90 bg-white p-3 text-xs text-teal-950 shadow-xs space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-zinc-500">Saldo Wajib Saat Ini:</span>
            <strong className="text-teal-800 font-mono">{formatRupiah(saldoWajib)}</strong>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-zinc-500">Bulan Sudah Terbayar:</span>
            <span className="font-semibold text-emerald-700">{monthsCovered} Bulan</span>
          </div>
          <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-teal-100">
            <span className="text-zinc-600 font-medium">Saldo Setelah Setor:</span>
            <strong className="text-teal-950 font-bold font-mono">
              {formatRupiah(saldoWajib + (op.jumlah || 0))} ({monthsCovered + selectedCount} Bulan)
            </strong>
          </div>
        </div>
      </div>

      {/* Kolom Kanan: Panel Informasi & Checklist Bulan Simpanan Wajib */}
      <div className="lg:col-span-7 rounded-xl border border-teal-200 bg-white p-3.5 shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-teal-100">
          <div>
            <h4 className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
              <Calendar className="size-3.5 text-teal-600" /> Jadwal & Status Pembayaran Simpanan Wajib
            </h4>
            <p className="text-[10px] text-teal-700">
              Iuran: <strong>{formatRupiah(nominalWajib)}/bln</strong> · Ceklis bulan yang ingin dibayarkan
            </p>
          </div>

          <Badge className="bg-teal-600 hover:bg-teal-600 text-white text-[11px] font-bold px-2.5 py-0.5 shadow-xs">
            {selectedCount} Bulan ({formatRupiah(op.jumlah || 0)})
          </Badge>
        </div>

        {/* Tombol Pintas Pilihan Cepat */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] font-semibold text-zinc-500 mr-0.5">Pilih Cepat:</span>
          <button
            type="button"
            onClick={() => selectCountUnpaid(1)}
            className="px-2 py-0.5 rounded border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 font-semibold text-[10px] transition-colors"
          >
            +1 Bln
          </button>
          <button
            type="button"
            onClick={() => selectCountUnpaid(3)}
            className="px-2 py-0.5 rounded border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 font-semibold text-[10px] transition-colors"
          >
            +3 Bln
          </button>
          <button
            type="button"
            onClick={() => selectCountUnpaid(6)}
            className="px-2 py-0.5 rounded border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 font-semibold text-[10px] transition-colors"
          >
            +6 Bln
          </button>
          <button
            type="button"
            onClick={selectUntilEndOfYear}
            className="px-2 py-0.5 rounded border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 font-semibold text-[10px] transition-colors"
          >
            s/d Des {currentYear}
          </button>
          <button
            type="button"
            onClick={resetSelection}
            className="px-2 py-0.5 rounded border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 font-medium text-[10px] transition-colors ml-auto"
          >
            Reset
          </button>
        </div>

        {/* Daftar Checklist Bulan (Scrollable List) */}
        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 text-xs">
          {allMonths.map((m) => {
            const isSelected = selectedKeys.includes(m.key)

            return (
              <div
                key={m.key}
                onClick={() => {
                  if (!m.isPaid) toggleMonth(m.key)
                }}
                className={cn(
                  'flex items-center justify-between p-2 rounded-lg border transition-all text-xs select-none',
                  m.isPaid
                    ? 'border-emerald-200 bg-emerald-50/60 text-emerald-950 cursor-default opacity-85'
                    : isSelected
                    ? 'border-teal-500 bg-teal-50/90 text-teal-950 font-semibold ring-1 ring-teal-400 cursor-pointer shadow-xs'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-teal-200 hover:bg-zinc-50/80 cursor-pointer'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={m.isPaid || isSelected}
                    disabled={m.isPaid}
                    onChange={() => {
                      if (!m.isPaid) toggleMonth(m.key)
                    }}
                    className={cn(
                      'size-4 rounded accent-teal-600 cursor-pointer',
                      m.isPaid && 'accent-emerald-600 cursor-default'
                    )}
                  />
                  <span className="font-medium text-xs flex items-center gap-1.5">
                    {m.label}
                    {m.isCurrent && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        Bulan Ini
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {m.isPaid ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                      <CheckCircle2 className="size-3.5 text-emerald-600" /> Sudah Lunas
                    </span>
                  ) : isSelected ? (
                    <span className="text-[11px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                      Dipilih (+{formatRupiah(nominalWajib)})
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-400">
                      Belum Bayar
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function TellerWizard() {
  const [step, setStep] = useState(1)
  const [nasabahQuery, setNasabahQuery] = useState('')
  const [nasabahResults, setNasabahResults] = useState<any[]>([])
  const [nasabah, setNasabah] = useState<any>(null)
  const [anggota, setAnggota] = useState<any>(null)
  const [saldo, setBalance] = useState<any>(null)
  const [barangList, setBarangList] = useState<any[]>([])
  const [produkList] = useState<any[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [sedekahItems, setSedekahItems] = useState<SedekahItem[]>([])
  // qcMode: 3 mode Quality Control untuk penimbangan sampah tabungan
  // - 'langsung'  → QC di tempat: teller input berat bersih saat itu juga → langsung finalize, saldo masuk
  // - 'nanti'     → Sampah dikumpulkan dulu, QC dilakukan kemudian → status pending QC, saldo belum masuk
  // - 'bersih'    → Sampah dianggap bersih, tidak perlu QC → langsung finalize, saldo masuk (berat kotor = berat bersih)
  // Default: 'nanti' (paling aman — saldo hanya masuk setelah QC benar-benar dilakukan)
  const [qcMode, setQcMode] = useState<'langsung' | 'nanti' | 'bersih'>('nanti')
  const applyQc = qcMode === 'langsung'
  const skipQc = qcMode === 'bersih'

  // sedekahQcMode: 3 mode QC untuk Sedekah Sampah
  // - 'langsung'  → QC di tempat: input berat bersih saat itu juga → langsung finalize, stok inventaris masuk
  // - 'nanti'     → Sampah sedekah kotor/belum disortir → masuk antrian QC untuk ditimbang bersih nanti
  // - 'bersih'    → Sampah sedekah sudah bersih → tanpa QC, langsung finalize ke stok inventaris
  const [sedekahQcMode, setSedekahQcMode] = useState<'langsung' | 'nanti' | 'bersih'>('nanti')
  const applySedekahQc = sedekahQcMode === 'langsung'
  const skipSedekahQc = sedekahQcMode === 'bersih'

  const [notes, setNotes] = useState('')
  const [operations, setOperations] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [receipt, setReceipt] = useState<any>(null)
  const [pinjamanList, setPinjamanList] = useState<any[]>([])
  const [loadingPinjaman, setLoadingPinjaman] = useState(false)
  const [pinjamanEligibility, setPinjamanEligibility] = useState<any>(null)
  const [koperasiSetting, setKoperasiSetting] = useState<any>(null)
  const [showEligibilityDetail, setShowEligibilityDetail] = useState(false)
  const [rupiahPerPointEarn, setRupiahPerPointEarn] = useState(1000)

  useEffect(() => {
    api.barang.list().then(setBarangList).catch(() => {})
    api.koperasiSetting.get().then(setKoperasiSetting).catch(() => {})
    api.aturanPoins.list().then((rules: any[]) => {
      const active = rules?.find((r) => r.isActive)
      if (active) {
        const rp = active.rupiahPerPointEarn || (toNumber(active.pointsPerRupiah) > 0 ? Math.round(1 / toNumber(active.pointsPerRupiah)) : 1000)
        if (rp > 0) setRupiahPerPointEarn(rp)
      }
    }).catch(() => {})
  }, [])

  const searchNasabah = useCallback(async (q: string) => {
    if (q.length < 2) { setNasabahResults([]); return }
    try {
      setNasabahResults(await api.operasional.nasabahList(q))
    } catch {}
  }, [])

  const pickNasabah = async (u: any) => {
    setNasabah(u)
    setNasabahQuery('')
    setNasabahResults([])
    setPinjamanList([])
    try {
      const b = await api.operasional.nasabahBalance(u.id)
      setBalance(b.saldo)
      // find anggota if koperasi member
      if (u.koperasiAnggota) {
        setAnggota(u.koperasiAnggota)
        // fetch active pinjaman for this anggota
        setLoadingPinjaman(true)
        try {
          const pinjaman = await api.koperasi.pinjamanList(u.koperasiAnggota.id, 'berjalan')
          setPinjamanList(pinjaman)
        } catch {}
        setLoadingPinjaman(false)
        api.koperasi.checkPinjamanEligibility(u.koperasiAnggota.id)
          .then(setPinjamanEligibility)
          .catch(() => {})
        // Refresh full anggota data to ensure tanggalBergabung and fresh simpananSaldos are available
        api.anggota.get(u.koperasiAnggota.id)
          .then((fresh: any) => {
            if (fresh && !fresh.error) setAnggota(fresh)
          })
          .catch(() => {})
      }
      else setAnggota(null)
    } catch {}
    setStep(2)
  }

  const addItem = () => setItems([...items, { jenisSampahId: '', quantityBeforeQc: 0 }])
  const updateItem = (i: number, patch: Partial<Item>) => setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i))

  const addSedekahItem = () => setSedekahItems([...sedekahItems, { jenisSampahId: '', quantityBeforeQc: 0 }])
  const updateSedekahItem = (i: number, patch: Partial<SedekahItem>) => setSedekahItems(sedekahItems.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  const removeSedekahItem = (i: number) => setSedekahItems(sedekahItems.filter((_, idx) => idx !== i))

  const nabungTotal = items.reduce((s, it) => {
    const wi = barangList.find((b) => b.id === it.jenisSampahId)
    if (!wi) return s
    const price = toNumber(wi.prices?.[0]?.pricePerUnit ?? wi.pricePerUnit)
    const qty = applyQc && it.quantityAfterQc != null ? it.quantityAfterQc : it.quantityBeforeQc
    return s + (qty * price)
  }, 0)
  const nabungWeight = items.reduce((s, it) => {
    const qty = applyQc && it.quantityAfterQc != null ? it.quantityAfterQc : it.quantityBeforeQc
    return s + (toNumber(qty))
  }, 0)

  const sedekahWeight = sedekahItems.reduce((s, it) => {
    const qty = applySedekahQc && it.quantityAfterQc != null ? it.quantityAfterQc : it.quantityBeforeQc
    return s + (toNumber(qty))
  }, 0)

  const addOp = (op: any) => setOperations([...operations, { ...op, id: Date.now() + Math.random() }])
  const removeOp = (id: number) => setOperations(operations.filter((o) => o.id !== id))

  const submit = async () => {
    if (!nasabah) { toast.error('Pilih nasabah dulu'); return }
    const ops: any[] = []
    // nabung operation
    if (items.length > 0) {
      if (items.some((i) => !i.jenisSampahId || i.quantityBeforeQc <= 0)) {
        toast.error('Ada item Nabung yang belum lengkap (Pilih barang & pastikan berat > 0). Lengkapi atau hapus item.')
        return
      }
      ops.push({ type: 'nabung', items, applyQc, skipQc, qcMode })
    }
    // sedekah sampah operation
    if (sedekahItems.length > 0) {
      if (sedekahItems.some((i) => !i.jenisSampahId || i.quantityBeforeQc <= 0)) {
        toast.error('Ada item Sedekah yang belum lengkap (Pilih barang & pastikan berat > 0). Lengkapi atau hapus item.')
        return
      }
      ops.push({
        type: 'sedekah_sampah',
        sedekahItems,
        applyQc: applySedekahQc,
        skipQc: skipSedekahQc,
        qcMode: sedekahQcMode,
      })
    }
    // other operations
    for (const op of operations) {
      if (op.type === 'setor_simpanan') {
        if (!op.jumlah || op.jumlah <= 0) { toast.error('Jumlah setor simpanan harus lebih dari 0'); return }
        ops.push({ type: 'setor_simpanan', jenisSimpanan: op.jenisSimpanan, jumlah: op.jumlah, keterangan: op.keterangan })
      }
      if (op.type === 'tarik_sukarela') {
        if (!op.jumlah || op.jumlah <= 0) { toast.error('Jumlah tarik sukarela harus lebih dari 0'); return }
        ops.push({ type: 'tarik_sukarela', jumlah: op.jumlah })
      }
      if (op.type === 'pengajuan_pinjaman') {
        if (!op.jumlahPinjaman || op.jumlahPinjaman <= 0 || !op.tenorBulan || op.tenorBulan <= 0) {
          toast.error('Jumlah dan tenor pengajuan pinjaman harus lebih dari 0')
          return
        }
        ops.push({ type: 'pengajuan_pinjaman', jumlahPinjaman: op.jumlahPinjaman, tenorBulan: op.tenorBulan, keterangan: op.keterangan })
      }
      if (op.type === 'bayar_angsuran') {
        if (!op.pinjamanId || !op.jumlahAngsuran || op.jumlahAngsuran <= 0) {
          toast.error('Pembayaran angsuran harus memiliki pinjaman valid dan jumlah lebih dari 0')
          return
        }
        ops.push({ type: 'bayar_angsuran', pinjamanId: op.pinjamanId, jumlahAngsuran: op.jumlahAngsuran })
      }
    }
    if (ops.length === 0) { toast.error('Tidak ada operasi untuk diproses'); return }
    setSubmitting(true)
    try {
      const res = await api.teller.wizard({ penggunaId: nasabah.id, anggotaId: anggota?.id, operations: ops })
      setReceipt(res)
      if (res?._meta?.emailDeferredForQc) {
        toast.success('Transaksi berhasil dicatat! Struk akan dikirim ke email nasabah setelah lolos verifikasi QC.')
      } else {
        toast.success('Transaksi berhasil diproses & struk telah dikirim ke email nasabah!')
      }
      // reset
      setItems([]); setSedekahItems([]); setOperations([]); setQcMode('nanti'); setSedekahQcMode('nanti'); setNotes('')
      // refresh saldo
      const b = await api.operasional.nasabahBalance(nasabah.id)
      setBalance(b.saldo)
      // refresh pinjaman list & anggota data (saldo simpanan realtime)
      if (anggota) {
        try {
          const [freshAnggota, pinjaman] = await Promise.all([
            api.anggota.get(anggota.id),
            api.koperasi.pinjamanList(anggota.id, 'berjalan'),
          ])
          if (freshAnggota && !freshAnggota.error) setAnggota(freshAnggota)
          setPinjamanList(pinjaman)
          api.koperasi.checkPinjamanEligibility(anggota.id).then(setPinjamanEligibility).catch(() => {})
        } catch {}
      }
    } catch (e: any) {
      toast.error('Gagal: ' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setNasabah(null); setAnggota(null); setBalance(null); setItems([]); setSedekahItems([]); setOperations([]); setStep(1); setReceipt(null); setPinjamanList([]); setQcMode('nanti'); setSedekahQcMode('nanti'); setNotes('')
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Steps indicator */}
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {[
          { n: 1, label: 'Pilih Nasabah', icon: User },
          { n: 2, label: 'Layanan', icon: Recycle },
          { n: 3, label: 'Kuitansi', icon: CheckCircle2 },
        ].map((s, idx) => {
          const Icon = s.icon
          const active = step === s.n
          const done = step > s.n
          return (
            <div key={s.n} className="flex items-center gap-2 sm:gap-4">
              <div className={cn('flex flex-col items-center gap-1.5',)}>
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                  done ? 'border-emerald-500 bg-emerald-500 text-white' :
                  active ? 'border-emerald-500 bg-white text-emerald-600' :
                  'border-zinc-200 bg-white text-zinc-400')}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={cn('text-[11px] font-medium', active || done ? 'text-emerald-700' : 'text-zinc-400')}>{s.label}</span>
              </div>
              {idx < 2 && <div className={cn('h-0.5 w-8 sm:w-16', done ? 'bg-emerald-500' : 'bg-zinc-200')} />}
            </div>
          )
        })}
      </div>

      {/* Step 1: Nasabah */}
      {step === 1 && (
        <Card className="border-emerald-100">
          <CardHeader><CardTitle className="text-emerald-900">Pilih Nasabah</CardTitle><CardDescription>Cari nasabah berdasarkan NIK, nama, alamat, kode member, atau telepon</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
              <Input
                value={nasabahQuery}
                onChange={(e) => { setNasabahQuery(e.target.value); searchNasabah(e.target.value) }}
                placeholder="Ketik NIK / nama / alamat..."
                className="border-emerald-200 pl-10"
              />
              {nasabahResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-emerald-200 bg-white shadow-lg max-h-60 overflow-y-auto">
                  {nasabahResults.map((u) => (
                    <button key={u.id} onClick={() => pickNasabah(u)} className="flex w-full items-center justify-between border-b border-emerald-50 px-3 py-2.5 text-left last:border-0 hover:bg-emerald-50">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium text-emerald-900 truncate">{u.name} {u.memberCode ? <span className="text-xs font-normal text-emerald-600/70">({u.memberCode})</span> : null}</p>
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              let rArr = [];
                              try { rArr = typeof u.roles === 'string' ? JSON.parse(u.roles) : Array.isArray(u.roles) ? u.roles : []; } catch(e) {}
                              return rArr.map((r: string) => (
                                <Badge key={r} variant="outline" className="border-emerald-300 bg-emerald-50 text-[9px] px-1 py-0 h-4 leading-none text-emerald-800 uppercase tracking-wider">{r}</Badge>
                              ));
                            })()}
                          </div>
                        </div>
                        <p className="text-xs text-emerald-600/70 truncate">
                          {u.nik ? `NIK: ${u.nik}` : 'NIK belum terdaftar'} &bull; {u.phone || '-'} {u.email ? `\u2022 ${u.email}` : ''}
                        </p>
                      </div>
                      <div className="ml-3 text-right min-w-0 flex-1">
                        <p className="text-xs text-gray-500 truncate">{u.address || '-'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-center text-xs text-emerald-600/60">Belum ada nasabah terpilih. Cari untuk melanjutkan.</p>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Services */}
      {step === 2 && nasabah && (
        <div className="space-y-6">
          <div className="-mb-2">
            <Button variant="ghost" size="sm" onClick={reset} className="text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 px-2 -ml-2">
              <ArrowLeft className="mr-2 h-4 w-4" /> Kembali Ganti Nasabah
            </Button>
          </div>
          {/* Nasabah info + saldo */}
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white font-bold">
                  {nasabah.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-emerald-900">{nasabah.name}</p>
                  <p className="text-xs text-emerald-700">{nasabah.memberCode || '-'} &bull; {nasabah.phone || '-'} {nasabah.email ? `\u2022 ${nasabah.email}` : ''}</p>
                  <div className="mt-1 flex gap-1">
                    {JSON.parse(nasabah.roles || '[]').map((r: string) => (
                      <Badge key={r} variant="outline" className="border-emerald-300 bg-white text-[10px] text-emerald-700">{r}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white/80 p-3 text-center">
                  <p className="text-[10px] font-medium text-emerald-600">Saldo Tersedia</p>
                  <p className="text-sm font-bold text-emerald-900">{formatRupiah(toNumber(saldo?.saldoTersedia))}</p>
                </div>
                <div className="rounded-lg bg-white/80 p-3 text-center">
                  <p className="text-[10px] font-medium text-emerald-600">Poin</p>
                  <p className="text-sm font-bold text-emerald-900">{formatNumber(toNumber(saldo?.points), 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service 1: Nabung Sampah (only if nasabah) */}
          {(typeof nasabah.roles === 'string' ? nasabah.roles.includes('nasabah') : Array.isArray(nasabah.roles) ? nasabah.roles.includes('nasabah') : false) && (
            <>
              <Card className="border-emerald-100">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Recycle className="h-5 w-5 text-emerald-600" />
                <div>
                  <CardTitle className="text-base text-emerald-900">Nabung Sampah</CardTitle>
                  <CardDescription className="text-xs">Timbang sampah → dapat saldo & poin</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* QC Mode Selector - 3 pilihan */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-3">
                <p className="mb-2 text-xs font-semibold text-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="size-3" /> Mode Quality Control (QC)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setQcMode('langsung')}
                    className={`rounded-lg border p-2 text-left transition-all ${
                      qcMode === 'langsung'
                        ? 'border-emerald-500 bg-emerald-100 ring-2 ring-emerald-400'
                        : 'border-zinc-200 bg-white hover:bg-emerald-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${qcMode === 'langsung' ? 'border-emerald-600 bg-emerald-600' : 'border-zinc-300'}`}>
                        {qcMode === 'langsung' && <CheckCircle2 className="size-2.5 text-white" />}
                      </div>
                      <span className="text-xs font-semibold text-emerald-900">QC Langsung</span>
                    </div>
                    <p className="mt-1 text-[10px] text-zinc-500">Timbang berat bersih di tempat. Saldo langsung masuk.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQcMode('nanti')}
                    className={`rounded-lg border p-2 text-left transition-all ${
                      qcMode === 'nanti'
                        ? 'border-amber-500 bg-amber-100 ring-2 ring-amber-400'
                        : 'border-zinc-200 bg-white hover:bg-amber-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${qcMode === 'nanti' ? 'border-amber-600 bg-amber-600' : 'border-zinc-300'}`}>
                        {qcMode === 'nanti' && <CheckCircle2 className="size-2.5 text-white" />}
                      </div>
                      <span className="text-xs font-semibold text-amber-900">QC Nanti</span>
                    </div>
                    <p className="mt-1 text-[10px] text-zinc-500">Kumpulkan dulu. Saldo masuk setelah QC dikonfirmasi.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQcMode('bersih')}
                    className={`rounded-lg border p-2 text-left transition-all ${
                      qcMode === 'bersih'
                        ? 'border-blue-500 bg-blue-100 ring-2 ring-blue-400'
                        : 'border-zinc-200 bg-white hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${qcMode === 'bersih' ? 'border-blue-600 bg-blue-600' : 'border-zinc-300'}`}>
                        {qcMode === 'bersih' && <CheckCircle2 className="size-2.5 text-white" />}
                      </div>
                      <span className="text-xs font-semibold text-blue-900">Sampah Bersih</span>
                    </div>
                    <p className="mt-1 text-[10px] text-zinc-500">Tanpa QC. Berat kotor = berat bersih. Saldo langsung masuk.</p>
                  </button>
                </div>
                {/* Info banner sesuai mode */}
                {qcMode === 'nanti' && (
                  <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200/80 p-2.5 text-[11px] text-amber-800">
                    ⏳ <strong>Mode QC Nanti:</strong> Sampah masuk antrian QC. Saldo <strong>belum ditambahkan</strong> dan <strong>email struk belum dikirim</strong>. Struk tabungan final otomatis dikirim ke email nasabah ketika QC telah diverifikasi & disetujui di Antrian QC.
                  </div>
                )}
                {qcMode === 'langsung' && (
                  <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-200/80 p-2.5 text-[11px] text-emerald-800">
                    ⚖️ <strong>Mode QC Langsung:</strong> Masukkan berat bersih di kolom input. Saldo & poin <strong>langsung masuk</strong> dan email struk dikirim saat ini juga.
                  </div>
                )}
                {qcMode === 'bersih' && (
                  <div className="mt-2 rounded-lg bg-blue-50 border border-blue-200/80 p-2.5 text-[11px] text-blue-800">
                    ✅ <strong>Mode Sampah Bersih:</strong> Tanpa QC (berat kotor = bersih). Saldo <strong>langsung masuk</strong> dan email struk dikirim saat ini juga.
                  </div>
                )}
              </div>
              {/* End QC Mode Selector */}
              {items.length === 0 && <p className="rounded-lg border border-dashed border-emerald-200 p-4 text-center text-xs text-emerald-600/60">Belum ada item sampah. Klik &quot;Tambah Item&quot; untuk menimbang.</p>}
              {items.map((it, i) => {
                const wi = barangList.find((b) => b.id === it.jenisSampahId)
                const price = wi ? toNumber(wi.prices?.[0]?.pricePerUnit ?? wi.pricePerUnit) : 0
                const qty = applyQc && it.quantityAfterQc != null ? it.quantityAfterQc : it.quantityBeforeQc
                return (
                  <div key={i} className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3">
                    <div className="grid gap-2 sm:grid-cols-12 sm:items-end">
                      <div className="sm:col-span-4">
                        <Label className="text-[11px] text-emerald-700">Barang Sampah</Label>
                        <Select value={it.jenisSampahId} onValueChange={(v) => updateItem(i, { jenisSampahId: v })}>
                          <SelectTrigger className="border-emerald-200 bg-white"><SelectValue placeholder="Pilih barang" /></SelectTrigger>
                          <SelectContent>{barangList.map((b) => <SelectItem key={b.id} value={b.id}>{b.code} · {b.name} ({formatRupiah(toNumber(b.prices?.[0]?.pricePerUnit ?? b.pricePerUnit))}/{b.unit})</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-[11px] text-emerald-700">Berat Kotor (kg)</Label>
                        <Input type="number" step="0.001" value={it.quantityBeforeQc || ''} onChange={(e) => updateItem(i, { quantityBeforeQc: parseFloat(e.target.value) || 0 })} className="border-emerald-200 bg-white" />
                      </div>
                      {applyQc && (
                        <div className="sm:col-span-2">
                          <Label className="text-[11px] text-emerald-700">Berat Bersih (kg)</Label>
                          <Input type="number" step="0.001" value={it.quantityAfterQc ?? ''} onChange={(e) => updateItem(i, { quantityAfterQc: parseFloat(e.target.value) || 0 })} className="border-emerald-200 bg-white" />
                        </div>
                      )}
                      <div className="sm:col-span-3">
                        <Label className="text-[11px] text-emerald-700">Subtotal</Label>
                        <p className="text-sm font-bold text-emerald-900">{formatRupiah(qty * price)}</p>
                        {applyQc && it.quantityAfterQc != null && it.quantityBeforeQc > it.quantityAfterQc && (
                          <p className="text-[10px] text-amber-600">Susut: {formatNumber(it.quantityBeforeQc - it.quantityAfterQc, 3)} kg</p>
                        )}
                      </div>
                      <div className="sm:col-span-1">
                        <Button variant="ghost" size="icon" onClick={() => removeItem(i)} className="text-rose-500 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={addItem} className="border-emerald-300 text-emerald-700"><Plus className="h-4 w-4" /> Tambah Item</Button>
                {items.length > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-emerald-600">Total {formatNumber(nabungWeight, 2)} kg · Estimasi {Math.floor(nabungTotal / (rupiahPerPointEarn || 1000))} poin ({formatRupiah(rupiahPerPointEarn || 1000)}/pt)</p>
                    <p className="text-lg font-bold text-emerald-900">{formatRupiah(nabungTotal)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Service 1b: Sedekah Sampah */}
          <Card className="border-rose-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-rose-500" />
                <div>
                  <CardTitle className="text-base text-rose-900">Sedekah Sampah</CardTitle>
                  <CardDescription className="text-xs">Donasi sampah warga untuk kegiatan sosial — inventaris masuk ke bank untuk bahan baku daur ulang/produk</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Sedekah QC Mode Selector - 3 pilihan */}
              <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-3">
                <p className="mb-2 text-xs font-semibold text-rose-900 flex items-center gap-1">
                  <ShieldCheck className="size-3 text-rose-600" /> Mode Quality Control (QC) Sedekah
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSedekahQcMode('langsung')}
                    className={`rounded-lg border p-2 text-left transition-all ${
                      sedekahQcMode === 'langsung'
                        ? 'border-rose-500 bg-rose-100 ring-2 ring-rose-400'
                        : 'border-zinc-200 bg-white hover:bg-rose-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${sedekahQcMode === 'langsung' ? 'border-rose-600 bg-rose-600' : 'border-zinc-300'}`}>
                        {sedekahQcMode === 'langsung' && <CheckCircle2 className="size-2.5 text-white" />}
                      </div>
                      <span className="text-xs font-semibold text-rose-900">QC Langsung</span>
                    </div>
                    <p className="mt-1 text-[10px] text-zinc-500">Timbang bersih di tempat. Langsung masuk stok gudang.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSedekahQcMode('nanti')}
                    className={`rounded-lg border p-2 text-left transition-all ${
                      sedekahQcMode === 'nanti'
                        ? 'border-amber-500 bg-amber-100 ring-2 ring-amber-400'
                        : 'border-zinc-200 bg-white hover:bg-amber-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${sedekahQcMode === 'nanti' ? 'border-amber-600 bg-amber-600' : 'border-zinc-300'}`}>
                        {sedekahQcMode === 'nanti' && <CheckCircle2 className="size-2.5 text-white" />}
                      </div>
                      <span className="text-xs font-semibold text-amber-900">QC Nanti</span>
                    </div>
                    <p className="mt-1 text-[10px] text-zinc-500">Sampah sedekah disortir nanti di Antrian QC.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSedekahQcMode('bersih')}
                    className={`rounded-lg border p-2 text-left transition-all ${
                      sedekahQcMode === 'bersih'
                        ? 'border-blue-500 bg-blue-100 ring-2 ring-blue-400'
                        : 'border-zinc-200 bg-white hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${sedekahQcMode === 'bersih' ? 'border-blue-600 bg-blue-600' : 'border-zinc-300'}`}>
                        {sedekahQcMode === 'bersih' && <CheckCircle2 className="size-2.5 text-white" />}
                      </div>
                      <span className="text-xs font-semibold text-blue-900">Sampah Bersih</span>
                    </div>
                    <p className="mt-1 text-[10px] text-zinc-500">Tanpa QC (berat kotor = bersih). Langsung masuk stok.</p>
                  </button>
                </div>
                {/* Info banner sesuai mode */}
                {sedekahQcMode === 'nanti' && (
                  <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200/80 p-2.5 text-[11px] text-amber-800">
                    ⏳ <strong>Mode QC Nanti (Umum untuk Sedekah):</strong> Sampah donasi biasanya belum disortir. Masuk ke <strong>Antrian QC</strong> untuk dipilah & disusutkan. Berat bersih final akan otomatis menambah stok bahan baku olahan dan struk donasi dikirim ke email warga setelah diverifikasi di Antrian QC.
                  </div>
                )}
                {sedekahQcMode === 'langsung' && (
                  <div className="mt-2 rounded-lg bg-rose-50 border border-rose-200/80 p-2.5 text-[11px] text-rose-800">
                    ⚖️ <strong>Mode QC Langsung:</strong> Masukkan berat bersih hasil timbang di tempat. Stok bahan baku <strong>langsung masuk ke inventaris bank</strong> dan email struk donasi langsung dikirim.
                  </div>
                )}
                {sedekahQcMode === 'bersih' && (
                  <div className="mt-2 rounded-lg bg-blue-50 border border-blue-200/80 p-2.5 text-[11px] text-blue-800">
                    ✅ <strong>Mode Sampah Bersih:</strong> Tanpa QC (berat kotor = bersih). Stok bahan baku <strong>langsung masuk ke inventaris</strong> dan email struk dikirim saat ini juga.
                  </div>
                )}
              </div>
              {/* End Sedekah QC Mode Selector */}

              {sedekahItems.length === 0 && <p className="rounded-lg border border-dashed border-rose-200 p-4 text-center text-xs text-rose-600/60">Belum ada item sedekah. Klik &quot;Tambah Item Sedekah&quot; untuk menambahkan.</p>}
              {sedekahItems.map((it, i) => {
                const wi = barangList.find((b) => b.id === it.jenisSampahId)
                const qty = applySedekahQc && it.quantityAfterQc != null ? it.quantityAfterQc : it.quantityBeforeQc
                return (
                  <div key={i} className="rounded-xl border border-rose-100 bg-rose-50/30 p-3">
                    <div className="grid gap-2 sm:grid-cols-12 sm:items-end">
                      <div className="sm:col-span-4">
                        <Label className="text-[11px] text-rose-700">Barang Sampah</Label>
                        <Select value={it.jenisSampahId} onValueChange={(v) => updateSedekahItem(i, { jenisSampahId: v })}>
                          <SelectTrigger className="border-rose-200 bg-white"><SelectValue placeholder="Pilih barang" /></SelectTrigger>
                          <SelectContent>{barangList.map((b) => <SelectItem key={b.id} value={b.id}>{b.code} · {b.name} ({b.unit})</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-[11px] text-rose-700">Berat Kotor (kg)</Label>
                        <Input type="number" step="0.001" value={it.quantityBeforeQc || ''} onChange={(e) => updateSedekahItem(i, { quantityBeforeQc: parseFloat(e.target.value) || 0 })} className="border-rose-200 bg-white" />
                      </div>
                      {applySedekahQc && (
                        <div className="sm:col-span-2">
                          <Label className="text-[11px] text-rose-700">Berat Bersih (kg)</Label>
                          <Input type="number" step="0.001" value={it.quantityAfterQc ?? ''} onChange={(e) => updateSedekahItem(i, { quantityAfterQc: parseFloat(e.target.value) || 0 })} className="border-rose-200 bg-white" />
                        </div>
                      )}
                      <div className="sm:col-span-3">
                        <Label className="text-[11px] text-rose-700">Berat Diterima</Label>
                        <p className="text-sm font-bold text-rose-900">{formatNumber(qty, 3)} kg</p>
                        {applySedekahQc && it.quantityAfterQc != null && it.quantityBeforeQc > it.quantityAfterQc && (
                          <p className="text-[10px] text-amber-600">Susut: {formatNumber(it.quantityBeforeQc - it.quantityAfterQc, 3)} kg</p>
                        )}
                      </div>
                      <div className="sm:col-span-1">
                        <Button variant="ghost" size="icon" onClick={() => removeSedekahItem(i)} className="text-rose-500 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={addSedekahItem} className="border-rose-300 text-rose-700"><Plus className="h-4 w-4" /> Tambah Item Sedekah</Button>
                {sedekahItems.length > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-rose-600">Total donasi sampah</p>
                    <p className="text-lg font-bold text-rose-900">{formatNumber(sedekahWeight, 2)} kg</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          </>
          )}

          {/* Additional koperasi services (only if anggota or has role) */}
          {(anggota || (nasabah && JSON.parse(nasabah.roles || '[]').includes('koperasi'))) && (
            <Card className="border-emerald-100">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <HandCoins className="h-5 w-5 text-teal-600" />
                  <div>
                    <CardTitle className="text-base text-emerald-900">Layanan Koperasi</CardTitle>
                    <CardDescription className="text-xs">Anggota: {anggota?.nomorAnggota || 'Belum Registrasi'} — simpanan, pinjaman, angsuran</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Operation chips */}
                {operations.map((op) => (
                  <div key={op.id} className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/30 p-3">
                    <Badge variant="outline" className={cn(
                      'text-[10px]',
                      op.type === 'setor_simpanan' ? 'border-teal-300 bg-teal-50 text-teal-700' :
                      op.type === 'tarik_sukarela' ? 'border-amber-300 bg-amber-50 text-amber-700' :
                      op.type === 'pengajuan_pinjaman' ? 'border-blue-300 bg-blue-50 text-blue-700' :
                      'border-purple-300 bg-purple-50 text-purple-700'
                    )}>
                      {op.type === 'setor_simpanan' ? 'Setor Simpanan' :
                       op.type === 'tarik_sukarela' ? 'Tarik Sukarela' :
                       op.type === 'pengajuan_pinjaman' ? 'Pinjaman (Langsung Cair)' :
                       'Bayar Angsuran'}
                    </Badge>
                    <span className="flex-1 text-sm text-emerald-900">
                      {op.type === 'setor_simpanan' && `Setor ${op.jenisSimpanan} ${formatRupiah(op.jumlah)}`}
                      {op.type === 'tarik_sukarela' && `Tarik sukarela ${formatRupiah(op.jumlah)}`}
                      {op.type === 'pengajuan_pinjaman' && `Pinjaman ${formatRupiah(op.jumlahPinjaman)} (${op.tenorBulan} bln)`}
                      {op.type === 'bayar_angsuran' && `Angsuran ${op.jumlahAngsuran === 'lunas' ? 'PELUNASAN' : `${op.jumlahAngsuran || 1}x`}`}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => removeOp(op.id)} className="h-7 w-7 text-rose-500"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}

                {/* Banner & Action buttons */}
                {(() => {
                  const saldoPokok = toNumber(anggota?.simpananSaldos?.find((s: any) => s.jenisSimpanan === 'pokok')?.saldo || 0)
                  const nominalPokok = Number(koperasiSetting?.nominalSimpananPokok || 50000)
                  const hasPaidPokok = saldoPokok > 0 && (nominalPokok <= 0 || saldoPokok >= nominalPokok)

                  return (
                    <div className="space-y-2">
                      {!hasPaidPokok && (
                        <div className="rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50/50 to-white p-3 text-xs text-amber-950 shadow-xs flex items-start gap-3">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-200 text-amber-800 mt-0.5">
                            <Landmark className="size-4" />
                          </div>
                          <div className="flex-1 space-y-0.5">
                            <p className="font-bold text-xs text-amber-950">
                              Langkah Awal: Setor Simpanan Pokok Pendaftaran
                            </p>
                            <p className="text-[11px] text-amber-800 leading-relaxed">
                              Anggota <strong>{anggota?.nomorAnggota || nasabah?.name}</strong> baru mendaftar dan belum membayar Simpanan Pokok ({formatRupiah(nominalPokok)}). Klik tombol <strong>Setor Simpanan Pokok</strong> di bawah untuk memproses deposit keanggotaan.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {!hasPaidPokok ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addOp({
                              type: 'setor_simpanan',
                              jenisSimpanan: 'pokok',
                              jumlah: nominalPokok,
                              keterangan: 'Simpanan Pokok awal pendaftaran/registrasi',
                            })}
                            className="border-amber-400 bg-amber-100/90 text-amber-950 font-bold hover:bg-amber-200 shadow-xs"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1 text-amber-800" />
                            + Setor Simpanan Pokok ({formatRupiah(nominalPokok)})
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addOp({
                              type: 'setor_simpanan',
                              jenisSimpanan: 'wajib',
                              jumlah: Number(koperasiSetting?.nominalSimpananWajib || 10000),
                              keterangan: '',
                            })}
                            className="border-teal-300 text-teal-700 font-semibold hover:bg-teal-50"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            + Setor Simpanan (Wajib / Sukarela)
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addOp({ type: 'tarik_sukarela', jumlah: 0 })}
                          disabled={!hasPaidPokok}
                          title={!hasPaidPokok ? 'Wajib melunasi Simpanan Pokok terlebih dahulu' : undefined}
                          className="border-amber-300 text-amber-700 disabled:opacity-40"
                        >
                          <Wallet className="h-3.5 w-3.5 mr-1" /> Tarik Sukarela
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addOp({ type: 'pengajuan_pinjaman', jumlahPinjaman: 0, tenorBulan: 12, keterangan: '' })}
                          disabled={!hasPaidPokok || (pinjamanEligibility && !pinjamanEligibility.eligible)}
                          title={!hasPaidPokok ? 'Wajib melunasi Simpanan Pokok terlebih dahulu' : (pinjamanEligibility && !pinjamanEligibility.eligible ? pinjamanEligibility.reasons?.join('; ') : undefined)}
                          className="border-blue-300 text-blue-700 disabled:opacity-40"
                        >
                          <Landmark className="h-3.5 w-3.5 mr-1" /> Pinjaman Koperasi
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addOp({ type: 'bayar_angsuran', pinjamanId: '', jumlahAngsuran: 1 })}
                          disabled={pinjamanList.length === 0}
                          className="border-purple-300 text-purple-700 disabled:opacity-40"
                        >
                          <CreditCard className="h-3.5 w-3.5 mr-1" /> Bayar Angsuran {pinjamanList.length === 0 && <span className="ml-1 text-[10px] opacity-60">(belum ada pinjaman aktif)</span>}
                        </Button>
                      </div>
                    </div>
                  )
                })()}

                {/* Editable fields for each added operation */}
                {operations.map((op) => {
                  const saldoPokok = toNumber(anggota?.simpananSaldos?.find((s: any) => s.jenisSimpanan === 'pokok')?.saldo || 0)
                  const nominalPokok = Number(koperasiSetting?.nominalSimpananPokok || 50000)
                  const hasPaidPokok = saldoPokok > 0 && (nominalPokok <= 0 || saldoPokok >= nominalPokok)

                  return (
                  <div key={`edit-${op.id}`} className="rounded-lg border border-teal-100 bg-teal-50/20 p-3">
                    {op.type === 'setor_simpanan' && (
                      op.jenisSimpanan === 'wajib' ? (
                        <SimpananWajibChecklistPanel
                          anggota={anggota}
                          koperasiSetting={koperasiSetting}
                          op={op}
                          onUpdateOp={(patch) => {
                            setOperations(operations.map((o) => o.id === op.id ? { ...o, ...patch } : o))
                          }}
                        />
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pt-1">
                          <div className="lg:col-span-5 space-y-3">
                            <div>
                              <Label className="text-[11px] font-semibold text-teal-800">Jenis Simpanan</Label>
                              <Select
                                value={op.jenisSimpanan}
                                onValueChange={(v) => {
                                  const autoNominal = v === 'pokok'
                                    ? Number(koperasiSetting?.nominalSimpananPokok || 50000)
                                    : v === 'wajib'
                                      ? Number(koperasiSetting?.nominalSimpananWajib || 10000)
                                      : 0
                                  const autoKet = v === 'pokok'
                                    ? 'Simpanan Pokok awal pendaftaran/registrasi'
                                    : v === 'sukarela'
                                      ? 'Setor simpanan sukarela'
                                      : 'Setor simpanan wajib'
                                  setOperations(operations.map((o) => o.id === op.id ? { ...o, jenisSimpanan: v, jumlah: autoNominal, keterangan: autoKet, selectedMonths: undefined } : o))
                                }}
                              >
                                <SelectTrigger className="border-teal-200 bg-white font-medium text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pokok">Pokok</SelectItem>
                                  <SelectItem value="wajib" disabled={!hasPaidPokok}>
                                    Wajib {!hasPaidPokok ? '(Wajib Lunas Pokok Dahulu)' : ''}
                                  </SelectItem>
                                  <SelectItem value="sukarela" disabled={!hasPaidPokok}>
                                    Sukarela {!hasPaidPokok ? '(Wajib Lunas Pokok Dahulu)' : ''}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-[11px] font-semibold text-teal-800">Jumlah (Rp)</Label>
                              {op.jenisSimpanan === 'sukarela' ? (
                                <Input type="number" value={op.jumlah || ''} onChange={(e) => setOperations(operations.map((o) => o.id === op.id ? { ...o, jumlah: parseFloat(e.target.value) || 0 } : o))} className="border-teal-200 bg-white" placeholder="Masukkan nominal..." />
                              ) : (
                                <Input type="number" value={op.jumlah || ''} readOnly className="border-teal-200 bg-teal-50 cursor-not-allowed text-teal-800 font-semibold" />
                              )}
                              {op.jenisSimpanan === 'pokok' && (
                                <p className="text-[9px] text-teal-500 mt-0.5">Sesuai pengaturan koperasi (Rp {Number(koperasiSetting?.nominalSimpananPokok || 50000).toLocaleString('id-ID')})</p>
                              )}
                            </div>
                            {op.jenisSimpanan === 'pokok' && (
                              <div>
                                <Label className="text-[11px] font-semibold text-teal-800">Keterangan</Label>
                                <Input
                                  type="text"
                                  value={op.keterangan || 'Simpanan pokok awal pendaftaran'}
                                  onChange={(e) => setOperations(operations.map((o) => o.id === op.id ? { ...o, keterangan: e.target.value } : o))}
                                  className="border-teal-200 bg-white text-xs"
                                />
                              </div>
                            )}
                          </div>

                          {/* Informasi di sebelah kanan untuk Pokok dan Sukarela */}
                          <div className="lg:col-span-7">
                            {op.jenisSimpanan === 'pokok' ? (
                              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 text-xs text-amber-950 space-y-2">
                                <h4 className="font-bold flex items-center gap-1.5 text-amber-900">
                                  <Landmark className="size-4 text-amber-700" /> Informasi Simpanan Pokok
                                </h4>
                                <p className="text-[11px] text-amber-800 leading-relaxed">
                                  Simpanan Pokok adalah iuran awal registrasi / deposit anggota sebesar <strong>Rp {Number(koperasiSetting?.nominalSimpananPokok || 50000).toLocaleString('id-ID')}</strong> yang disetor 1 kali saat pendaftaran. Ini merupakan syarat mutlak sebelum melakukan simpanan wajib, sukarela, atau pinjaman.
                                </p>
                                <div className="rounded-lg border border-amber-200 bg-white p-2.5 text-[11px] space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-zinc-500">Saldo Pokok Saat Ini:</span>
                                    <strong className="text-amber-950 font-mono">Rp {toNumber(anggota?.simpananSaldos?.find((s: any) => s.jenisSimpanan === 'pokok')?.saldo || 0).toLocaleString('id-ID')}</strong>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-zinc-500">Status Keanggotaan:</span>
                                    {toNumber(anggota?.simpananSaldos?.find((s: any) => s.jenisSimpanan === 'pokok')?.saldo || 0) >= Number(koperasiSetting?.nominalSimpananPokok || 50000) ? (
                                      <span className="font-bold text-emerald-700">✓ Sudah Lunas</span>
                                    ) : (
                                      <span className="font-bold text-rose-600">⚠️ Belum Lunas (Wajib Disetor)</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 text-xs text-blue-950 space-y-2">
                                <h4 className="font-bold flex items-center gap-1.5 text-blue-900">
                                  <Wallet className="size-4 text-blue-700" /> Informasi Simpanan Sukarela
                                </h4>
                                <p className="text-[11px] text-blue-800 leading-relaxed">
                                  Simpanan Sukarela bersifat fleksibel tanpa jadwal bulanan. Anggota bebas menyetor nominal berapapun dan dana dapat ditarik sewaktu-waktu sesuai kebutuhan.
                                </p>
                                <div className="rounded-lg border border-blue-200 bg-white p-2.5 text-[11px]">
                                  <div className="flex justify-between items-center">
                                    <span className="text-zinc-500">Saldo Sukarela Saat Ini:</span>
                                    <strong className="text-blue-950 font-mono">Rp {toNumber(anggota?.simpananSaldos?.find((s: any) => s.jenisSimpanan === 'sukarela')?.saldo || 0).toLocaleString('id-ID')}</strong>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}
                    {op.type === 'tarik_sukarela' && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div>
                          <Label className="text-[11px] text-amber-700">Jumlah Tarik (Rp)</Label>
                          <Input type="number" value={op.jumlah || ''} onChange={(e) => setOperations(operations.map((o) => o.id === op.id ? { ...o, jumlah: parseFloat(e.target.value) || 0 } : o))} className="border-amber-200 bg-white" />
                        </div>
                      </div>
                    )}
                    {op.type === 'pengajuan_pinjaman' && (
                      <div className="space-y-2">
                        {/* Eligibility status banner for teller */}
                        {pinjamanEligibility && (
                          <div className={cn(
                            'rounded-xl border-2 p-3.5',
                            pinjamanEligibility.eligible
                              ? 'border-emerald-200 bg-emerald-50/60'
                              : 'border-red-200 bg-red-50/60'
                          )}>
                            <div className="flex items-center gap-2">
                              {pinjamanEligibility.eligible ? (
                                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                              ) : (
                                <XCircle className="h-5 w-5 shrink-0 text-red-500" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={cn('text-xs font-bold', pinjamanEligibility.eligible ? 'text-emerald-800' : 'text-red-800')}>
                                  {pinjamanEligibility.eligible ? '✓ LAYAK — Anggota memenuhi syarat pinjaman' : '✗ TIDAK LAYAK — Anggota belum memenuhi syarat'}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-600">
                                  <span>Lama keanggotaan: <span className={cn('font-bold', (pinjamanEligibility.memberMonths ?? 0) >= (pinjamanEligibility.minimalBulanAnggota ?? 3) ? 'text-emerald-700' : 'text-red-600')}>{pinjamanEligibility.memberMonths ?? 0} bulan</span></span>
                                  <span>Riwayat: <span className={cn('font-bold', pinjamanEligibility.riwayatPembayaran === 'baik' ? 'text-emerald-700' : pinjamanEligibility.riwayatPembayaran === 'baru' ? 'text-amber-600' : 'text-red-600')}>{pinjamanEligibility.riwayatPembayaran === 'baru' ? 'Belum ada' : pinjamanEligibility.riwayatPembayaran === 'baik' ? 'Bagus' : 'Buruk'}</span></span>
                                  <span>Pinjaman aktif: <span className={cn('font-bold', !pinjamanEligibility.adaPinjamanAktif ? 'text-emerald-700' : 'text-red-600')}>{pinjamanEligibility.adaPinjamanAktif ? 'Ada' : 'Tidak ada'}</span></span>
                                </div>
                                {!pinjamanEligibility.eligible && pinjamanEligibility.reasons?.length > 0 && (
                                  <ul className="mt-1.5 space-y-0.5">
                                    {pinjamanEligibility.reasons.map((r: string, i: number) => (
                                      <li key={i} className="text-[11px] text-red-600">• {r}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <div>
                          <Label className="text-[11px] text-blue-700">Jumlah Pinjaman (Rp)</Label>
                          <Input type="number" value={op.jumlahPinjaman || ''} onChange={(e) => setOperations(operations.map((o) => o.id === op.id ? { ...o, jumlahPinjaman: parseFloat(e.target.value) || 0 } : o))} className="border-blue-200 bg-white" placeholder="Contoh: 1000000" />
                        </div>
                        <div>
                          <Label className="text-[11px] text-blue-700">Tenor (Bulan)</Label>
                          <Select value={String(op.tenorBulan || 12)} onValueChange={(v) => setOperations(operations.map((o) => o.id === op.id ? { ...o, tenorBulan: parseInt(v) } : o))}>
                            <SelectTrigger className="border-blue-200 bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {[3, 6, 12, 18, 24, 36].map((t) => <SelectItem key={t} value={String(t)}>{t} Bulan</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11px] text-blue-700">Keterangan</Label>
                          <Input value={op.keterangan || ''} onChange={(e) => setOperations(operations.map((o) => o.id === op.id ? { ...o, keterangan: e.target.value } : o))} className="border-blue-200 bg-white" placeholder="Keperluan pinjaman..." />
                        </div>
                        {op.jumlahPinjaman > 0 && op.tenorBulan > 0 && (() => {
                          const sukuBunga = Number(koperasiSetting?.sukuBungaPinjaman || 0)
                          const biayaAdmin = Number(koperasiSetting?.biayaAdminPinjaman || 0)
                          const rawPokok = op.jumlahPinjaman / op.tenorBulan
                          const pokokPerBulan = Math.ceil(rawPokok / 1000) * 1000
                          const rawBunga = (op.jumlahPinjaman * (sukuBunga / 100)) / 12
                          const bungaPerBulan = Math.ceil(rawBunga / 1000) * 1000
                          const rawAngsuran = pokokPerBulan + bungaPerBulan + biayaAdmin
                          const angsuranPerBulan = Math.ceil(rawAngsuran / 1000) * 1000
                          const pembulatanPerBulan = angsuranPerBulan - (Math.round(rawPokok) + Math.round(rawBunga) + biayaAdmin)
                          const totalPembulatan = pembulatanPerBulan * op.tenorBulan
                          const totalBunga = bungaPerBulan * op.tenorBulan
                          const totalBayar = angsuranPerBulan * op.tenorBulan
                          return (
                            <div className="col-span-full mt-1 rounded-lg border border-blue-200 bg-blue-50/60 p-3 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-medium text-blue-700">Estimasi Angsuran per Bulan:</span>
                                <span className="text-sm font-bold text-blue-950">{formatRupiah(angsuranPerBulan)}</span>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-blue-200/60 pt-1.5 text-[10px] text-blue-800">
                                <span>Pokok: <strong>{formatRupiah(pokokPerBulan)}</strong>/bln</span>
                                {bungaPerBulan > 0 ? (
                                  <span>Bunga ({sukuBunga}%/thn): <strong>{formatRupiah(bungaPerBulan)}</strong>/bln</span>
                                ) : (
                                  <span className="text-zinc-500">Bunga: Rp 0</span>
                                )}
                                {biayaAdmin > 0 ? (
                                  <span className="text-amber-800 font-semibold">Biaya Admin: +{formatRupiah(biayaAdmin)}/bln</span>
                                ) : (
                                  <span className="text-zinc-500">Biaya Admin: Rp 0</span>
                                )}
                              </div>
                              {pembulatanPerBulan > 0 && (
                                <div className="border-t border-blue-200/60 pt-1.5 space-y-0.5">
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
                                    <span className="text-teal-700">📐 Pembulatan: <strong>+{formatRupiah(pembulatanPerBulan)}</strong>/bln</span>
                                    <span className="text-teal-600">Total pembulatan {op.tenorBulan} bln: <strong>{formatRupiah(totalPembulatan)}</strong></span>
                                  </div>
                                  <p className="text-[9px] text-zinc-500 leading-snug">
                                    Angka dibulatkan ke ribuan terdekat agar mudah dibayar tunai. Selisih pembulatan menjadi pendapatan koperasi.
                                  </p>
                                </div>
                              )}
                              <div className="border-t border-blue-200/60 pt-1.5 flex flex-wrap gap-x-4 text-[10px] text-zinc-600">
                                <span>Total bayar {op.tenorBulan} bln: <strong className="text-blue-900">{formatRupiah(totalBayar)}</strong></span>
                                {totalBunga > 0 && <span>Total bunga: <strong>{formatRupiah(totalBunga)}</strong></span>}
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                      </div>
                    )}
                    {op.type === 'bayar_angsuran' && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <div className="sm:col-span-2">
                          <Label className="text-[11px] text-purple-700">Pilih Pinjaman</Label>
                          <Select value={op.pinjamanId} onValueChange={(v) => setOperations(operations.map((o) => o.id === op.id ? { ...o, pinjamanId: v } : o))}>
                            <SelectTrigger className="border-purple-200 bg-white"><SelectValue placeholder="Pilih pinjaman aktif..." /></SelectTrigger>
                            <SelectContent>
                              {pinjamanList.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.nomorPinjaman} — {formatRupiah(toNumber(p.jumlahPinjaman))} ({p.tenorBulan} bln) · Sisa: {formatRupiah(toNumber(p.sisaPinjaman))}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {loadingPinjaman && <p className="mt-1 text-[10px] text-purple-500">Memuat pinjaman...</p>}
                        </div>
                        <div>
                          <Label className="text-[11px] text-purple-700">Jumlah Bayar</Label>
                          <Select value={op.jumlahAngsuran === 'lunas' ? 'lunas' : String(op.jumlahAngsuran || 1)} onValueChange={(v) => setOperations(operations.map((o) => o.id === op.id ? { ...o, jumlahAngsuran: v === 'lunas' ? 'lunas' : parseInt(v) } : o))}>
                            <SelectTrigger className="border-purple-200 bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1x Angsuran</SelectItem>
                              <SelectItem value="2">2x Angsuran</SelectItem>
                              <SelectItem value="3">3x Angsuran</SelectItem>
                              <SelectItem value="lunas">Pelunasan Semua</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {op.pinjamanId && (
                          <div className="col-span-full rounded-lg border border-purple-100 bg-purple-50/50 p-3">
                            {(() => {
                              const selectedPinjaman = pinjamanList.find((p) => p.id === op.pinjamanId)
                              if (!selectedPinjaman) return null
                              const angsuranPerBulan = toNumber(selectedPinjaman.angsuranPerBulan)
                              const sudahBayar = selectedPinjaman.angsurans?.length || 0
                              const sisaAngsuran = selectedPinjaman.tenorBulan - sudahBayar
                              const bayarCount = op.jumlahAngsuran === 'lunas' ? sisaAngsuran : Math.min(op.jumlahAngsuran || 1, sisaAngsuran)
                              return (
                                <>
                                  <div className="flex items-center justify-between">
                                    <p className="text-[11px] text-purple-600">Angsuran/bulan</p>
                                    <p className="text-sm font-bold text-purple-900">{formatRupiah(angsuranPerBulan)}</p>
                                  </div>
                                  <div className="flex items-center justify-between mt-1">
                                    <p className="text-[11px] text-purple-600">Sudah dibayar</p>
                                    <p className="text-sm text-purple-800">{sudahBayar} / {selectedPinjaman.tenorBulan} kali</p>
                                  </div>
                                  <div className="flex items-center justify-between mt-1">
                                    <p className="text-[11px] text-purple-600">Total bayar kali ini</p>
                                    <p className="text-sm font-bold text-purple-900">{formatRupiah(angsuranPerBulan * bayarCount)}</p>
                                  </div>
                                  <p className="text-[10px] text-purple-500 mt-1">
                                    {op.jumlahAngsuran === 'lunas' ? `Pelunasan ${sisaAngsuran} sisa angsuran` : `Membayar ${bayarCount}x angsuran`}
                                  </p>
                                </>
                              )
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  )
                })}
                <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-teal-100">
                  <div className="flex flex-wrap gap-3">
                    {['pokok', 'wajib', 'sukarela'].map((jenis) => {
                      const s = anggota?.simpananSaldos?.find((sv: any) => sv.jenisSimpanan === jenis)
                      return (
                        <div key={jenis} className="rounded bg-teal-50 px-2.5 py-1.5 text-center">
                          <p className="text-[9px] font-medium text-teal-500 uppercase">{jenis}</p>
                          <p className="text-xs font-bold text-teal-800">{formatRupiah(toNumber(s?.saldo))}</p>
                        </div>
                      )
                    })}
                  </div>

                  {pinjamanEligibility && (
                    <div className={cn("rounded border p-2.5 flex items-start gap-2.5", pinjamanEligibility.eligible ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200")}>
                      {pinjamanEligibility.eligible ? (
                        <ShieldCheck className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      ) : (
                        <ShieldX className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <p className={cn("text-xs font-bold", pinjamanEligibility.eligible ? "text-emerald-800" : "text-red-800")}>
                          {pinjamanEligibility.eligible ? "Layak Mengajukan Pinjaman" : "Belum Layak Mengajukan Pinjaman"}
                        </p>
                        {!pinjamanEligibility.eligible && pinjamanEligibility.reasons && pinjamanEligibility.reasons.length > 0 ? (
                          <ul className="mt-1 space-y-0.5">
                            {pinjamanEligibility.reasons.map((r: string, i: number) => (
                              <li key={i} className="text-[10px] text-red-600 flex items-start gap-1">
                                <span className="mt-0.5 shrink-0">•</span>
                                <span>{r}</span>
                              </li>
                            ))}
                          </ul>
                        ) : pinjamanEligibility.eligible ? (
                          <p className="text-[10px] text-emerald-600 mt-0.5">Anggota telah memenuhi seluruh persyaratan koperasi (masa keanggotaan minimal {pinjamanEligibility.minimalBulanAnggota} bulan, tidak memiliki tunggakan/pinjaman aktif, dsb).</p>
                        ) : null}
                      </div>
                    </div>
                  )}
                  {pinjamanEligibility?.kasKoperasi != null && (
                    <div className={cn("rounded border p-2.5 flex items-center justify-between", pinjamanEligibility.kasKoperasi > 0 ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200")}>
                      <div className="flex items-center gap-2">
                        <Landmark className="h-4 w-4 text-blue-600 shrink-0" />
                        <span className="text-[11px] text-zinc-700">Saldo Kas Koperasi</span>
                      </div>
                      <span className={cn("text-xs font-bold", pinjamanEligibility.kasKoperasi > 0 ? "text-blue-900" : "text-red-600")}>
                        {formatRupiah(pinjamanEligibility.kasKoperasi)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {!anggota && nasabah && JSON.parse(nasabah.roles || '[]').includes('koperasi') === false && (
            <p className="text-center text-xs text-amber-600">Nasabah ini bukan anggota koperasi — layanan koperasi tidak tersedia.</p>
          )}

          {/* Notes + actions */}
          <Card className="border-emerald-100">
            <CardContent className="space-y-4 p-5">
              <div>
                <Label className="text-xs text-emerald-700">Catatan Transaksi</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan tambahan..." className="border-emerald-200" rows={2} />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <Button variant="outline" onClick={() => { setStep(1); }} className="border-emerald-300 text-emerald-700">← Ganti Nasabah</Button>
                <Button onClick={submit} disabled={submitting} className="bg-emerald-600 text-white hover:bg-emerald-700">
                  {submitting ? 'Memproses...' : <>Proses & Cetak Kuitansi <Printer className="ml-2 h-4 w-4" /></>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Eligibility detail popup */}
      <Dialog open={showEligibilityDetail} onOpenChange={setShowEligibilityDetail}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-red-900">Penjelasan Ketidaklayakan Pinjaman</DialogTitle>
                <DialogDescription className="mt-1 text-zinc-600">
                  Rincian alasan mengapa anggota belum bisa mengajukan pinjaman koperasi.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {pinjamanEligibility && (
            <div className="space-y-4">
              {/* Status banner */}
              <div className="rounded-xl border-2 border-red-200 bg-red-50/60 p-3">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 shrink-0 text-red-500" />
                  <p className="text-sm font-bold text-red-800">
                    ✗ TIDAK LAYAK — Anggota belum memenuhi syarat pinjaman
                  </p>
                </div>
              </div>

              {/* Anggota info */}
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-zinc-500" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Info Anggota</p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
                  <div>
                    <span className="text-zinc-500">Nomor Anggota</span>
                    <p className="font-semibold text-zinc-900">{pinjamanEligibility.anggotaInfo?.nomorAnggota || anggota?.nomorAnggota || '-'}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Nama</span>
                    <p className="font-semibold text-zinc-900">{pinjamanEligibility.anggotaInfo?.nama || anggota?.nama || nasabah?.name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Bergabung</span>
                    <p className="font-semibold text-zinc-900">{pinjamanEligibility.anggotaInfo?.tanggalBergabung ? formatDate(pinjamanEligibility.anggotaInfo.tanggalBergabung) : (anggota?.tanggalBergabung ? formatDate(anggota.tanggalBergabung) : '-')}</p>
                  </div>
                </div>
              </div>

              {/* Requirement checks breakdown */}
              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-zinc-500" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Daftar Syarat & Status</p>
                </div>
                <div className="space-y-1.5">
                  {/* 1. Masa keanggotaan */}
                  <div className={cn(
                    'flex items-center justify-between rounded-lg border px-3 py-2',
                    (pinjamanEligibility.memberMonths ?? 0) >= (pinjamanEligibility.minimalBulanAnggota ?? 3)
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-red-200 bg-red-50/50'
                  )}>
                    <div className="flex items-center gap-2">
                      {(pinjamanEligibility.memberMonths ?? 0) >= (pinjamanEligibility.minimalBulanAnggota ?? 3)
                        ? <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        : <ShieldX className="h-4 w-4 text-red-500" />}
                      <div>
                        <p className="text-xs font-semibold text-zinc-800">Masa Keanggotaan</p>
                        <p className="text-[11px] text-zinc-500">Minimal {(pinjamanEligibility.minimalBulanAnggota ?? 3)} bulan sejak bergabung</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        'text-sm font-bold',
                        (pinjamanEligibility.memberMonths ?? 0) >= (pinjamanEligibility.minimalBulanAnggota ?? 3) ? 'text-emerald-700' : 'text-red-600'
                      )}>
                        {pinjamanEligibility.memberMonths ?? 0} bulan
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        {(pinjamanEligibility.memberMonths ?? 0) >= (pinjamanEligibility.minimalBulanAnggota ?? 3) ? 'Memenuhi' : `Kurang ${Math.max(0, (pinjamanEligibility.minimalBulanAnggota ?? 3) - (pinjamanEligibility.memberMonths ?? 0))} bulan`}
                      </p>
                    </div>
                  </div>

                  {/* 2. Riwayat pembayaran */}
                  <div className={cn(
                    'flex items-center justify-between rounded-lg border px-3 py-2',
                    pinjamanEligibility.riwayatPembayaran === 'baik' || pinjamanEligibility.riwayatPembayaran === 'baru'
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-red-200 bg-red-50/50'
                  )}>
                    <div className="flex items-center gap-2">
                      {pinjamanEligibility.riwayatPembayaran === 'buruk'
                        ? <ShieldX className="h-4 w-4 text-red-500" />
                        : <ShieldCheck className="h-4 w-4 text-emerald-600" />}
                      <div>
                        <p className="text-xs font-semibold text-zinc-800">Riwayat Pembayaran</p>
                        <p className="text-[11px] text-zinc-500">Tidak ada keterlambatan angsuran sebelumnya</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        'text-sm font-bold',
                        pinjamanEligibility.riwayatPembayaran === 'buruk' ? 'text-red-600' : 'text-emerald-700'
                      )}>
                        {pinjamanEligibility.riwayatPembayaran === 'baru' ? 'Belum ada' : pinjamanEligibility.riwayatPembayaran === 'baik' ? 'Bagus' : 'Buruk'}
                      </p>
                      {pinjamanEligibility.totalKeterlambatan > 0 && (
                        <p className="text-[10px] text-red-400">{pinjamanEligibility.totalKeterlambatan}x telat</p>
                      )}
                    </div>
                  </div>

                  {/* 3. Pinjaman aktif */}
                  <div className={cn(
                    'flex items-center justify-between rounded-lg border px-3 py-2',
                    !pinjamanEligibility.adaPinjamanAktif
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-red-200 bg-red-50/50'
                  )}>
                    <div className="flex items-center gap-2">
                      {!pinjamanEligibility.adaPinjamanAktif
                        ? <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        : <ShieldX className="h-4 w-4 text-red-500" />}
                      <div>
                        <p className="text-xs font-semibold text-zinc-800">Pinjaman Aktif</p>
                        <p className="text-[11px] text-zinc-500">Tidak boleh memiliki pinjaman yang sedang berjalan</p>
                      </div>
                    </div>
                    <p className={cn(
                      'text-sm font-bold',
                      !pinjamanEligibility.adaPinjamanAktif ? 'text-emerald-700' : 'text-red-600'
                    )}>
                      {pinjamanEligibility.adaPinjamanAktif ? 'Ada' : 'Tidak ada'}
                    </p>
                  </div>

                  {/* 4. Pinjaman diblokir */}
                  <div className={cn(
                    'flex items-center justify-between rounded-lg border px-3 py-2',
                    !pinjamanEligibility.pinjamanDiblokir
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-red-200 bg-red-50/50'
                  )}>
                    <div className="flex items-center gap-2">
                      {!pinjamanEligibility.pinjamanDiblokir
                        ? <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        : <ShieldX className="h-4 w-4 text-red-500" />}
                      <div>
                        <p className="text-xs font-semibold text-zinc-800">Status Blokir Pinjaman</p>
                        <p className="text-[11px] text-zinc-500">Akun tidak dalam status diblokir</p>
                      </div>
                    </div>
                    <p className={cn(
                      'text-sm font-bold',
                      !pinjamanEligibility.pinjamanDiblokir ? 'text-emerald-700' : 'text-red-600'
                    )}>
                      {pinjamanEligibility.pinjamanDiblokir ? 'Diblokir' : 'Aman'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Active loans detail (if any) */}
              {pinjamanEligibility.adaPinjamanAktif && (
                <div>
                  <div className="mb-2 flex items-center gap-1.5">
                    <Landmark className="h-3.5 w-3.5 text-zinc-500" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Pinjaman Aktif Anggota</p>
                  </div>
                  {loadingPinjaman ? (
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 text-center">
                      <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                      <p className="mt-2 text-[11px] text-zinc-500">Memuat data pinjaman...</p>
                    </div>
                  ) : pinjamanList.length === 0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-[11px] text-amber-700">
                      <Info className="mr-1 inline h-3.5 w-3.5" />
                      Status menunjukkan ada pinjaman aktif, namun data pinjaman tidak dapat dimuat.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pinjamanList.map((p, idx) => {
                        const sudahBayar = p.angsurans?.length || 0
                        const sisaAngsuran = Math.max(0, p.tenorBulan - sudahBayar)
                        const progress = p.tenorBulan > 0 ? Math.min(100, (sudahBayar / p.tenorBulan) * 100) : 0
                        return (
                          <div key={p.id} className="rounded-lg border border-blue-200 bg-blue-50/40 p-3">
                            <div className="mb-2 flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">{idx + 1}</span>
                                <div>
                                  <p className="text-sm font-bold text-blue-900">{p.nomorPinjaman || '-'}</p>
                                  <p className="text-[10px] text-zinc-500">Diajukan {p.tanggalPengajuan ? formatDate(p.tanggalPengajuan) : '-'}</p>
                                </div>
                              </div>
                              <Badge variant="outline" className="border-blue-300 bg-blue-100 text-[10px] text-blue-700 capitalize">
                                {p.status || 'berjalan'}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-4">
                              <div>
                                <span className="text-[10px] text-zinc-500">Jumlah Pinjaman</span>
                                <p className="font-semibold text-zinc-900">{formatRupiah(toNumber(p.jumlahPinjaman))}</p>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-500">Angsuran/Bulan</span>
                                <p className="font-semibold text-zinc-900">{formatRupiah(toNumber(p.angsuranPerBulan))}</p>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-500">Tenor</span>
                                <p className="font-semibold text-zinc-900">{p.tenorBulan || 0} bulan</p>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-500">Sisa Pinjaman</span>
                                <p className="font-semibold text-red-700">{formatRupiah(toNumber(p.sisaPinjaman))}</p>
                              </div>
                            </div>
                            {/* Progress angsuran */}
                            <div className="mt-2.5">
                              <div className="mb-1 flex items-center justify-between text-[10px]">
                                <span className="text-zinc-500">Progress angsuran</span>
                                <span className="font-semibold text-zinc-700">{sudahBayar} / {p.tenorBulan} kali ({progress.toFixed(0)}%)</span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
                                <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
                              </div>
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500">
                                <Clock className="h-3 w-3" />
                                <span>Sisa {sisaAngsuran} angsuran lagi hingga lunas</span>
                              </div>
                            </div>
                            {p.keterangan && (
                              <div className="mt-2 rounded border border-zinc-200 bg-white/60 px-2 py-1 text-[10px] text-zinc-600">
                                <span className="font-semibold">Keterangan:</span> {p.keterangan}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2.5 text-[11px] text-amber-800">
                        <AlertCircle className="mr-1 inline h-3.5 w-3.5" />
                        Anggota harus melunasi seluruh pinjaman aktif di atas sebelum dapat mengajukan pinjaman baru. Gunakan tombol <span className="font-semibold">Bayar Angsuran</span> untuk membayar.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pending perbaikan request */}
              {pinjamanEligibility.pendingPerbaikan && pinjamanEligibility.perbaikanInfo && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Pengajuan Perbaikan Sedang Diproses</p>
                  </div>
                  <div className="mt-1.5 text-[11px] text-amber-800">
                    <p>Status: <span className="font-semibold capitalize">{pinjamanEligibility.perbaikanInfo.status}</span></p>
                    {pinjamanEligibility.perbaikanInfo.syaratTambahan && (
                      <p className="mt-0.5">Syarat tambahan: {pinjamanEligibility.perbaikanInfo.syaratTambahan}</p>
                    )}
                    {pinjamanEligibility.perbaikanInfo.catatanAdmin && (
                      <p className="mt-0.5">Catatan admin: {pinjamanEligibility.perbaikanInfo.catatanAdmin}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Summary of reasons */}
              <div className="rounded-lg border border-red-200 bg-red-50/60 p-3">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Ringkasan Alasan</p>
                </div>
                <ul className="space-y-1">
                  {pinjamanEligibility.reasons?.map((r: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-red-700">
                      <span className="mt-0.5 text-red-400">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Help footer */}
              <div className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-2.5">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
                <p className="text-[11px] text-zinc-600">
                  Jika anggota merasa ada kekeliruan data, mereka dapat mengajukan <span className="font-semibold">permintaan perbaikan eligibilitas</span> melalui admin koperasi untuk ditinjau ulang.
                </p>
              </div>

              <div className="flex justify-end pt-1">
                <Button variant="outline" size="sm" onClick={() => setShowEligibilityDetail(false)}>
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt dialog */}
      <Dialog open={!!receipt} onOpenChange={(o) => { if (!o) reset() }}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogTitle className="sr-only">Struk Transaksi Teller</DialogTitle>
          {receipt && (() => {
            const hasNabung = receipt.steps.some((s: any) => s.type === 'nabung')
            const hasSedekah = receipt.steps.some((s: any) => s.type === 'sedekah_sampah')
            const hasKoperasi = receipt.steps.some((s: any) => ['setor_simpanan', 'tarik_sukarela', 'pengajuan_pinjaman', 'bayar_angsuran'].includes(s.type))
            const koperasiSteps = receipt.steps.filter((s: any) => ['setor_simpanan', 'tarik_sukarela', 'pengajuan_pinjaman', 'bayar_angsuran'].includes(s.type))
            const bsTypes = [hasNabung, hasSedekah, hasKoperasi].filter(Boolean).length
            let strukTitle = 'KUITANSI LAYANAN TERPADU'
            let strukIcon = '🧾'
            if (bsTypes === 1) {
              if (hasNabung) { strukTitle = 'STRUK NABUNG SAMPAH'; strukIcon = '♻' }
              else if (hasSedekah) { strukTitle = 'STRUK SEDEKAH SAMPAH'; strukIcon = '🤲' }
              else if (hasKoperasi) { strukTitle = 'STRUK LAYANAN KOPERASI'; strukIcon = '🏦' }
            }

            const handlePrintReceipt = () => {
              let html = ''
              // Header
              html += `<div class="struk-header">
                <div class="icon">${strukIcon}</div>
                <h2>Bank Sampah</h2>
                <div class="sub">Sukamaju Sejahtera</div>
                <div class="desc">Layanan Satu Pintu Terpadu</div>
                <div class="badge">${strukTitle}</div>
              </div>`
              // Info
              html += `<div class="struk-section">
                <div class="info-row"><span class="key">No. Transaksi</span><span class="val mono">${receipt.receiptNo}</span></div>
                <div class="info-row"><span class="key">Waktu</span><span class="val">${new Date(receipt.summary.transactedAt).toLocaleString('id-ID')}</span></div>
                <div class="info-row"><span class="key">Nasabah</span><span class="val bold">${nasabah?.name || '-'}</span></div>
                <div class="info-row"><span class="key">Kode Member (BS)</span><span class="val mono">${nasabah?.memberCode || '-'}</span></div>`
              if (hasKoperasi && anggota) {
                html += `<div class="info-row"><span class="key">No. Anggota (KP)</span><span class="val mono">${anggota.nomorAnggota}</span></div>`
              }
              html += `<div class="info-row"><span class="key">Teller</span><span class="val">${receipt.summary.teller}</span></div>
              </div>`
              // Nabung
              if (hasNabung) {
                html += `<div class="struk-section">
                  <div class="label">Bank Sampah — Nabung</div>
                  <div class="summary-row"><span class="key">Total Berat</span><span class="val">${formatNumber(receipt.summary.totalBerat, 2)} kg</span></div>
                  <div class="summary-row"><span class="key">Total Nilai</span><span class="val">${formatRupiah(receipt.summary.totalSaldoDitahan)}</span></div>
                  <div class="summary-row"><span class="key">Poin Diperoleh</span><span class="val">${formatNumber(receipt.summary.totalPoin, 0)}</span></div>
                  <div class="summary-row highlight"><span class="key">Poin Akhir</span><span class="val">${formatNumber(receipt.summary.poinAkhir, 0)}</span></div>
                </div>`
              }
              // Sedekah
              if (hasSedekah) {
                html += `<div class="struk-section">
                  <div class="label">Bank Sampah — Sedekah Sampah</div>`
                for (const s of receipt.steps.filter((s: any) => s.type === 'sedekah_sampah' && s.status === 'ok')) {
                  html += `<div class="summary-row"><span class="key">Berat Diterima</span><span class="val">${formatNumber(s.totalWeight, 2)} kg</span></div>
                  <div class="summary-row"><span class="key">Berat Kotor</span><span class="val">${formatNumber(s.totalWeightKotor, 2)} kg</span></div>
                  <div class="summary-row"><span class="key">Jenis Item</span><span class="val">${s.itemCount} item</span></div>`
                }
                html += `<div class="notes" style="margin-top:8px">Sedekah — tidak menghasilkan saldo/poin. Sampah menjadi aset bank.</div>
                </div>`
              }
              // Koperasi
              if (hasKoperasi) {
                html += `<div class="struk-section">
                  <div class="label">Koperasi</div>`
                for (const s of koperasiSteps) {
                  if (s.type === 'setor_simpanan') {
                    html += `<div class="summary-row"><span class="key">Setor Simpanan (${s.jenis})</span><span class="val">${formatRupiah(s.jumlah)}</span></div>`
                    if (s.saldoSetelahnya != null) html += `<div class="summary-row"><span class="key" style="padding-left:8px;font-size:11px">Saldo setelahnya</span><span class="val" style="font-size:11px">${formatRupiah(s.saldoSetelahnya)}</span></div>`
                  } else if (s.type === 'tarik_sukarela') {
                    html += `<div class="summary-row"><span class="key">Tarik Sukarela</span><span class="val">${formatRupiah(s.jumlah)}</span></div>`
                    if (s.saldoSetelahnya != null) html += `<div class="summary-row"><span class="key" style="padding-left:8px;font-size:11px">Saldo setelahnya</span><span class="val" style="font-size:11px">${formatRupiah(s.saldoSetelahnya)}</span></div>`
                  } else if (s.type === 'pengajuan_pinjaman') {
                    html += `<div class="summary-row"><span class="key">Pinjaman Koperasi</span><span class="val">${formatRupiah(s.jumlahPinjaman)}</span></div>
                    <div class="summary-row"><span class="key" style="padding-left:8px;font-size:11px">No. Pinjaman</span><span class="val" style="font-size:11px;font-family:monospace">${s.nomorPinjaman}</span></div>
                    <div class="summary-row"><span class="key" style="padding-left:8px;font-size:11px">Tenor</span><span class="val" style="font-size:11px">${s.tenorBulan} Bulan</span></div>
                    <div class="summary-row"><span class="key" style="padding-left:8px;font-size:11px">Angsuran/bulan</span><span class="val" style="font-size:11px">${formatRupiah(s.angsuranPerBulan)}</span></div>
                    <div class="summary-row"><span class="key" style="padding-left:8px;font-size:11px">Status</span><span class="val" style="font-size:11px;font-weight:600;color:#059669">Berjalan (Dicairkan)</span></div>`
                  } else if (s.type === 'bayar_angsuran') {
                    html += `<div class="summary-row"><span class="key">Bayar Angsuran</span><span class="val">${formatRupiah(s.totalPaid)}</span></div>
                    <div class="summary-row"><span class="key" style="padding-left:8px;font-size:11px">Jumlah dibayar</span><span class="val" style="font-size:11px">${s.countPaid}x angsuran</span></div>`
                    if (s.lunas) html += `<div style="padding-left:8px;font-size:11px;font-weight:600;color:#059669">LUNAS</div>`
                    if (s.sisaPinjaman != null) html += `<div class="summary-row"><span class="key" style="padding-left:8px;font-size:11px">Sisa pinjaman</span><span class="val" style="font-size:11px">${formatRupiah(s.sisaPinjaman)}</span></div>`
                    if (s.sisaAngsuran != null) html += `<div class="summary-row"><span class="key" style="padding-left:8px;font-size:11px">Sisa angsuran</span><span class="val" style="font-size:11px">${s.sisaAngsuran} kali</span></div>`
                  }
                }
                html += `</div>`
              }
              // Steps
              html += `<div class="struk-section">
                <div class="label">Langkah Diproses</div>
                <div class="steps-list">`
              for (const s of receipt.steps) {
                const icon = s.status === 'ok' ? '<span class="check">✓</span>' : '<span class="cross">✗</span>'
                let label = ''
                if (s.type === 'nabung') label = `Nabung sampah ${formatRupiah(s.totalValue)}`
                else if (s.type === 'sedekah_sampah') label = `Sedekah sampah ${formatNumber(s.totalWeight, 2)} kg`
                else if (s.type === 'setor_simpanan') label = `Setor simpanan ${s.jenis || '-'} ${formatRupiah(s.jumlah || 0)}`
                else if (s.type === 'tarik_sukarela') label = `Tarik sukarela ${formatRupiah(s.jumlah || 0)}`
                else if (s.type === 'pengajuan_pinjaman') label = `Pemberian pinjaman ${formatRupiah(s.jumlahPinjaman || 0)} (${s.tenorBulan || '-'} bln - Langsung Cair)`
                else if (s.type === 'bayar_angsuran') label = `Bayar angsuran ${s.countPaid || 0}x ${s.lunas ? '(LUNAS)' : ''}`
                html += `<div class="step">${icon}<span>${label}</span></div>`
              }
              html += `</div></div>`
              // Footer
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

            return (
              <>
              <div id="printable-struk" className="relative bg-white">
                {/* Header */}
                <div className="border-b-2 border-dashed border-zinc-300 bg-emerald-50 px-5 py-4 text-center">
                  <div className="mb-1 text-2xl">{strukIcon}</div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-900">Bank Sampah</h2>
                  <p className="text-xs font-semibold text-emerald-700">Sukamaju Sejahtera</p>
                  <p className="mt-0.5 text-[10px] text-emerald-600/70">Layanan Satu Pintu Terpadu</p>
                  <div className="mt-2 inline-block rounded-full bg-emerald-600 px-3 py-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white">{strukTitle}</p>
                  </div>
                </div>

                {/* Info Section */}
                <div className="space-y-1.5 border-b-2 border-dashed border-zinc-300 px-5 py-4">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="shrink-0 text-zinc-500">No. Transaksi</span>
                    <span className="text-right font-mono font-medium text-zinc-900">{receipt.receiptNo}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="shrink-0 text-zinc-500">Waktu</span>
                    <span className="text-right font-medium text-zinc-900">{new Date(receipt.summary.transactedAt).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="shrink-0 text-zinc-500">Nasabah</span>
                    <span className="text-right font-bold text-zinc-900">{nasabah?.name || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="shrink-0 text-zinc-500">Kode Member (BS)</span>
                    <span className="text-right font-mono text-zinc-900">{nasabah?.memberCode || '-'}</span>
                  </div>
                  {hasKoperasi && anggota && (
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="shrink-0 text-zinc-500">No. Anggota (KP)</span>
                      <span className="text-right font-mono text-zinc-900">{anggota.nomorAnggota}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="shrink-0 text-zinc-500">Teller</span>
                    <span className="text-right font-medium text-zinc-900">{receipt.summary.teller}</span>
                  </div>
                </div>

                {/* Bank Sampah - Nabung Section */}
                {hasNabung && (
                  <div className="border-b-2 border-dashed border-zinc-300 px-5 py-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-600">Bank Sampah — Nabung</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Total Berat</span>
                        <span className="font-medium text-zinc-900">{formatNumber(receipt.summary.totalBerat, 2)} kg</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Total Nilai</span>
                        <span className="font-medium text-zinc-900">{formatRupiah(receipt.summary.totalSaldoDitahan)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Poin Diperoleh</span>
                        <span className="font-medium text-zinc-900">{formatNumber(receipt.summary.totalPoin, 0)}</span>
                      </div>
                      <div className="flex justify-between rounded-md bg-emerald-50 px-2 py-1.5 text-sm font-bold">
                        <span className="text-emerald-900">Poin Akhir</span>
                        <span className="text-emerald-700">{formatNumber(receipt.summary.poinAkhir, 0)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bank Sampah - Sedekah Section */}
                {hasSedekah && (
                  <div className="border-b-2 border-dashed border-zinc-300 px-5 py-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-rose-600">Bank Sampah — Sedekah Sampah</p>
                    {receipt.steps.filter((s: any) => s.type === 'sedekah_sampah' && s.status === 'ok').map((s: any, i: number) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-500">Berat Diterima</span>
                          <span className="font-medium text-zinc-900">{formatNumber(s.totalWeight, 2)} kg</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-500">Berat Kotor</span>
                          <span className="text-zinc-900">{formatNumber(s.totalWeightKotor, 2)} kg</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-500">Jenis Item</span>
                          <span className="text-zinc-900">{s.itemCount} item</span>
                        </div>
                      </div>
                    ))}
                    <p className="mt-2 text-[10px] italic text-zinc-400">Sedekah — tidak menghasilkan saldo/poin. Sampah menjadi aset bank.</p>
                  </div>
                )}

                {/* Koperasi Section */}
                {hasKoperasi && (
                  <div className="border-b-2 border-dashed border-zinc-300 px-5 py-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-teal-600">Koperasi</p>
                    <div className="space-y-2">
                      {koperasiSteps.map((s: any, i: number) => (
                        <div key={i} className="space-y-1 border-b border-dashed border-zinc-100 pb-2 last:border-0 last:pb-0">
                          {s.type === 'setor_simpanan' && (
                            <>
                              <div className="flex justify-between text-xs">
                                <span className="text-zinc-600">Setor Simpanan ({s.jenis})</span>
                                <span className="font-medium text-zinc-900">{formatRupiah(s.jumlah)}</span>
                              </div>
                              {s.saldoSetelahnya != null && (
                                <div className="flex justify-between pl-2 text-[11px]">
                                  <span className="text-zinc-400">Saldo setelahnya</span>
                                  <span className="text-zinc-700">{formatRupiah(s.saldoSetelahnya)}</span>
                                </div>
                              )}
                            </>
                          )}
                          {s.type === 'tarik_sukarela' && (
                            <>
                              <div className="flex justify-between text-xs">
                                <span className="text-zinc-600">Tarik Sukarela</span>
                                <span className="font-medium text-zinc-900">{formatRupiah(s.jumlah)}</span>
                              </div>
                              {s.saldoSetelahnya != null && (
                                <div className="flex justify-between pl-2 text-[11px]">
                                  <span className="text-zinc-400">Saldo setelahnya</span>
                                  <span className="text-zinc-700">{formatRupiah(s.saldoSetelahnya)}</span>
                                </div>
                              )}
                            </>
                          )}
                          {s.type === 'pengajuan_pinjaman' && (
                            <>
                              <div className="flex justify-between text-xs">
                                <span className="text-zinc-600">Pinjaman Koperasi</span>
                                <span className="font-medium text-zinc-900">{formatRupiah(s.jumlahPinjaman)}</span>
                              </div>
                              <div className="flex justify-between pl-2 text-[11px]">
                                <span className="text-zinc-400">No. Pinjaman</span>
                                <span className="font-mono text-zinc-700">{s.nomorPinjaman}</span>
                              </div>
                              <div className="flex justify-between pl-2 text-[11px]">
                                <span className="text-zinc-400">Tenor</span>
                                <span className="text-zinc-700">{s.tenorBulan} Bulan</span>
                              </div>
                              <div className="flex justify-between pl-2 text-[11px]">
                                <span className="text-zinc-400">Angsuran/bulan</span>
                                <span className="text-zinc-700">{formatRupiah(s.angsuranPerBulan)}</span>
                              </div>
                              <div className="flex justify-between pl-2 text-[11px]">
                                <span className="text-zinc-400">Status</span>
                                <span className="font-semibold text-emerald-700">Berjalan (Dicairkan)</span>
                              </div>
                            </>
                          )}
                          {s.type === 'bayar_angsuran' && (
                            <>
                              <div className="flex justify-between text-xs">
                                <span className="text-zinc-600">Bayar Angsuran</span>
                                <span className="font-medium text-zinc-900">{formatRupiah(s.totalPaid)}</span>
                              </div>
                              <div className="flex justify-between pl-2 text-[11px]">
                                <span className="text-zinc-400">Jumlah dibayar</span>
                                <span className="text-zinc-700">{s.countPaid}x angsuran</span>
                              </div>
                              {s.lunas && <p className="pl-2 text-[11px] font-medium text-emerald-600">LUNAS</p>}
                              {s.sisaPinjaman != null && (
                                <div className="flex justify-between pl-2 text-[11px]">
                                  <span className="text-zinc-400">Sisa pinjaman</span>
                                  <span className="text-zinc-700">{formatRupiah(s.sisaPinjaman)}</span>
                                </div>
                              )}
                              {s.sisaAngsuran != null && (
                                <div className="flex justify-between pl-2 text-[11px]">
                                  <span className="text-zinc-400">Sisa angsuran</span>
                                  <span className="text-zinc-700">{s.sisaAngsuran} kali</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Steps Summary */}
                <div className="border-b-2 border-dashed border-zinc-300 px-5 py-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Langkah Diproses</p>
                  <div className="space-y-1.5">
                    {receipt.steps.map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs">
                        {s.status === 'ok' ? <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" /> : <span className="text-rose-500">✗</span>}
                        <span className="text-zinc-700">
                          {s.type === 'nabung' && `Nabung sampah ${formatRupiah(s.totalValue)}`}
                          {s.type === 'sedekah_sampah' && `Sedekah sampah ${formatNumber(s.totalWeight, 2)} kg`}
                          {s.type === 'setor_simpanan' && `Setor simpanan ${s.jenis || '-'} ${formatRupiah(s.jumlah || 0)}`}
                          {s.type === 'tarik_sukarela' && `Tarik sukarela ${formatRupiah(s.jumlah || 0)}`}
                          {s.type === 'pengajuan_pinjaman' && `Pengajuan pinjaman ${formatRupiah(s.jumlahPinjaman || 0)} (${s.tenorBulan || '-'} bln)`}
                          {s.type === 'bayar_angsuran' && `Bayar angsuran ${s.countPaid || 0}x ${s.lunas ? '(LUNAS)' : ''}`}
                        </span>
                        {s.error && <span className="text-rose-500">— {s.error}</span>}
                      </div>
                    ))}
                  </div>
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
                <Button onClick={() => reset()} className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700">Selesai</Button>
                <Button
                  variant="outline"
                  onClick={handlePrintReceipt}
                  className="flex-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  <Printer className="mr-1.5 h-4 w-4" /> Cetak Struk
                </Button>
              </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}