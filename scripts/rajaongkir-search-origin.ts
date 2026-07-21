// Helper script to look up the RajaOngkir destination ID for the toko's
// origin kecamatan. Run this once after setting RAJAONGKIR_API_KEY in .env,
// then copy the returned ID into RAJAONGKIR_ORIGIN_ID.
//
// Usage:
//   RAJAONGKIR_API_KEY=xxx bun run scripts/rajaongkir-search-origin.ts
//
// Or pass the keyword as argument:
//   RAJAONGKIR_API_KEY=xxx bun run scripts/rajaongkir-search-origin.ts "coblong, bandung"

const keyword = process.argv[2] || 'coblong, bandung'
const apiKey = process.env.RAJAONGKIR_API_KEY

if (!apiKey) {
  console.error(
    'RAJAONGKIR_API_KEY env var wajib di-set. Dapatkan dari dashboard collaborator.komerce.id → Developer → API Key.'
  )
  process.exit(1)
}

async function main() {
  const url = `https://rajaongkir.komerce.id/api/v1/destination/search?search=${encodeURIComponent(keyword)}`
  console.log(`Mencari: ${keyword}`)
  console.log(`GET ${url}\n`)

  const res = await fetch(url, { method: 'GET', headers: { key: apiKey } })
  const text = await res.text()
  if (!res.ok) {
    console.error(`HTTP ${res.status}:`)
    console.error(text)
    process.exit(1)
  }

  let json: any
  try {
    json = JSON.parse(text)
  } catch {
    console.error('Response bukan JSON:')
    console.error(text)
    process.exit(1)
  }

  const items: any[] = Array.isArray(json?.data) ? json.data : []
  if (items.length === 0) {
    console.error('Tidak ada hasil. Coba keyword lain.')
    process.exit(1)
  }

  console.log(`Ditemukan ${items.length} hasil (5 teratas):\n`)
  for (const item of items.slice(0, 5)) {
    console.log(
      `ID: ${item.id}\n  Nama: ${item.name || '-'}\n  Detail: ${item.detail || '-'}\n`
    )
  }

  console.log('\n→ Copy ID dari hasil di atas ke .env:')
  console.log(`  RAJAONGKIR_ORIGIN_ID=${items[0].id}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
