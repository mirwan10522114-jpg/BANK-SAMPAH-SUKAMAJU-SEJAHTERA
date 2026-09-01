import { db } from '@/lib/db'

/**
 * Mem-broadcast notifikasi ke semua pengguna yang memiliki role "admin"
 * @param title Judul notifikasi
 * @param message Isi pesan
 * @param type Jenis notifikasi ('info', 'success', 'warning', 'error')
 */
export async function broadcastAdminNotification(title: string, message: string, type: string = 'info') {
  try {
    const admins = await db.user.findMany({
      where: {
        roles: {
          contains: '"admin"'
        }
      },
      select: { id: true }
    })

    if (admins.length > 0) {
      // @ts-ignore: Model might not be typed yet until server restarts and prisma generate finishes
      await db.notification.createMany({
        data: admins.map(a => ({
          userId: a.id,
          title,
          message,
          type
        }))
      })
    }
  } catch (error) {
    console.error('[Notification Broadcast Error]', error)
  }
}
