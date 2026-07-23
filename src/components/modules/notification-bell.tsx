'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bell, BellRing, CalendarClock, Scale, HeartHandshake, PiggyBank,
  HandCoins, CreditCard, ShoppingBag, PackageCheck, Truck, XCircle,
  AlertTriangle, CheckCircle2, Loader2, RefreshCw, Store, FileText,
  CheckCheck, CircleDot, X,
} from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { api } from '@/lib/api'
import { formatRupiah, formatDateTime, formatDate, toNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

// ============================================================
// Types
// ============================================================
type TxNotif = {
  id: string
  category: 'bank_sampah' | 'koperasi' | 'penjualan_produk'
  type: string
  title: string
  message: string
  amount: number
  timestamp: string
  status?: string
}

type ReminderNotif = {
  id: string
  category: 'reminder'
  type: 'angsuran_due' | 'simpanan_wajib_due'
  title: string
  message: string
  amount: number
  timestamp: string
  dueDate: string
  daysUntilDue: number
  severity: 'warning' | 'danger'
}

type NotifData = {
  transactions: TxNotif[]
  reminders: ReminderNotif[]
  unreadCount: {
    transactions: number
    reminders: number
    total: number
  }
}

// ============================================================
// localStorage read-status tracking (per user)
// ============================================================
function getReadIds(userId: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(`notif-read-${userId}`)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(arr)
  } catch {
    return new Set()
  }
}

function saveReadIds(userId: string, ids: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`notif-read-${userId}`, JSON.stringify([...ids]))
  } catch {
    // ignore
  }
}

// ============================================================
// Icon helper — pick icon based on notification type
// ============================================================
function getTxIcon(notif: TxNotif) {
  const { category, type } = notif
  if (category === 'bank_sampah') {
    if (type === 'nabung') return { Icon: Scale, color: 'text-emerald-600', bg: 'bg-emerald-50' }
    if (type === 'sedekah') return { Icon: HeartHandshake, color: 'text-rose-600', bg: 'bg-rose-50' }
  }
  if (category === 'koperasi') {
    if (type.startsWith('simpanan')) return { Icon: PiggyBank, color: 'text-teal-600', bg: 'bg-teal-50' }
    if (type === 'pinjaman_pengajuan') return { Icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' }
    if (type === 'pinjaman_cair') return { Icon: HandCoins, color: 'text-blue-600', bg: 'bg-blue-50' }
    if (type === 'angsuran_bayar') return { Icon: CreditCard, color: 'text-indigo-600', bg: 'bg-indigo-50' }
  }
  if (category === 'penjualan_produk') {
    if (type === 'pos_sale') return { Icon: Store, color: 'text-purple-600', bg: 'bg-purple-50' }
    if (type === 'toko_diterima') return { Icon: PackageCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' }
    if (type === 'toko_dikirim') return { Icon: Truck, color: 'text-amber-600', bg: 'bg-amber-50' }
    if (type === 'toko_dibatalkan') return { Icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' }
    return { Icon: ShoppingBag, color: 'text-cyan-600', bg: 'bg-cyan-50' }
  }
  return { Icon: Bell, color: 'text-zinc-600', bg: 'bg-zinc-100' }
}

function getReminderIcon(notif: ReminderNotif) {
  const isOverdue = notif.severity === 'danger'
  if (notif.type === 'angsuran_due') return { Icon: CreditCard, color: isOverdue ? 'text-red-600' : 'text-amber-600', bg: isOverdue ? 'bg-red-50' : 'bg-amber-50' }
  return { Icon: CalendarClock, color: isOverdue ? 'text-red-600' : 'text-amber-600', bg: isOverdue ? 'bg-red-50' : 'bg-amber-50' }
}

// ============================================================
// Category label
// ============================================================
function categoryLabel(category: string): string {
  switch (category) {
    case 'bank_sampah': return 'Bank Sampah'
    case 'koperasi': return 'Koperasi'
    case 'penjualan_produk': return 'Penjualan Produk'
    case 'reminder': return 'Pengingat'
    default: return category
  }
}

// ============================================================
// Type label (human-readable transaction type)
// ============================================================
function typeLabel(type: string): string {
  const map: Record<string, string> = {
    nabung: 'Tabungan Sampah',
    sedekah: 'Sedekah Sampah',
    simpanan_pokok: 'Simpanan Pokok',
    simpanan_wajib: 'Simpanan Wajib',
    simpanan_sukarela: 'Simpanan Sukarela',
    pinjaman_pengajuan: 'Pengajuan Pinjaman',
    pinjaman_cair: 'Pencairan Pinjaman',
    angsuran_bayar: 'Pembayaran Angsuran',
    pos_sale: 'Pembelian Offline (POS)',
    toko_menunggu_pembayaran: 'Pesanan Menunggu Pembayaran',
    toko_dibayar: 'Pembayaran Pesanan Dikonfirmasi',
    toko_diproses: 'Pesanan Diproses',
    toko_dikirim: 'Pesanan Dikirim',
    toko_diterima: 'Pesanan Diterima',
    toko_dibatalkan: 'Pesanan Dibatalkan',
    angsuran_due: 'Pengingat Angsuran',
    simpanan_wajib_due: 'Pengingat Simpanan Wajib',
  }
  return map[type] || type
}

// ============================================================
// Notification Item (clickable)
// ============================================================
function NotifItem({ notif, isUnread, onClick }: { notif: TxNotif | ReminderNotif; isUnread: boolean; onClick: () => void }) {
  const isReminder = notif.category === 'reminder'
  const { Icon, color, bg } = isReminder
    ? getReminderIcon(notif as ReminderNotif)
    : getTxIcon(notif as TxNotif)
  const isOverdue = isReminder && (notif as ReminderNotif).severity === 'danger'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full gap-3 rounded-lg p-3 text-left transition-colors hover:bg-zinc-50',
        isOverdue && 'bg-red-50/50 hover:bg-red-50',
        isUnread && !isOverdue && 'bg-blue-50/40 hover:bg-blue-50',
      )}
    >
      <div className="relative shrink-0">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', bg)}>
          <Icon className={cn('h-4 w-4', color)} />
        </div>
        {isUnread && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-blue-500 ring-2 ring-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm leading-tight', isUnread ? 'font-bold text-zinc-900' : 'font-semibold text-zinc-800')}>{notif.title}</p>
          <span className="text-[10px] text-zinc-400 whitespace-nowrap shrink-0">
            {formatDateTime(notif.timestamp)}
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-600 leading-relaxed line-clamp-2">{notif.message}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-[9px] font-medium uppercase tracking-wide text-zinc-600">
            {categoryLabel(notif.category)}
          </Badge>
          {notif.amount > 0 && (
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[9px] font-semibold text-emerald-700">
              {formatRupiah(notif.amount)}
            </Badge>
          )}
          {isReminder && (
            <Badge
              variant="outline"
              className={cn(
                'text-[9px] font-semibold',
                isOverdue
                  ? 'border-red-200 bg-red-100 text-red-700'
                  : 'border-amber-200 bg-amber-100 text-amber-700',
              )}
            >
              {isOverdue ? 'Lewat Jatuh Tempo' : 'H-7 Jatuh Tempo'}
            </Badge>
          )}
          {!isReminder && (notif as TxNotif).status && (
            <Badge
              variant="outline"
              className={cn(
                'text-[9px] font-medium capitalize',
                ['paid', 'completed', 'lunas', 'lolos qc', 'dibayar', 'diterima'].includes((notif as TxNotif).status!.toLowerCase())
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : ['pending', 'menunggu', 'menunggu_pembayaran', 'diajukan'].includes((notif as TxNotif).status!.toLowerCase())
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-600',
              )}
            >
              {(notif as TxNotif).status}
            </Badge>
          )}
        </div>
      </div>
    </button>
  )
}

// ============================================================
// Notification Detail Dialog
// ============================================================
function NotifDetailDialog({ notif, onClose }: { notif: TxNotif | ReminderNotif | null; onClose: () => void }) {
  if (!notif) return null
  const isReminder = notif.category === 'reminder'
  const { Icon, color, bg } = isReminder
    ? getReminderIcon(notif as ReminderNotif)
    : getTxIcon(notif as TxNotif)
  const reminder = isReminder ? (notif as ReminderNotif) : null
  const tx = !isReminder ? (notif as TxNotif) : null

  return (
    <Dialog open={!!notif} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-900">
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', bg)}>
              <Icon className={cn('h-4 w-4', color)} />
            </div>
            Detail Notifikasi
          </DialogTitle>
          <DialogDescription className="sr-only">Detail informasi notifikasi</DialogDescription>
        </DialogHeader>

        {/* Title & timestamp */}
        <div className="space-y-1">
          <h3 className="text-base font-bold text-zinc-900">{notif.title}</h3>
          <p className="text-xs text-zinc-500">{formatDateTime(notif.timestamp)}</p>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
            {categoryLabel(notif.category)}
          </Badge>
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-[10px] font-medium text-blue-700">
            {typeLabel(notif.type)}
          </Badge>
          {reminder && (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] font-semibold',
                reminder.severity === 'danger'
                  ? 'border-red-200 bg-red-100 text-red-700'
                  : 'border-amber-200 bg-amber-100 text-amber-700',
              )}
            >
              {reminder.severity === 'danger' ? 'Lewat Jatuh Tempo' : 'H-7 Jatuh Tempo'}
            </Badge>
          )}
          {tx?.status && (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] font-medium capitalize',
                ['paid', 'completed', 'lunas', 'lolos qc', 'dibayar', 'diterima'].includes(tx.status.toLowerCase())
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : ['pending', 'menunggu', 'menunggu_pembayaran', 'diajukan'].includes(tx.status.toLowerCase())
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-600',
              )}
            >
              {tx.status}
            </Badge>
          )}
        </div>

        <Separator />

        {/* Message */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Pesan</p>
          <p className="text-sm leading-relaxed text-zinc-700">{notif.message}</p>
        </div>

        {/* Detail grid */}
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
          {notif.amount > 0 && (
            <div>
              <p className="text-[10px] text-zinc-500">Jumlah</p>
              <p className="text-sm font-bold text-emerald-700">{formatRupiah(notif.amount)}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] text-zinc-500">Waktu</p>
            <p className="text-xs font-semibold text-zinc-900">{formatDateTime(notif.timestamp)}</p>
          </div>
          {reminder && (
            <>
              <div>
                <p className="text-[10px] text-zinc-500">Jatuh Tempo</p>
                <p className="text-xs font-semibold text-zinc-900">{formatDate(reminder.dueDate)}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500">Status Waktu</p>
                <p className={cn('text-xs font-semibold', reminder.daysUntilDue < 0 ? 'text-red-600' : 'text-amber-600')}>
                  {reminder.daysUntilDue < 0
                    ? `${Math.abs(reminder.daysUntilDue)} hari lewat`
                    : reminder.daysUntilDue === 0
                      ? 'Hari ini'
                      : `${reminder.daysUntilDue} hari lagi`}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Action hint */}
        {reminder && (
          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            <AlertTriangle className="mr-1 inline h-3 w-3" />
            Pembayaran dilakukan melalui admin/teller. Hubungi admin untuk pembayaran.
          </div>
        )}
        {tx && (tx.type === 'toko_menunggu_pembayaran' || tx.type === 'toko_dibayar' || tx.type === 'toko_diproses' || tx.type === 'toko_dikirim') && (
          <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
            <CheckCircle2 className="mr-1 inline h-3 w-3" />
            Lacak status pesanan Anda di menu "Lacak Pesanan" pada halaman utama.
          </div>
        )}

        <Button onClick={onClose} className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
          Tutup
        </Button>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Main NotificationBell component
// ============================================================
export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<NotifData | null>(null)
  const [tab, setTab] = useState<'all' | 'reminder'>('all')
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [selectedNotif, setSelectedNotif] = useState<TxNotif | ReminderNotif | null>(null)
  const reqId = useRef(0)

  // Load read IDs from localStorage on mount
  useEffect(() => {
    setReadIds(getReadIds(userId))
  }, [userId])

  const load = useCallback(() => {
    if (!userId) return
    const myId = ++reqId.current
    setLoading(true)
    api.notifications(userId)
      .then((res) => {
        if (myId === reqId.current) {
          setData(res)
          setLoading(false)
        }
      })
      .catch(() => {
        if (myId === reqId.current) {
          setLoading(false)
        }
      })
  }, [userId])

  // Initial load + refresh every 60 seconds
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const myId = ++reqId.current

    const fetchNotifs = () => {
      setLoading(true)
      api.notifications(userId)
        .then((res) => {
          if (!cancelled && myId === reqId.current) {
            setData(res)
            setLoading(false)
          }
        })
        .catch(() => {
          if (!cancelled && myId === reqId.current) {
            setLoading(false)
          }
        })
    }

    fetchNotifs()
    const interval = setInterval(fetchNotifs, 60000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [userId])

  // Compute all notifications + unread count (based on localStorage read IDs)
  const allNotifs: (TxNotif | ReminderNotif)[] = data
    ? [...data.reminders, ...data.transactions]
    : []

  const unreadNotifIds = allNotifs.filter((n) => !readIds.has(n.id)).map((n) => n.id)
  const unreadCount = unreadNotifIds.length
  const unreadReminders = data ? data.reminders.filter((n) => !readIds.has(n.id)).length : 0
  const hasUnread = unreadCount > 0

  // Mark a single notification as read
  const markAsRead = useCallback((notifId: string) => {
    setReadIds((prev) => {
      if (prev.has(notifId)) return prev
      const next = new Set(prev)
      next.add(notifId)
      saveReadIds(userId, next)
      return next
    })
  }, [userId])

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev)
      for (const n of allNotifs) {
        next.add(n.id)
      }
      saveReadIds(userId, next)
      return next
    })
  }, [userId, allNotifs])

  // Handle clicking a notification — mark as read + open detail dialog
  const handleClickNotif = useCallback((notif: TxNotif | ReminderNotif) => {
    markAsRead(notif.id)
    setSelectedNotif(notif)
  }, [markAsRead])

  return (
    <>
      <Popover open={open} onOpenChange={(o) => {
        setOpen(o)
        if (o) load() // refresh on open
      }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Notifikasi"
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            {unreadReminders > 0 ? (
              <BellRing className="h-5 w-5" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
            {hasUnread && (
              <span
                className={cn(
                  'absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white',
                  unreadReminders > 0 ? 'bg-red-500' : 'bg-blue-500',
                )}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-[min(92vw,420px)] p-0"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-zinc-900">Notifikasi</h3>
              {hasUnread && (
                <Badge className={cn(
                  'text-[9px] font-bold',
                  unreadReminders > 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700',
                )}>
                  {unreadCount} belum dibaca
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {hasUnread && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-[10px] font-medium text-emerald-700 hover:bg-emerald-50"
                  onClick={markAllAsRead}
                  title="Tandai semua sudah dibaca"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Tandai semua dibaca</span>
                  <span className="sm:hidden">Tandai semua</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-zinc-500 hover:bg-zinc-100"
                onClick={load}
                disabled={loading}
                aria-label="Muat ulang"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          {/* Tabs: All / Pengingat */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | 'reminder')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-zinc-100 bg-transparent p-0">
              <TabsTrigger
                value="all"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-emerald-700"
              >
                Semua {hasUnread && <span className="ml-1 text-[9px] font-bold text-blue-600">({unreadCount})</span>}
              </TabsTrigger>
              <TabsTrigger
                value="reminder"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-500 data-[state=active]:bg-transparent data-[state=active]:text-red-700"
              >
                Pengingat {unreadReminders > 0 && <span className="ml-1 text-[9px] font-bold text-red-600">({unreadReminders})</span>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="m-0">
              <ScrollArea className="h-[min(60vh,420px)]">
                {loading ? (
                  <div className="space-y-2 p-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex gap-3 p-2">
                        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3 w-3/4" />
                          <Skeleton className="h-2.5 w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : allNotifs.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="divide-y divide-zinc-50 p-1">
                    {allNotifs.map((n) => (
                      <NotifItem
                        key={n.id}
                        notif={n}
                        isUnread={!readIds.has(n.id)}
                        onClick={() => handleClickNotif(n)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="reminder" className="m-0">
              <ScrollArea className="h-[min(60vh,420px)]">
                {loading ? (
                  <div className="space-y-2 p-3">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="flex gap-3 p-2">
                        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3 w-3/4" />
                          <Skeleton className="h-2.5 w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (data?.reminders || []).length === 0 ? (
                  <EmptyState
                    title="Tidak ada pengingat"
                    message="Tidak ada angsuran atau simpanan wajib yang jatuh tempo dalam 7 hari ke depan."
                  />
                ) : (
                  <div className="divide-y divide-zinc-50 p-1">
                    {data?.reminders.map((n) => (
                      <NotifItem
                        key={n.id}
                        notif={n}
                        isUnread={!readIds.has(n.id)}
                        onClick={() => handleClickNotif(n)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Footer hint */}
          <div className="border-t border-zinc-100 px-4 py-2 text-center">
            <p className="text-[10px] text-zinc-400">
              <CalendarClock className="mr-1 inline h-3 w-3" />
              Klik notifikasi untuk melihat detail · Pengingat muncul H-7 sebelum jatuh tempo
            </p>
          </div>
        </PopoverContent>
      </Popover>

      {/* Detail Dialog */}
      <NotifDetailDialog notif={selectedNotif} onClose={() => setSelectedNotif(null)} />
    </>
  )
}

// ============================================================
// Empty state
// ============================================================
function EmptyState({ title = 'Tidak ada notifikasi', message = 'Riwayat transaksi dan pengingat akan muncul di sini.' }: { title?: string; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
        <CheckCircle2 className="h-6 w-6 text-zinc-400" />
      </div>
      <p className="text-sm font-semibold text-zinc-700">{title}</p>
      <p className="mt-1 text-xs text-zinc-500">{message}</p>
    </div>
  )
}
