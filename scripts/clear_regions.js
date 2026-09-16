const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE district;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE city;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE province;');
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
  console.log('Cleared');
}
main().finally(() => prisma.$disconnect());
