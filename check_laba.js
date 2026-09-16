const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const salesMitraDetail = await prisma.salesTransaction.findMany({
    include: {
      items: {
        include: {
          wasteItem: { include: { prices: true } }
        }
      }
    }
  });

  let totalBeliNasabah = 0;
  let totalJualMitra = 0;

  salesMitraDetail.forEach(tx => {
    tx.items.forEach(item => {
      const hargaJualMitra = Number(item.pricePerUnit);
      const qty = Number(item.quantity);
      
      const hargaBeliNasabah = item.wasteItem.prices && item.wasteItem.prices.length > 0
        ? Number(item.wasteItem.prices[0].pricePerUnit)
        : Number(item.wasteItem.pricePerUnit || 0);
        
      const subtotalJual = hargaJualMitra * qty;
      const subtotalBeli = hargaBeliNasabah * qty;
      
      totalBeliNasabah += subtotalBeli;
      totalJualMitra += subtotalJual;
    });
  });

  const marginKotor = totalJualMitra - totalBeliNasabah;

  const kasTx = await prisma.bankSampahKas.findMany({
    where: { tipe: 'keluar', sumber: 'biaya_operasional' }
  });
  
  let bebanOperasional = 0;
  kasTx.forEach(tx => {
    bebanOperasional += Number(tx.jumlah);
  });

  console.log('--- LABA RUGI JUAL BELI ---');
  console.log('Penjualan Mitra (Harga Jual):', totalJualMitra);
  console.log('Nilai Sampah Beli (Harga Beli saat ini):', totalBeliNasabah);
  console.log('Margin Kotor (Penjualan - Beli):', marginKotor);
  console.log('Beban Operasional:', bebanOperasional);
  console.log('Keuntungan Jual Beli:', marginKotor - bebanOperasional);
}

main().catch(console.error).finally(() => prisma.$disconnect());
