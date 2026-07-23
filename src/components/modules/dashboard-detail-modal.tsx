'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Filter, RotateCcw, MousePointerClick } from 'lucide-react'
import { getActingUserHeader } from '@/lib/api'
import { formatRupiah, formatNumber, toNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface DetailColumn {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
  format?: (value: any, row: any) => string
}

export interface DetailExtraFilter {
  key: string
  label: string
  options: { value: string; label: string }[]
  // Optional: extra query params to always include when this filter value is selected
  // (e.g. { qcStatus: 'pending' } when value='menunggu')
  paramMap?: Record<string, Record<string, string>>
}

export interface DashboardDetailModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  apiPath: string // e.g. '/operasional/nabung' (without /api prefix)
  columns: DetailColumn[]
  sumField?: string
  sumLabel?: string
  // Format the sum value as 'currency' | 'number' | 'qty'
  sumFormat?: 'currency' | 'number' | 'qty'
  extraFilters?: DetailExtraFilter[]
  // Which field to extract rows from in the response.
  // If not provided, the response is assumed to be an array.
  responsePath?: string
  // Pre-applied query params (always sent). e.g. { channel: 'offline' }
  baseParams?: Record<string, string>
  // Optional initial date range (yyyy-mm-dd)
  initialDari?: string
  initialSampai?: string
  dateFieldLabel?: string
}

function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj)
}

function formatSum(value: number, fmt?: 'currency' | 'number' | 'qty'): string {
  if (fmt === 'number') return formatNumber(value, 0)
  if (fmt === 'qty') return formatNumber(value, 2)
  return formatRupiah(value)
}

export function DashboardDetailModal({
  open,
  onClose,
  title,
  description,
  apiPath,
  columns,
  sumField,
  sumLabel,
  sumFormat = 'currency',
  extraFilters = [],
  responsePath,
  baseParams = {},
  initialDari = '',
  initialSampai = '',
  dateFieldLabel = 'Tanggal Transaksi',
}: DashboardDetailModalProps) {
  // Pending filter state
  const [dariInput, setDariInput] = useState(initialDari)
  const [sampaiInput, setSampaiInput] = useState(initialSampai)
  const [qInput, setQInput] = useState('')
  const [extraInput, setExtraInput] = useState<Record<string, string>>({})
  // Committed filter state (only changes when "Terapkan" clicked)
  const [dari, setDari] = useState(initialDari)
  const [sampai, setSampai] = useState(initialSampai)
  const [q, setQ] = useState('')
  const [extra, setExtra] = useState<Record<string, string>>({})

  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchIdRef = useRef(0)
  // Serialize object deps to prevent unnecessary useCallback re-creation
  const baseParamsKey = JSON.stringify(baseParams)
  const extraFiltersKey = JSON.stringify(extraFilters)

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setDariInput(initialDari); setSampaiInput(initialSampai)
      setQInput(''); setExtraInput({})
      setDari(initialDari); setSampai(initialSampai)
      setQ(''); setExtra({})
    }
  }, [open, initialDari, initialSampai])

  const load = useCallback(async () => {
    const myId = ++fetchIdRef.current
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams()
      // base params
      for (const [k, v] of Object.entries(baseParams)) params.set(k, v)
      // committed filters
      if (dari) params.set('dari', dari)
      if (sampai) params.set('sampai', sampai)
      if (q) params.set('q', q)
      // extra filters — may map to multiple params via paramMap
      for (const ef of extraFilters) {
        const val = extra[ef.key]
        if (val && val !== 'all') {
          if (ef.paramMap && ef.paramMap[val]) {
            for (const [k, v] of Object.entries(ef.paramMap[val])) params.set(k, v)
          } else {
            params.set(ef.key, val)
          }
        }
      }
      const qs = params.toString()
      const pathWithQs = `${apiPath}${qs ? '?' + qs : ''}`
      const actingUser = getActingUserHeader()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (actingUser) headers['x-acting-user'] = actingUser
      const sep = pathWithQs.includes('?') ? '&' : '?'
      const url = actingUser ? `/api${pathWithQs}${sep}actingUser=${actingUser}` : `/api${pathWithQs}`
      const res = await fetch(url, { headers })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const json = await res.json()
      // Stale fetch guard: ignore if a newer fetch was triggered
      if (myId !== fetchIdRef.current) return
      const extracted = responsePath ? (getNestedValue(json, responsePath) || []) : (Array.isArray(json) ? json : (json.list || json.orders || []))
      setError(null)
      setRows(extracted)
      setLoading(false)
    } catch (e: any) {
      if (myId !== fetchIdRef.current) return
      setError(e.message || 'Gagal memuat data')
      setRows([])
      setLoading(false)
    }
  }, [apiPath, baseParamsKey, extraFiltersKey, JSON.stringify(extra), dari, sampai, q, responsePath])

  useEffect(() => {
    if (open) {
      setLoading(true)
      setError(null)
      load()
    }
  }, [open, load])

  const applyFilters = () => {
    setDari(dariInput); setSampai(sampaiInput); setQ(qInput); setExtra(extraInput)
  }
  const resetFilters = () => {
    setDariInput(''); setSampaiInput(''); setQInput(''); setExtraInput({})
    setDari(''); setSampai(''); setQ(''); setExtra({})
  }

  const total = sumField ? rows.reduce((s, r) => s + toNumber(getNestedValue(r, sumField)), 0) : 0
  const hasActiveFilters = !!(dari || sampai || q || Object.values(extra).some((v) => v && v !== 'all'))

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-zinc-900">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {/* ===== FILTER BAR ===== */}
        <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Dari</label>
              <Input type="date" value={dariInput} onChange={(e) => setDariInput(e.target.value)} className="h-9 w-40 border-zinc-200 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Sampai</label>
              <Input type="date" value={sampaiInput} onChange={(e) => setSampaiInput(e.target.value)} className="h-9 w-40 border-zinc-200 text-sm" />
            </div>
            {extraFilters.map((ef) => (
              <div key={ef.key} className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{ef.label}</label>
                <Select
                  value={extraInput[ef.key] || 'all'}
                  onValueChange={(v) => setExtraInput((s) => ({ ...s, [ef.key]: v }))}
                >
                  <SelectTrigger className="h-9 w-40 border-zinc-200 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ef.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="relative flex-1 min-w-[200px]">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Cari</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyFilters() }}
                  placeholder="Cari..."
                  className="h-9 border-zinc-200 pl-9 text-sm"
                />
              </div>
            </div>
            <Button onClick={applyFilters} className="h-9 bg-emerald-600 text-white hover:bg-emerald-700">
              <Filter className="mr-1.5 h-4 w-4" /> Terapkan
            </Button>
            <Button onClick={resetFilters} variant="outline" className="h-9 border-zinc-200 text-sm text-zinc-600">
              <RotateCcw className="mr-1.5 h-4 w-4" /> Reset
            </Button>
          </div>
          {hasActiveFilters && (
            <p className="mt-2 text-[11px] font-medium text-emerald-700">Filter aktif · klik Terapkan ulang setelah mengubah input</p>
          )}
        </div>

        {/* ===== SUMMARY ROW ===== */}
        {sumField && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Total Transaksi</p>
              <p className="mt-1 text-xl font-bold text-zinc-900">{formatNumber(rows.length, 0)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50/60 p-4 ring-1 ring-emerald-100 sm:col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">{sumLabel || 'Total'}</p>
              <p className="mt-1 text-xl font-bold text-emerald-700">{formatSum(total, sumFormat)}</p>
            </div>
          </div>
        )}

        {/* ===== TABLE ===== */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
          </div>
        ) : error ? (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-100">{error}</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
              <Search className="h-6 w-6 text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-500">Belum ada data.</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-auto rounded-xl border border-zinc-100">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-zinc-50">
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className={cn(
                        'whitespace-nowrap border-b border-zinc-100 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500',
                        c.align === 'right' && 'text-right',
                        c.align === 'center' && 'text-center',
                        !c.align && 'text-left',
                      )}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {rows.map((r, i) => (
                  <tr key={r.id || i} className="hover:bg-zinc-50/50">
                    {columns.map((c) => {
                      const raw = getNestedValue(r, c.key)
                      const formatted = c.format ? c.format(raw, r) : (raw == null ? '-' : String(raw))
                      return (
                        <td
                          key={c.key}
                          className={cn(
                            'whitespace-nowrap px-3 py-2.5 text-xs text-zinc-600',
                            c.align === 'right' && 'text-right',
                            c.align === 'center' && 'text-center',
                          )}
                        >
                          {formatted}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ===== FOOTER HINT ===== */}
        {!loading && rows.length > 0 && (
          <p className="text-center text-[11px] text-zinc-400">Menampilkan {rows.length} transaksi · {dateFieldLabel}</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Helper: render a small "Klik untuk detail" hint badge for use inside cards.
export function ClickHintBadge({ label = 'Klik untuk detail' }: { label?: string }) {
  return (
    <Badge variant="outline" className="border-emerald-200 bg-emerald-50/50 text-[9px] font-medium text-emerald-700">
      <MousePointerClick className="mr-1 h-3 w-3" /> {label}
    </Badge>
  )
}
