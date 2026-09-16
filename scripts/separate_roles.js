const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.pengguna.findFirst({ where: { email: 'admin@banksampah.com' } });
  
  if (admin) {
    // 1. Update existing admin to only have 'admin' role
    await prisma.pengguna.update({
      where: { id: admin.id },
      data: {
        name: 'Administrator',
        roles: JSON.stringify(['admin'])
      }
    });

    // 2. Create new Owner account using the same password hash
    const existingOwner = await prisma.pengguna.findFirst({ where: { email: 'owner@banksampah.com' } });
    if (!existingOwner) {
      await prisma.pengguna.create({
        data: {
          name: 'Owner (Pemilik)',
          email: 'owner@banksampah.com',
          password: admin.password,
          roles: JSON.stringify(['owner']),
          emailVerifiedAt: new Date(),
          verificationStatus: 'verified'
        }
      });
      console.log('Akun owner@banksampah.com berhasil dibuat!');
    } else {
      await prisma.pengguna.update({
        where: { id: existingOwner.id },
        data: { roles: JSON.stringify(['owner']) }
      });
      console.log('Akun owner@banksampah.com sudah ada, role diupdate.');
    }
  } else {
    console.log('Akun admin@banksampah.com tidak ditemukan!');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
