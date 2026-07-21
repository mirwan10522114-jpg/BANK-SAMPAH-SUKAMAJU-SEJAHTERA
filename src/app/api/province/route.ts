import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/province → list semua provinsi
// Optional ?q= untuk pencarian by nama (case-insensitive contains)
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim() || ''

  const where = q ? { name: { contains: q } } : {}

  const provinces = await db.province.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      altName: true,
      latitude: true,
      longitude: true,
    },
  })

  return NextResponse.json(provinces)
}
