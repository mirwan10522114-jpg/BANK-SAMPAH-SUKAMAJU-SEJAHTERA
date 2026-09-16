const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const crypto = require('crypto')

async function run() {
  try {
    const adminId = 'cmt1v3mle0000zd4owc03j9hs'
    const nasabah = await prisma.pengguna.findMany({
      where: { roles: { contains: 'nasabah' } },
      take: 2
    })
    const items = await prisma.jenisSampah.findMany({ take: 3 })
    
    if (nasabah.length === 0 || items.length === 0) {
      console.log('Tidak ada nasabah atau barang sampah')
      return
    }

    const txs = [
      {
        penggunaId: nasabah[0].id,
        items: [
          { jenisSampahId: items[0].id, name: items[0].name, qty: 5, price: 1200 },
          { jenisSampahId: items[1].id, name: items[1].name, qty: 2.5, price: 800 }
        ]
      },
      {
        penggunaId: nasabah[1].id,
        items: [
          { jenisSampahId: items[2].id, name: items[2].name, qty: 10, price: 1500 }
        ]
      },
      {
        penggunaId: nasabah[0].id,
        items: [
          { jenisSampahId: items[1].id, name: items[1].name, qty: 8, price: 800 },
          { jenisSampahId: items[2].id, name: items[2].name, qty: 3, price: 1500 }
        ]
      }
    ]

    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i]
      const totalEstimated = tx.items.reduce((acc, curr) => acc + (curr.qty * curr.price), 0)
      
      const newTx = await prisma.transaksiNabung.create({
        data: {
          kodeTransaksi: `TRX-${Date.now()}-${i}`,
          penggunaId: tx.penggunaId,
          createdById: adminId,
          status: 'menunggu_qc',
          totalValue: 0,
          items: {
            create: tx.items.map(item => ({
              jenisSampahId: item.jenisSampahId,
              quantityBeforeQc: item.qty,
              pricePerUnitSnapshot: item.price,
              unitSnapshot: 'kg',
              itemCodeSnapshot: 'TEST-' + Math.floor(Math.random()*1000),
              itemNameSnapshot: item.name || 'Barang Dummy'
            }))
          }
        }
      })
      console.log('Created transaction:', newTx.kodeTransaksi)
    }

    console.log('Berhasil menambahkan 3 transaksi nabung menunggu QC.')
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

run()
