import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/cities?provinceId=xxx → list kota/kabupaten dalam provinsi
// Optional ?q= untuk pencarian by nama
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const provinceId = url.searchParams.get('provinceId')?.trim() || ''
  const q = url.searchParams.get('q')?.trim() || ''

  if (!provinceId) {
    return NextResponse.json(
      { error: 'Parameter provinceId wajib' },
      { status: 400 }
    )
  }

  const where: any = { provinceId }
  if (q) where.name = { contains: q }

  const cities = await db.city.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      provinceId: true,
      altName: true,
      latitude: true,
      longitude: true,
    },
  })

  return NextResponse.json(cities)
}
