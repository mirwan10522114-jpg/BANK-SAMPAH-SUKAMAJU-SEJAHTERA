const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const pangandaranDistricts = ['Parigi', 'Cijulang', 'Cimerak', 'Cigugur', 'Langkaplancar', 'Mangunjaya', 'Padaherang', 'Kalipucang', 'Pangandaran', 'Sidamulih'];
async function main() {
  const cityId = '32.19';
  const existing = await prisma.district.findMany({ where: { cityId }, orderBy: { id: 'asc' } });
  for (let i = 0; i < existing.length; i++) {
    if (pangandaranDistricts[i]) {
      await prisma.district.update({
        where: { id: existing[i].id },
        data: { name: pangandaranDistricts[i] }
      });
    }
  }
  // if not enough, create the rest
  if (existing.length < pangandaranDistricts.length) {
    for(let i = existing.length; i < pangandaranDistricts.length; i++) {
      await prisma.district.create({
        data: {
          id: cityId + '.' + String(i + 1).padStart(2, '0'),
          cityId,
          name: pangandaranDistricts[i]
        }
      });
    }
  }
  // Delete any excess districts
  if (existing.length > pangandaranDistricts.length) {
    for(let i = pangandaranDistricts.length; i < existing.length; i++) {
      await prisma.district.delete({
        where: { id: existing[i].id }
      });
    }
  }
  console.log('Pangandaran districts updated!');
}
main().finally(() => prisma.$disconnect());
