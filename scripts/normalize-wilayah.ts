// Normalize nama provinsi/kota/kecamatan ke Title Case
// (dataset emsifa menggunakan UPPERCASE, kita ubah ke Title Case
// supaya tampil lebih natural di UI)
import { db } from '../src/lib/db'

function titleCase(s: string): string {
  // Khusus kata "DI", "DKI" biarkan tetap uppercase
  const keepUpper = new Set(['DI', 'DKI'])
  return s
    .split(' ')
    .map((word) => {
      if (keepUpper.has(word)) return word
      if (word.length === 0) return word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

async function main() {
  console.log('🔄 Normalisasi nama wilayah ke Title Case...')

  // Provinces
  const provinces = await db.province.findMany()
  console.log(`  Memproses ${provinces.length} provinsi...`)
  for (const p of provinces) {
    const normalized = titleCase(p.name)
    if (normalized !== p.name) {
      await db.province.update({ where: { id: p.id }, data: { name: normalized } })
    }
  }

  // Cities
  const cities = await db.city.findMany()
  console.log(`  Memproses ${cities.length} kota/kabupaten...`)
  for (const c of cities) {
    const normalized = titleCase(c.name)
    if (normalized !== c.name) {
      await db.city.update({ where: { id: c.id }, data: { name: normalized } })
    }
  }

  // Districts (dalam batch supaya tidak terlalu lambat)
  const districts = await db.district.findMany()
  console.log(`  Memproses ${districts.length} kecamatan...`)
  let updated = 0
  for (const d of districts) {
    const normalized = titleCase(d.name)
    if (normalized !== d.name) {
      await db.district.update({ where: { id: d.id }, data: { name: normalized } })
      updated++
    }
  }

  // Verify
  const cimahi = await db.city.findFirst({ where: { name: { contains: 'Cimahi' } } })
  const madiun = await db.city.findFirst({ where: { name: { contains: 'Madiun' } } })
  console.log(`✅ Normalisasi selesai. ${updated} kecamatan di-update.`)
  console.log(`   Sample: ${cimahi?.name}, ${madiun?.name}`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
