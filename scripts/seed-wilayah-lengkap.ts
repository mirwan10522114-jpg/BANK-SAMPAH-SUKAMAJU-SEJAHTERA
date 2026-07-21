// Seed master wilayah lengkap dari dataset emsifa/api-wilayah-indonesia.
// Fetches provinces.csv, regencies.csv, districts.csv from GitHub raw and
// upserts into Province / City / District tables.
//
// Total: 34 provinces + 514 regencies + ~7,000 districts.
// Run: bun run scripts/seed-wilayah-lengkap.ts
//
// Idempotent: upsert by primary key.

import { db } from '../src/lib/db'

const BASE = 'https://raw.githubusercontent.com/emsifa/api-wilayah-indonesia/master/data'

interface CsvRow {
  id: string
  name: string
  // For regencies: also has provinceId (2nd column)
  // For districts: also has regencyId (2nd column)
}

async function fetchCsv(url: string): Promise<string> {
  console.log(`  Fetching ${url}`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`)
  }
  return res.text()
}

// Parse CSV with format: code,name OR code,parentCode,name
// No quoting/escaping in this dataset (simple comma-separated).
function parseCsv(text: string, expectedCols: 2 | 3): CsvRow[] {
  const lines = text.trim().split('\n')
  const result: CsvRow[] = []
  for (const line of lines) {
    const parts = line.split(',')
    if (parts.length < expectedCols) continue
    if (expectedCols === 2) {
      result.push({ id: parts[0].trim(), name: parts[1].trim() })
    } else {
      // 3 cols: id, parentCode, name
      result.push({ id: parts[0].trim(), name: parts[2].trim() })
    }
  }
  return result
}

// For regencies (3 cols: id, provinceId, name)
function parseRegenciesCsv(text: string): Array<CsvRow & { provinceId: string }> {
  const lines = text.trim().split('\n')
  const result: Array<CsvRow & { provinceId: string }> = []
  for (const line of lines) {
    const parts = line.split(',')
    if (parts.length < 3) continue
    result.push({
      id: parts[0].trim(),
      provinceId: parts[1].trim(),
      name: parts[2].trim(),
    })
  }
  return result
}

// For districts (3 cols: id, regencyId, name)
function parseDistrictsCsv(text: string): Array<CsvRow & { cityId: string }> {
  const lines = text.trim().split('\n')
  const result: Array<CsvRow & { cityId: string }> = []
  for (const line of lines) {
    const parts = line.split(',')
    if (parts.length < 3) continue
    result.push({
      id: parts[0].trim(),
      cityId: parts[1].trim(),
      name: parts[2].trim(),
    })
  }
  return result
}

// Batch upsert helper — call db in chunks to avoid memory issues
async function batchUpsert<T>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    await Promise.all(batch.map(fn))
    if ((i + batchSize) % (batchSize * 10) === 0 || i + batchSize >= items.length) {
      console.log(`    ...${Math.min(i + batchSize, items.length)}/${items.length}`)
    }
  }
}

async function main() {
  console.log('🌱 Seeding master wilayah lengkap (emsifa dataset)...')
  console.log('')

  // 1) Provinces
  console.log('Step 1: Provinces')
  const provText = await fetchCsv(`${BASE}/provinces.csv`)
  const provinces = parseCsv(provText, 2)
  console.log(`  Parsed ${provinces.length} provinces`)
  await batchUpsert(provinces, 50, async (p) => {
    await db.province.upsert({
      where: { id: p.id },
      update: { name: p.name },
      create: { id: p.id, name: p.name },
    })
  })

  // 2) Regencies (kota/kabupaten)
  console.log('Step 2: Regencies (Kota/Kabupaten)')
  const regText = await fetchCsv(`${BASE}/regencies.csv`)
  const regencies = parseRegenciesCsv(regText)
  console.log(`  Parsed ${regencies.length} regencies`)
  await batchUpsert(regencies, 50, async (c) => {
    await db.city.upsert({
      where: { id: c.id },
      update: { name: c.name, provinceId: c.provinceId },
      create: { id: c.id, name: c.name, provinceId: c.provinceId },
    })
  })

  // 3) Districts (kecamatan)
  console.log('Step 3: Districts (Kecamatan)')
  const distText = await fetchCsv(`${BASE}/districts.csv`)
  const districts = parseDistrictsCsv(distText)
  console.log(`  Parsed ${districts.length} districts`)
  await batchUpsert(districts, 100, async (d) => {
    await db.district.upsert({
      where: { id: d.id },
      update: { name: d.name, cityId: d.cityId },
      create: { id: d.id, name: d.name, cityId: d.cityId },
    })
  })

  // Summary
  const provinceCount = await db.province.count()
  const cityCount = await db.city.count()
  const districtCount = await db.district.count()
  console.log('')
  console.log(`✅ Seeding lengkap selesai!`)
  console.log(`   ${provinceCount} provinsi`)
  console.log(`   ${cityCount} kota/kabupaten`)
  console.log(`   ${districtCount} kecamatan`)
}

main()
  .catch((e) => {
    console.error('❌ Seed wilayah lengkap error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
