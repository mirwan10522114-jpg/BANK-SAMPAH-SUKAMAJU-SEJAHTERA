const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Master Data...');

  // 1. Admin
  await prisma.pengguna.upsert({
    where: { email: 'admin@banksampah.com' },
    update: {},
    create: {
      name: 'Admin Utama',
      email: 'admin@banksampah.com',
      password: 'password', // bcrypt if needed, but in this setup plain text might be acceptable for test
      roles: '["admin","owner"]',
      isMember: true,
      verificationStatus: 'verified'
    }
  });

  // 2. Kategori Sampah
  const katKertas = await prisma.kategoriSampah.upsert({
    where: { slug: 'kertas' },
    update: {},
    create: { name: 'Kertas', slug: 'kertas', codePrefix: 'KRT' }
  });

  const katPlastik = await prisma.kategoriSampah.upsert({
    where: { slug: 'plastik' },
    update: {},
    create: { name: 'Plastik', slug: 'plastik', codePrefix: 'PLST' }
  });

  // 3. Jenis Sampah
  await prisma.jenisSampah.upsert({
    where: { slug: 'dus' },
    update: {},
    create: { name: 'Dus', slug: 'dus', code: 'KRT-01', kategoriSampahId: katKertas.id, unit: 'kg' }
  });

  await prisma.jenisSampah.upsert({
    where: { slug: 'duplex' },
    update: {},
    create: { name: 'Duplex', slug: 'duplex', code: 'KRT-02', kategoriSampahId: katKertas.id, unit: 'kg' }
  });
  
  await prisma.jenisSampah.upsert({
    where: { slug: 'pet-kotor' },
    update: {},
    create: { name: 'PET Kotor', slug: 'pet-kotor', code: 'PLST-01', kategoriSampahId: katPlastik.id, unit: 'kg' }
  });

  // 4. Harga Sampah (for Dus and Duplex)
  const dus = await prisma.jenisSampah.findUnique({ where: { slug: 'dus' } });
  const duplex = await prisma.jenisSampah.findUnique({ where: { slug: 'duplex' } });

  await prisma.hargaSampah.create({
    data: { jenisSampahId: dus.id, pricePerUnit: 1500, effectiveFrom: new Date() }
  });

  await prisma.hargaSampah.create({
    data: { jenisSampahId: duplex.id, pricePerUnit: 1200, effectiveFrom: new Date() }
  });

  // 5. Point Rule
  await prisma.aturanPoin.create({
    data: {
      pointsPerRupiah: 0.001,
      rupiahPerPointEarn: 1000,
      rupiahPerPoint: 0,
      effectiveFrom: new Date()
    }
  });

  console.log('Seeding completed!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
