// =====================================================================
// RajaOngkir (Komerce) integration
// ---------------------------------------------------------------------
// API base: https://rajaongkir.komerce.id/api/v1
// Endpoints used:
//   GET  /destination/search?search=<keyword>      → resolve destination ID
//   POST /calculate/domestic-cost                  → hitung ongkir
//
// Auth: API key di header `key` (diambil dari env RAJAONGKIR_API_KEY).
// Origin: ID kecamatan asal toko, diambil dari env RAJAONGKIR_ORIGIN_ID
// (dicari sekali via /destination/search, lalu hardcode di .env).
//
// Cache: ID tujuan RajaOngkir disimpan ke District.rajaOngkirDestId
// supaya tidak query berulang untuk kecamatan yang sama.
//
// Fallback: kalau API key tidak ada / API gagal / timeout → kalkulasi
// ongkir fallback ke formula manual TokoSetting (rate per kg, dst).
// Ini supaya checkout tetap berfungsi walau API eksternal down.
// =====================================================================

import { db } from './db'
import { toNumber } from './format'

const RAJAONGKIR_BASE = 'https://rajaongkir.komerce.id/api/v1'
const REQUEST_TIMEOUT_MS = 8000

export interface RajaOngkirRate {
  kurir: string           // jne | jnt | sicepat | pos | tiki | anteraja | ...
  service: string         // EZ | REG | OKE | ...
  serviceDisplay: string  // "JNE EZ" atau "JNE REG" untuk tampilan UI
  etd: string             // "2-3 hari"
  cost: number            // tarif rupiah
}

export interface ShippingCalcResult {
  // Sumber hasil perhitungan: "rajaongkir" | "fallback"
  source: 'rajaongkir' | 'fallback'
  // Tarif termurah di antara semua opsi (dipakai untuk totalBayar)
  cheapestCost: number
  // Daftar lengkap opsi kurir (kosong kalau fallback)
  options: RajaOngkirRate[]
  // Pesan status untuk debugging/logging
  message?: string
}

// =====================================================================
// Internal helpers
// =====================================================================

function isRajaOngkirConfigured(): boolean {
  return !!process.env.RAJAONGKIR_API_KEY && !!process.env.RAJAONGKIR_ORIGIN_ID
}

// fetch dengan timeout sederhana, supaya kalau RajaOngkir lambat kita
// cepat fallback ke formula TokoSetting.
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// =====================================================================
// Resolve nama kecamatan → ID tujuan RajaOngkir (dengan caching DB)
// =====================================================================

async function resolveDestinationId(
  districtId: string,
  districtName: string,
  cityName: string
): Promise<number | null> {
  // 1) Cek cache di District.rajaOngkirDestId dulu
  const cached = await db.district.findUnique({
    where: { id: districtId },
    select: { rajaOngkirDestId: true },
  })
  if (cached?.rajaOngkirDestId) {
    return cached.rajaOngkirDestId
  }

  // 2) Hit API search. Pakai keyword "kecamatan, kota" supaya lebih akurat.
  const apiKey = process.env.RAJAONGKIR_API_KEY!
  const keyword = `${districtName}, ${cityName}`

  try {
    const res = await fetchWithTimeout(
      `${RAJAONGKIR_BASE}/destination/search?search=${encodeURIComponent(keyword)}`,
      { method: 'GET', headers: { key: apiKey } }
    )
    if (!res.ok) {
      console.warn(
        `[rajaongkir] /destination/search HTTP ${res.status} for "${keyword}"`
      )
      return null
    }
    const json = await res.json()
    // Struktur response Komerce:
    //   { meta: {...}, data: [ { id, name, ... }, ... ] }
    const items: any[] = Array.isArray(json?.data) ? json.data : []
    if (items.length === 0) {
      // Coba fallback: cari pakai keyword hanya nama kecamatan
      const res2 = await fetchWithTimeout(
        `${RAJAONGKIR_BASE}/destination/search?search=${encodeURIComponent(districtName)}`,
        { method: 'GET', headers: { key: apiKey } }
      )
      if (!res2.ok) return null
      const json2 = await res2.json()
      const items2: any[] = Array.isArray(json2?.data) ? json2.data : []
      if (items2.length === 0) return null
      // Ambil hasil pertama (best match)
      const destId = parseInt(items2[0].id, 10)
      if (isNaN(destId)) return null
      await db.district.update({
        where: { id: districtId },
        data: { rajaOngkirDestId: destId },
      })
      return destId
    }

    const destId = parseInt(items[0].id, 10)
    if (isNaN(destId)) return null

    // Simpan ke cache untuk panggilan berikutnya
    await db.district.update({
      where: { id: districtId },
      data: { rajaOngkirDestId: destId },
    })
    return destId
  } catch (e: any) {
    console.warn(
      `[rajaongkir] resolve destination error for "${keyword}": ${e?.message || e}`
    )
    return null
  }
}

// =====================================================================
// Fallback: hitung ongkir pakai formula TokoSetting (lama)
// =====================================================================

async function fallbackCalcBySetting(
  totalWeightGram: number
): Promise<ShippingCalcResult> {
  const setting = await db.tokoSetting.findFirst()
  const ratePerKg = toNumber(setting?.ongkirRatePerKg)
  const ongkirTetap = toNumber(setting?.ongkirTetap)
  const beratMinKg = toNumber(setting?.beratMinimumKg) || 1

  let cost = 0
  if (ratePerKg > 0) {
    cost = Math.ceil(totalWeightGram / 1000 / beratMinKg) * ratePerKg
  } else if (ongkirTetap > 0) {
    cost = ongkirTetap
  } else {
    // Last-resort default supaya toko tetap bisa terima order walau setting kosong
    cost = 15000
  }

  return {
    source: 'fallback',
    cheapestCost: cost,
    options: [],
    message:
      'Menggunakan estimasi ongkir internal (API RajaOngkir tidak tersedia).',
  }
}

// =====================================================================
// Hitung ongkir via RajaOngkir, dengan fallback aman
// =====================================================================
//
// Input:
//   districtId     → ID Kemendagri kecamatan (e.g. "32.73.01")
//   districtName   → Nama kecamatan (e.g. "Bandung Wetan")
//   cityName       → Nama kota (e.g. "Bandung")
//   totalWeightGram→ Total berat keranjang dalam gram
//
// Output: ShippingCalcResult { source, cheapestCost, options, message }
//   - Kalau RajaOngkir aktif & sukses → source = "rajaongkir"
//   - Kalau gagal/timeout/key tidak ada → source = "fallback" pakai TokoSetting
//   - Tidak pernah melempar exception (aman dipanggil di checkout)

export async function getRajaOngkirRates(params: {
  districtId: string
  districtName: string
  cityName: string
  totalWeightGram: number
}): Promise<ShippingCalcResult> {
  const { districtId, districtName, cityName, totalWeightGram } = params

  // 1) Cek apakah RajaOngkir dikonfigurasi
  if (!isRajaOngkirConfigured()) {
    return fallbackCalcBySetting(totalWeightGram)
  }

  // 2) Resolve destination ID (dengan caching)
  const destId = await resolveDestinationId(districtId, districtName, cityName)
  if (!destId) {
    // Tidak bisa resolve → fallback
    return fallbackCalcBySetting(totalWeightGram)
  }

  // 3) Hit ongkir via /calculate/domestic-cost
  const apiKey = process.env.RAJAONGKIR_API_KEY!
  const originId = process.env.RAJAONGKIR_ORIGIN_ID!
  // Minimum 1 kg (1000 g) — RajaOngkir menolak weight < 1000
  const weightGram = Math.max(1000, Math.ceil(totalWeightGram))

  // Pakai semua kurir yang umum — RajaOngkir mendukung multi-courier
  // via parameter courier yang dipisah `:` (jne:jnt:sicepat:anteraja:pos:tiki:wahana:lion:etc)
  // Untuk simplisitas & agar fallback lebih cepat, kita pakai jne:jnt:sicepat:anteraha:pos:tiki
  const couriers = 'jne:jnt:sicepat:anteraja:pos:tiki'

  try {
    const res = await fetchWithTimeout(
      `${RAJAONGKIR_BASE}/calculate/domestic-cost`,
      {
        method: 'POST',
        headers: {
          key: apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          origin: originId,
          destination: String(destId),
          weight: String(weightGram),
          courier: couriers,
          price: 'lowest', // ambil service termurah per kurir
        }).toString(),
      }
    )

    if (!res.ok) {
      console.warn(
        `[rajaongkir] /calculate/domestic-cost HTTP ${res.status} — falling back`
      )
      return fallbackCalcBySetting(totalWeightGram)
    }

    const json = await res.json()
    // Struktur response:
    //   {
    //     meta: {...},
    //     data: {
    //       origin_details: {...},
    //       destination_details: {...},
    //       results: [
    //         { code: "jne", name: "JNE", costs: [
    //             { service: "REG", description: "...", cost: [{ value: 18000, etd: "2-3", note: "" }] },
    //             ...
    //           ]
    //         },
    //         ...
    //       ]
    //     }
    //   }
    const results: any[] = Array.isArray(json?.data?.results)
      ? json.data.results
      : Array.isArray(json?.results)
        ? json.results
        : []

    const options: RajaOngkirRate[] = []
    for (const courier of results) {
      const courierCode: string = courier.code || courier.name || ''
      const courierName: string = (courier.name || courierCode).toUpperCase()
      const costs: any[] = Array.isArray(courier.costs) ? courier.costs : []
      for (const c of costs) {
        const service: string = c.service || ''
        const costArr: any[] = Array.isArray(c.cost) ? c.cost : []
        const first = costArr[0] || {}
        const value: number = typeof first.value === 'number'
          ? first.value
          : parseInt(first.value || '0', 10) || 0
        const etd: string = first.etd ? String(first.etd) : '-'
        if (value > 0) {
          options.push({
            kurir: courierCode.toLowerCase(),
            service,
            serviceDisplay: `${courierName} ${service}`,
            etd: etd.includes('hari') ? etd : `${etd} hari`,
            cost: value,
          })
        }
      }
    }

    if (options.length === 0) {
      // API sukses tapi tidak ada opsi → fallback
      return fallbackCalcBySetting(totalWeightGram)
    }

    // Sort by cost asc, ambil termurah sebagai cheapestCost
    options.sort((a, b) => a.cost - b.cost)
    return {
      source: 'rajaongkir',
      cheapestCost: options[0].cost,
      options,
      message: `Ongkir real-time dari ${options.length} layanan kurir.`,
    }
  } catch (e: any) {
    const isAbort = e?.name === 'AbortError'
    console.warn(
      `[rajaongkir] calculate error (${isAbort ? 'timeout' : e?.message || e}) — falling back`
    )
    return fallbackCalcBySetting(totalWeightGram)
  }
}
