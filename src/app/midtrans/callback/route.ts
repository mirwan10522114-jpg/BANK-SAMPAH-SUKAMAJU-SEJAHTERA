// Re-export the canonical callback handler at /midtrans/callback
// so users who configured Midtrans dashboard with this exact path
// can hit it without the /api prefix.
//
// The actual implementation lives in /api/payment/callback/route.ts.
// We re-export the POST handler to avoid duplicating the webhook logic.

export { POST } from '@/app/api/payment/callback/route'
