const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTest() {
  console.log('--- TESTING MODUL BANK SAMPAH ---');
  let testPassed = true;
  
  // 1. Setup Data Dummy
  const nasabah = await prisma.pengguna.findFirst({ where: { roles: { contains: 'nasabah' } } });
  const kasir = await prisma.pengguna.findFirst({ where: { roles: { contains: 'admin' } } });
  const jenisSampah = await prisma.jenisSampah.findFirst({ include: { prices: { take: 1, orderBy: { createdAt: 'desc' } } } });
  const mitra = await prisma.mitra.findFirst();

  if (!nasabah || !kasir || !jenisSampah || !mitra) {
    console.error('Data dummy tidak lengkap:');
    console.log('nasabah:', !!nasabah);
    console.log('kasir:', !!kasir);
    console.log('jenisSampah:', !!jenisSampah);
    console.log('mitra:', !!mitra);
    return;
  }

  const hargaPerUnit = Number(jenisSampah.prices[0].hargaPengepul);
  const hargaNasabah = Number(jenisSampah.prices[0].hargaNasabah);

  console.log(`Nasabah: ${nasabah.name}, Jenis Sampah: ${jenisSampah.nama}, Harga Pengepul: ${hargaPerUnit}, Harga Nasabah: ${hargaNasabah}`);

  // Catat Saldo Awal
  const saldoAwalData = await prisma.saldo.findUnique({ where: { penggunaId: nasabah.id } });
  const saldoAwal = saldoAwalData ? Number(saldoAwalData.saldoAwal) + Number(saldoAwalData.totalPemasukan) - Number(saldoAwalData.totalPengeluaran) : 0;
  
  const invAwalData = await prisma.inventaris.findFirst({ where: { jenisSampahId: jenisSampah.id } });
  const invAwal = invAwalData ? Number(invAwalData.stock) : 0;

  const kasAwalAgg = await prisma.kasBankSampah.findFirst({ orderBy: { createdAt: 'desc' } });
  const kasAwal = kasAwalAgg ? Number(kasAwalAgg.saldoSetelah) : 0;

  console.log(`[AWAL] Saldo Nasabah: ${saldoAwal}, Stok Inventaris: ${invAwal}, Kas Bank Sampah: ${kasAwal}`);

  try {
    // ---------------------------------------------------------
    // TEST 1: NABUNG SAMPAH
    // ---------------------------------------------------------
    console.log('\n[TEST 1] Menabung 10 kg Sampah...');
    const qtyNabung = 10;
    const subtotalNabung = qtyNabung * hargaNasabah;

    const trxNabung = await prisma.$transaction(async (tx) => {
      // Create TransaksiNabung
      const trx = await tx.transaksiNabung.create({
        data: {
          nasabahId: nasabah.id,
          tellerId: kasir.id,
          totalBerat: qtyNabung,
          totalNilai: subtotalNabung,
          status: 'selesai',
          keterangan: 'TEST Nabung',
          items: {
            create: [{
              jenisSampahId: jenisSampah.id,
              berat: qtyNabung,
              hargaPerUnitSnapshot: hargaNasabah,
              subtotal: subtotalNabung
            }]
          }
        }
      });

      // Update Saldo
      let saldo = await tx.saldo.findUnique({ where: { penggunaId: nasabah.id } });
      if (!saldo) {
         saldo = await tx.saldo.create({ data: { penggunaId: nasabah.id, totalPemasukan: subtotalNabung, saldoAwal: 0 }});
      } else {
         await tx.saldo.update({ where: { id: saldo.id }, data: { totalPemasukan: { increment: subtotalNabung } }});
      }

      await tx.riwayatSaldo.create({
        data: {
          saldoId: saldo.id,
          penggunaId: nasabah.id,
          jenis: 'pemasukan',
          nominal: subtotalNabung,
          sumber: 'nabung',
          referensiId: trx.id,
          keterangan: 'TEST Nabung'
        }
      });

      // Update Inventaris
      let inv = await tx.inventaris.findFirst({ where: { jenisSampahId: jenisSampah.id, source: 'nabung' } });
      if (!inv) {
        inv = await tx.inventaris.create({ data: { jenisSampahId: jenisSampah.id, source: 'nabung', stock: qtyNabung } });
      } else {
        await tx.inventaris.update({ where: { id: inv.id }, data: { stock: { increment: qtyNabung } } });
      }

      await tx.pergerakanInventaris.create({
        data: {
          inventarisId: inv.id,
          jenis: 'masuk',
          jumlah: qtyNabung,
          sumber: 'nabung',
          referensiId: trx.id,
          keterangan: 'TEST Nabung'
        }
      });

      return trx;
    });

    const saldoSetelahNabungData = await prisma.saldo.findUnique({ where: { penggunaId: nasabah.id } });
    const saldoSetelahNabung = Number(saldoSetelahNabungData.totalPemasukan) - Number(saldoSetelahNabungData.totalPengeluaran);
    const invSetelahNabungData = await prisma.inventaris.findFirst({ where: { jenisSampahId: jenisSampah.id, source: 'nabung' } });
    const invSetelahNabung = Number(invSetelahNabungData.stock);

    console.log(`[HASIL 1] Saldo: ${saldoSetelahNabung} (Harap: ${saldoAwal + subtotalNabung}), Stok: ${invSetelahNabung} (Harap: ${invAwal + qtyNabung})`);
    if (saldoSetelahNabung !== saldoAwal + subtotalNabung || invSetelahNabung !== invAwal + qtyNabung) {
      console.error('❌ TEST 1 FAILED!');
      testPassed = false;
    } else {
      console.log('✅ TEST 1 PASSED!');
    }

    // ---------------------------------------------------------
    // TEST 2: SEDEKAH SAMPAH
    // ---------------------------------------------------------
    console.log('\n[TEST 2] Sedekah 5 kg Sampah...');
    const qtySedekah = 5;
    
    const trxSedekah = await prisma.$transaction(async (tx) => {
      const trx = await tx.transaksiSedekah.create({
        data: {
          nasabahId: nasabah.id,
          tellerId: kasir.id,
          totalBerat: qtySedekah,
          status: 'selesai',
          keterangan: 'TEST Sedekah',
          items: {
            create: [{
              jenisSampahId: jenisSampah.id,
              beratKotor: qtySedekah,
              beratBersih: qtySedekah,
              potongan: 0,
              keterangan: 'TEST'
            }]
          }
        }
      });

      // Update Inventaris (sedekah nambah stok tapi ngga nambah saldo)
      let inv = await tx.inventaris.findFirst({ where: { jenisSampahId: jenisSampah.id, source: 'sedekah' } });
      if (!inv) inv = await tx.inventaris.create({ data: { jenisSampahId: jenisSampah.id, source: 'sedekah', stock: qtySedekah }});
      else await tx.inventaris.update({ where: { id: inv.id }, data: { stock: { increment: qtySedekah } } });

      await tx.pergerakanInventaris.create({
        data: {
          inventarisId: inv.id,
          jenis: 'masuk',
          jumlah: qtySedekah,
          sumber: 'sedekah',
          referensiId: trx.id,
          keterangan: 'TEST Sedekah'
        }
      });
      return trx;
    });

    const saldoSetelahSedekahData = await prisma.saldo.findUnique({ where: { penggunaId: nasabah.id } });
    const saldoSetelahSedekah = Number(saldoSetelahSedekahData.totalPemasukan) - Number(saldoSetelahSedekahData.totalPengeluaran);
    const invSetelahSedekahData = await prisma.inventaris.findFirst({ where: { jenisSampahId: jenisSampah.id, source: 'sedekah' } });
    const invSetelahSedekah = Number(invSetelahSedekahData ? invSetelahSedekahData.stock : 0);

    console.log(`[HASIL 2] Saldo: ${saldoSetelahSedekah} (Harap: ${saldoSetelahNabung}), Stok Sedekah: ${invSetelahSedekah} (Harap: ${qtySedekah})`);
    if (saldoSetelahSedekah !== saldoSetelahNabung || invSetelahSedekah !== qtySedekah) {
      console.error('❌ TEST 2 FAILED!');
      testPassed = false;
    } else {
      console.log('✅ TEST 2 PASSED!');
    }

    // ---------------------------------------------------------
    // TEST 3: TARIK TUNAI
    // ---------------------------------------------------------
    console.log('\n[TEST 3] Tarik Tunai Rp 5.000...');
    const nominalTarik = 5000;
    
    await prisma.$transaction(async (tx) => {
      const saldo = await tx.saldo.findUnique({ where: { penggunaId: nasabah.id } });
      await tx.saldo.update({ where: { id: saldo.id }, data: { totalPengeluaran: { increment: nominalTarik } } });

      await tx.riwayatSaldo.create({
        data: {
          saldoId: saldo.id,
          penggunaId: nasabah.id,
          jenis: 'pengeluaran',
          nominal: nominalTarik,
          sumber: 'tarik_tunai',
          keterangan: 'TEST Tarik Tunai'
        }
      });

      const kasTerakhir = await tx.kasBankSampah.findFirst({ orderBy: { createdAt: 'desc' } });
      const saldoSetelahKas = kasTerakhir ? Number(kasTerakhir.saldoSetelah) - nominalTarik : -nominalTarik;

      await tx.kasBankSampah.create({
        data: {
          tipe: 'keluar',
          sumber: 'penarikan_nasabah',
          jumlah: nominalTarik,
          saldoSetelah: saldoSetelahKas,
          keterangan: 'TEST Tarik Tunai'
        }
      });
    });

    const saldoSetelahTarikData = await prisma.saldo.findUnique({ where: { penggunaId: nasabah.id } });
    const saldoSetelahTarik = Number(saldoSetelahTarikData.totalPemasukan) - Number(saldoSetelahTarikData.totalPengeluaran);
    const kasSetelahTarikAgg = await prisma.kasBankSampah.findFirst({ orderBy: { createdAt: 'desc' } });
    const kasSetelahTarik = kasSetelahTarikAgg ? Number(kasSetelahTarikAgg.saldoSetelah) : 0;

    console.log(`[HASIL 3] Saldo: ${saldoSetelahTarik} (Harap: ${saldoSetelahSedekah - nominalTarik}), Kas: ${kasSetelahTarik} (Harap: ${kasAwal - nominalTarik})`);
    if (saldoSetelahTarik !== saldoSetelahSedekah - nominalTarik || kasSetelahTarik !== kasAwal - nominalTarik) {
      console.error('❌ TEST 3 FAILED!');
      testPassed = false;
    } else {
      console.log('✅ TEST 3 PASSED!');
    }

    // ---------------------------------------------------------
    // TEST 4: PENJUALAN MITRA
    // ---------------------------------------------------------
    console.log('\n[TEST 4] Penjualan Mitra 15 kg...');
    const qtyJual = 15;
    const subtotalJual = qtyJual * hargaPerUnit;
    
    await prisma.$transaction(async (tx) => {
      const trx = await tx.transaksiPenjualanMitra.create({
        data: {
          mitraId: mitra.id,
          tellerId: kasir.id,
          totalBerat: qtyJual,
          totalNilai: subtotalJual,
          status: 'selesai',
          keterangan: 'TEST Jual Mitra',
          items: {
            create: [{
              jenisSampahId: jenisSampah.id,
              berat: qtyJual,
              hargaPerUnitSnapshot: hargaPerUnit,
              subtotal: subtotalJual
            }]
          }
        }
      });

      let inv = await tx.inventaris.findFirst({ where: { jenisSampahId: jenisSampah.id, source: 'nabung' } });
      await tx.inventaris.update({ where: { id: inv.id }, data: { stock: { decrement: qtyJual } } });

      await tx.pergerakanInventaris.create({
        data: {
          inventarisId: inv.id,
          jenis: 'keluar',
          jumlah: qtyJual,
          sumber: 'penjualan_mitra',
          referensiId: trx.id,
          keterangan: 'TEST Jual Mitra'
        }
      });

      const kasTerakhir = await tx.kasBankSampah.findFirst({ orderBy: { createdAt: 'desc' } });
      const saldoSetelahKas = kasTerakhir ? Number(kasTerakhir.saldoSetelah) + subtotalJual : subtotalJual;

      await tx.kasBankSampah.create({
        data: {
          tipe: 'masuk',
          sumber: 'penjualan_mitra',
          jumlah: subtotalJual,
          saldoSetelah: saldoSetelahKas,
          keterangan: 'TEST Jual Mitra'
        }
      });
    });

    const invSetelahJualData = await prisma.inventaris.findFirst({ where: { jenisSampahId: jenisSampah.id, source: 'nabung' } });
    const invSetelahJual = Number(invSetelahJualData ? invSetelahJualData.stock : 0);
    const kasSetelahJualAgg = await prisma.kasBankSampah.findFirst({ orderBy: { createdAt: 'desc' } });
    const kasSetelahJual = kasSetelahJualAgg ? Number(kasSetelahJualAgg.saldoSetelah) : 0;

    console.log(`[HASIL 4] Stok Nabung: ${invSetelahJual} (Harap: ${invSetelahNabung - qtyJual}), Kas: ${kasSetelahJual} (Harap: ${kasSetelahTarik + subtotalJual})`);
    if (invSetelahJual !== invSetelahNabung - qtyJual || kasSetelahJual !== kasSetelahTarik + subtotalJual) {
      console.error('❌ TEST 4 FAILED!');
      testPassed = false;
    } else {
      console.log('✅ TEST 4 PASSED!');
    }

  } catch (error) {
    console.error('❌ Terjadi Error saat testing:', error);
    testPassed = false;
  }

  if (testPassed) {
    console.log('\n✅ SEMUA TEST MODUL BANK SAMPAH LULUS!');
  } else {
    console.log('\n❌ ADA TEST YANG GAGAL!');
  }
}

runTest().finally(() => prisma.$disconnect());
