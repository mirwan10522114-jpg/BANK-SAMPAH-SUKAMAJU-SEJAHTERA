import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/district?cityId=xxx → list kecamatan dalam kota/kabupaten
// Optional ?q= untuk pencarian by nama
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const cityId = url.searchParams.get('cityId')?.trim() || ''
  const q = url.searchParams.get('q')?.trim() || ''

  if (!cityId) {
    return NextResponse.json(
      { error: 'Parameter cityId wajib' },
      { status: 400 }
    )
  }

  const where: any = { cityId }
  if (q) where.name = { contains: q }

  const districts = await db.district.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      cityId: true,
      altName: true,
      latitude: true,
      longitude: true,
      rajaOngkirDestId: true,
    },
  })

  return NextResponse.json(districts)
}
