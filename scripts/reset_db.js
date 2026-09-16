const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Memulai proses reset database...');

  // 1. Disable FK checks to allow truncation
  await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 0;`);
  console.log('Foreign key checks disabled.');

  // 2. Tables to truncate
  const tables = [
    // Keuangan & Saldo
    'Saldo', 'RiwayatSaldo', 'RiwayatPoin', 'PencairanPoin', 'PelepasanSaldo', 'KasBankSampah', 'PermintaanPenarikan',
    // Operasional Sampah
    'ItemTransaksiNabung', 'TransaksiNabung', 'ItemTransaksiSedekah', 'TransaksiSedekah',
    // Inventaris & Pengolahan
    'PergerakanInventaris', 'Inventaris', 'OutputPengolahan', 'InputPengolahan', 'TransaksiPengolahan', 'ResepPengolahan',
    // Mitra & Pengepul
    'ItemTransaksiPenjualanMitra', 'TransaksiPenjualanMitra', 'Mitra',
    // Produk & Toko
    'ItemPenjualanProduk', 'PenjualanProduk', 'PergerakanProduk', 'HargaProduk', 'Produk', 'KategoriProduk',
    'ItemPesananToko', 'RiwayatStatusPesananToko', 'PesananToko',
    // Koperasi
    'KoperasiPinjamanAngsuran', 'KoperasiPinjaman', 'KoperasiSimpananTransaksi', 'KoperasiSimpananSaldo', 
    'KoperasiPenarikanSukarela', 'KoperasiPinjamanPerbaikan', 'KoperasiAnggotaKeluar', 'KoperasiKasTransaksi', 
    'KoperasiAnggota',
    // Sistem & Lainnya
    'PenukaranPoin', 'Notifikasi', 'PenghitungKodeAnggota', 'LogTugasHarianAdmin', 'Article', 'Kegiatan'
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${table};`);
      console.log(`Truncated ${table}`);
    } catch (e) {
      console.error(`Gagal truncate ${table}:`, e.message);
    }
  }

  // 3. Clear associations for HargaSampah so we can safely delete users
  console.log('Mengosongkan relasi HargaSampah dengan Pengguna...');
  await prisma.$executeRawUnsafe(`UPDATE HargaSampah SET createdById = NULL;`);

  // 4. Delete non-admin/owner users
  console.log('Menghapus Pengguna (selain admin dan owner)...');
  const result = await prisma.$executeRawUnsafe(`
    DELETE FROM Pengguna 
    WHERE roles NOT LIKE '%"admin"%' 
      AND roles NOT LIKE '%"owner"%';
  `);
  console.log(`Menghapus sejumlah user.`);

  // 5. Re-enable FK checks
  await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 1;`);
  console.log('Foreign key checks enabled.');

  console.log('Reset database selesai.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
