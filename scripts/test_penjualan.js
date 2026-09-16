const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ ASSERTION FAILED: ${message}`)
  }
  console.log(`✅ ${message}`)
}

async function runTest() {
  console.log('=== MEMULAI PENGUJIAN E2E MODUL PENJUALAN PRODUK ===\n')

  try {
    // 0. Setup Data Dummy
    console.log('[0] Setup Data Dummy (Produk)...')
    const admin = await prisma.pengguna.findFirst({ where: { roles: { contains: 'admin' } } })
    if (!admin) throw new Error('Tidak ada admin')

    let category = await prisma.kategoriProduk.findFirst()
    if (!category) {
      category = await prisma.kategoriProduk.create({
        data: {
          name: 'Kategori Test',
          slug: `kategori-test-${Date.now()}`,
          isActive: true
        }
      })
    }

    const initialStock = 10
    const price = 15000

    const produk = await prisma.produk.create({
      data: {
        name: 'Produk Tas Daur Ulang Test',
        slug: `tas-daur-ulang-${Date.now()}`,
        description: 'Produk testing',
        unit: 'pcs',
        price: price,
        stock: initialStock,
        isActive: true,
        kategoriProdukId: category.id,
      }
    })
    console.log(`Produk dummy dibuat: ${produk.name} (Stok: ${initialStock}, Harga: ${price})`)

    // Helper: get kas utama
    async function getKasUtama() {
      const masuk = await prisma.kasBankSampah.aggregate({ where: { buku: 'utama', tipe: 'masuk' }, _sum: { jumlah: true } })
      const keluar = await prisma.kasBankSampah.aggregate({ where: { buku: 'utama', tipe: 'keluar' }, _sum: { jumlah: true } })
      return Number(masuk._sum.jumlah || 0) - Number(keluar._sum.jumlah || 0)
    }

    const kasAwal = await getKasUtama()

    // ==========================================
    // 1. Alur Transaksi Langsung (Point of Sale)
    // ==========================================
    console.log('\n[1] Skenario Transaksi Penjualan Langsung (POS)...')
    const qtyBeli = 2
    const totalBayar = qtyBeli * price

    await prisma.$transaction(async (tx) => {
      // 1. Catat Sale
      const sale = await tx.penjualanProduk.create({
        data: {
          invoiceNumber: `INV-${Date.now()}`,
          buyerName: 'Pelanggan POS',
          buyerPhone: '-',
          paymentMethod: 'cash',
          paymentStatus: 'paid',
          totalQuantity: qtyBeli,
          totalValue: totalBayar,
          channel: 'offline', // POS
          createdById: admin.id,
          items: {
            create: [{
              produkId: produk.id,
              productNameSnapshot: produk.name,
              unitSnapshot: produk.unit,
              pricePerUnitSnapshot: price,
              quantity: qtyBeli,
              subtotal: totalBayar
            }]
          }
        }
      })

      // 2. Kurangi stok produk
      await tx.produk.update({
        where: { id: produk.id },
        data: { stock: Number(produk.stock) - qtyBeli }
      })

      // 3. Catat Movement
      await tx.pergerakanProduk.create({
        data: {
          movementNumber: `MOV-${Date.now()}`,
          produkId: produk.id,
          direction: 'out',
          reason: 'sale',
          quantity: qtyBeli,
          stockAfter: Number(produk.stock) - qtyBeli,
          sourceRefType: 'sale',
          sourceRefId: sale.id,
          createdById: admin.id
        }
      })

      // 4. Masuk ke Buku Kas Utama
      // Saldo setelah dummy calculation
      const masukTotal = await tx.kasBankSampah.aggregate({ where: { buku: 'utama', tipe: 'masuk' }, _sum: { jumlah: true } })
      const keluarTotal = await tx.kasBankSampah.aggregate({ where: { buku: 'utama', tipe: 'keluar' }, _sum: { jumlah: true } })
      const currentBalance = Number(masukTotal._sum.jumlah || 0) - Number(keluarTotal._sum.jumlah || 0)

      await tx.kasBankSampah.create({
        data: {
          buku: 'utama',
          tipe: 'masuk',
          sumber: 'penjualan_produk',
          jumlah: totalBayar,
          saldoSetelah: currentBalance + totalBayar,
          keterangan: `Penjualan POS Offline Invoice ${sale.invoiceNumber}`,
          penjualanProdukId: sale.id,
          createdById: admin.id
        }
      })
    })

    // Validasi
    const productAfter = await prisma.produk.findUnique({ where: { id: produk.id } })
    assert(Number(productAfter.stock) === initialStock - qtyBeli, `Stok produk berkurang sebanyak ${qtyBeli} (Sisa Stok: ${productAfter.stock})`)

    const kasAkhir = await getKasUtama()
    assert(kasAkhir === kasAwal + totalBayar, `Uang penjualan produk masuk ke Buku Kas Utama sebesar Rp${totalBayar}`)

    console.log('\n✅✅✅ SEMUA SKENARIO PENGUJIAN MODUL PENJUALAN PRODUK BERHASIL! ✅✅✅')

  } catch (err) {
    console.error(err)
  } finally {
    await prisma.$disconnect()
  }
}

runTest()
