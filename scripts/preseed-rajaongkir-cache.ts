// Pre-seed RajaOngkir cache dengan rute populer dari Padalarang.
// Jalankan script ini SEKALI setelah quota RajaOngkir reset (00:00 WIB)
// untuk mengisi cache dengan tarif ke kota-kota utama Indonesia.
//
// Setelah cache terisi, semua request berikutnya akan cache hit (0 API call)
// selama 24 jam ke depan. Ini sangat menghemat quota harian (100 hits).
//
// Usage:
//   bun run scripts/preseed-rajaongkir-cache.ts
//
// Total rute yang di-seed: ~30 (populer dari Padalarang)
// Hit yang dipakai: ~30 dari 100 harian
// Sisa: 70 hits untuk rute lain yang belum ter-cache

import { db } from '../src/lib/db'
import { getRajaOngkirRates } from '../src/lib/rajaongkir'

// Rute populer dari Padalarang (origin=575, Kab. Bandung Barat)
// ke kota-kota utama Indonesia. Berat 1000g (1kg) sebagai baseline.
const POPULAR_ROUTES: Array<{
  cityName: string
  districtName: string
  districtId: string
  weight: number
  label: string
}> = [
  // Same province (Jawa Barat) - ongkir termurah
  { label: 'Padalarang → Bandung', cityName: 'Bandung', districtName: 'Bandung Wetan', districtId: '32.73.01', weight: 1000 },
  { label: 'Padalarang → Kota Cimahi', cityName: 'Kota Cimahi', districtName: 'Cimahi Tengah', districtId: '32.77.01', weight: 1000 },
  { label: 'Padalarang → Kota Bekasi', cityName: 'Kota Bekasi', districtName: 'Bekasi Barat', districtId: '32.74.01', weight: 1000 },
  { label: 'Padalarang → Kota Bogor', cityName: 'Kota Bogor', districtName: 'Bogor Tengah', districtId: '32.75.01', weight: 1000 },
  { label: 'Padalarang → Kota Depok', cityName: 'Kota Depok', districtName: 'Pancoran Mas', districtId: '32.76.01', weight: 1000 },
  { label: 'Padalarang → Kota Sukabumi', cityName: 'Kota Sukabumi', districtName: 'Warudoyong', districtId: '32.72.01', weight: 1000 },
  { label: 'Padalarang → Kota Tasikmalaya', cityName: 'Kota Tasikmalaya', districtName: 'Tawang', districtId: '32.78.01', weight: 1000 },
  { label: 'Padalarang → Kota Cirebon', cityName: 'Kota Cirebon', districtName: 'Pekalipan', districtId: '32.71.01', weight: 1000 },

  // DKI Jakarta
  { label: 'Padalarang → Jakarta Pusat', cityName: 'Jakarta Pusat', districtName: 'Gambir', districtId: '31.71.01', weight: 1000 },
  { label: 'Padalarang → Jakarta Selatan', cityName: 'Jakarta Selatan', districtName: 'Kebayoran Baru', districtId: '31.72.01', weight: 1000 },
  { label: 'Padalarang → Jakarta Barat', cityName: 'Jakarta Barat', districtName: 'Cengkareng', districtId: '31.73.01', weight: 1000 },
  { label: 'Padalarang → Jakarta Timur', cityName: 'Jakarta Timur', districtName: 'Cakung', districtId: '31.74.01', weight: 1000 },
  { label: 'Padalarang → Jakarta Utara', cityName: 'Jakarta Utara', districtName: 'Tanjung Priok', districtId: '31.75.01', weight: 1000 },

  // Banten
  { label: 'Padalarang → Kota Tangerang', cityName: 'Kota Tangerang', districtName: 'Tangerang', districtId: '36.71.01', weight: 1000 },
  { label: 'Padalarang → Kota Tangerang Selatan', cityName: 'Kota Tangerang Selatan', districtName: 'Ciputat', districtId: '36.74.01', weight: 1000 },
  { label: 'Padalarang → Kota Serang', cityName: 'Kota Serang', districtName: 'Serang', districtId: '36.73.01', weight: 1000 },

  // Jawa Tengah
  { label: 'Padalarang → Kota Semarang', cityName: 'Kota Semarang', districtName: 'Semarang Tengah', districtId: '33.74.01', weight: 1000 },
  { label: 'Padalarang → Kota Surakarta', cityName: 'Kota Surakarta', districtName: 'Banjarsari', districtId: '33.75.01', weight: 1000 },

  // DI Yogyakarta
  { label: 'Padalarang → Kota Yogyakarta', cityName: 'Kota Yogyakarta', districtName: 'Gondokusuman', districtId: '34.71.01', weight: 1000 },

  // Jawa Timur
  { label: 'Padalarang → Kota Surabaya', cityName: 'Kota Surabaya', districtName: 'Tegalsari', districtId: '35.78.01', weight: 1000 },
  { label: 'Padalarang → Kota Malang', cityName: 'Kota Malang', districtName: 'Klojen', districtId: '35.74.01', weight: 1000 },

  // Bali (beda pulau)
  { label: 'Padalarang → Kota Denpasar', cityName: 'Kota Denpasar', districtName: 'Denpasar Selatan', districtId: '51.71.01', weight: 1000 },

  // Sumatera (beda pulau)
  { label: 'Padalarang → Kota Medan', cityName: 'Kota Medan', districtName: 'Medan Tuntungan', districtId: '12.71.01', weight: 1000 },
  { label: 'Padalarang → Kota Palembang', cityName: 'Kota Palembang', districtName: 'Ilir Timur I', districtId: '16.71.01', weight: 1000 },
  { label: 'Padalarang → Kota Pekanbaru', cityName: 'Kota Pekanbaru', districtName: 'Pekanbaru Kota', districtId: '14.71.01', weight: 1000 },

  // Kalimantan (beda pulau)
  { label: 'Padalarang → Kota Banjarmasin', cityName: 'Kota Banjarmasin', districtName: 'Banjarmasin Barat', districtId: '63.71.01', weight: 1000 },
  { label: 'Padalarang → Kota Samarinda', cityName: 'Kota Samarinda', districtName: 'Samarinda Ulu', districtId: '64.71.01', weight: 1000 },
  { label: 'Padalarang → Kota Balikpapan', cityName: 'Kota Balikpapan', districtName: 'Balikpapan Tengah', districtId: '64.74.01', weight: 1000 },

  // Sulawesi (beda pulau)
  { label: 'Padalarang → Kota Makassar', cityName: 'Kota Makassar', districtName: 'Mariso', districtId: '73.71.01', weight: 1000 },
  { label: 'Padalarang → Kota Manado', cityName: 'Kota Manado', districtName: 'Wenang', districtId: '71.71.01', weight: 1000 },
]

async function main() {
  console.log('🌱 Pre-seeding RajaOngkir cache dengan rute populer dari Padalarang...\n')

  let success = 0
  let fallback = 0
  let failed = 0

  for (const route of POPULAR_ROUTES) {
    process.stdout.write(`  ${route.label}... `)
    try {
      const result = await getRajaOngkirRates({
        districtId: route.districtId,
        districtName: route.districtName,
        cityName: route.cityName,
        totalWeightGram: route.weight,
      })
      if (result.source === 'rajaongkir') {
        console.log(`✓ Rp ${result.cheapestCost} (${result.options.length} opsi)`)
        success++
      } else {
        console.log(`⚠ Fallback: ${result.message?.slice(0, 60)}...`)
        fallback++
      }
    } catch (e) {
      console.log(`✗ Error: ${e instanceof Error ? e.message : 'unknown'}`)
      failed++
    }
    // Delay 500ms antar request supaya tidak terlalu cepat
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log(`\n✅ Selesai!`)
  console.log(`   ${success} rute berhasil di-cache (RajaOngkir real-time)`)
  console.log(`   ${fallback} rute pakai fallback (RajaOngkir rate-limited/gagal)`)
  console.log(`   ${failed} rute error`)
  console.log(`\n   Total API hits terpakai: ${success} dari 100 harian`)
  console.log(`   Cache valid selama 24 jam, akan dipakai untuk semua request berikutnya.`)

  // Cek file cache
  const { readFile } = await import('fs/promises')
  try {
    const raw = await readFile('/home/z/my-project/storage/rajaongkir-cache.json', 'utf8')
    const cache = JSON.parse(raw)
    console.log(`\n   Cache file: ${Object.keys(cache).length} entries`)
  } catch {
    console.log(`\n   Cache file belum ada`)
  }

  await db.$disconnect()
}

main().catch((e) => {
  console.error('❌ Error:', e)
  process.exit(1)
})
