import { NextRequest, NextResponse } from 'next/server'
import { getRajaOngkirRates } from '@/lib/rajaongkir'

// POST /api/shipping/cost
// Body: { districtId, districtName, cityName, weightGram }
//
// Returns: {
//   source: "rajaongkir" | "fallback",
//   cheapestCost: number,
//   options: RajaOngkirRate[],   // kosong kalau fallback
//   message?: string,
// }
//
// Dipakai oleh frontend CheckoutView untuk menampilkan estimasi ongkir
// live saat user sudah pilih kecamatan. Angka yang dikembalikan di sini
// SAMA PERSIS dengan yang akan dibebankan ke totalBayar di /toko/checkout,
// karena keduanya memanggil getRajaOngkirRates() yang sama.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { districtId, districtName, cityName, weightGram } = body as {
      districtId?: string
      districtName?: string
      cityName?: string
      weightGram?: number
    }

    // Validasi input
    if (!districtId || !districtName || !cityName) {
      return NextResponse.json(
        { error: 'districtId, districtName, cityName wajib diisi' },
        { status: 400 }
      )
    }
    const w = Number(weightGram) || 0
    if (w <= 0) {
      return NextResponse.json(
        { error: 'weightGram harus > 0' },
        { status: 400 }
      )
    }

    const result = await getRajaOngkirRates({
      districtId,
      districtName,
      cityName,
      totalWeightGram: w,
    })

    return NextResponse.json(result)
  } catch (e: any) {
    console.error('[shipping/cost] error:', e)
    // Return fallback supaya frontend tidak crash
    return NextResponse.json(
      {
        source: 'fallback' as const,
        cheapestCost: 15000,
        options: [],
        message: 'Gagal menghitung ongkir, pakai tarif default.',
        error: e?.message || 'Unknown error',
      },
      { status: 200 } // 200 supaya frontend tidak throw di res.ok check
    )
  }
}
