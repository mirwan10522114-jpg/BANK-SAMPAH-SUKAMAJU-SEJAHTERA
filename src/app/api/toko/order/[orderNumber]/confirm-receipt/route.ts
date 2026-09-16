import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await params
  
  try {
    const order = await db.pesananToko.findFirst({
      where: { orderNumber },
    })

    if (!order) {
      return new NextResponse(`
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #ef4444;">Pesanan Tidak Ditemukan</h1>
            <p>Maaf, pesanan dengan nomor ${orderNumber} tidak ditemukan.</p>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } })
    }

    if (order.orderStatus === 'diterima') {
      return new NextResponse(`
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #10b981;">Sudah Dikonfirmasi</h1>
            <p>Pesanan ${orderNumber} sudah berstatus Diterima sebelumnya. Terima kasih!</p>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } })
    }

    if (order.orderStatus !== 'dikirim') {
      return new NextResponse(`
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #f59e0b;">Status Tidak Valid</h1>
            <p>Pesanan ${orderNumber} saat ini berstatus <b>${order.orderStatus}</b>, bukan "dikirim".</p>
            <p>Hanya pesanan yang sedang dikirim yang dapat dikonfirmasi penerimaannya.</p>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } })
    }

    // Update status ke diterima
    await db.pesananToko.update({
      where: { id: order.id },
      data: {
        orderStatus: 'diterima',
        receivedAt: new Date(),
      },
    })

    await db.riwayatStatusPesananToko.create({
      data: {
        pesananTokoId: order.id,
        status: 'diterima',
        keterangan: 'Pesanan dikonfirmasi telah diterima oleh pembeli melalui link email.',
        createdById: null, // by system/buyer action
      },
    })

    return new NextResponse(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 50px; background-color: #f0fdf4;">
          <div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="width: 64px; height: 64px; background-color: #10b981; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 32px;">✓</div>
            <h1 style="color: #059669; margin-top: 0;">Konfirmasi Berhasil!</h1>
            <p style="color: #4b5563;">Terima kasih, pesanan <b>${orderNumber}</b> telah dikonfirmasi selesai.</p>
            <p style="color: #4b5563;">Semoga Anda puas dengan produk kami. Jangan ragu untuk berbelanja lagi di Bank Sampah Sukamaju Sejahtera.</p>
            <a href="/" style="display: inline-block; margin-top: 24px; padding: 10px 20px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">Kembali ke Beranda</a>
          </div>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } })

  } catch (error) {
    console.error('Error in confirm-receipt:', error)
    return new NextResponse('Terjadi kesalahan pada server.', { status: 500 })
  }
}
