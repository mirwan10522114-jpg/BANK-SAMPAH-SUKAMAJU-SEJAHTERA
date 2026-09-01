import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const baseClient = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
})

const prismaClient = baseClient.$extends({
  query: {
    $allModels: {
      async $allOperations({ operation, model, args, query }) {
        const result = await query(args)

        const isMutation = ['create', 'update', 'delete', 'createMany', 'updateMany', 'deleteMany'].includes(operation)
        
        if (model && (model as string) !== 'Notification' && isMutation) {
          // Jalankan asinkron agar tidak mem-block query
          setTimeout(() => {
            import('./notification')
              .then(({ broadcastAdminNotification }) => {
                const actionMap: any = {
                  create: 'Penambahan/Pembuatan',
                  update: 'Perubahan/Edit',
                  delete: 'Penghapusan',
                  createMany: 'Penambahan Massal',
                  updateMany: 'Perubahan Massal',
                  deleteMany: 'Penghapusan Massal'
                }
                const actionName = actionMap[operation] || operation
                broadcastAdminNotification(
                  `Aktivitas: ${model}`,
                  `Sistem mendeteksi proses ${actionName} pada data ${model}.`,
                  'info'
                ).catch(console.error)
              })
              .catch(console.error)
          }, 0)
        }

        return result
      },
    },
  },
}) as unknown as PrismaClient

export const db = globalForPrisma.prisma ?? prismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db