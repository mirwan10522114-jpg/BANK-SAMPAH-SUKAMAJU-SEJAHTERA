const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const orders = await prisma.pesananToko.findMany({ orderBy: { createdAt: 'desc' }, take: 3 });
  console.log(JSON.stringify(orders, null, 2));
}
main().finally(() => prisma.$disconnect());
