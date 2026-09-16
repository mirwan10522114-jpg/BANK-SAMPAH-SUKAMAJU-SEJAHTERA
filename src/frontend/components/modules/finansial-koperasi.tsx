'use client'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { formatRupiah, formatDateTime, toNumber } from '@/lib/format'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Loader2, ArrowUpRight, ArrowDownRight, WalletCards, Wallet, Landmark, HandCoins, History, Calendar, ListChecks, Plus, ArrowDownCircle, ArrowUpCircle, Coins, PiggyBank } from 'lucide-react'
import { Anggota, KoperasiSetting, SUMBER_LABEL, StatCard, AnggotaSelector, EmptyRow, SkeletonRows, SumberBadge } from './koperasi'
import { StrukModal, useStruk } from './struk-modal'
import { formatDate } from '@/lib/format'

// ===================== Main Component =====================
export function FinansialKoperasi() {
  return (
    <div className="space-y-4">
      <KasTab />
    </div>
  )
}

// ============================ PENARIKAN SUKARELA TAB ============================
function PenarikanTab() {
  const [anggotaList, setAnggotaList] = useState<Anggota[]>([])
  const [anggotaId, setAnggotaId] = useState<string>('')
  const [simpananList, setSimpananList] = useState<any[]>([])
  const [loadingAnggota, setLoadingAnggota] = useState(true)
  const [loadingList, setLoadingList] = useState(false)

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [jumlah, setJumlah] = useState('')
  const [alasan, setAlasan] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ---- Filter state (Daftar Penarikan) ----
  const [dariInput, setDariInput] = useState('')
  const [sampaiInput, setSampaiInput] = useState('')
  const [qInput, setQInput] = useState('')
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [q, setQ] = useState('')
  const [saldoSukarela, setSaldoSukarela] = useState<number>(0)

  const { strukData, strukOpen, setStrukOpen, showStruk } = useStruk()

  useEffect(() => {
    setLoadingAnggota(true)
    api.anggota
      .list()
      .then((data) => {
        setAnggotaList(data)
        if (data.length > 0) setAnggotaId(data[0].id)
      })
      .catch((e) => toast.error('Gagal memuat anggota: ' + e.message))
      .finally(() => setLoadingAnggota(false))
  }, [])

  const loadList = useCallback(async () => {
    if (!anggotaId) {
      setSimpananList([])
      setSaldoSukarela(0)
      return
    }
    setLoadingList(true)
    try {
      const [data, agtData] = await Promise.all([
        api.koperasi.simpananList(anggotaId, {
          jenisSimpanan: 'sukarela',
          tipe: 'tarik',
          dari,
          sampai,
          q,
        }),
        api.anggota.get(anggotaId)
      ])
      setSimpananList(data)
      const saldo = agtData?.simpananSaldos?.find((s: any) => s.jenisSimpanan === 'sukarela')?.saldo || 0
      setSaldoSukarela(toNumber(saldo))
    } catch (e: any) {
      toast.error('Gagal memuat penarikan: ' + e.message)
    } finally {
      setLoadingList(false)
    }
  }, [anggotaId, dari, sampai, q])

  useEffect(() => {
    loadList()
  }, [loadList])

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

  const handleCreate = async () => {
    const n = parseFloat(jumlah)
    if (isNaN(n) || n <= 0) {
      toast.error('Jumlah harus > 0')
      return
    }
    if (!alasan.trim()) {
      toast.error('Alasan wajib diisi')
      return
    }
    setSubmitting(true)
    try {
      const res = await api.koperasi.simpananTx({
        anggotaId,
        jenisSimpanan: 'sukarela',
        tipe: 'tarik',
        jumlah: n,
        keterangan: alasan,
      })
      toast.success('Penarikan sukarela berhasil dicairkan')
      setDialogOpen(false)
      setJumlah('')
      setAlasan('')
      if (res) {
        showStruk({
          type: 'penarikan_sukarela',
          receiptNo: res.nomorTransaksi,
          tanggal: res.tanggalTransaksi || new Date().toISOString(),
          anggotaName: anggotaList.find(a => a.id === anggotaId)?.nama || '-',
          anggotaCode: anggotaList.find(a => a.id === anggotaId)?.nomorAnggota || '-',
          summary: [
            {
              label: 'Jumlah Ditarik',
              value: formatRupiah(toNumber(res.jumlah)),
              highlight: true,
            },
            { label: 'Status', value: 'DANA DICAIRKAN' },
          ],
          notes: 'Simpanan sukarela telah ditarik dan dana diserahkan kepada anggota.',
        })
      }
      loadList()
    } catch (e: any) {
      toast.error(e.message || 'Gagal melakukan penarikan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-emerald-100">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-emerald-900">
              <ArrowDownCircle className="h-5 w-5 text-emerald-600" /> Penarikan
              Simpanan Sukarela
            </CardTitle>
            <CardDescription>
              Penarikan dana simpanan sukarela anggota yang akan langsung dipotong dari saldo kas.
            </CardDescription>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            disabled={!anggotaId}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Tarik Dana
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <AnggotaSelector
              value={anggotaId}
              onChange={setAnggotaId}
              anggotaList={anggotaList}
              loading={loadingAnggota}
            />
          </div>
          {anggotaId && (
            <div className="flex min-w-[200px] flex-col justify-center rounded-lg border border-emerald-100 bg-emerald-50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-800">Saldo Sukarela</p>
              <p className="text-2xl font-bold text-emerald-700">{formatRupiah(saldoSukarela)}</p>
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-emerald-900">
              Riwayat Penarikan Dana
            </p>
            {loadingList && <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />}
          </div>

          {/* Filter bar */}
          <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
            <div className="w-40">
              <Label className="text-xs text-zinc-500">Dari</Label>
              <Input
                type="date"
                value={dariInput}
                onChange={(e) => setDariInput(e.target.value)}
                className="h-9 bg-white"
              />
            </div>
            <div className="w-40">
              <Label className="text-xs text-zinc-500">Sampai</Label>
              <Input
                type="date"
                value={sampaiInput}
                onChange={(e) => setSampaiInput(e.target.value)}
                className="h-9 bg-white"
              />
            </div>
            <div className="w-44">
              <Label className="text-xs text-zinc-500">Cari No. Penarikan</Label>
              <Input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFilters()
                }}
                placeholder="No. transaksi..."
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

          <div className="max-h-[480px] overflow-auto rounded-lg border border-emerald-100">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-emerald-50/95 backdrop-blur">
                <TableRow>
                  <TableHead>Nomor</TableHead>
                  <TableHead>Tanggal Penarikan</TableHead>
                  <TableHead>Nama Anggota</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingList ? (
                  <SkeletonRows cols={5} />
                ) : simpananList.length === 0 ? (
                  <EmptyRow
                    colSpan={5}
                    message="Belum ada riwayat penarikan dana."
                  />
                ) : (
                  simpananList.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">
                        {p.nomorTransaksi}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDate(p.tanggalTransaksi)}
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-emerald-900">
                        {p.anggota?.nama || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatRupiah(toNumber(p.jumlah))}
                      </TableCell>
                      <TableCell
                        className="max-w-[260px] truncate text-xs text-emerald-700/80"
                        title={p.keterangan}
                      >
                        {p.keterangan || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-emerald-900">
              Tarik Simpanan Sukarela
            </DialogTitle>
            <DialogDescription>
              Dana simpanan sukarela anggota akan langsung dipotong dari saldo kas dan dicairkan.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="jp2">Jumlah (Rp)</Label>
              <Input
                id="jp2"
                type="number"
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                placeholder="100000"
                min="0"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="alasan">Alasan Penarikan</Label>
              <Textarea
                id="alasan"
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                placeholder="Jelaskan alasan penarikan..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              onClick={handleCreate}
              disabled={submitting}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Cairkan Dana
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <StrukModal data={strukData} open={strukOpen} onOpenChange={setStrukOpen} />
    </Card>
  )
}

// ============================ KAS KOPERASI TAB ============================
function KasTab() {
  const [data, setData] = useState<{
    list: any[]
    saldo: number | string
    totalMasuk?: number | string
    totalKeluar?: number | string
    bySumber: any[]
    periode?: { dari: string | null; sampai: string | null } | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterSumber, setFilterSumber] = useState<string>('')
  const [filterTipe, setFilterTipe] = useState<string>('')
  const [dariInput, setDariInput] = useState<string>('')
  const [sampaiInput, setSampaiInput] = useState<string>('')
  const [dari, setDari] = useState<string>('')
  const [sampai, setSampai] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.koperasi.kas(dari, sampai)
      setData(res)
    } catch (e: any) {
      toast.error('Gagal memuat kas koperasi: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [dari, sampai])

  useEffect(() => {
    load()
  }, [load])

  // Client-side filter (the API also supports query, but we filter locally for snappy UX)
  const filtered = (data?.list || []).filter((k) => {
    if (filterSumber && k.sumber !== filterSumber) return false
    if (filterTipe && k.tipe !== filterTipe) return false
    return true
  })

  const masukTotal =
    data?.totalMasuk != null
      ? toNumber(data.totalMasuk)
      : (data?.list || [])
          .filter((k) => k.tipe === 'masuk')
          .reduce((sum, k) => sum + toNumber(k.jumlah), 0)
  const keluarTotal =
    data?.totalKeluar != null
      ? toNumber(data.totalKeluar)
      : (data?.list || [])
          .filter((k) => k.tipe === 'keluar')
          .reduce((sum, k) => sum + toNumber(k.jumlah), 0)
  const periodeLabel =
    dari || sampai
      ? `periode: ${dari || '…'} — ${sampai || '…'}`
      : 'semua periode'

  const applyPeriode = () => {
    setDari(dariInput)
    setSampai(sampaiInput)
  }

  const resetPeriode = () => {
    setDariInput('')
    setSampaiInput('')
    setDari('')
    setSampai('')
  }

  return (
    <Card className="border-emerald-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-900">
          <Landmark className="h-5 w-5 text-emerald-600" /> Kas Koperasi
        </CardTitle>
        <CardDescription>
          Buku kas koperasi — masuk & keluar dari semua sumber transaksi.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        ) : (
          <>
            {/* Big saldo card */}
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
              <CardContent className="flex items-center justify-between gap-4 p-6">
                <div>
                  <p className="text-xs font-medium text-emerald-50/80">
                    Saldo Kas Saat Ini
                  </p>
                  <p className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                    {formatRupiah(toNumber(data?.saldo))}
                  </p>
                  <p className="mt-1 text-xs text-emerald-50/70">
                    Saldo berjalan — semua periode (tidak terfilter)
                  </p>
                </div>
                <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur sm:flex">
                  <ListChecks className="h-8 w-8 text-white" />
                </div>
              </CardContent>
            </Card>

            {/* Stat cards */}
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard
                label="Total Kas Masuk"
                value={formatRupiah(masukTotal)}
                icon={ArrowUpCircle}
                accent="emerald"
                sub={`(${periodeLabel})`}
              />
              <StatCard
                label="Total Kas Keluar"
                value={formatRupiah(keluarTotal)}
                icon={ArrowDownCircle}
                accent="rose"
                sub={`(${periodeLabel})`}
              />
            </div>

            {/* Period filter */}
            <div className="flex flex-wrap items-end gap-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
              <div className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Filter Periode
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Dari</Label>
                <Input
                  type="date"
                  value={dariInput}
                  onChange={(e) => setDariInput(e.target.value)}
                  className="w-full sm:w-[150px]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Sampai</Label>
                <Input
                  type="date"
                  value={sampaiInput}
                  onChange={(e) => setSampaiInput(e.target.value)}
                  className="w-full sm:w-[150px]"
                />
              </div>
              <Button
                size="sm"
                onClick={applyPeriode}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Terapkan
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={resetPeriode}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                Reset
              </Button>
              {(dari || sampai) && (
                <div className="ml-auto text-xs text-emerald-800">
                  Aktif: <span className="font-medium">{dari || '…'}</span> —{' '}
                  <span className="font-medium">{sampai || '…'}</span>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Sumber</Label>
                <Select
                  value={filterSumber}
                  onValueChange={(v) => setFilterSumber(v === 'all' ? '' : v)}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Semua sumber" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua sumber</SelectItem>
                    {Object.entries(SUMBER_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Tipe</Label>
                <Select
                  value={filterTipe}
                  onValueChange={(v) => setFilterTipe(v === 'all' ? '' : v)}
                >
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Semua tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua tipe</SelectItem>
                    <SelectItem value="masuk">Masuk</SelectItem>
                    <SelectItem value="keluar">Keluar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={load}
              >
                <Loader2
                  className={
                    'mr-1.5 h-4 w-4 ' + (loading ? 'animate-spin' : 'hidden')
                  }
                />
                Refresh
              </Button>
            </div>

            {/* Table */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-emerald-900">
                  Riwayat Transaksi Kas
                </p>
                <span className="text-xs text-emerald-700/60">
                  {filtered.length} transaksi
                </span>
              </div>
              <div className="max-h-[480px] overflow-auto rounded-lg border border-emerald-100">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-emerald-50/95 backdrop-blur">
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Sumber</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead>No Referensi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <EmptyRow colSpan={6} message="Tidak ada transaksi kas." />
                    ) : (
                      filtered.map((k) => (
                        <TableRow key={k.id}>
                          <TableCell className="text-xs">
                            {formatDateTime(k.tanggalTransaksi)}
                          </TableCell>
                          <TableCell>
                            <SumberBadge sumber={k.sumber} />
                          </TableCell>
                          <TableCell>
                            {k.tipe === 'masuk' ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-200 bg-emerald-50 text-emerald-700"
                              >
                                <ArrowUpCircle className="h-3 w-3" /> masuk
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-rose-200 bg-rose-50 text-rose-700"
                              >
                                <ArrowDownCircle className="h-3 w-3" /> keluar
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell
                            className={
                              'text-right font-semibold ' +
                              (k.tipe === 'masuk'
                                ? 'text-emerald-700'
                                : 'text-rose-700')
                            }
                          >
                            {k.tipe === 'masuk' ? '+' : '-'}{' '}
                            {formatRupiah(toNumber(k.jumlah))}
                          </TableCell>
                          <TableCell
                            className="max-w-[240px] truncate text-xs text-emerald-700/80"
                            title={k.keterangan || ''}
                          >
                            {k.keterangan || '-'}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-emerald-700/60">
                            {k.nomorReferensi || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
