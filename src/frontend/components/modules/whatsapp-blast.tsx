'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Send, Loader2, MessageSquareWarning, Search } from 'lucide-react'

export function WhatsappBlastTab() {
  const [tipe, setTipe] = useState('pengumuman')
  const [message, setMessage] = useState('Halo [NAMA],\n\nIni adalah pesan dari Bank Sampah / Koperasi Sukamaju Sejahtera.\n\nTerima kasih.')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  // States for perorangan
  const [penggunas, setUsers] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Preview States
  const [tagihanFilter, setTagihanFilter] = useState('semua')
  const [previewTargets, setPreviewTargets] = useState<any[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Fetch Preview
  useEffect(() => {
    const fetchPreview = async () => {
      if (tipe === 'perorangan' && selectedIds.length === 0) {
        setPreviewTargets([])
        return
      }

      setLoadingPreview(true)
      try {
        let url = `/api/whatsapp/blast/preview?tipe=${tipe}`
        if (tipe === 'tagihan_pinjaman') url += `&tagihanFilter=${tagihanFilter}`
        if (tipe === 'perorangan') url += `&ids=${selectedIds.join(',')}`

        const res = await fetch(url, { cache: 'no-store' })
        const data = await res.json()
        if (res.ok && data.targets) {
          setPreviewTargets(data.targets)
        } else {
          setPreviewTargets([])
        }
      } catch (e) {
        console.error('Failed to fetch preview', e)
        setPreviewTargets([])
      } finally {
        setLoadingPreview(false)
      }
    }

    // Add a slight debounce to avoid too many fetches if typing/clicking fast
    const timeout = setTimeout(fetchPreview, 300)
    return () => clearTimeout(timeout)
  }, [tipe, tagihanFilter, selectedIds])

  useEffect(() => {
    if (tipe === 'perorangan' && penggunas.length === 0) {
      setLoadingUsers(true)
      fetch('/api/master/nasabah')
        .then(res => res.json())
        .then(data => setUsers(data))
        .catch(() => toast.error('Gagal memuat data nasabah'))
        .finally(() => setLoadingUsers(false))
    }
  }, [tipe, penggunas.length])

  const filteredUsers = penggunas.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.memberCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.phone?.includes(searchQuery)
  )

  const toggleUser = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const getTemplatePlaceholder = () => {
    switch (tipe) {
      case 'simpanan_pokok':
        return 'Tersedia Variabel: [NAMA], [KODE_ANGGOTA], [NOMINAL_POKOK]'
      case 'simpanan_wajib':
        return 'Tersedia Variabel: [NAMA], [KODE_ANGGOTA], [NOMINAL_WAJIB], [BULAN]'
      case 'tagihan_pinjaman':
        return 'Tersedia Variabel: [NAMA], [KODE_ANGGOTA], [SISA_PINJAMAN]'
      default:
        return 'Tersedia Variabel: [NAMA], [KODE_ANGGOTA]'
    }
  }

  const handleTemplateChange = (val: string) => {
    setTipe(val)
    switch (val) {
      case 'simpanan_pokok':
        setMessage('Halo [NAMA],\n\nKami mengingatkan bahwa Anda belum melunasi Simpanan Pokok Koperasi sebesar [NOMINAL_POKOK].\n\nMohon segera diselesaikan agar bisa menggunakan layanan Koperasi sepenuhnya.\n\nTerima kasih.')
        break
      case 'simpanan_wajib':
        setMessage('Halo [NAMA],\n\nIni adalah pengingat untuk pembayaran Simpanan Wajib bulan [BULAN] sebesar [NOMINAL_WAJIB].\n\nTerima kasih atas partisipasi Anda.')
        break
      case 'tagihan_pinjaman':
        setMessage('Halo [NAMA],\n\nKami menginformasikan bahwa Anda memiliki pinjaman aktif dengan sisa tagihan sebesar [SISA_PINJAMAN].\n\nMohon pastikan untuk membayar angsuran tepat waktu.\n\nTerima kasih.')
        break
      default:
        setMessage('Halo [NAMA],\n\nIni adalah pesan dari Bank Sampah / Koperasi Sukamaju Sejahtera.\n\nTerima kasih.')
    }
  }

  const handleSendBlast = async () => {
    if (!message.trim()) {
      toast.error('Pesan tidak boleh kosong')
      return
    }

    if (tipe === 'perorangan' && selectedIds.length === 0) {
      toast.error('Pilih minimal satu nasabah untuk dikirimkan pesan')
      return
    }

    if (!confirm('Apakah Anda yakin ingin mengirim pesan massal ini sekarang? Aksi ini tidak dapat dibatalkan.')) return

    setLoading(true)
    setResult(null)
    
    try {
      const payload: any = { tipe, customMessage: message }
      if (tipe === 'perorangan') payload.targetIds = selectedIds
      if (tipe === 'tagihan_pinjaman') payload.tagihanFilter = tagihanFilter

      const res = await fetch('/api/whatsapp/blast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kesalahan')
      }

      setResult({ success: true, message: data.message })
      toast.success('Blast berhasil dieksekusi!')
    } catch (err: any) {
      setResult({ success: false, message: err.message })
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-emerald-600" />
            Kirim WhatsApp Blast
          </CardTitle>
          <CardDescription>
            Kirim pesan massal secara otomatis ke anggota koperasi berdasarkan kategori tertentu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {result && (
            <div className={`p-4 rounded-xl border ${result.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
              <p className="font-medium text-sm">{result.message}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-emerald-900 font-semibold">Tujuan Blast / Filter Anggota</Label>
            <Select value={tipe} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pengumuman">Semua Pengguna / Nasabah (Pengumuman)</SelectItem>
                <SelectItem value="simpanan_pokok">Reminder Simpanan Pokok Belum Lunas</SelectItem>
                <SelectItem value="simpanan_wajib">Reminder Simpanan Wajib Bulan Ini</SelectItem>
                <SelectItem value="tagihan_pinjaman">Peringatan Tagihan Pinjaman</SelectItem>
                <SelectItem value="perorangan">Pilih Perorangan / Beberapa Nasabah</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tipe === 'tagihan_pinjaman' && (
            <div className="space-y-2">
              <Label className="text-emerald-900 font-semibold">Sub-Filter Pinjaman</Label>
              <Select value={tagihanFilter} onValueChange={setTagihanFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Pinjaman Berjalan</SelectItem>
                  <SelectItem value="menunggak">Menunggak (Jatuh tempo sudah lewat)</SelectItem>
                  <SelectItem value="h-30">Jatuh Tempo H-30 (15 - 30 hari lagi)</SelectItem>
                  <SelectItem value="h-14">Jatuh Tempo H-14 (8 - 14 hari lagi)</SelectItem>
                  <SelectItem value="h-7">Jatuh Tempo H-7 (4 - 7 hari lagi)</SelectItem>
                  <SelectItem value="h-3">Jatuh Tempo H-3 (0 - 3 hari lagi)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {tipe === 'perorangan' && (
            <div className="space-y-3 p-4 rounded-xl border bg-zinc-50/50">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Pilih Nasabah ({selectedIds.length} dipilih)</Label>
                {selectedIds.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])} className="h-7 text-xs text-rose-600 hover:text-rose-700">Batalkan Pilihan</Button>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                <Input 
                  placeholder="Cari nama, ID, atau no HP..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2 rounded-md border bg-white p-2">
                {loadingUsers ? (
                  <p className="text-center text-sm text-zinc-500 py-4">Memuat nasabah...</p>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-center text-sm text-zinc-500 py-4">Tidak ada nasabah yang cocok.</p>
                ) : (
                  filteredUsers.map(u => (
                    <div key={u.id} className="flex items-center space-x-2 p-2 hover:bg-zinc-50 rounded-lg cursor-pointer" onClick={() => toggleUser(u.id)}>
                      <Checkbox 
                        id={`pengguna-${u.id}`} 
                        checked={selectedIds.includes(u.id)} 
                        onCheckedChange={() => toggleUser(u.id)}
                      />
                      <label htmlFor={`pengguna-${u.id}`} className="flex-1 text-sm font-medium leading-none cursor-pointer flex flex-col gap-1">
                        <span>{u.name} <span className="font-normal text-zinc-500 text-xs">({u.memberCode || 'Umum'})</span></span>
                        <span className="text-xs font-normal text-zinc-500">{u.phone || 'Tidak ada no HP'}</span>
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Preview Table */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-emerald-900 font-semibold">Daftar Penerima Pesan</Label>
              <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">
                Total: {previewTargets.length} Orang
              </span>
            </div>
            <div className="border rounded-xl overflow-hidden bg-white max-h-60 overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 border-b text-zinc-500 font-medium sticky top-0">
                  <tr>
                    <th className="px-4 py-2">Nama</th>
                    <th className="px-4 py-2">No. WA</th>
                    <th className="px-4 py-2">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {loadingPreview ? (
                    <tr><td colSpan={3} className="text-center py-6 text-zinc-500"><Loader2 className="h-4 w-4 animate-spin mx-auto mb-2"/> Memuat daftar penerima...</td></tr>
                  ) : previewTargets.length === 0 ? (
                    <tr><td colSpan={3} className="text-center py-6 text-zinc-500">Tidak ada target yang cocok dengan filter saat ini.</td></tr>
                  ) : (
                    previewTargets.map((t, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/50">
                        <td className="px-4 py-2 font-medium">
                          {t.nama}
                          {t.nomorAnggota && <span className="ml-2 text-xs font-normal text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">{t.nomorAnggota}</span>}
                        </td>
                        <td className="px-4 py-2 text-zinc-500">{t.phone}</td>
                        <td className="px-4 py-2 text-zinc-500">
                          {t.nilai ? <span className="font-semibold text-emerald-700">{t.nilai}</span> : '-'}
                          {t.jatuh_tempo && <span className="block text-xs text-rose-600 mt-0.5">Jatuh Tempo: {t.jatuh_tempo}</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <Label className="text-emerald-900 font-semibold">Pesan / Template (Bisa diedit)</Label>
              <span className="text-xs font-medium text-emerald-600/80 bg-emerald-50 px-2 py-0.5 rounded-md">
                {getTemplatePlaceholder()}
              </span>
            </div>
            <Textarea 
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="resize-none"
            />
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-100">
              <MessageSquareWarning className="h-4 w-4 shrink-0 mt-0.5" />
              <p>Pastikan Anda memiliki koneksi WhatsApp yang aktif. Jika token Fonnte tidak diisi di .env, sistem hanya akan mensimulasikan pengiriman (Mock) di terminal server.</p>
            </div>
          </div>

          <Button 
            className="w-full bg-emerald-600 hover:bg-emerald-700" 
            onClick={handleSendBlast}
            disabled={loading || previewTargets.length === 0}
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            {loading ? 'Sedang Mengirim...' : 'Mulai Kirim Blast Sekarang'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
