import { NextResponse } from 'next/server'

// POST /api/auth/logout — mock logout (client just clears localStorage)
export async function POST() {
  return NextResponse.json({ ok: true })
}
