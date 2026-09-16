const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const data = [
  // KT - Kertas
  { kode: 'KT1', nama: 'DUS', harga: 1000, kategori: 'Kertas', unit: 'kg' },
  { kode: 'KT2', nama: 'DUPLEX', harga: 300, kategori: 'Kertas', unit: 'kg' },
  { kode: 'KT3', nama: 'ARSIP', harga: 800, kategori: 'Kertas', unit: 'kg' },
  { kode: 'KT4', nama: 'BUKU', harga: 500, kategori: 'Kertas', unit: 'kg' },

  // LG - Logam
  { kode: 'LG1', nama: 'BESI 1', harga: 1500, kategori: 'Logam', unit: 'kg' },
  { kode: 'LG2', nama: 'BESI 2 (PAKU)', harga: 1000, kategori: 'Logam', unit: 'kg' },
  { kode: 'LG3', nama: 'KALENG', harga: 500, kategori: 'Logam', unit: 'kg' },
  { kode: 'LG4', nama: 'KALENG ALUMUNIUM/ARO', harga: 4500, kategori: 'Logam', unit: 'kg' },
  { kode: 'LG5', nama: 'TEMBAGA', harga: 3000, kategori: 'Logam', unit: 'kg' },
  { kode: 'LG6', nama: 'SENG', harga: 500, kategori: 'Logam', unit: 'kg' },

  // BL - Beling / Kaca
  { kode: 'BL1', nama: 'BOTOL BENING', harga: 100, kategori: 'Beling', unit: 'pcs' },
  { kode: 'BL2', nama: 'BOTOL WARNA/KECAP', harga: 200, kategori: 'Beling', unit: 'pcs' },
  { kode: 'BL3', nama: 'BELING', harga: 300, kategori: 'Beling', unit: 'kg' },

  // PL - Plastik
  { kode: 'PL1', nama: 'AGB', harga: 2700, kategori: 'Plastik', unit: 'kg' },
  { kode: 'PL2', nama: 'AGK', harga: 1500, kategori: 'Plastik', unit: 'kg' },
  { kode: 'PL3', nama: 'PET BOTOL BERSIH', harga: 2000, kategori: 'Plastik', unit: 'kg' },
  { kode: 'PL4', nama: 'PET BOTOL KOTOR', harga: 1500, kategori: 'Plastik', unit: 'kg' },
  { kode: 'PL5', nama: 'ALE-ALE', harga: 1000, kategori: 'Plastik', unit: 'kg' },
  { kode: 'PL6', nama: 'MIZONE BERSIH', harga: 500, kategori: 'Plastik', unit: 'kg' },
  { kode: 'PL7', nama: 'MIZONE KOTOR', harga: 300, kategori: 'Plastik', unit: 'kg' },
  { kode: 'PL8', nama: 'JELI', harga: 1000, kategori: 'Plastik', unit: 'kg' },
  { kode: 'PL9', nama: 'KERASAN', harga: 300, kategori: 'Plastik', unit: 'kg' },
  { kode: 'PL10', nama: 'GEBRUS 1 (GB 1)', harga: 1200, kategori: 'Plastik', unit: 'kg' },
  { kode: 'PL11', nama: 'GEBRUS 2 (GB 2)', harga: 1000, kategori: 'Plastik', unit: 'kg' },
  { kode: 'PL11a', nama: 'GEBRUS 3 (GB 3)', harga: 500, kategori: 'Plastik', unit: 'kg' },
  { kode: 'PL12', nama: 'LD (Tutup Galon Merk Aqua)', harga: 2000, kategori: 'Plastik', unit: 'kg' },
  { kode: 'PL13', nama: 'KRISTAL', harga: 2000, kategori: 'Plastik', unit: 'kg' },
  { kode: 'PL14', nama: 'BLOWING', harga: 1500, kategori: 'Plastik', unit: 'kg' },
  { kode: 'PL15', nama: 'GALON PECAH MERK AQUA', harga: 2500, kategori: 'Plastik', unit: 'kg' },

  // L - Lain-lain
  { kode: 'L1', nama: 'KARPET TALANG/JAS HUJAN', harga: 500, kategori: 'Lain-lain', unit: 'kg' },
  { kode: 'L2', nama: 'SENDAL KARET', harga: 0, kategori: 'Lain-lain', unit: 'kg' },
  { kode: 'L3', nama: 'SELANG AIR', harga: 0, kategori: 'Lain-lain', unit: 'kg' },
  { kode: 'L4', nama: 'CANGKANG KABEL', harga: 0, kategori: 'Lain-lain', unit: 'kg' },
  { kode: 'L5', nama: 'REGULATOR BEKAS', harga: 3000, kategori: 'Lain-lain', unit: 'kg' },
  { kode: 'L6', nama: 'PARALON', harga: 600, kategori: 'Lain-lain', unit: 'kg' },
  { kode: 'L7', nama: 'FIBER', harga: 350, kategori: 'Lain-lain', unit: 'kg' },
  { kode: 'L8', nama: 'MINYAK JELANTAH', harga: 4000, kategori: 'Lain-lain', unit: 'kg' },
  { kode: 'L9', nama: 'TRAY TELOR', harga: 500, kategori: 'Lain-lain', unit: 'kg' },

  // R - Residu
  { kode: 'R1', nama: 'PLASTIK RESIDU MULTILAYER', harga: 500, kategori: 'Residu', unit: 'kg' },
];

async function main() {
  console.log('Menghapus data HargaSampah, JenisSampah, KategoriSampah...');
  
  await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 0;`);
  
  await prisma.hargaSampah.deleteMany();
  await prisma.jenisSampah.deleteMany();
  await prisma.kategoriSampah.deleteMany();

  // Create categories mapping
  const categoryMap = {};
  const uniqueCategories = [...new Set(data.map(d => d.kategori))];

  for (const catName of uniqueCategories) {
    const firstItem = data.find(d => d.kategori === catName);
    const codePrefix = firstItem.kode.replace(/[0-9a-z]+$/g, ''); // Extract prefix (e.g., 'KT1' -> 'KT')
    const cat = await prisma.kategoriSampah.create({
      data: { 
        name: catName, 
        description: 'Kategori ' + catName,
        slug: catName.toLowerCase(),
        codePrefix: codePrefix || catName.substring(0,2).toUpperCase()
      }
    });
    categoryMap[catName] = cat.id;
  }

  // Insert JenisSampah and HargaSampah
  for (const item of data) {
    const catId = categoryMap[item.kategori];
    const jenis = await prisma.jenisSampah.create({
      data: {
        code: item.kode,
        name: item.nama,
        kategoriSampahId: catId,
        unit: item.unit,
        pricePerUnit: item.harga,
        description: item.nama,
        slug: item.nama.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      }
    });

    await prisma.hargaSampah.create({
      data: {
        jenisSampahId: jenis.id,
        pricePerUnit: item.harga,
        effectiveFrom: new Date()
      }
    });
  }

  await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 1;`);
  console.log('Data master sampah berhasil diupdate!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
