const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(__dirname, '..', 'backup', 'backup_banksampah_master.sql');
  const content = fs.readFileSync(filePath, 'utf16le');

  const tablesToRestore = ['province', 'city', 'district'];

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');

  for (const table of tablesToRestore) {
    console.log(`Searching INSERT for \`${table}\`...`);
    const searchPattern = `INSERT INTO \`${table}\``;
    const startIndex = content.indexOf(searchPattern);
    
    if (startIndex === -1) {
      console.log(`No INSERT statement found for \`${table}\`.`);
      continue;
    }

    const endIndex = content.indexOf(';\n', startIndex);
    const endIndexAlt = content.indexOf(';\r\n', startIndex);
    const end = (endIndex !== -1 && endIndexAlt !== -1) ? Math.min(endIndex, endIndexAlt) : (endIndex !== -1 ? endIndex : endIndexAlt);

    if (end === -1) {
      console.log(`Could not find statement end for \`${table}\`.`);
      continue;
    }

    const sqlStatement = content.slice(startIndex, end + 1).trim();
    console.log(`Restoring ${table}... (Length: ${sqlStatement.length} chars)`);

    try {
      await prisma.$executeRawUnsafe(sqlStatement);
      console.log(`Successfully restored table \`${table}\`!`);
    } catch (err) {
      console.error(`Error restoring \`${table}\`:`, err.message);
    }
  }

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');

  const pCount = await prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM province');
  const cCount = await prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM city');
  const dCount = await prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM district');

  console.log('\n--- RESTORE RESULT ---');
  console.log('Province count:', pCount[0].count.toString());
  console.log('City count:', cCount[0].count.toString());
  console.log('District count:', dCount[0].count.toString());
}

main().catch(console.error).finally(() => prisma.$disconnect());
