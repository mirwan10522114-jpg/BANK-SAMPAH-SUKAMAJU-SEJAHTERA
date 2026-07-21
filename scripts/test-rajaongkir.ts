// Test RajaOngkir calculate cost with real API key
import { getRajaOngkirRates } from '../src/lib/rajaongkir'

async function main() {
  console.log('Test 1: Bandung → Jakarta, 1000g')
  const r1 = await getRajaOngkirRates({
    districtId: '32.73.01',
    districtName: 'Bandung Wetan',
    cityName: 'Bandung',
    totalWeightGram: 1000,
  })
  console.log('Source:', r1.source)
  console.log('Cheapest:', r1.cheapestCost)
  console.log('Options:', r1.options.length)
  console.log('First 3 options:')
  for (const o of r1.options.slice(0, 3)) {
    console.log(`  - ${o.serviceDisplay}: ${o.cost} (${o.etd})`)
  }
  console.log('Message:', r1.message)
  console.log('')

  console.log('Test 2: Bandung → Surabaya, 1500g')
  const r2 = await getRajaOngkirRates({
    districtId: '32.73.01',
    districtName: 'Bandung Wetan',
    cityName: 'Surabaya',
    totalWeightGram: 1500,
  })
  console.log('Source:', r2.source)
  console.log('Cheapest:', r2.cheapestCost)
  console.log('Options:', r2.options.length)
  console.log('')

  console.log('Test 3: Empty districtId (should fallback)')
  const r3 = await getRajaOngkirRates({
    districtId: 'unknown',
    districtName: 'Unknown',
    cityName: 'Unknown City',
    totalWeightGram: 1000,
  })
  console.log('Source:', r3.source)
  console.log('Cheapest:', r3.cheapestCost)
  console.log('Message:', r3.message)
}

main()
  .catch((e) => {
    console.error('Test failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    const { db } = await import('../src/lib/db')
    await db.$disconnect()
  })
