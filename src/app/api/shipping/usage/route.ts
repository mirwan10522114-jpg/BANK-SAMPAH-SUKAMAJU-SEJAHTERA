import { NextResponse } from 'next/server'
import { getDailyUsage } from '@/lib/rajaongkir'

// GET /api/shipping/usage
// Returns harian hit count untuk RajaOngkir API.
// User bisa cek sisa quota lewat endpoint ini.
//
// Limit default RajaOngkir free tier: 100 hits/hari.
// Reset pukul 00:00 WIB.

const DAILY_LIMIT = 100

export async function GET() {
  const usage = await getDailyUsage()
  const remaining = Math.max(0, DAILY_LIMIT - usage.hits)
  const isExhausted = remaining === 0

  // Estimasi waktu reset (00:00 WIB = 17:00 UTC hari sebelumnya)
  // WIB = UTC+7, jadi 00:00 WIB hari ini = 17:00 UTC hari sebelumnya
  const now = new Date()
  const nextResetWIB = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  nextResetWIB.setUTCHours(24, 0, 0, 0) // Set ke 00:00 WIB besok
  const nextResetUTC = new Date(nextResetWIB.getTime() - 7 * 60 * 60 * 1000)
  const msUntilReset = nextResetUTC.getTime() - now.getTime()
  const hoursUntilReset = Math.floor(msUntilReset / (60 * 60 * 1000))
  const minutesUntilReset = Math.floor(
    (msUntilReset % (60 * 60 * 1000)) / (60 * 1000)
  )

  return NextResponse.json({
    date: usage.date,
    limit: DAILY_LIMIT,
    used: usage.hits,
    remaining,
    isExhausted,
    successes: usage.successes,
    failures: usage.failures,
    nextResetAt: nextResetUTC.toISOString(),
    timeUntilReset: `${hoursUntilReset}j ${minutesUntilReset}m`,
    // Catatan: limit sebenarnya bisa berbeda tergantung paket RajaOngkir
    // yang aktif. 100/hari adalah default free tier.
  })
}
