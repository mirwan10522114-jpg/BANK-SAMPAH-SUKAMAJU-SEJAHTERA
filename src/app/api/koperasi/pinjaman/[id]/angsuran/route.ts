import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, bayarAngsuran } from '@/lib/business'

// POST: bayar angsuran (1x, N kali, atau lunas)
// body: { jumlahAngsuran?: number | 'lunas', keterangan? }
// tanggalBayar is NOT accepted from client — always uses server time to prevent backdating.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actor = await getActingUser(req)
  const body = await req.json().catch(() => ({}))

  // Validate jumlahAngsuran if provided
  if (body.jumlahAngsuran !== undefined && body.jumlahAngsuran !== 'lunas') {
    const n = Number(body.jumlahAngsuran)
    if (!Number.isInteger(n) || n < 1) {
      return NextResponse.json({ error: 'Jumlah angsuran harus bilangan bulat positif atau "lunas"' }, { status: 400 })
    }
  }

  try {
    const result = await bayarAngsuran(
      id,
      actor?.id,
      body.keterangan,
      undefined, // Always use server time — prevent backdating
      body.jumlahAngsuran // number | 'lunas' | undefined (default 1)
    )
    return NextResponse.json(result, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
