import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, addProductStock, reduceProductStock, recordBankSampahKas } from '@/lib/business'
import { toNumber } from '@/lib/format'

// Valid state machine transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  menunggu_pembayaran: ['dibayar', 'diproses', 'dibatalkan'],
  dibayar: ['diproses'],
  diproses: ['dikirim'],
  dikirim: ['diterima'],
  dibatalkan: [],
  expired: [],
  diterima: [],
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = decodeURIComponent(rawId)
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const rawStatus = (body.status || body.orderStatus || body.newStatus || '').toLowerCase()
  const statusMap: Record<string, string> = {
    paid: 'dibayar',
    lunas: 'dibayar',
    processing: 'diproses',
    shipped: 'dikirim',
    selesai: 'diterima',
    completed: 'diterima',
    delivered: 'diterima',
    canceled: 'dibatalkan',
    cancelled: 'dibatalkan',
    batal: 'dibatalkan',
  }
  const status = statusMap[rawStatus] || rawStatus
  const kurirNama = body.kurirNama || body.kurir || body.shippingCourier || 'Kurir Toko'
  const noResi = body.noResi || body.resi || body.nomorResi || body.trackingNumber
  const resiPhotoUrl = body.resiPhotoUrl || body.shippingResiPhotoUrl || null
  const shippingEtaStart = body.shippingEtaStart ? new Date(body.shippingEtaStart) : null
  const shippingEtaEnd = body.shippingEtaEnd ? new Date(body.shippingEtaEnd) : null
  const keterangan = body.keterangan || body.alasan || body.notes || ''

  if (!status) return NextResponse.json({ error: 'Status wajib diisi' }, { status: 400 })

  const order = await db.pesananToko.findFirst({
    where: {
      OR: [
        { id },
        { id: rawId },
        { orderNumber: id },
        { orderNumber: rawId },
      ],
    },
    include: { items: true },
  })

  if (!order) return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })

  if (order.orderStatus === 'diterima') {
    return NextResponse.json({ error: 'Order sudah selesai' }, { status: 400 })
  }

  // Validate transition
  const allowed = VALID_TRANSITIONS[order.orderStatus] || []
  if (!allowed.includes(status)) {
    return NextResponse.json({
      error: `Transisi tidak valid dari "${order.orderStatus}" ke "${status}". Transisi yang diizinkan: ${allowed.join(', ') || 'tidak ada'}`,
    }, { status: 400 })
  }

  // Build update data
  const updateData: any = { orderStatus: status }
  if (status === 'dikirim') {
    updateData.kurirNama = kurirNama
    if (noResi) updateData.noResi = noResi
    if (resiPhotoUrl) updateData.resiPhotoUrl = resiPhotoUrl
    if (shippingEtaStart) updateData.shippingEtaStart = shippingEtaStart
    if (shippingEtaEnd) updateData.shippingEtaEnd = shippingEtaEnd
    updateData.shippedAt = new Date()
  }
  if (status === 'diterima') {
    updateData.receivedAt = new Date()
  }
  if (status === 'dibatalkan') {
    if (order.paymentStatus === 'menunggu') {
      updateData.paymentStatus = 'dibatalkan'
    }
    // Release reserved stock
    for (const item of order.items) {
      const qty = toNumber(item.quantity)
      await addProductStock(item.produkId, qty, 'online_release', 'toko_order', order.id, actor.id, `Pembatalan admin: ${keterangan || ''}`)
    }
  }

  // Handle payment confirmation when admin moves to "dibayar" from "menunggu_pembayaran"
  // This is the case where admin confirms payment received but doesn't start processing yet
  if (status === 'dibayar' && order.paymentStatus !== 'dibayar' && order.orderStatus === 'menunggu_pembayaran') {
    updateData.paymentStatus = 'dibayar'
    updateData.paidAt = new Date()

    // Convert reserved stock to real sale
    for (const item of order.items) {
      const qty = toNumber(item.quantity)
      await addProductStock(item.produkId, qty, 'online_release', 'toko_order', order.id, actor.id, `Konfirmasi manual pesanan ${order.orderNumber}`)
      await reduceProductStock(item.produkId, qty, 'online_sale', 'toko_order', order.id, actor.id, `Penjualan online ${order.orderNumber}`)
    }

    // Record kas masuk
    try {
      await recordBankSampahKas('masuk', 'penjualan_produk', toNumber(order.totalBayar), `Penjualan online ${order.orderNumber}`, actor.id, undefined)
    } catch (e) {
      console.error('Failed to record kas:', e)
    }

    // Create PenjualanProduk for unified reporting
    const existingSale = await db.penjualanProduk.findFirst({ where: { notes: { contains: order.orderNumber } } })
    if (!existingSale) {
      await db.penjualanProduk.create({
        data: {
          buyerName: order.buyerName,
          buyerPhone: order.buyerPhone,
          paymentMethod: order.paymentMethod,
          paymentStatus: 'paid',
          totalQuantity: order.items.reduce((sum, i) => sum + toNumber(i.quantity), 0),
          totalValue: toNumber(order.subtotalProduk),
          channel: 'online',
          notes: `Pesanan online ${order.orderNumber} (manual)`,
          createdById: actor.id,
          items: {
            create: order.items.map((i) => ({
              produkId: i.produkId,
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
  }

  // Handle payment confirmation when admin moves to "diproses" from "menunggu_pembayaran"
  // This covers: manual payment confirm + auto-proses in one step
  if (status === 'diproses' && order.paymentStatus !== 'dibayar' && order.orderStatus === 'menunggu_pembayaran') {
    updateData.paymentStatus = 'dibayar'
    updateData.paidAt = new Date()

    // Convert reserved stock to real sale
    for (const item of order.items) {
      const qty = toNumber(item.quantity)
      await addProductStock(item.produkId, qty, 'online_release', 'toko_order', order.id, actor.id, `Konfirmasi manual pesanan ${order.orderNumber}`)
      await reduceProductStock(item.produkId, qty, 'online_sale', 'toko_order', order.id, actor.id, `Penjualan online ${order.orderNumber}`)
    }

    // Record kas masuk
    try {
      await recordBankSampahKas('masuk', 'penjualan_produk', toNumber(order.totalBayar), `Penjualan online ${order.orderNumber}`, actor.id, undefined)
    } catch (e) {
      console.error('Failed to record kas:', e)
    }

    // Create PenjualanProduk for unified reporting
    const existingSale = await db.penjualanProduk.findFirst({ where: { notes: { contains: order.orderNumber } } })
    if (!existingSale) {
      await db.penjualanProduk.create({
        data: {
          buyerName: order.buyerName,
          buyerPhone: order.buyerPhone,
          paymentMethod: order.paymentMethod,
          paymentStatus: 'paid',
          totalQuantity: order.items.reduce((sum, i) => sum + toNumber(i.quantity), 0),
          totalValue: toNumber(order.subtotalProduk),
          channel: 'online',
          notes: `Pesanan online ${order.orderNumber} (manual)`,
          createdById: actor.id,
          items: {
            create: order.items.map((i) => ({
              produkId: i.produkId,
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
  }

  const updated = await db.pesananToko.update({
    where: { id },
    data: updateData,
  })

  // Create status history
  await db.riwayatStatusPesananToko.create({
    data: {
      pesananTokoId: order.id,
      status,
      keterangan: keterangan || `Status diubah ke "${status}" oleh admin`,
      createdById: actor.id,
    },
  })

  // Send Order Confirmation (Struk) if payment was just confirmed manually
  if (updateData.paymentStatus === 'dibayar' && order.paymentStatus !== 'dibayar' && order.buyerEmail) {
    try {
      const { sendOrderConfirmationEmail } = await import('@/lib/email')
      await sendOrderConfirmationEmail({
        to: order.buyerEmail,
        buyerName: order.buyerName,
        orderNumber: order.orderNumber,
        items: order.items.map((i) => ({
          productName: i.productNameSnapshot,
          quantity: toNumber(i.quantity),
          unit: i.unitSnapshot,
          pricePerUnit: toNumber(i.pricePerUnitSnapshot),
          subtotal: toNumber(i.subtotal),
        })),
        subtotal: toNumber(order.subtotalProduk),
        ongkir: toNumber(order.ongkir),
        total: toNumber(order.totalBayar),
        paymentMethod: order.paymentMethod,
        buyerAddress: order.buyerAddress || '-',
        buyerPhone: order.buyerPhone,
        kurirNama: order.kurirNama || '-',
        notes: order.notes || '-',
        paidAt: new Date(),
      })
    } catch (err) {
      console.error('Failed to send manual order confirmation email:', err)
    }
  }

  // Send status update email (for diproses, dikirim, diterima, dibatalkan)
  // (We skip this if the status was just moved to 'dibayar' and the confirmation receipt was already sent)
  if (order.buyerEmail && status !== 'dibayar' && !(status === 'diproses' && updateData.paymentStatus === 'dibayar')) {
    try {
      const { sendOrderStatusEmail } = await import('@/lib/email')
      await sendOrderStatusEmail({
        to: order.buyerEmail,
        buyerName: order.buyerName,
        orderNumber: order.orderNumber,
        status: status,
        keterangan: keterangan,
        noResi: noResi,
        kurirNama: kurirNama,
        updatedAt: new Date()
      })
    } catch (err) {
      console.error('Failed to send order status email:', err)
    }
  }

  // Send WhatsApp notifikasi
  if (order.buyerPhone && status !== 'dibayar' && !(status === 'diproses' && updateData.paymentStatus === 'dibayar')) {
    try {
      const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
      
      let waMessage = `Halo *${order.buyerName}*,\n\nPesanan Anda *#${order.orderNumber}* saat ini berstatus: *${status.toUpperCase()}*.\n`
      
      if (status === 'dikirim') {
        waMessage += `\nKurir: ${kurirNama || '-'}\nNo Resi: ${noResi || '-'}\n`
      }
      
      if (keterangan) {
        waMessage += `\nCatatan: ${keterangan}\n`
      }
      
      waMessage += `\nTerima kasih telah berbelanja di Bank Sampah Sukamaju Sejahtera!`
      
      await sendWhatsAppMessage(order.buyerPhone, waMessage)
    } catch (err) {
      console.error('Failed to send order status whatsapp:', err)
    }
  }

  return NextResponse.json(updated)
}