'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, X, CheckCircle2 } from 'lucide-react'
import { formatRupiah, formatNumber, formatDateTime, toNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { printStruk } from '@/lib/print-struk'

export interface StrukData {
  type: 'nabung' | 'sedekah' | 'simpanan' | 'pencairan_pinjaman' | 'angsuran' | 'penarikan_sukarela' | 'penarikan_bs' | 'teller_wizard'
  receiptNo: string
  tanggal: string
  nasabahName?: string
  nasabahCode?: string
  anggotaName?: string
  anggotaCode?: string
  teller?: string
  items?: { label: string; qty?: string; price?: string; subtotal?: string }[]
  summary?: { label: string; value: string; highlight?: boolean }[]
  notes?: string
  // For koperasi-specific
  jenisSimpanan?: string
  saldoSebelum?: string | number
  saldoSesudah?: string | number
  // For teller wizard
  steps?: { label: string; value: string }[]
}

const TYPE_LABELS: Record<string, { title: string; icon: string; color: string }> = {
  nabung: { title: 'STRUK NABUNG SAMPAH', icon: '♻', color: 'emerald' },
  sedekah: { title: 'STRUK SEDEKAH SAMPAH', icon: '🤲', color: 'teal' },
  simpanan: { title: 'STRUK SIMPANAN KOPERASI', icon: '🏦', color: 'blue' },
  pencairan_pinjaman: { title: 'STRUK PENCAIRAN PINJAMAN', icon: '💵', color: 'amber' },
  angsuran: { title: 'STRUK PEMBAYARAN ANGSURAN', icon: '✅', color: 'emerald' },
  penarikan_sukarela: { title: 'STRUK PENCAIRAN SIMPANAN SUKARELA', icon: '💰', color: 'orange' },
  penarikan_bs: { title: 'STRUK PENARIKAN SALDO BANK SAMPAH', icon: '💸', color: 'emerald' },
  teller_wizard: { title: 'KUITANSI TELLER WIZARD', icon: '🧾', color: 'emerald' },
}

export function StrukModal({ data, open, onOpenChange }: { data: StrukData | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  if (!data) return null
  const cfg = TYPE_LABELS[data.type] || TYPE_LABELS.nabung
  const personName = data.nasabahName || data.anggotaName || '-'
  const personCode = data.nasabahCode || data.anggotaCode || '-'

  const handlePrint = () => {
    const html = buildStrukHtmlFromData(data, cfg, personName, personCode)
    printStruk(html)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogTitle className="sr-only">Struk Transaksi {cfg.title}</DialogTitle>
        <div id="printable-struk" className="relative bg-white">
          {/* Header */}
          <div className="border-b-2 border-dashed border-zinc-300 bg-emerald-50 px-5 py-4 text-center">
            <div className="mb-1 text-2xl">{cfg.icon}</div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-900">Bank Sampah</h2>
            <p className="text-xs font-semibold text-emerald-700">Sukamaju Sejahtera</p>
            <p className="mt-0.5 text-[10px] text-emerald-600/70">Koperasi Simpan Pinjam Terintegrasi</p>
            <div className="mt-2 inline-block rounded-full bg-emerald-600 px-3 py-0.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white">{cfg.title}</p>
            </div>
          </div>

          {/* Info Section */}
          <div className="space-y-1.5 border-b-2 border-dashed border-zinc-300 px-5 py-4">
            <InfoRow label="No. Transaksi" value={data.receiptNo} mono />
            <InfoRow label="Tanggal" value={formatDateTime(data.tanggal)} />
            <InfoRow label={data.nasabahName ? 'Nasabah' : 'Anggota'} value={personName} bold />
            <InfoRow label="Kode" value={personCode} mono />
            {data.teller && <InfoRow label="Petugas" value={data.teller} />}
            {data.jenisSimpanan && <InfoRow label="Jenis Simpanan" value={data.jenisSimpanan} capitalize />}
          </div>

          {/* Items (for nabung/sedekah) */}
          {data.items && data.items.length > 0 && (
            <div className="border-b-2 border-dashed border-zinc-300 px-5 py-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Detail Item</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-[9px] uppercase text-zinc-400">
                    <th className="pb-1.5 font-semibold">Barang</th>
                    {data.items[0].qty !== undefined && <th className="pb-1.5 text-right font-semibold">Qty</th>}
                    {data.items[0].price !== undefined && <th className="pb-1.5 text-right font-semibold">Harga</th>}
                    <th className="pb-1.5 text-right font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((it, i) => (
                    <tr key={i} className="border-b border-dashed border-zinc-100 last:border-0">
                      <td className="py-1.5 text-zinc-700">{it.label}</td>
                      {it.qty !== undefined && <td className="py-1.5 text-right text-zinc-600">{it.qty}</td>}
                      {it.price !== undefined && <td className="py-1.5 text-right text-zinc-600">{it.price}</td>}
                      <td className="py-1.5 text-right font-medium text-zinc-900">{it.subtotal || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Teller Wizard steps */}
          {data.steps && data.steps.length > 0 && (
            <div className="border-b-2 border-dashed border-zinc-300 px-5 py-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Langkah Transaksi</p>
              <div className="space-y-2">
                {data.steps.map((s, i) => (
                  <div key={i} className="flex items-start justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-zinc-700">
                      <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                      <span>{s.label}</span>
                    </span>
                    <span className="text-right font-medium text-zinc-900">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {data.summary && data.summary.length > 0 && (
            <div className="border-b-2 border-dashed border-zinc-300 px-5 py-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Ringkasan</p>
              <div className="space-y-1.5">
                {data.summary.map((s, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex justify-between text-xs',
                      s.highlight && 'rounded-md bg-emerald-50 px-2 py-1.5 text-sm font-bold',
                    )}
                  >
                    <span className={s.highlight ? 'text-emerald-900' : 'text-zinc-500'}>{s.label}</span>
                    <span className={s.highlight ? 'text-emerald-700' : 'font-medium text-zinc-900'}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saldo info for koperasi */}
          {data.saldoSebelum !== undefined && data.saldoSesudah !== undefined && (
            <div className="border-b-2 border-dashed border-zinc-300 px-5 py-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Mutasi Saldo</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Saldo Sebelum</span>
                  <span className="font-medium text-zinc-900">{formatRupiah(toNumber(data.saldoSebelum))}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Saldo Sesudah</span>
                  <span className="font-bold text-emerald-700">{formatRupiah(toNumber(data.saldoSesudah))}</span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {data.notes && (
            <div className="border-b-2 border-dashed border-zinc-300 px-5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Catatan</p>
              <p className="mt-1 text-xs italic leading-relaxed text-zinc-600">{data.notes}</p>
            </div>
          )}

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
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 text-sm">
            <X className="mr-1.5 h-4 w-4" /> Tutup
          </Button>
          <Button onClick={handlePrint} className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700">
            <Printer className="mr-1.5 h-4 w-4" /> Cetak Struk
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Helper: Info Row — consistent label/value alignment
// ============================================================
function InfoRow({ label, value, mono, bold, capitalize }: { label: string; value: string; mono?: boolean; bold?: boolean; capitalize?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="shrink-0 text-zinc-500">{label}</span>
      <span
        className={cn(
          'text-right text-zinc-900',
          mono && 'font-mono',
          bold && 'font-bold',
          capitalize && 'capitalize',
          !bold && !mono && 'font-medium',
        )}
      >
        {value}
      </span>
    </div>
  )
}

// Hook to manage struk state
export function useStruk() {
  const [strukData, setStrukData] = useState<StrukData | null>(null)
  const [strukOpen, setStrukOpen] = useState(false)

  const showStruk = (data: StrukData) => {
    setStrukData(data)
    setStrukOpen(true)
  }

  return { strukData, strukOpen, setStrukOpen, showStruk }
}

// ============================================================
// Build HTML for print window from StrukData
// ============================================================
function buildStrukHtmlFromData(data: StrukData, cfg: { title: string; icon: string }, personName: string, personCode: string): string {
  const personLabel = data.nasabahName ? 'Nasabah' : 'Anggota'
  const extraInfo: { label: string; value: string }[] = []
  if (data.jenisSimpanan) extraInfo.push({ label: 'Jenis Simpanan', value: data.jenisSimpanan })

  let html = ''
  // Header
  html += `<div class="struk-header">
    <div class="icon">${cfg.icon}</div>
    <h2>Bank Sampah</h2>
    <div class="sub">Sukamaju Sejahtera</div>
    <div class="desc">Koperasi Simpan Pinjam Terintegrasi</div>
    <div class="badge">${cfg.title}</div>
  </div>`

  // Info Section
  html += `<div class="struk-section">
    <div class="info-row"><span class="key">No. Transaksi</span><span class="val mono">${data.receiptNo}</span></div>
    <div class="info-row"><span class="key">Tanggal</span><span class="val">${formatDateTime(data.tanggal)}</span></div>
    <div class="info-row"><span class="key">${personLabel}</span><span class="val bold">${personName}</span></div>
    <div class="info-row"><span class="key">Kode</span><span class="val mono">${personCode}</span></div>`
  if (data.teller) {
    html += `<div class="info-row"><span class="key">Petugas</span><span class="val">${data.teller}</span></div>`
  }
  for (const e of extraInfo) {
    html += `<div class="info-row"><span class="key">${e.label}</span><span class="val">${e.value}</span></div>`
  }
  html += `</div>`

  // Items Table
  if (data.items && data.items.length > 0) {
    const hasQty = data.items[0].qty !== undefined
    const hasPrice = data.items[0].price !== undefined
    html += `<div class="struk-section">
      <div class="label">Detail Item</div>
      <table class="items-table">
        <thead><tr>
          <th>Barang</th>
          ${hasQty ? '<th class="center">Qty</th>' : ''}
          ${hasPrice ? '<th class="right">Harga</th>' : ''}
          <th class="right">Subtotal</th>
        </tr></thead>
        <tbody>`
    for (const it of data.items) {
      html += `<tr>
        <td>${it.label}</td>
        ${hasQty ? `<td class="center">${it.qty || '-'}</td>` : ''}
        ${hasPrice ? `<td class="right">${it.price || '-'}</td>` : ''}
        <td class="right">${it.subtotal || '-'}</td>
      </tr>`
    }
    html += `</tbody></table></div>`
  }

  // Summary
  if (data.summary && data.summary.length > 0) {
    html += `<div class="struk-section">
      <div class="label">Ringkasan</div>`
    for (const s of data.summary) {
      if (s.highlight) {
        html += `<div class="summary-row highlight"><span class="key">${s.label}</span><span class="val">${s.value}</span></div>`
      } else {
        html += `<div class="summary-row"><span class="key">${s.label}</span><span class="val">${s.value}</span></div>`
      }
    }
    html += `</div>`
  }

  // Saldo Info (Mutasi Saldo)
  if (data.saldoSebelum !== undefined && data.saldoSesudah !== undefined) {
    html += `<div class="struk-section">
      <div class="label">Mutasi Saldo</div>
      <div class="summary-row"><span class="key">Saldo Sebelum</span><span class="val">${formatRupiah(toNumber(data.saldoSebelum))}</span></div>
      <div class="summary-row"><span class="key">Saldo Sesudah</span><span class="val" style="font-weight:700;color:#047857">${formatRupiah(toNumber(data.saldoSesudah))}</span></div>
    </div>`
  }

  // Steps
  if (data.steps && data.steps.length > 0) {
    html += `<div class="struk-section">
      <div class="label">Langkah Transaksi</div>
      <div class="steps-list">`
    for (const s of data.steps) {
      html += `<div class="step"><span class="check">✓</span><span>${s.label}</span><span style="margin-left:auto;font-weight:500">${s.value}</span></div>`
    }
    html += `</div></div>`
  }

  // Notes
  if (data.notes) {
    html += `<div class="struk-section">
      <div class="label">Catatan</div>
      <div class="notes">${data.notes}</div>
    </div>`
  }

  // Footer
  html += `<div class="struk-footer">
    <div class="thanks">Terima kasih telah berkontribusi</div>
    <div class="sub-thanks">menjaga lingkungan & membangun ekonomi komunitas</div>
    <div class="signature-area">
      <div class="sig"><div class="line"></div><div class="label">Nasabah</div></div>
      <div class="sig"><div class="line"></div><div class="label">Petugas</div></div>
    </div>
  </div>`

  return html
}

export default StrukModal
