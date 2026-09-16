const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Memulai proses penghapusan data produk...')

  try {
    // Pastikan child tables dihapus
    console.log('Menghapus data terkait produk...')
    await prisma.itemPesananToko.deleteMany()
    await prisma.itemPenjualanProduk.deleteMany()
    await prisma.pergerakanProduk.deleteMany()
    await prisma.hargaProduk.deleteMany()
    await prisma.outputPengolahan.deleteMany()
    await prisma.resepPengolahan.deleteMany()
    await prisma.penukaranPoin.deleteMany()

    console.log('Menghapus data master produk...')
    await prisma.produk.deleteMany()
    
    console.log('Menghapus kategori produk...')
    await prisma.kategoriProduk.deleteMany()

    console.log('✅ Semua data produk berhasil dikosongkan!')

  } catch (error) {
    console.error('Terjadi kesalahan saat menghapus data produk:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
