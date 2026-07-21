// Seed additional product categories + demo products so the user can test
// the dynamic category filter on the merchandise page.
//
// Idempotent: safe to re-run; existing rows are kept.

import { db } from '../src/lib/db'

async function main() {
  console.log('🌱 Seeding additional product categories + demo products...')

  // ----- Categories ---------------------------------------------------------
  const categories = [
    { name: 'Daur Ulang Plastik', description: 'Produk dari olahan plastik daur ulang' },
    { name: 'Kerajinan Tangan',   description: 'Kerajinan tangan buatan warga & UMKM lokal' },
    { name: 'Kompos & Pupuk Organik', description: 'Pupuk organik dari sampah dapur & dedaunan' },
    { name: 'Tas Belanja Ramah Lingkungan', description: 'Tas belanja reusable dari kain perca' },
    { name: 'Merchandise Logo',   description: 'Merchandise resmi Bank Sampah Sukamaju' },
  ]

  const catRecords: { id: string; name: string }[] = []
  for (const c of categories) {
    const slug = c.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
    const rec = await db.productCategory.upsert({
      where: { slug },
      update: { description: c.description, isActive: true },
      create: { name: c.name, slug, description: c.description, isActive: true },
    })
    catRecords.push({ id: rec.id, name: rec.name })
    console.log(`  ✓ Kategori: ${rec.name} (${rec.id})`)
  }

  // ----- Demo products ------------------------------------------------------
  // Use the existing product images in /public/uploads/products so we don't
  // need to fetch anything from the internet.
  const img = (file: string) => `/uploads/products/${file}`

  const products = [
    {
      name: 'Paving Block dari Plastik Daur Ulang',
      slug: 'paving-block-plastik',
      description: 'Paving block 20x10x6 cm dari campuran plastik LDPE dan pasir. Kuat, anti-air, dan tahan lama.',
      image: img('paving-block.png'),
      unit: 'pcs', price: 5000, stock: 19, weightGram: 1200,
      categoryName: 'Daur Ulang Plastik',
    },
    {
      name: 'Pot Tanaman dari Botol Plastik',
      slug: 'pot-botol-plastik',
      description: 'Pot tanaman hias hasil daur ulang botol plastik bekas. Cocok untuk tanaman kecil dan sukulen.',
      image: img('produk-1784016395596-a0d6d60edd2ff00c.png'),
      unit: 'pcs', price: 8000, stock: 25, weightGram: 150,
      categoryName: 'Daur Ulang Plastik',
    },
    {
      name: 'Tempat Pensil dari Kaleng Bekas',
      slug: 'tempat-pensil-kaleng',
      description: 'Tempat pensil unik hasil dekorasi kaleng bekas dengan cat warna-warni.',
      image: img('kerajinan.png'),
      unit: 'pcs', price: 12000, stock: 15, weightGram: 120,
      categoryName: 'Kerajinan Tangan',
    },
    {
      name: 'Gantungan Kunci dari Tutup Botol',
      slug: 'gantungan-kunci-tutup-botol',
      description: 'Gantungan kunci handmade dari tutup botol bekas yang dicat dan dilapisi resin.',
      image: img('produk-1784016456500-51e3db500084b94f.png'),
      unit: 'pcs', price: 7000, stock: 40, weightGram: 50,
      categoryName: 'Kerajinan Tangan',
    },
    {
      name: 'Kompos Organik 1 kg',
      slug: 'kompos-organik-1kg',
      description: 'Pupuk kompos organik dari sampah dapur dan dedaunan, sudah matang dan siap pakai untuk tanaman.',
      image: img('produk-1784150619397-0837e3116d589d30.png'),
      unit: 'kg', price: 10000, stock: 50, weightGram: 1000,
      categoryName: 'Kompos & Pupuk Organik',
    },
    {
      name: 'Pupuk Cair Organik 500 ml',
      slug: 'pupuk-cair-organik-500ml',
      description: 'Pupuk cair dari fermentasi sampah organik. Kaya nutrisi untuk menyuburkan tanaman.',
      image: img('produk-1784016395596-a0d6d60edd2ff00c.png'),
      unit: 'botol', price: 15000, stock: 30, weightGram: 600,
      categoryName: 'Kompos & Pupuk Organik',
    },
    {
      name: 'Tas Belanja Perca Ukuran Besar',
      slug: 'tas-belanja-perca-besar',
      description: 'Tas belanja reusable dari kain perca sisa pabrik. Kapasitas besar, kuat, dan bisa dicuci.',
      image: img('kerajinan.png'),
      unit: 'pcs', price: 25000, stock: 20, weightGram: 200,
      categoryName: 'Tas Belanja Ramah Lingkungan',
    },
    {
      name: 'Pouch Mini Kain Perca',
      slug: 'pouch-mini-kain-perca',
      description: 'Pouch mini mungil dari kain perca untuk menyimpan koin, kunci, atau kosmetik kecil.',
      image: img('produk-1784016456500-51e3db500084b94f.png'),
      unit: 'pcs', price: 9000, stock: 35, weightGram: 60,
      categoryName: 'Tas Belanja Ramah Lingkungan',
    },
    {
      name: 'Tumbler Logo Bank Sampah Sukamaju',
      slug: 'tumbler-logo-bank-sampah',
      description: 'Tumbler 500 ml dengan logo Bank Sampah Sukamaju. Bahan stainless steel, menjaga suhu 6 jam.',
      image: img('produk-1784150619397-0837e3116d589d30.png'),
      unit: 'pcs', price: 45000, stock: 10, weightGram: 350,
      categoryName: 'Merchandise Logo',
    },
    {
      name: 'Kaos Logo Bank Sampah',
      slug: 'kaos-logo-bank-sampah',
      description: 'Kaos katun combed 30s dengan logo Bank Sampah Sukamaju. Tersedia ukuran S, M, L, XL.',
      image: img('paving-block.png'),
      unit: 'pcs', price: 60000, stock: 25, weightGram: 200,
      categoryName: 'Merchandise Logo',
    },
  ]

  for (const p of products) {
    const cat = catRecords.find((c) => c.name === p.categoryName)
    if (!cat) {
      console.warn(`  ⚠ Kategori tidak ditemukan untuk produk ${p.name}, skip`)
      continue
    }

    const existing = await db.product.findUnique({ where: { slug: p.slug } })
    if (existing) {
      // Update agar yakin data konsisten (dijual online, kategori benar, dst)
      await db.product.update({
        where: { id: existing.id },
        data: {
          name: p.name,
          description: p.description,
          image: p.image,
          images: JSON.stringify([p.image]),
          unit: p.unit,
          price: p.price,
          stock: p.stock,
          weightGram: p.weightGram,
          productCategoryId: cat.id,
          isActive: true,
          dijualOnline: true,
          dijualOffline: true,
          minOrderQty: 1,
        },
      })
      console.log(`  ↻ Produk: ${p.name} (update)`)
    } else {
      await db.product.create({
        data: {
          name: p.name,
          slug: p.slug,
          description: p.description,
          image: p.image,
          images: JSON.stringify([p.image]),
          unit: p.unit,
          price: p.price,
          stock: p.stock,
          weightGram: p.weightGram,
          productCategoryId: cat.id,
          isActive: true,
          dijualOnline: true,
          dijualOffline: true,
          minOrderQty: 1,
        },
      })
      console.log(`  + Produk: ${p.name} (baru)`)
    }
  }

  // ----- Summary ------------------------------------------------------------
  const allCats = await db.productCategory.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: { where: { isActive: true, dijualOnline: true } } } } },
  })
  console.log('\n✅ Seeding selesai. Ringkasan kategori aktif:')
  for (const c of allCats) {
    console.log(`   • ${c.name} (${c._count.products} produk)`)
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
