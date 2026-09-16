import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Disabling foreign key checks...')
  await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 0;`)

  const tablesToKeepFull = ['KategoriSampah', 'JenisSampah', 'HargaSampah', 'Province', 'City', 'District']
  
  const models = [
    'Notifikasi',
    'PenghitungKodeAnggota',
    'AturanPoin',
    'Saldo',
    'RiwayatSaldo',
    'RiwayatPoin',
    'PencairanPoin',
    'PermintaanPenarikan',
    'PelepasanSaldo',
    'ItemTransaksiNabung',
    'TransaksiNabung',
    'ItemTransaksiSedekah',
    'TransaksiSedekah',
    'InputPengolahan',
    'OutputPengolahan',
    'TransaksiPengolahan',
    'ResepPengolahan',
    'ItemTransaksiPenjualanMitra',
    'TransaksiPenjualanMitra',
    'Inventaris',
    'PergerakanInventaris',
    'KoperasiAnggota',
    'KoperasiAnggotaKeluar',
    'KoperasiSimpananTransaksi',
    'KoperasiPinjaman',
    'KoperasiPinjamanAngsuran',
    'KoperasiPinjamanPerbaikan',
    'KoperasiKas',
    'KoperasiKasTransaksi',
    'KasBankSampah',
    'KategoriProduk',
    'ProductItem',
    'HargaProduk',
    'PergerakanProduk',
    'ItemPenjualanProduk',
    'PenjualanProduk',
    'PenukaranPoin',
    'Article',
    'Kegiatan',
    'BankInfo',
    'ShippingCourier',
    'PesananToko',
    'ItemPesananToko',
    'RiwayatStatusPesananToko',
    'TokoCartItem',
  ]

  for (const model of models) {
    try {
      console.log(`Truncating ${model}...`)
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${model}\`;`)
    } catch (e: any) {
      console.error(`Error truncating ${model}: ${e.message}`)
    }
  }

  console.log('Cleaning up Users (keeping admin and owner)...')
  try {
    const result = await prisma.$executeRawUnsafe(`
      DELETE FROM \`Pengguna\` 
      WHERE roles NOT LIKE '%admin%' 
        AND roles NOT LIKE '%owner%';
    `)
    console.log('Users cleaned.')
  } catch (e: any) {
    console.error(`Error cleaning penggunas: ${e.message}`)
  }

  console.log('Enabling foreign key checks...')
  await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 1;`)
  console.log('Done!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
