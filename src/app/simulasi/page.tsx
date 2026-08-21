'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, CreditCard, Truck, CheckCircle2, AlertCircle, Copy } from 'lucide-react'

// =====================================================================
// Halaman Simulasi Checkout — /simulasi
// ---------------------------------------------------------------------
// End-to-end test page for the Midtrans + RajaOngkir integration.
// User can:
//   1. Choose destination city (Bandung / Jakarta / Surabaya / dll)
//   2. Set subtotal (default Rp 100.000) and weight (default 1000g)
//   3. Hit "Hitung Ongkir" → shows real RajaOngkir courier options
//   4. Hit "Buat Order & Snap Token" → creates TokoOrder + Midtrans Snap
//   5. Click "Bayar dengan Snap" → opens Snap popup with all methods
//   6. After Snap closes, simulate settlement via "Simulate Webhook" button
//   7. See final order status in DB
// =====================================================================

interface CourierOption {
  serviceDisplay: string
  cost: number
  etd: string
}

interface ShippingResponse {
  source: 'rajaongkir' | 'fallback'
  cheapestCost: number
  options: CourierOption[]
  message?: string
}

interface PaymentCreateResponse {
  orderId: string
  midtransOrderId: string
  snapToken: string
  redirectUrl?: string
  grossAmount: number
  breakdown: {
    subtotal: number
    ongkir: number
    ongkirSource: string
    grandTotal: number
  }
}

interface OrderStatus {
  orderNumber: string
  paymentStatus: string
  orderStatus: string
  midtransTransactionId: string | null
  midtransPaymentType: string | null
  midtransVaNumber: string | null
  midtransIssuer: string | null
  midtransPdfUrl: string | null
  paidAt: string | null
  midtransSettlementTime: string | null
  midtransLastWebhookAt: string | null
}

const CITIES: Array<{ id: string; name: string; districtId: string; districtName: string }> = [
  { id: '32.73', name: 'Bandung', districtId: '32.73.01', districtName: 'Bandung Wetan' },
  { id: '31.71', name: 'Jakarta Pusat', districtId: '31.71.01', districtName: 'Gambir' },
  { id: '35.78', name: 'Surabaya', districtId: '35.78.01', districtName: 'Tegalsari' },
  { id: '33.74', name: 'Semarang', districtId: '33.74.01', districtName: 'Semarang Tengah' },
  { id: '34.71', name: 'Yogyakarta', districtId: '34.71.01', districtName: 'Gondokusuman' },
  { id: '51.71', name: 'Denpasar', districtId: '51.71.01', districtName: 'Denpasar Selatan' },
]

export default function SimulasiPage() {
  // Form state
  const [subtotal, setSubtotal] = useState<number>(100000)
  const [weightGram, setWeightGram] = useState<number>(1000)
  const [selectedCity, setSelectedCity] = useState<typeof CITIES[number]>(CITIES[0])

  // API response state
  const [shipping, setShipping] = useState<ShippingResponse | null>(null)
  const [loadingShipping, setLoadingShipping] = useState(false)
  const [payment, setPayment] = useState<PaymentCreateResponse | null>(null)
  const [loadingPayment, setLoadingPayment] = useState(false)
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)

  // Midtrans config
  const [snapJsUrl, setSnapJsUrl] = useState<string>('')
  const [environment, setEnvironment] = useState<string>('')

  // Logs (local)
  const [logs, setLogs] = useState<string[]>([])
  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString('id-ID')
    setLogs((prev) => [...prev, `[${ts}] ${msg}`])
  }, [])

  useEffect(() => {
    addLog('Halaman simulasi dimuat')
    fetch('/api/payment/config')
      .then((r) => r.json())
      .then((cfg: { snapJsUrl: string; environment: string }) => {
        setSnapJsUrl(cfg.snapJsUrl)
        setEnvironment(cfg.environment)
        addLog(`Midtrans environment: ${cfg.environment}`)
      })
      .catch(() => addLog('Gagal fetch /api/payment/config'))
  }, [addLog])

  // 1) Hitung ongkir via RajaOngkir
  const handleCalculateShipping = async () => {
    setLoadingShipping(true)
    setShipping(null)
    addLog(`Menghitung ongkir → ${selectedCity.name}, ${weightGram}g`)
    try {
      const res = await fetch('/api/shipping/cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          districtId: selectedCity.districtId,
          districtName: selectedCity.districtName,
          cityName: selectedCity.name,
          weightGram,
        }),
      })
      const data: ShippingResponse = await res.json()
      setShipping(data)
      addLog(`Ongkir (${data.source}): Rp ${data.cheapestCost} — ${data.options.length} opsi kurir`)
    } catch (e) {
      addLog(`ERROR hitung ongkir: ${e instanceof Error ? e.message : 'unknown'}`)
    } finally {
      setLoadingShipping(false)
    }
  }

  // 2) Create order + Snap token
  const handleCreatePayment = async () => {
    setLoadingPayment(true)
    setPayment(null)
    setOrderStatus(null)
    addLog('Membuat order + Snap token via /api/payment/create')
    try {
      // Use first product from katalog as the line item.
      // If no real products available, fall back to a virtual item via the
      // shipping-only payload (subtotal + ongkir). For real test, we use
      // the existing /api/payment/create which requires a real product.
      // To keep this page self-contained, we use a fixed virtual product
      // created specifically for simulation (id "simulasi-product").
      // But /api/payment/create validates product existence — so we use
      // a real product from katalog. If none, we mock by calling /api/payment/create
      // with the first product from katalog.
      const katalogRes = await fetch('/api/toko/katalog')
      const katalog: Array<{ id: string; name: string; price: number; weightGram: number; stock: number }> = await katalogRes.json()
      if (!Array.isArray(katalog) || katalog.length === 0) {
        throw new Error('Tidak ada produk di katalog. Tambahkan produk lewat admin panel dulu.')
      }
      const product = katalog[0]
      // Compute quantity to roughly match the desired subtotal
      const qty = Math.max(1, Math.floor(subtotal / product.price))
      addLog(`Menggunakan produk "${product.name}" × ${qty} = Rp ${product.price * qty}`)

      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ productId: product.id, quantity: qty }],
          buyer: {
            name: 'Simulasi Buyer',
            phone: '081234567890',
            email: 'simulasi@example.com',
          },
          shipping: {
            province: 'Jawa Barat',
            city: selectedCity.name,
            district: selectedCity.districtName,
            districtId: selectedCity.districtId,
            cityId: selectedCity.id,
            postalCode: '40123',
            address: 'Jl. Simulasi No. 123',
          },
        }),
      })
      const data: PaymentCreateResponse & { error?: string } = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat payment')
      }
      setPayment(data)
      addLog(`Order dibuat: ${data.orderId} | gross_amount: Rp ${data.grossAmount}`)
      addLog(`Snap token: ${data.snapToken.slice(0, 8)}...`)
    } catch (e) {
      addLog(`ERROR create payment: ${e instanceof Error ? e.message : 'unknown'}`)
    } finally {
      setLoadingPayment(false)
    }
  }

  // 3) Open Snap popup
  const handleOpenSnap = () => {
    if (!payment) return
    addLog('Membuka Snap popup...')
    const loadSnap = (url: string) =>
      new Promise<void>((resolve, reject) => {
        const w = window as unknown as { snap?: unknown }
        if (w.snap) return resolve()
        const existing = document.getElementById('midtrans-snap-script')
        if (existing) {
          existing.addEventListener('load', () => resolve())
          return
        }
        const s = document.createElement('script')
        s.id = 'midtrans-snap-script'
        s.src = url
        s.async = true
        s.onload = () => resolve()
        s.onerror = () => reject(new Error('Gagal load Snap.js'))
        document.head.appendChild(s)
      })

    loadSnap(snapJsUrl || 'https://app.sandbox.midtrans.com/snap/snap.js')
      .then(() => {
        const w = window as unknown as {
          snap: {
            pay: (
              token: string,
              callbacks: {
                onSuccess: (r: unknown) => void
                onPending: (r: unknown) => void
                onError: (r: unknown) => void
                onClose: () => void
              }
            ) => void
          }
        }
        w.snap.pay(payment.snapToken, {
          onSuccess: (r) => {
            addLog('Snap onSuccess — pembayaran berhasil di frontend')
            addLog('Catatan: webhook dari Midtrans akan otomatis update status di DB')
          },
          onPending: (r) => {
            addLog('Snap onPending — pembayaran pending')
          },
          onError: (r) => {
            addLog('Snap onError — pembayaran gagal di frontend')
          },
          onClose: () => {
            addLog('Snap popup ditutup')
          },
        })
      })
      .catch((e) => addLog(`ERROR load Snap: ${e instanceof Error ? e.message : 'unknown'}`))
  }

  // 4) Simulate webhook (for sandbox testing without Midtrans dashboard)
  const handleSimulateWebhook = async (
    transactionStatus: 'settlement' | 'pending' | 'expire' | 'cancel' | 'deny'
  ) => {
    if (!payment) return
    addLog(`Simulasi webhook: transaction_status=${transactionStatus}`)
    // Compute valid signature
    const grossAmountStr = payment.grossAmount.toFixed(2)
    const statusCode = '200'
    const serverKeyReq = await fetch('/api/payment/config').then((r) => r.json()).catch(() => ({}))
    void serverKeyReq
    // We don't have server key on frontend (correctly), so we use a
    // dedicated simulation endpoint that generates a valid signature
    // server-side. This is a sandbox-only dev tool.
    try {
      const res = await fetch('/api/payment/simulate-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          midtransOrderId: payment.midtransOrderId,
          transactionStatus,
          paymentType: transactionStatus === 'settlement' ? 'bank_transfer' : 'qris',
          vaNumber: '12345678901',
          issuer: 'bca',
        }),
      })
      const text = await res.text()
      addLog(`Webhook simulation: HTTP ${res.status} — ${text}`)
      // Refresh order status
      await refreshOrderStatus()
    } catch (e) {
      addLog(`ERROR simulate webhook: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  // 5) Refresh order status from DB
  const refreshOrderStatus = async () => {
    if (!payment) return
    setLoadingStatus(true)
    try {
      const res = await fetch(`/api/payment/status?orderId=${payment.orderId}`)
      if (res.ok) {
        const data: OrderStatus = await res.json()
        setOrderStatus(data)
        addLog(`Status DB: payment=${data.paymentStatus}, order=${data.orderStatus}`)
      }
    } catch (e) {
      addLog(`ERROR refresh status: ${e instanceof Error ? e.message : 'unknown'}`)
    } finally {
      setLoadingStatus(false)
    }
  }

  const grandTotal = subtotal + (shipping?.cheapestCost ?? 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-emerald-900">
            Simulasi Checkout — Midtrans + RajaOngkir
          </h1>
          <p className="mt-1 text-sm text-emerald-700">
            Test end-to-end integrasi pembayaran & ongkir real-time. Environment: <strong>{environment}</strong>
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {/* === Step 1: Form input === */}
          <section className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-emerald-900">
              <span className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">1</span>
              Data Checkout
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-emerald-800">Subtotal (Rp)</label>
                <input
                  type="number"
                  value={subtotal}
                  onChange={(e) => setSubtotal(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-md border border-emerald-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-emerald-800">Berat (gram)</label>
                <input
                  type="number"
                  value={weightGram}
                  onChange={(e) => setWeightGram(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-md border border-emerald-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-emerald-800">Kota Tujuan</label>
                <select
                  value={selectedCity.id}
                  onChange={(e) => setSelectedCity(CITIES.find((c) => c.id === e.target.value) || CITIES[0])}
                  className="mt-1 w-full rounded-md border border-emerald-200 px-3 py-2 text-sm"
                >
                  {CITIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleCalculateShipping}
                disabled={loadingShipping || weightGram <= 0}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {loadingShipping ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />}
                Hitung Ongkir (RajaOngkir)
              </button>
            </div>
          </section>

          {/* === Step 2: Shipping result === */}
          <section className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-emerald-900">
              <span className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">2</span>
              Hasil Ongkir
            </h2>
            {shipping ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-md bg-emerald-50 px-3 py-2">
                  <span className="text-xs text-emerald-700">Sumber</span>
                  <span className={`text-xs font-semibold ${shipping.source === 'rajaongkir' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {shipping.source === 'rajaongkir' ? 'RajaOngkir (real-time)' : 'Fallback TokoSetting'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-emerald-50 px-3 py-2">
                  <span className="text-xs text-emerald-700">Termurah</span>
                  <span className="text-sm font-bold text-emerald-900">
                    Rp {shipping.cheapestCost.toLocaleString('id-ID')}
                  </span>
                </div>
                {shipping.message && (
                  <p className="text-xs italic text-emerald-600">{shipping.message}</p>
                )}
                {shipping.options.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-emerald-100">
                    {shipping.options.slice(0, 8).map((o, i) => (
                      <div key={i} className="flex justify-between border-b border-emerald-50 px-3 py-1.5 text-xs last:border-b-0">
                        <span className="text-emerald-800">{o.serviceDisplay}</span>
                        <span className="font-medium text-emerald-900">
                          Rp {o.cost.toLocaleString('id-ID')} · {o.etd}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-emerald-500">Belum dihitung. Klik "Hitung Ongkir" di kiri.</p>
            )}
          </section>

          {/* === Step 3: Create payment === */}
          <section className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-emerald-900">
              <span className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">3</span>
              Buat Order & Snap Token
            </h2>
            <div className="mb-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-emerald-700">Subtotal</span>
                <span>Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-700">Ongkir</span>
                <span>{shipping ? `Rp ${shipping.cheapestCost.toLocaleString('id-ID')}` : '-'}</span>
              </div>
              <div className="flex justify-between border-t border-emerald-100 pt-1 text-base font-bold text-emerald-900">
                <span>Grand Total</span>
                <span>Rp {grandTotal.toLocaleString('id-ID')}</span>
              </div>
              <p className="mt-1 text-xs italic text-emerald-600">
                Grand Total inilah yang dikirim ke Midtrans sebagai gross_amount.
              </p>
            </div>
            <button
              onClick={handleCreatePayment}
              disabled={loadingPayment || !shipping}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loadingPayment ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
              Buat Order + Snap Token
            </button>
            {payment && (
              <div className="mt-3 space-y-2 rounded-md bg-emerald-50 p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-emerald-700">Order ID</span>
                  <span className="font-mono">{payment.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700">Gross Amount</span>
                  <span className="font-semibold">Rp {payment.grossAmount.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-700">Snap Token</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(payment.snapToken)}
                    className="flex items-center gap-1 font-mono text-[10px] text-emerald-600 hover:underline"
                  >
                    {payment.snapToken.slice(0, 16)}...
                    <Copy className="size-3" />
                  </button>
                </div>
                <button
                  onClick={handleOpenSnap}
                  className="mt-2 w-full rounded-md bg-orange-500 px-3 py-2 text-xs font-bold text-white hover:bg-orange-600"
                >
                  Buka Snap Popup (semua metode bayar)
                </button>
              </div>
            )}
          </section>

          {/* === Step 4: Webhook simulation === */}
          <section className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-emerald-900">
              <span className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">4</span>
              Simulasi Webhook
            </h2>
            <p className="mb-3 text-xs text-emerald-600">
              Klik tombol di bawah untuk mensimulasikan callback dari Midtrans (cocok untuk testing tanpa dashboard Midtrans). Signature_key akan dihitung server-side.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSimulateWebhook('settlement')}
                disabled={!payment}
                className="rounded-md bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                ✓ Settlement (Lunas)
              </button>
              <button
                onClick={() => handleSimulateWebhook('pending')}
                disabled={!payment}
                className="rounded-md bg-yellow-500 px-3 py-2 text-xs font-semibold text-white hover:bg-yellow-600 disabled:opacity-50"
              >
                ⏳ Pending
              </button>
              <button
                onClick={() => handleSimulateWebhook('expire')}
                disabled={!payment}
                className="rounded-md bg-gray-600 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
              >
                ⌛ Expire
              </button>
              <button
                onClick={() => handleSimulateWebhook('cancel')}
                disabled={!payment}
                className="rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                ✗ Cancel
              </button>
            </div>
            <button
              onClick={refreshOrderStatus}
              disabled={!payment || loadingStatus}
              className="mt-3 w-full rounded-md border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              {loadingStatus ? <Loader2 className="mx-auto size-4 animate-spin" /> : 'Refresh Status DB'}
            </button>
          </section>
        </div>

        {/* === Order status display === */}
        {orderStatus && (
          <section className="mt-4 rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-emerald-900">
              <CheckCircle2 className="size-5 text-emerald-600" />
              Status Final di Database
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <StatusItem label="Order Number" value={orderStatus.orderNumber} />
              <StatusItem label="Payment Status" value={orderStatus.paymentStatus} highlight />
              <StatusItem label="Order Status" value={orderStatus.orderStatus} highlight />
              <StatusItem label="Transaction ID" value={orderStatus.midtransTransactionId || '-'} />
              <StatusItem label="Payment Type" value={orderStatus.midtransPaymentType || '-'} />
              <StatusItem label="VA Number" value={orderStatus.midtransVaNumber || '-'} />
              <StatusItem label="Issuer" value={orderStatus.midtransIssuer || '-'} />
              <StatusItem label="Paid At" value={orderStatus.paidAt ? new Date(orderStatus.paidAt).toLocaleString('id-ID') : '-'} />
              <StatusItem label="Settlement Time" value={orderStatus.midtransSettlementTime ? new Date(orderStatus.midtransSettlementTime).toLocaleString('id-ID') : '-'} />
            </div>
            {orderStatus.midtransPdfUrl && (
              <a
                href={orderStatus.midtransPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block rounded-md bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-200"
              >
                Lihat PDF Instruksi Pembayaran
              </a>
            )}
          </section>
        )}

        {/* === Logs === */}
        <section className="mt-4 rounded-xl border border-emerald-200 bg-gray-900 p-4 shadow-sm">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-300">
            <AlertCircle className="size-4" />
            Log Aktivitas
          </h2>
          <div className="max-h-60 overflow-y-auto rounded-md bg-black p-3 font-mono text-xs text-emerald-300">
            {logs.length === 0 ? (
              <p className="italic text-gray-500">Belum ada log.</p>
            ) : (
              logs.map((line, i) => <div key={i}>{line}</div>)
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function StatusItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-md bg-emerald-50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-emerald-600">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? 'text-emerald-900' : 'text-emerald-800'}`}>
        {value}
      </p>
    </div>
  )
}
