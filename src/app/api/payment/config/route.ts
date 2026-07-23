import { NextResponse } from 'next/server'
import {
  getMidtransClientKey,
  getMidtransEnvironment,
  getSnapJsUrl,
  isMidtransConfigured,
} from '@/lib/midtrans'

// GET /api/payment/config
// Returns public Midtrans config the frontend needs to load Snap.js:
//   - clientKey (safe to expose — Midtrans designates this as the public key)
//   - environment ('sandbox' | 'production')
//   - snapJsUrl (different for sandbox vs production)
//
// The Server Key is NEVER exposed to the frontend.
export async function GET() {
  return NextResponse.json({
    configured: isMidtransConfigured(),
    environment: getMidtransEnvironment(),
    clientKey: getMidtransClientKey(),
    snapJsUrl: getSnapJsUrl(),
  })
}
