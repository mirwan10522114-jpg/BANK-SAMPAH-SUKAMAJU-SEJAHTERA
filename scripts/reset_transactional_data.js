const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Memulai proses pengosongan data transaksional...')

  try {
    // 0. Disable foreign key checks if possible (Not supported directly in Prisma deleteMany, so we delete children first)
    
    // 1. Delete Child Tables first (to avoid foreign key constraint violations)
    console.log('Menghapus data item transaksi (child tables)...')
    await prisma.itemTransaksiNabung.deleteMany()
    await prisma.itemTransaksiSedekah.deleteMany()
    await prisma.itemTransaksiPenjualanMitra.deleteMany()
    await prisma.itemPesananToko.deleteMany()
    await prisma.itemPenjualanProduk.deleteMany()
    await prisma.inputPengolahan.deleteMany()
    await prisma.outputPengolahan.deleteMany()
    await prisma.pergerakanProduk.deleteMany()
    await prisma.pergerakanInventaris.deleteMany()

    // 2. Delete Operational Transactions
    console.log('Menghapus data transaksi operasional (Bank Sampah)...')
    await prisma.transaksiNabung.deleteMany()
    await prisma.transaksiSedekah.deleteMany()
    await prisma.permintaanPenarikan.deleteMany()
    await prisma.transaksiPenjualanMitra.deleteMany()
    await prisma.inventaris.deleteMany()
    await prisma.riwayatSaldo.deleteMany()
    await prisma.saldo.deleteMany()
    await prisma.penjualanProduk.deleteMany()
    await prisma.riwayatStatusPesananToko.deleteMany()
    await prisma.pesananToko.deleteMany()
    await prisma.kasBankSampah.deleteMany()
    await prisma.riwayatPoin.deleteMany()
    await prisma.pencairanPoin.deleteMany()
    await prisma.transaksiPengolahan.deleteMany()
    await prisma.penukaranPoin.deleteMany()
    await prisma.pelepasanSaldo.deleteMany()
    // NOTE: qcQueue & withdrawalQueue do not exist in the schema anymore

    // 3. Delete Koperasi Transactions
    console.log('Menghapus data transaksi koperasi...')
    await prisma.koperasiPinjamanAngsuran.deleteMany()
    await prisma.koperasiPinjamanPerbaikan.deleteMany()
    await prisma.koperasiSimpananTransaksi.deleteMany()
    await prisma.koperasiSimpananSaldo.deleteMany()
    await prisma.koperasiPinjaman.deleteMany()
    await prisma.koperasiKasTransaksi.deleteMany()
    await prisma.koperasiPenarikanSukarela.deleteMany()
    await prisma.koperasiAnggotaKeluar.deleteMany()
    
    // Anggota koperasi dihapus karena itu data operasional nasabah
    console.log('Menghapus data anggota koperasi...')
    await prisma.koperasiAnggota.deleteMany()

    // 4. Delete Notifications
    console.log('Menghapus notifikasi dan log aktivitas...')
    await prisma.notifikasi.deleteMany()
    await prisma.logTugasHarianAdmin.deleteMany()

    // 5. Delete Non-Admin/Owner Users
    console.log('Menghapus data pengguna (nasabah)...')
    // Temukan semua pengguna yang bukan admin atau owner
    const usersToDelete = await prisma.pengguna.findMany({
      where: {
        NOT: {
          OR: [
            { roles: { contains: 'admin' } },
            { roles: { contains: 'owner' } }
          ]
        }
      }
    })
    
    const userIds = usersToDelete.map(u => u.id)
    if (userIds.length > 0) {
      await prisma.pengguna.deleteMany({
        where: { id: { in: userIds } }
      })
      console.log(`Berhasil menghapus ${userIds.length} pengguna nasabah.`)
    } else {
      console.log('Tidak ada pengguna nasabah yang perlu dihapus.')
    }

    console.log('✅ Semua data transaksional berhasil dihapus!')
    
    // 6. Delete Products as requested
    console.log('Menghapus data produk dan kategori produk...')
    await prisma.produk.deleteMany()
    await prisma.kategoriProduk.deleteMany()
    
    console.log('Data Master (Jenis Sampah, Admin, Owner, Wilayah) tetap aman.')

  } catch (error) {
    console.error('Terjadi kesalahan saat menghapus data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
