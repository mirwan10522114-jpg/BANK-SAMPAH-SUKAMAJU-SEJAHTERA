const { PrismaClient } = require('@prisma/client'); 
const db = new PrismaClient(); 
async function run() { 
  const txs = await db.transaksiSedekah.findMany({ 
    where: { 
      OR: [ 
        { totalWeightBersih: null }, 
        { totalWeightBersih: 0 } 
      ] 
    } 
  }); 
  console.log('Found:', txs.length); 
  for (const tx of txs) { 
    if (tx.totalWeight > 0) {
      await db.transaksiSedekah.update({ 
        where: { id: tx.id }, 
        data: { totalWeightBersih: tx.totalWeight, totalWeightKotor: tx.totalWeight } 
      }) 
    }
  } 
  console.log('Fixed'); 
} 
run().catch(console.error).finally(()=>db.$disconnect())
