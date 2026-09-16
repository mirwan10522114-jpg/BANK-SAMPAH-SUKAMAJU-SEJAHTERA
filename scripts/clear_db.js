const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');
  
  console.log('Menghapus data transaksi dan operasional...');
  
  const tablesToClear = [
    'logTugasHarianAdmin',
    'kegiatan',
    'article',
    'aturanPenjualan',
    'tokoSetting',
    'riwayatStatusPesananToko',
    'itemPesananToko',
    'pesananToko',
    'koperasiPinjamanPerbaikan',
    'koperasiPenarikanSukarela',
    'koperasiKasTransaksi',
    'koperasiPinjamanAngsuran',
    'koperasiPinjaman',
    'koperasiSimpananTransaksi',
    'koperasiAnggotaKeluar',
    'pelepasanSaldo',
    'kasBankSampah',
    'permintaanPenarikan',
    'penukaranPoin',
    'resepPengolahan',
    'outputPengolahan',
    'inputPengolahan',
    'transaksiPengolahan',
    'itemPenjualanProduk',
    'penjualanProduk',
    'pergerakanProduk',
    'hargaProduk',
    'produk',
    'kategoriProduk',
    'itemTransaksiPenjualanMitra',
    'transaksiPenjualanMitra',
    'mitra',
    'pergerakanInventaris',
    'inventaris',
    'itemTransaksiSedekah',
    'transaksiSedekah',
    'itemTransaksiNabung',
    'transaksiNabung',
    'pencairanPoin',
    'riwayatPoin',
    'riwayatSaldo',
    'aturanPoin',
    'penghitungKodeAnggota',
    'notifikasi'
  ];

  for (const table of tablesToClear) {
    if (prisma[table]) {
      console.log(`Clearing ${table}...`);
      await prisma[table].deleteMany();
    }
  }

  console.log('Menghapus pengguna nasabah dan koperasi...');
  
  // Find all non-admin and non-owner users
  const users = await prisma.pengguna.findMany();
  const usersToDelete = users.filter(u => {
    return !u.roles.includes('admin') && !u.roles.includes('owner');
  });
  
  const userIdsToDelete = usersToDelete.map(u => u.id);
  
  if (userIdsToDelete.length > 0) {
    // Delete their related KoperasiAnggota and SimpananSaldo
    const anggota = await prisma.koperasiAnggota.findMany({
      where: { penggunaId: { in: userIdsToDelete } }
    });
    const anggotaIds = anggota.map(a => a.id);
    
    if (anggotaIds.length > 0) {
      await prisma.koperasiSimpananSaldo.deleteMany({
        where: { koperasiAnggotaId: { in: anggotaIds } }
      });
      await prisma.koperasiAnggota.deleteMany({
        where: { id: { in: anggotaIds } }
      });
    }
    
    // Delete their Saldo
    await prisma.saldo.deleteMany({
      where: { penggunaId: { in: userIdsToDelete } }
    });
    
    // Delete the users
    await prisma.pengguna.deleteMany({
      where: { id: { in: userIdsToDelete } }
    });
  }

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
  console.log('Proses pembersihan selesai!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
