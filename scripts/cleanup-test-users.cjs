const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

async function main() {
  // Hapus user yang emailnya mengandung "mirwangenius06" (sebelumnya dipake testing)
  // Sekaligus hapus relasinya (balance, koperasi, dll) untuk hindari foreign key error
  const users = await db.user.findMany({
    where: { email: { contains: 'mirwangenius06' } },
    select: { id: true, email: true },
  })
  console.log('Found users to delete:', users.length)
  for (const u of users) {
    console.log('  Deleting:', u.email)
    try {
      // Hapus balance dulu
      await db.balance.deleteMany({ where: { userId: u.id } })
      // Hapus koperasi anggota
      await db.koperasiAnggota.deleteMany({ where: { userId: u.id } })
      // Hapus user
      await db.user.delete({ where: { id: u.id } })
      console.log('    ✓ deleted')
    } catch (e) {
      console.log('    ✗ error:', e.message)
    }
  }
  await db.$disconnect()
}

main()
