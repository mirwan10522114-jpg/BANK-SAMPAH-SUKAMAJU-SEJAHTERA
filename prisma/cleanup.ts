// Cleanup script: empty all tables EXCEPT WasteCategory, WasteItem, WastePrice
// Then re-seed minimal infrastructure (admin user, koperasi settings, point rule, member code counter)
import { db } from '../src/lib/db'

async function main() {
  console.log('🧹 Emptying all tables EXCEPT WasteCategory, WasteItem, WastePrice...')

  // Delete children first to respect FK constraints
  const order = [
    // transaction items
    'savingTransactionItem',
    'sedekahTransactionItem',
    'salesTransactionItem',
    'productSaleItem',
    'processingInput',
    'processingOutput',
    'koperasiPinjamanAngsuran',
    'koperasiAnggotaKeluar',
    'koperasiSimpananTransaksi',
    'koperasiSimpananSaldo',
    'koperasiPenarikanSukarela',
    'koperasiPinjaman',
    'koperasiKasTransaksi',
    'inventoryMovement',
    'inventory',
    'productMovement',
    'productPrice',
    'productSale',
    'processingTransaction',
    'salesTransaction',
    'savingTransaction',
    'sedekahTransaction',
    'redemption',
    'withdrawalRequest',
    'pointCashOut',
    'pointHistory',
    'balanceHistory',
    'balance',
    'koperasiAnggota',
    'article',
    'partner',
    'product',
    'pointRule',
    'koperasiSetting',
    'memberCodeCounter',
    'user',
  ] as const

  const counts: Record<string, number> = {}
  for (const t of order) {
    const r = await (db as any)[t].deleteMany({})
    counts[t] = r.count
  }

  console.log('🗑️  Deleted records per table:')
  for (const [t, c] of Object.entries(counts)) {
    if (c > 0) console.log(`   - ${t}: ${c}`)
  }

  // Verify catalog tables intact
  const [cats, items, prices] = await Promise.all([
    db.wasteCategory.count(),
    db.wasteItem.count(),
    db.wastePrice.count(),
  ])
  console.log(`\n📦 Catalog preserved:`)
  console.log(`   - WasteCategory: ${cats}`)
  console.log(`   - WasteItem: ${items}`)
  console.log(`   - WastePrice: ${prices}`)

  // Re-seed minimal infrastructure so the app remains functional
  console.log('\n🌱 Re-seeding minimal infrastructure...')
  const admin = await db.user.create({
    data: {
      name: 'Admin Utama',
      email: 'admin@gmail.com',
      nik: '1111111111111111',
      roles: '["admin"]',
      phone: '081111111111',
      password: 'password',
    },
  })
  await db.balance.create({ data: { userId: admin.id } })

  await db.memberCodeCounter.create({ data: { prefix: 'BS', lastNumber: 0 } })

  await db.koperasiSetting.create({
    data: {
      namaKoperasi: 'Koperasi Sukamaju Sejahtera',
      nominalSimpananPokok: 100000,
      nominalSimpananWajib: 50000,
      biayaAdminPinjaman: 0,
      minimalBulanAnggota: 3,
      saldoKasAwal: 0,
      dendaTerlambatPerHari: 1000,
      sukuBungaPinjaman: 12,
    },
  })

  await db.pointRule.create({
    data: {
      pointsPerRupiah: 0.01,
      rupiahPerPoint: 100,
      effectiveFrom: new Date('2026-01-01'),
      notes: 'Aturan poin default: 1 poin per Rp100 nabung, 1 poin = Rp100 saat ditukar.',
      isActive: true,
    },
  })

  console.log('✅ Cleanup complete!')
  console.log('   Catalog (kategori/barang/harga) tetap utuh')
  console.log('   Data nasabah, transaksi, koperasi, inventaris, mitra, produk DIBERSIHKAN')
  console.log('   Re-seed: admin user, pengaturan koperasi, aturan poin, member code counter')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
