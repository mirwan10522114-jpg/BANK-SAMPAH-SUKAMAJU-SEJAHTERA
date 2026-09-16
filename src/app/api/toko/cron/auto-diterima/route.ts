import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendMail } from '../../../../../lib/email'

export async function GET(req: NextRequest) {
  // Verifikasi token cron (opsional, untuk keamanan)
  const authHeader = req.headers.get('authorization')
  const cronToken = process.env.CRON_SECRET
  if (cronToken && authHeader !== `Bearer ${cronToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

  try {
    // 1. Auto-Selesai: cari pesanan yang status 'dikirim' dan ETA End-nya sudah lewat 3 hari
    const toComplete = await db.pesananToko.findMany({
      where: {
        orderStatus: 'dikirim',
        shippingEtaEnd: {
          lt: threeDaysAgo,
        },
      },
    })

    const completedOrderIds: string[] = []
    for (const order of toComplete) {
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
          keterangan: 'Pesanan otomatis diselesaikan oleh sistem (melewati batas waktu 3 hari setelah estimasi tiba).',
          createdById: null, // system
        },
      })
      completedOrderIds.push(order.orderNumber)
    }

    // 2. Kirim Email Reminder: cari pesanan yang status 'dikirim', ETA End sudah lewat hari ini, 
    //    dan belum pernah dikirim reminder.
    const toRemind = await db.pesananToko.findMany({
      where: {
        orderStatus: 'dikirim',
        shippingEtaEnd: {
          lt: now,
          gte: threeDaysAgo,
        },
        buyerEmail: { not: null },
      },
      include: {
        statusHistory: true,
      }
    })

    const remindedOrderIds: string[] = []
    const origin = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    for (const order of toRemind) {
      // Cek apakah sudah pernah kirim reminder
      const hasReminded = order.statusHistory.some(h => h.keterangan?.includes('[REMINDER_SENT]'))
      if (hasReminded || !order.buyerEmail) continue

      const confirmUrl = `${origin}/api/toko/order/${order.orderNumber}/confirm-receipt`

      const html = `<div style="font-family: sans-serif; background: #f0fdf4; padding: 24px;">
        <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 8px; padding: 24px; border: 1px solid #bbf7d0;">
          <h2 style="color: #166534; margin-top: 0;">Pesanan #${order.orderNumber} Telah Tiba?</h2>
          <p>Halo <b>${order.buyerName}</b>,</p>
          <p>Menurut estimasi pengiriman kami, pesanan Anda seharusnya sudah tiba atau akan segera tiba hari ini.</p>
          <p>Mohon konfirmasi jika Anda telah menerima pesanan tersebut dengan mengklik tombol di bawah ini:</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${confirmUrl}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Konfirmasi Pesanan Diterima</a>
          </div>
          <p style="font-size: 13px; color: #4b5563;">Jika tombol tidak berfungsi, Anda bisa membuka link berikut di browser: <br/><a href="${confirmUrl}" style="color: #059669;">${confirmUrl}</a></p>
          <p style="font-size: 12px; color: #ef4444; margin-top: 16px;">Penting: Jika tidak ada konfirmasi, sistem akan otomatis menyelesaikan pesanan ini dalam 3 hari ke depan.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <p style="font-size: 13px; color: #6b7280; text-align: center; margin-bottom: 0;">Bank Sampah Sukamaju Sejahtera</p>
        </div>
      </div>`

      try {
        await sendMail({
          to: order.buyerEmail,
          subject: `Konfirmasi Penerimaan Pesanan - ${order.orderNumber}`,
          html,
        })

        // Catat history bahwa reminder sudah dikirim
        await db.riwayatStatusPesananToko.create({
          data: {
            pesananTokoId: order.id,
            status: 'dikirim',
            keterangan: 'Email pengingat konfirmasi penerimaan telah dikirim. [REMINDER_SENT]',
            createdById: null,
          },
        })
        remindedOrderIds.push(order.orderNumber)
      } catch (err) {
        console.error(`Gagal kirim email reminder pesanan ${order.orderNumber}:`, err)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cron job berhasil dijalankan',
      completed: completedOrderIds,
      reminded: remindedOrderIds,
    })
  } catch (error: any) {
    console.error('Error running cron job:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
