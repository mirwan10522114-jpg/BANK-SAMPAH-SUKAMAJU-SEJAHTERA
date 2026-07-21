import { NextRequest, NextResponse } from 'next/server'

// =====================================================================
// POST /api/toko/order/[orderNumber]/confirm-payment
// ---------------------------------------------------------------------
// ⚠️ DEPRECATED — DO NOT USE.
//
// Sebelumnya endpoint ini mengizinkan pembeli meng-konfirmasi pembayaran
// secara manual (bypass Midtrans). Ini TIDAK AMAN karena pembeli bisa
// "lunas" tanpa benar-benar membayar.
//
// Sekarang: konfirmasi pembayaran HANYA boleh terjadi via Midtrans webhook
// (/api/payment/callback). Webhook akan otomatis update status ke "dibayar"
// setelah Midtrans mengkonfirmasi pembayaran sukses.
//
// Endpoint ini tetap di-keep untuk backward compatibility (admin-only)
// tapi selalu return 403 untuk request dari pembeli.
// =====================================================================

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params

  // Admin-only fallback: kalau admin ingin manual konfirmasi (mis. untuk
  // pembayaran tunai offline), harus pakai endpoint admin terpisah.
  // Untuk request publik (dari pembeli), tolak.
  const actingUserHeader = req.headers.get('x-acting-user')
  const url = new URL(req.url)
  const actingUserQuery = url.searchParams.get('actingUser')
  const hasActor = actingUserHeader || actingUserQuery

  if (!hasActor) {
    return NextResponse.json(
      {
        error:
          'Konfirmasi pembayaran manual tidak diizinkan. Pembayaran HARUS dilakukan via Midtrans. ' +
          'Setelah pembayaran sukses di Midtrans, status akan otomatis berubah menjadi "dibayar" melalui webhook.',
        hint: 'Buka popup Midtrans Snap untuk membayar. Jika popup expired, klik "Bayar Ulang" untuk membuat transaksi baru.',
      },
      { status: 403 }
    )
  }

  // Admin manual confirm (HANYA untuk admin, mis. pesanan offline COD)
  // Import db di sini supaya tidak load kalau request dari pembeli
  const { db } = await import('@/lib/db')
  const { addProductStock, reduceProductStock, recordBankSampahKas } = await import('@/lib/business')
  const { toNumber } = await import('@/lib/format')

  const actor = (await import('@/lib/business')).getActingUser
  const actorInfo = await actor(req)
  if (!actorInfo) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const isAdmin = actorInfo.roles.includes('admin') || actorInfo.roles.includes('owner')
  if (!isAdmin) {
    return NextResponse.json(
      { error: 'Hanya admin/owner yang dapat konfirmasi pembayaran manual' },
      { status: 403 }
    )
  }

  const order = await db.tokoOrder.findFirst({
    where: { orderNumber },
    include: { items: true },
  })

  if (!order) {
    return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
  }

  if (order.paymentStatus !== 'menunggu') {
    return NextResponse.json(
      { error: `Pesanan berstatus ${order.paymentStatus}, tidak dapat dikonfirmasi` },
      { status: 400 }
    )
  }

  // Update order status
  await db.tokoOrder.update({
    where: { id: order.id },
    data: {
      paymentStatus: 'dibayar',
      orderStatus: 'dibayar',
      paidAt: new Date(),
      notes: `${order.notes || ''}\n[Admin manual confirm by ${actorInfo.name}]`.trim(),
    },
  })

  await db.tokoOrderStatusHistory.create({
    data: {
      tokoOrderId: order.id,
      status: 'dibayar',
      keterangan: `Pembayaran dikonfirmasi manual oleh admin (${actorInfo.name})`,
    },
  })

  // Convert reserved stock to real sale
  for (const item of order.items) {
    const qty = toNumber(item.quantity)
    try {
      await addProductStock(item.productId, qty, 'online_release', 'toko_order', order.id, undefined, `Konfirmasi pesanan ${order.orderNumber}`)
    } catch {}
    try {
      await reduceProductStock(item.productId, qty, 'online_sale', 'toko_order', order.id, undefined, `Penjualan online ${order.orderNumber}`)
    } catch {}
  }

  try {
    await recordBankSampahKas('masuk', 'penjualan_produk', toNumber(order.totalBayar), `Penjualan online ${order.orderNumber} (manual confirm)`, undefined, undefined)
  } catch (e) {
    console.error('Failed to record kas from online sale:', e)
  }

  const existingSale = await db.productSale.findFirst({ where: { notes: { contains: order.orderNumber } } })
  if (!existingSale) {
    await db.productSale.create({
      data: {
        buyerName: order.buyerName,
        buyerPhone: order.buyerPhone,
        paymentMethod: 'manual',
        paymentStatus: 'paid',
        totalQuantity: order.items.reduce((sum, i) => sum + toNumber(i.quantity), 0),
        totalValue: toNumber(order.subtotalProduk),
        channel: 'online',
        notes: `Pesanan online ${order.orderNumber} (manual confirm)`,
        transactedAt: new Date(),
        items: {
          create: order.items.map((i) => ({
            productId: i.productId,
            productNameSnapshot: i.productNameSnapshot,
            unitSnapshot: i.unitSnapshot,
            pricePerUnitSnapshot: i.pricePerUnitSnapshot,
            quantity: toNumber(i.quantity),
            subtotal: toNumber(i.subtotal),
          })),
        },
      },
    })
  }

  return NextResponse.json({
    success: true,
    message: 'Pembayaran dikonfirmasi manual oleh admin',
    orderNumber: order.orderNumber,
    paymentStatus: 'dibayar',
    orderStatus: 'dibayar',
  })
}
