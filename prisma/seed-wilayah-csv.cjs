// Seed Wilayah Lengkap dari CSV Kemendagri 2025
// 38 Provinsi, 514 Kabupaten/Kota, 7.285 Kecamatan
// Run: node prisma/seed-wilayah-csv.cjs

const { PrismaClient } = require('../node_modules/@prisma/client')
const prisma = new PrismaClient()
const fs = require('fs')
const readline = require('readline')

async function main() {
  console.log('🗺️  Seeding wilayah dari CSV Kemendagri 2025...\n')
  
  // Clear existing
  await prisma.district.deleteMany({})
  await prisma.city.deleteMany({})
  await prisma.province.deleteMany({})
  console.log('✓ Cleared existing data')
  
  // Parse CSV
  const fileStream = fs.createReadStream('/home/z/my-project/upload/wilayah_indonesia.csv')
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity })
  
  const provinces = new Map() // id -> { id, name }
  const cities = new Map()    // id -> { id, provinceId, name }
  const districts = []        // { id, cityId, name }
  
  let firstLine = true
  let lineCount = 0
  
  for await (const line of rl) {
    if (firstLine) { firstLine = false; continue }
    
    // Parse CSV line: district_id,district_code,district_name,regency_id,regency_code,regency_name,province_id,province_code,province_name
    const parts = line.split(',')
    if (parts.length < 9) continue
    
    const provinceId = parts[6].trim()
    const provinceName = parts[8].trim().replace(/"/g, '')
    const regencyId = parts[3].trim()
    const regencyName = parts[5].trim().replace(/"/g, '')
    const districtId = parts[1].trim()
    const districtName = parts[2].trim().replace(/"/g, '')
    
    if (!provinceId || !provinceName) continue
    
    // Collect unique provinces
    if (!provinces.has(provinceId)) {
      provinces.set(provinceId, { id: provinceId, name: provinceName })
    }
    
    // Collect unique cities (use regency_code as id)
    if (!cities.has(regencyId)) {
      cities.set(regencyId, { id: regencyId, provinceId, name: regencyName })
    }
    
    // Collect all districts
    districts.push({ id: districtId, cityId: regencyId, name: districtName })
    
    lineCount++
    if (lineCount % 1000 === 0) {
      console.log(`  ...parsed ${lineCount} kecamatan`)
    }
  }
  
  console.log(`\n✓ Parsed CSV: ${provinces.size} provinsi, ${cities.size} kota, ${districts.length} kecamatan`)
  
  // Seed provinces
  console.log('Seeding provinces...')
  for (const [id, p] of provinces) {
    await prisma.province.create({ data: { id: p.id, name: p.name } })
  }
  console.log(`  ✓ ${provinces.size} provinces`)
  
  // Seed cities
  console.log('Seeding cities...')
  for (const [id, c] of cities) {
    await prisma.city.create({ data: { id: c.id, provinceId: c.provinceId, name: c.name } })
  }
  console.log(`  ✓ ${cities.size} cities`)
  
  // Seed districts
  console.log('Seeding districts...')
  let distCount = 0
  for (const d of districts) {
    await prisma.district.create({ data: { id: d.id, cityId: d.cityId, name: d.name } })
    distCount++
    if (distCount % 1000 === 0) {
      console.log(`  ...${distCount} kecamatan seeded`)
    }
  }
  console.log(`  ✓ ${distCount} districts`)
  
  console.log(`\n📊 SUMMARY (Kepmendagri 2025):`)
  console.log(`  • ${provinces.size} Provinsi`)
  console.log(`  • ${cities.size} Kota/Kabupaten`)
  console.log(`  • ${districts.length} Kecamatan`)
  console.log(`\n✅ SEED COMPLETE!`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
