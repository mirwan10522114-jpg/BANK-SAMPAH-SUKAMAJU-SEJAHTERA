const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function run() {
  try {
    console.log('Menghitung total saldo nasabah saat ini...')
    const agg = await prisma.saldo.aggregate({ _sum: { saldoTersedia: true, saldoTertahan: true } })
    const totalSaldo = Number(agg._sum.saldoTersedia || 0) + Number(agg._sum.saldoTertahan || 0)
    console.log('Total Saldo Nasabah (Tersedia + Tertahan): Rp', totalSaldo)

    if (totalSaldo <= 0) {
      console.log('Tidak ada saldo nasabah yang perlu dipindahkan.')
      return
    }

    console.log('Memindahkan dana dari Buku Kas Utama ke Buku Kas Nasabah sebesar Rp', totalSaldo)

    // 1. Kurangi dari Utama
    const kasUtamaRes = await prisma.kasBankSampah.aggregate({
      where: { buku: 'utama', tipe: 'masuk' },
      _sum: { jumlah: true }
    })
    const kasUtamaOut = await prisma.kasBankSampah.aggregate({
      where: { buku: 'utama', tipe: 'keluar' },
      _sum: { jumlah: true }
    })
    const saldoUtama = Number(kasUtamaRes._sum.jumlah || 0) - Number(kasUtamaOut._sum.jumlah || 0)
    
    await prisma.kasBankSampah.create({
      data: {
        buku: 'utama',
        tipe: 'keluar',
        sumber: 'penyesuaian',
        jumlah: totalSaldo,
        saldoSetelah: saldoUtama - totalSaldo,
        keterangan: 'Pemindahan dana alokasi nasabah ke Buku Kas Nasabah (Migrasi Sistem)',
      }
    })

    // 2. Tambahkan ke Nasabah
    const kasNasabahRes = await prisma.kasBankSampah.aggregate({
      where: { buku: 'nasabah', tipe: 'masuk' },
      _sum: { jumlah: true }
    })
    const kasNasabahOut = await prisma.kasBankSampah.aggregate({
      where: { buku: 'nasabah', tipe: 'keluar' },
      _sum: { jumlah: true }
    })
    const saldoNasabah = Number(kasNasabahRes._sum.jumlah || 0) - Number(kasNasabahOut._sum.jumlah || 0)

    await prisma.kasBankSampah.create({
      data: {
        buku: 'nasabah',
        tipe: 'masuk',
        sumber: 'penyesuaian',
        jumlah: totalSaldo,
        saldoSetelah: saldoNasabah + totalSaldo,
        keterangan: 'Penerimaan dana alokasi nasabah dari Buku Kas Utama (Migrasi Sistem)',
      }
    })

    console.log('Berhasil! Dana sudah dipindahkan.')
  } catch (e) {
    console.error('Error:', e)
  } finally {
    await prisma.$disconnect()
  }
}

run()
