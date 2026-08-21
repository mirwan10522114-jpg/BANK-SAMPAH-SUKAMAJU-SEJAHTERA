// =====================================================================
// Midtrans Snap integration (Sandbox & Production)
// ---------------------------------------------------------------------
// All credentials are read from environment variables — NO hardcoding.
// To switch to production, change .env values only:
//   MIDTRANS_IS_PRODUCTION=true
//   MIDTRANS_SERVER_KEY=Mid-server-...   (production version)
//   MIDTRANS_CLIENT_KEY=Mid-client-...   (production version)
//
// Uses the official `midtrans-client` package's Snap class.
//
// Payment methods: NOT restricted — every payment method enabled in
// the Midtrans dashboard will appear automatically. We intentionally
// DO NOT pass `enabled_payments` so Snap shows whatever is configured
// in the dashboard (credit_card, qris, gopay, shopeepay, bank_transfer,
// echannel, cstore, akulaku, danamon_online, bca_klikbca, etc).
// =====================================================================

import { Snap } from 'midtrans-client'
import crypto from 'crypto'
import { logMidtrans } from './logger'

// =====================================================================
// Config (read from env)
// =====================================================================

interface MidtransConfig {
  merchantId: string
  serverKey: string
  clientKey: string
  isProduction: boolean
  isSanitized: boolean
  is3ds: boolean
}

function readConfig(): MidtransConfig {
  const cfg: MidtransConfig = {
    merchantId: process.env.MIDTRANS_MERCHANT_ID ?? '',
    serverKey: process.env.MIDTRANS_SERVER_KEY ?? '',
    clientKey: process.env.MIDTRANS_CLIENT_KEY ?? '',
    isProduction: String(process.env.MIDTRANS_IS_PRODUCTION ?? 'false').toLowerCase() === 'true',
    isSanitized: String(process.env.MIDTRANS_IS_SANITIZED ?? 'true').toLowerCase() === 'true',
    is3ds: String(process.env.MIDTRANS_IS_3DS ?? 'true').toLowerCase() === 'true',
  }
  return cfg
}

// =====================================================================
// Validation
// =====================================================================

export function isMidtransConfigured(): boolean {
  const cfg = readConfig()
  return cfg.serverKey.length > 0 && cfg.clientKey.length > 0
}

export function validateMidtransConfigOrThrow(): void {
  const cfg = readConfig()
  if (!cfg.serverKey) {
    logMidtrans.error('MIDTRANS_SERVER_KEY kosong di .env')
    throw new Error(
      'MIDTRANS_SERVER_KEY belum dikonfigurasi. Isi di file .env dengan kredensial dari dashboard Midtrans.'
    )
  }
  if (!cfg.clientKey) {
    logMidtrans.error('MIDTRANS_CLIENT_KEY kosong di .env')
    throw new Error(
      'MIDTRANS_CLIENT_KEY belum dikonfigurasi. Isi di file .env dengan kredensial dari dashboard Midtrans.'
    )
  }
}

// =====================================================================
// Customer details (typed — no `any`)
// =====================================================================

export interface MidtransCustomerDetails {
  first_name: string
  last_name?: string
  email?: string
  phone?: string
  billing_address?: {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    address?: string
    city?: string
    postal_code?: string
    country_code?: string
  }
  shipping_address?: {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    address?: string
    city?: string
    postal_code?: string
    country_code?: string
  }
}

export interface MidtransItemDetail {
  id: string
  name: string
  price: number
  quantity: number
  brand?: string
  category?: string
  merchant_name?: string
}

export interface CreateSnapTokenParams {
  orderId: string
  grossAmount: number
  customerDetails: MidtransCustomerDetails
  itemDetails?: MidtransItemDetail[]
  // Optional callback URLs (finish/pending/error pages on your site)
  finishUrl?: string
  pendingUrl?: string
  errorUrl?: string
}

export interface CreateSnapTokenResult {
  token: string
  redirectUrl?: string
}

// =====================================================================
// Create Snap Token
// =====================================================================
//
// We DO NOT pass `enabled_payments` — every payment method enabled in
// the dashboard will appear automatically in the Snap popup.
// We DO pass `credit_card.secure = true` for 3DS when MIDTRANS_IS_3DS=true.
//
// Throws on failure. Caller is expected to catch and return proper HTTP error.

export async function createSnapToken(
  params: CreateSnapTokenParams
): Promise<CreateSnapTokenResult> {
  validateMidtransConfigOrThrow()
  const cfg = readConfig()

  // Build the request body for Midtrans Snap API.
  // Reference: https://docs.midtrans.com/reference/snap-api-v1-charge-cardless
  const requestBody: Record<string, unknown> = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.grossAmount,
    },
    customer_details: params.customerDetails,
    credit_card: {
      secure: cfg.is3ds,
    },
    // ============================================================
    // EXPIRY: 24 JAM EKSPLISIT (WAJIB!)
    // ------------------------------------------------------------
    // Midtrans Snap sandbox default expiry sangat pendek (seringkali
    // hanya 2-5 menit). Kalau kita TIDAK set expiry eksplisit, user
    // akan lihat "Transaction expired" saat klik payment method.
    //
    // Dengan set eksplisit 24 jam di sini, user punya waktu seharian
    // untuk bayar — bahkan kalau tutup browser & buka lagi besok.
    //
    // ⚠️ Jika ada Custom Expiry aktif di Midtrans Dashboard
    //    (Settings → Snap → Preference → Custom Expiry), itu akan
    //    OVERRIDE pengaturan ini. Pastikan Custom Expiry DISABLED
    //    di dashboard, atau set ke 24 jam juga.
    // ============================================================
    expiry: {
      unit: 'hour',
      duration: 24,
    },
    // Intentionally omit `enabled_payments` so ALL dashboard-enabled
    // methods are surfaced. Do NOT hardcode QRIS or any specific method.
  }

  if (params.itemDetails && params.itemDetails.length > 0) {
    requestBody.item_details = params.itemDetails
  }

  const callbacks: Record<string, string> = {}
  if (params.finishUrl) callbacks.finish = params.finishUrl
  if (params.pendingUrl) callbacks.pending = params.pendingUrl
  if (params.errorUrl) callbacks.error = params.errorUrl
  if (Object.keys(callbacks).length > 0) {
    requestBody.callbacks = callbacks
  }

  logMidtrans.info('Snap token request', {
    order_id: params.orderId,
    gross_amount: params.grossAmount,
    is_production: cfg.isProduction,
    item_count: params.itemDetails?.length ?? 0,
  })
  logMidtrans.debug('Snap request body', requestBody)

  // Initialize Snap instance with config
  const snap = new Snap({
    isProduction: cfg.isProduction,
    serverKey: cfg.serverKey,
    clientKey: cfg.clientKey,
  })

  try {
    // midtrans-client's createTransaction returns { token, redirect_url }
    const result = (await snap.createTransaction(requestBody)) as {
      token: string
      redirect_url?: string
    }

    logMidtrans.info('Snap token created', {
      order_id: params.orderId,
      token_prefix: result.token.slice(0, 8) + '...',
      has_redirect: Boolean(result.redirect_url),
    })

    return {
      token: result.token,
      redirectUrl: result.redirect_url,
    }
  } catch (error) {
    logMidtrans.error(
      `Snap token creation failed for ${params.orderId}`,
      error,
      { gross_amount: params.grossAmount }
    )
    throw error
  }
}

// =====================================================================
// Signature verification
// ---------------------------------------------------------------------
// Midtrans signature_key = SHA512(order_id + status_code + gross_amount + serverKey)
// Used by webhook to verify that the callback truly came from Midtrans.
// =====================================================================

export function verifyMidtransSignature(params: {
  orderId: string
  statusCode: string
  grossAmount: string
  signatureKey: string
}): boolean {
  const cfg = readConfig()
  if (!cfg.serverKey) {
    logMidtrans.error('Cannot verify signature: MIDTRANS_SERVER_KEY kosong')
    return false
  }

  const { orderId, statusCode, grossAmount, signatureKey } = params

  // grossAmount harus format dengan 2 desimal persis seperti Midtrans kirim,
  // misal "20000.00". Kita pakai string apa adanya dari body callback.
  const payload = `${orderId}${statusCode}${grossAmount}${cfg.serverKey}`
  const expected = crypto.createHash('sha512').update(payload).digest('hex')

  const isValid = expected === signatureKey
  if (!isValid) {
    logMidtrans.warn('Signature verification failed', {
      order_id: orderId,
      status_code: statusCode,
      gross_amount: grossAmount,
    })
  }
  return isValid
}

// =====================================================================
// Public helper: get client key for frontend Snap.js
// ---------------------------------------------------------------------
// Frontend needs MIDTRANS_CLIENT_KEY to load Snap.js on the checkout
// page. We expose it via /api/payment/config (read-only) so the client
// can fetch it without it being hardcoded in the source.
// =====================================================================

export function getMidtransClientKey(): string {
  return readConfig().clientKey
}

export function getMidtransEnvironment(): 'sandbox' | 'production' {
  return readConfig().isProduction ? 'production' : 'sandbox'
}

// Snap.js base URL (different for sandbox vs production)
export function getSnapJsUrl(): string {
  return readConfig().isProduction
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js'
}
