import { db } from '../src/lib/db'

async function main() {
  console.log('🌱 Seeding database...')

  // ===== USERS =====
  const admin = await db.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {},
    create: {
      name: 'Admin Utama',
      email: 'admin@gmail.com',
      nik: '1111111111111111',
      roles: '["admin"]',
      phone: '081111111111',
      password: 'password',
    },
  })

  const owner = await db.user.upsert({
    where: { email: 'owner@gmail.com' },
    update: {},
    create: {
      name: 'Owner Sistem',
      email: 'owner@gmail.com',
      nik: '2222222222222222',
      roles: '["owner"]',
      phone: '082222222222',
      password: 'password',
    },
  })

  // ===== BALANCES =====
  for (const u of [admin, owner]) {
    await db.balance.upsert({
      where: { userId: u.id },
      update: {},
      create: { userId: u.id },
    })
  }

  // ===== MEMBER CODE COUNTER =====
  await db.memberCodeCounter.upsert({
    where: { prefix: 'BS' },
    update: { lastNumber: 0 },
    create: { prefix: 'BS', lastNumber: 0 },
  })

  // ===== WASTE CATEGORIES =====
  const categoriesData = [
    { name: 'Kertas', slug: 'kertas', codePrefix: 'KT', description: 'Dus, duplex, arsip, buku bekas.' },
    { name: 'Logam', slug: 'logam', codePrefix: 'LG', description: 'Besi, kaleng, tembaga, seng, aluminium.' },
    { name: 'Botol', slug: 'botol', codePrefix: 'BL', description: 'Botol kaca bening, botol warna, beling.' },
    { name: 'Plastik', slug: 'plastik', codePrefix: 'PL', description: 'PET, kresek, galon, jenis plastik lain.' },
    { name: 'Lain-lain', slug: 'lain-lain', codePrefix: 'L', description: 'Karpet, sandal karet, minyak jelantah, fiber, paralon.' },
    { name: 'Residu', slug: 'residu', codePrefix: 'R', description: 'Sampah multilayer tak terdaur.' },
  ]
  const catMap: Record<string, string> = {}
  for (const c of categoriesData) {
    const cat = await db.wasteCategory.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    })
    catMap[c.name] = cat.id
  }

  // ===== WASTE ITEMS + PRICES =====
  const itemsData: { cat: string; code: string; name: string; slug: string; unit: string; price: number }[] = [
    { cat: 'Kertas', code: 'KT1', name: 'Dus', slug: 'dus-kt1', unit: 'kg', price: 1000 },
    { cat: 'Kertas', code: 'KT2', name: 'Duplex', slug: 'duplex-kt2', unit: 'kg', price: 300 },
    { cat: 'Kertas', code: 'KT3', name: 'Arsip', slug: 'arsip-kt3', unit: 'kg', price: 800 },
    { cat: 'Kertas', code: 'KT4', name: 'Buku', slug: 'buku-kt4', unit: 'kg', price: 500 },
    { cat: 'Logam', code: 'LG1', name: 'Besi 1', slug: 'besi-1-lg1', unit: 'kg', price: 1500 },
    { cat: 'Logam', code: 'LG2', name: 'Besi 2 (Paku)', slug: 'besi-2-paku-lg2', unit: 'kg', price: 1000 },
    { cat: 'Logam', code: 'LG3', name: 'Kaleng', slug: 'kaleng-lg3', unit: 'kg', price: 500 },
    { cat: 'Logam', code: 'LG4', name: 'Kaleng Aluminium/Aro', slug: 'kaleng-aluminium-lg4', unit: 'kg', price: 4500 },
    { cat: 'Logam', code: 'LG5', name: 'Tembaga', slug: 'tembaga-lg5', unit: 'kg', price: 3000 },
    { cat: 'Logam', code: 'LG6', name: 'Seng', slug: 'seng-lg6', unit: 'kg', price: 500 },
    { cat: 'Botol', code: 'BL1', name: 'Botol Bening', slug: 'botol-bening-bl1', unit: 'pcs', price: 100 },
    { cat: 'Botol', code: 'BL2', name: 'Botol Warna/Kecap', slug: 'botol-warna-bl2', unit: 'pcs', price: 200 },
    { cat: 'Botol', code: 'BL3', name: 'Beling', slug: 'beling-bl3', unit: 'kg', price: 300 },
    { cat: 'Plastik', code: 'PL1', name: 'AGB', slug: 'agb-pl1', unit: 'kg', price: 2700 },
    { cat: 'Plastik', code: 'PL2', name: 'AGK', slug: 'agk-pl2', unit: 'kg', price: 1500 },
    { cat: 'Plastik', code: 'PL3', name: 'PET Botol Bersih', slug: 'pet-bersih-pl3', unit: 'kg', price: 2000 },
    { cat: 'Plastik', code: 'PL4', name: 'PET Botol Kotor', slug: 'pet-kotor-pl4', unit: 'kg', price: 1500 },
    { cat: 'Plastik', code: 'PL5', name: 'Ale-Ale', slug: 'ale-ale-pl5', unit: 'kg', price: 1000 },
    { cat: 'Plastik', code: 'PL6', name: 'Mizone Bersih', slug: 'mizone-bersih-pl6', unit: 'kg', price: 500 },
    { cat: 'Plastik', code: 'PL7', name: 'Mizone Kotor', slug: 'mizone-kotor-pl7', unit: 'kg', price: 300 },
    { cat: 'Plastik', code: 'PL8', name: 'Jeli', slug: 'jeli-pl8', unit: 'kg', price: 2000 },
    { cat: 'Plastik', code: 'PL9', name: 'Kerasan', slug: 'kerasan-pl9', unit: 'kg', price: 300 },
    { cat: 'Plastik', code: 'PL10', name: 'Gebrus 1 (GB 1)', slug: 'gebrus-1-pl10', unit: 'kg', price: 1200 },
    { cat: 'Plastik', code: 'PL11', name: 'Gebrus 2 (GB 2)', slug: 'gebrus-2-pl11', unit: 'kg', price: 1000 },
    { cat: 'Plastik', code: 'PL11A', name: 'Gebrus 3 (GB 3)', slug: 'gebrus-3-pl11a', unit: 'kg', price: 500 },
    { cat: 'Residu', code: 'R1', name: 'Plastik Residu Multilayer', slug: 'residu-multilayer-r1', unit: 'kg', price: 500 },
  ]
  for (const it of itemsData) {
    const item = await db.wasteItem.upsert({
      where: { code: it.code },
      update: {},
      create: {
        wasteCategoryId: catMap[it.cat],
        code: it.code,
        name: it.name,
        slug: it.slug,
        unit: it.unit,
        pricePerUnit: it.price,
      },
    })
    await db.wastePrice.upsert({
      where: { id: `seed-${it.code}` },
      update: {},
      create: {
        id: `seed-${it.code}`,
        wasteItemId: item.id,
        pricePerUnit: it.price,
        effectiveFrom: new Date('2026-06-19'),
        notes: 'Harga awal seed (banner Bank Sampah).',
      },
    })
  }

  // ===== POINT RULES =====
  await db.pointRule.upsert({
    where: { id: 'seed-point-rule' },
    update: {},
    create: {
      id: 'seed-point-rule',
      pointsPerRupiah: 0.01, // 1 poin per 100 rupiah
      rupiahPerPoint: 100, // 1 poin = 100 rupiah saat cash out
      effectiveFrom: new Date('2026-01-01'),
      notes: 'Aturan poin default: 1 poin per Rp100 nabung, 1 poin = Rp100 saat ditukar.',
      isActive: true,
    },
  })

  // ===== KOPERASI SETTINGS =====
  await db.koperasiSetting.upsert({
    where: { id: 'seed-koperasi-setting' },
    update: {},
    create: {
      id: 'seed-koperasi-setting',
      namaKoperasi: 'Koperasi Sukamaju Sejahtera',
      nominalSimpananPokok: 100000,
      nominalSimpananWajib: 50000,
      biayaAdminPinjaman: 0,
      minimalBulanAnggota: 3,
      saldoKasAwal: 0,
      dendaTerlambatPerHari: 1000,
      sukuBungaPinjaman: 12, // 12% flat per tahun
    },
  })

  // ===== PARTNERS =====
  const partnersData = [
    { name: 'CV Logam Jaya', type: 'pengepul', phone: '022-123456', address: 'Bandung' },
    { name: 'PT Plastik Mandiri', type: 'pengepul', phone: '022-654321', address: 'Cimahi' },
    { name: 'UD Kertas Sejahtera', type: 'pengepul', phone: '022-111222', address: 'Padalarang' },
  ]
  for (const p of partnersData) {
    const exists = await db.partner.findFirst({ where: { name: p.name } })
    if (!exists) await db.partner.create({ data: p })
  }

  // ===== PRODUCTS =====
  const productsData = [
    { name: 'Pupuk Organik 1kg', slug: 'pupuk-organik-1kg', unit: 'pcs', price: 15000, pointsCost: 150, stock: 20 },
    { name: 'Tas Belanja Upcycle', slug: 'tas-belanja-upcycle', unit: 'pcs', price: 25000, pointsCost: 250, stock: 10 },
    { name: 'Pot Bunga Plastik', slug: 'pot-bunga-plastik', unit: 'pcs', price: 10000, pointsCost: 100, stock: 15 },
    { name: 'Bijih Plastik PET (per kg)', slug: 'bijih-plastik-pet', unit: 'kg', price: 5000, pointsCost: 50, stock: 0 },
  ]
  for (const p of productsData) {
    await db.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    })
  }

  console.log('✅ Seed complete!')
  console.log(`   Users: admin (admin@gmail.com), owner (owner@gmail.com)`)
  console.log(`   Waste categories: 6, items: 26`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })