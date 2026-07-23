'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react'

// =====================================================================
// Halaman Return dari Midtrans
// ---------------------------------------------------------------------
// Setelah user bayar (atau batal) di halaman Midtrans, user di-redirect
// balik ke halaman ini. Halaman ini akan:
//   1. Ambil orderNumber dari URL query
//   2. Poll /api/payment/status setiap 3 detik
//   3. Tampilkan status real-time (menunggu / dibayar / expired / gagal)
//   4. Kalau dibayar → tampilkan success + tombol "Lihat Pesanan"
//   5. Kalau expired/gagal → tampilkan tombol "Bayar Ulang"
//      (tombol ini akan redirect ke /api/payment/retry → dapat redirect URL baru
//       → redirect ke Midtrans lagi dengan token fresh)
// =====================================================================

interface OrderStatus {
  orderNumber: string
  paymentStatus: string
  dbPaymentStatus: string
  orderStatus: string
  isExpired: boolean
  secondsUntilExpiry: number
  total: number
  midtransPaymentType: string | null
  midtransVaNumber: string | null
  midtransIssuer: string | null
  midtransPdfUrl: string | null
  midtransTransactionId: string | null
  paidAt: string | null
  buyerName: string
}

export default function PaymentReturnPage() {
  const router = useRouter()
  const [status, setStatus] = useState<OrderStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)

  // Ambil orderNumber dari URL
  const [orderNumber, setOrderNumber] = useState<string>('')

  useEffect(() => {
    const url = new URL(window.location.href)
    const ord = url.searchParams.get('orderNumber') || ''
    const orderIdParam = url.searchParams.get('order_id') || ''
    const statusCode = url.searchParams.get('status_code') || ''
    const transactionStatus = url.searchParams.get('transaction_status') || ''
    void statusCode
    void transactionStatus

    // Coba ambil dari query param, kalau tidak ada cek sessionStorage
    let ord_ = ord
    if (!ord_ && orderIdParam) {
      // Midtrans mungkin kirim order_id (bukan orderNumber kita)
      // Coba extract dari format MID-TKO-YYYYMMDD-XXXX-XXX
      const match = orderIdParam.match(/MID-(TKO-\d{8}-\d{4})/)
      if (match) ord_ = match[1]
    }
    if (!ord_) {
      try {
        const cached = sessionStorage.getItem('pendingOrderData')
        if (cached) {
          const parsed = JSON.parse(cached) as { orderNumber: string }
          ord_ = parsed.orderNumber
        }
      } catch {}
    }
    setOrderNumber(ord_)
  }, [])

  // Poll status setiap 3 detik
  useEffect(() => {
    if (!orderNumber) return
    let cancelled = false

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/payment/status?orderId=${encodeURIComponent(orderNumber)}`
        )
        if (!res.ok) return
        const data: OrderStatus = await res.json()
        if (!cancelled) {
          setStatus(data)
          setLoading(false)
        }
      } catch {
        // silent
      }
    }

    poll()
    const interval = setInterval(poll, 3000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [orderNumber])

  // Bayar Ulang — panggil /api/payment/retry, dapat redirect URL baru
  const handleRetry = async () => {
    if (!orderNumber) return
    setRetrying(true)
    try {
      const res = await fetch('/api/payment/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Gagal membuat token pembayaran baru')
        return
      }
      // Redirect ke Midtrans dengan token baru
      window.location.href = data.redirectUrl
    } catch (e) {
      alert('Gagal membuat token pembayaran baru')
    } finally {
      setRetrying(false)
    }
  }

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(n)

  // Loading state
  if (loading || !status) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-emerald-50">
        <div className="text-center">
          <Loader2 className="mx-auto size-12 animate-spin text-emerald-600" />
          <p className="mt-4 text-sm text-emerald-900">
            Memuat status pembayaran...
          </p>
        </div>
      </div>
    )
  }

  const isPaid = status.paymentStatus === 'dibayar'
  const isExpired = status.isExpired || status.paymentStatus === 'expired'
  const isFailed = ['gagal', 'dibatalkan'].includes(status.paymentStatus)
  const isPending = status.paymentStatus === 'menunggu' && !isExpired

  return (
    <div className="min-h-screen bg-emerald-50 p-4">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-emerald-900">
            Status Pembayaran
          </h1>
          <p className="mt-1 text-sm text-emerald-700">
            Order: <span className="font-mono font-semibold">{status.orderNumber}</span>
          </p>
        </div>

        {/* Status Card */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          {/* Status Icon */}
          <div className="mb-4 flex justify-center">
            {isPaid ? (
              <div className="flex size-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="size-10 text-green-600" />
              </div>
            ) : isExpired ? (
              <div className="flex size-16 items-center justify-center rounded-full bg-red-100">
                <Clock className="size-10 text-red-600" />
              </div>
            ) : isFailed ? (
              <div className="flex size-16 items-center justify-center rounded-full bg-red-100">
                <XCircle className="size-10 text-red-600" />
              </div>
            ) : (
              <div className="flex size-16 items-center justify-center rounded-full bg-amber-100">
                <Loader2 className="size-10 animate-spin text-amber-600" />
              </div>
            )}
          </div>

          {/* Status Text */}
          <div className="mb-4 text-center">
            {isPaid ? (
              <>
                <h2 className="text-xl font-bold text-green-800">
                  ✓ Pembayaran Berhasil!
                </h2>
                <p className="mt-1 text-sm text-green-700">
                  Pembayaran Anda telah diterima. Status pesanan: <strong>Dibayar</strong>
                </p>
              </>
            ) : isExpired ? (
              <>
                <h2 className="text-xl font-bold text-red-800">
                  ⌛ Waktu Pembayaran Habis
                </h2>
                <p className="mt-1 text-sm text-red-700">
                  Transaksi telah expired. Klik "Bayar Ulang" untuk membuat transaksi baru.
                </p>
              </>
            ) : isFailed ? (
              <>
                <h2 className="text-xl font-bold text-red-800">
                  ✗ Pembayaran Gagal
                </h2>
                <p className="mt-1 text-sm text-red-700">
                  Pembayaran tidak berhasil. Silakan coba lagi.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-amber-800">
                  ⏳ Menunggu Pembayaran
                </h2>
                <p className="mt-1 text-sm text-amber-700">
                  Selesaikan pembayaran Anda. Status update otomatis setelah pembayaran sukses.
                </p>
                <p className="mt-2 text-xs text-amber-600">
                  Halaman ini akan auto-refresh setiap 3 detik
                </p>
              </>
            )}
          </div>

          {/* Order Info */}
          <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-emerald-700">Pembeli:</span>
              <span className="font-medium text-emerald-900">{status.buyerName}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-emerald-700">Total:</span>
              <span className="font-bold text-emerald-900">{formatRupiah(status.total)}</span>
            </div>
          </div>

          {/* Midtrans Details (kalau sudah bayar) */}
          {isPaid && status.midtransPaymentType && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-xs">
              <p className="mb-2 font-semibold text-emerald-900">📋 Detail Pembayaran:</p>
              <div className="space-y-1">
                <div>
                  <span className="text-emerald-700/60">Metode:</span>
                  <span className="ml-1 font-medium text-emerald-900">
                    {status.midtransPaymentType}
                    {status.midtransIssuer ? ` (${status.midtransIssuer})` : ''}
                  </span>
                </div>
                {status.midtransVaNumber && (
                  <div>
                    <span className="text-emerald-700/60">VA/Code:</span>
                    <span className="ml-1 font-mono font-medium text-emerald-900">
                      {status.midtransVaNumber}
                    </span>
                  </div>
                )}
                {status.midtransTransactionId && (
                  <div>
                    <span className="text-emerald-700/60">Transaction ID:</span>
                    <span className="ml-1 font-mono text-[10px] text-emerald-900">
                      {status.midtransTransactionId}
                    </span>
                  </div>
                )}
              </div>
              {status.midtransPdfUrl && (
                <a
                  href={status.midtransPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-semibold text-emerald-600 hover:underline"
                >
                  📄 Lihat PDF Instruksi Pembayaran
                </a>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {isPaid ? (
            <button
              onClick={() => router.push('/')}
              className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Kembali ke Beranda
            </button>
          ) : isExpired || isFailed ? (
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {retrying ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Menyiapkan pembayaran...
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" />
                  Bayar Ulang via Midtrans
                </>
              )}
            </button>
          ) : isPending ? (
            <div className="text-center text-xs text-amber-600">
              <Loader2 className="mx-auto mb-1 size-4 animate-spin" />
              Menunggu konfirmasi pembayaran dari Midtrans...
            </div>
          ) : null}

          {/* Back to home */}
          {!isPaid && (
            <button
              onClick={() => router.push('/')}
              className="mt-3 w-full rounded-lg border border-emerald-300 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              Kembali ke Beranda
            </button>
          )}
        </div>

        {/* Footer Info */}
        <p className="mt-4 text-center text-xs text-emerald-700/60">
          Status pembayaran di-update otomatis via Midtrans webhook.
          <br />
          Admin panel akan melihat perubahan status secara real-time.
        </p>
      </div>
    </div>
  )
}
