// Re-export the canonical webhook handler.
//
// Midtrans dashboard may be configured to send notifications to either:
//   /api/payment/callback   (canonical — used by new integrations)
//   /api/toko/webhook/midtrans  (legacy path used by old /toko/checkout)
//
// Both paths must execute the same handler to keep behavior consistent.

export { POST } from '@/app/api/payment/callback/route'
