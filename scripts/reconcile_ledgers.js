const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function toNum(val) {
  if (!val) return 0;
  return Number(val.toString());
}

async function main() {
  console.log('=== STARTING RECONCILIATION ===')

  // 1. Bank Sampah Kas Reconciliation
  console.log('\n--- 1. KAS BANK SAMPAH ---')
  const bsKasTxs = await prisma.kasBankSampah.findMany({ orderBy: { createdAt: 'asc' } })
  const bukuTypes = [...new Set(bsKasTxs.map(t => t.buku))]
  
  for (const b of bukuTypes) {
    const txs = bsKasTxs.filter(t => t.buku === b)
    let calculated = 0
    for (const tx of txs) {
      if (tx.tipe === 'masuk') calculated += toNum(tx.jumlah)
      else if (tx.tipe === 'keluar') calculated -= toNum(tx.jumlah)
    }
    const lastKas = txs.length > 0 ? toNum(txs[txs.length - 1].saldoSetelah) : 0
    console.log(`Buku: ${b}`)
    console.log(`  Expected Total (from sum): ${calculated}`)
    console.log(`  Actual Total (from last row saldoSetelah): ${lastKas}`)
    console.log(`  Match: ${calculated === lastKas ? 'YES' : 'NO'}`)
  }

  // 2. Koperasi Kas Reconciliation
  console.log('\n--- 2. KAS KOPERASI ---')
  const kopKasTxs = await prisma.koperasiKasTransaksi.findMany({ orderBy: { createdAt: 'asc' } })
  let calculatedKopKas = 0
  for (const tx of kopKasTxs) {
    if (tx.tipe === 'masuk') calculatedKopKas += toNum(tx.jumlah)
    else if (tx.tipe === 'keluar') calculatedKopKas -= toNum(tx.jumlah)
  }
  console.log(`Expected Total Kas Koperasi (from sum): ${calculatedKopKas}`)

  // 3. User Saldo Bank Sampah vs Mutasi Nabung/Tarik
  console.log('\n--- 3. SALDO BANK SAMPAH NASABAH ---')
  const users = await prisma.pengguna.findMany({ include: { transaksiNabungs: true, withdrawals: true } })
  let bsUserDiffCount = 0
  for (const user of users) {
    let expectedSaldo = 0
    for (const s of user.transaksiNabungs) {
      if (s.status === 'selesai') {
        expectedSaldo += toNum(s.totalNilai)
      }
    }
    for (const w of user.withdrawals) {
      if (w.status === 'sukses') {
        expectedSaldo -= toNum(w.amount)
      }
    }
    const userSaldo = toNum(user.saldo)
    if (userSaldo !== expectedSaldo) {
      bsUserDiffCount++
      console.log(`[!] User ${user.email} - Saldo: ${userSaldo}, Expected: ${expectedSaldo}`)
    }
  }
  console.log(`Total mismatch in User Saldo Bank Sampah: ${bsUserDiffCount}`)

  // 4. Saldo Koperasi Anggota vs Transaksi Simpanan
  console.log('\n--- 4. SALDO SIMPANAN KOPERASI ANGGOTA ---')
  const anggotaKop = await prisma.koperasiAnggota.findMany({
    include: { simpananSaldos: true, simpananTx: true }
  })
  let kopUserDiffCount = 0
  for (const a of anggotaKop) {
    let expectedPokok = 0
    let expectedWajib = 0
    let expectedSukarela = 0

    for (const tx of a.simpananTx) {
      let multiplier = tx.tipe === 'setor' ? 1 : -1
      if (tx.jenisSimpanan === 'pokok') expectedPokok += toNum(tx.jumlah) * multiplier
      if (tx.jenisSimpanan === 'wajib') expectedWajib += toNum(tx.jumlah) * multiplier
      if (tx.jenisSimpanan === 'sukarela') expectedSukarela += toNum(tx.jumlah) * multiplier
    }

    const sPokok = a.simpananSaldos.find(s => s.jenisSimpanan === 'pokok')
    const sWajib = a.simpananSaldos.find(s => s.jenisSimpanan === 'wajib')
    const sSukarela = a.simpananSaldos.find(s => s.jenisSimpanan === 'sukarela')

    const actualPokok = sPokok ? toNum(sPokok.saldo) : 0
    const actualWajib = sWajib ? toNum(sWajib.saldo) : 0
    const actualSukarela = sSukarela ? toNum(sSukarela.saldo) : 0

    if (actualPokok !== expectedPokok || actualWajib !== expectedWajib || actualSukarela !== expectedSukarela) {
      kopUserDiffCount++
      console.log(`[!] Anggota ${a.nomorAnggota} mismatch:`)
      console.log(`    Pokok: Expected ${expectedPokok}, Actual ${actualPokok}`)
      console.log(`    Wajib: Expected ${expectedWajib}, Actual ${actualWajib}`)
      console.log(`    Sukarela: Expected ${expectedSukarela}, Actual ${actualSukarela}`)
    }
  }
  console.log(`Total mismatch in Anggota Koperasi Saldo: ${kopUserDiffCount}`)

  console.log('\n=== RECONCILIATION COMPLETE ===')
}

main().catch(console.error).finally(() => prisma.$disconnect())
