const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 MEMULAI SEED MASTER DATA KESELURUHAN...');

  // 1. SEED WILAYAH (Provinsi, Kota, Kecamatan)
  console.log('\n=======================================');
  console.log('1. SEEDING DATA WILAYAH INDONESIA');
  console.log('=======================================');
  try {
    execSync('node scripts/restore_regions.js', { stdio: 'inherit' });
  } catch (error) {
    console.error('Gagal melakukan seed wilayah:', error.message);
  }

  // 2. SEED MASTER SAMPAH (Kategori, Jenis, Harga)
  console.log('\n=======================================');
  console.log('2. SEEDING MASTER DATA SAMPAH');
  console.log('=======================================');
  try {
    // Memanggil script seed sampah yang berisi data dari gambar sebelumnya
    execSync('node backup/master_data_sampah_seed.js', { stdio: 'inherit' });
  } catch (error) {
    console.error('Gagal melakukan seed sampah:', error.message);
  }

  // 3. SEED AKUN ADMIN & OWNER
  console.log('\n=======================================');
  console.log('3. SEEDING AKUN PENGURUS (Admin & Owner)');
  console.log('=======================================');
  
  const hashedPassword = 'password'; // Use plain text as per app logic

  // Akun Admin
  const existingAdmin = await prisma.pengguna.findFirst({ where: { email: 'admin@banksampah.com' } });
  if (!existingAdmin) {
    await prisma.pengguna.create({
      data: {
        name: 'Administrator',
        email: 'admin@banksampah.com',
        password: hashedPassword,
        roles: JSON.stringify(['admin']),
        emailVerifiedAt: new Date(),
        verificationStatus: 'verified'
      }
    });
    console.log('✅ Akun admin@banksampah.com berhasil dibuat.');
  } else {
    console.log('✅ Akun admin@banksampah.com sudah ada.');
  }

  // Akun Owner
  const existingOwner = await prisma.pengguna.findFirst({ where: { email: 'owner@banksampah.com' } });
  if (!existingOwner) {
    await prisma.pengguna.create({
      data: {
        name: 'Owner (Pemilik)',
        email: 'owner@banksampah.com',
        password: hashedPassword,
        roles: JSON.stringify(['owner']),
        emailVerifiedAt: new Date(),
        verificationStatus: 'verified'
      }
    });
    console.log('✅ Akun owner@banksampah.com berhasil dibuat.');
  } else {
    console.log('✅ Akun owner@banksampah.com sudah ada.');
  }

  console.log('\n🎉 SEMUA SEED MASTER DATA SELESAI!');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
