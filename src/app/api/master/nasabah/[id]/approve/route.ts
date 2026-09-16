import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getActingUser(req)
    if (!actor || !(Array.isArray(actor.roles) ? actor.roles : JSON.parse(actor.roles || '[]')).includes('admin')) {
      return NextResponse.json({ error: 'Unauthorized. Only admin can approve.' }, { status: 403 })
    }

    const { id } = await params
    
    // Temukan pengguna
    const pengguna = await db.pengguna.findUnique({
      where: { id },
      include: { koperasiAnggota: true }
    })
    
    if (!pengguna) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 })
    }

    // Ubah status jadi verified
    const updatedUser = await db.pengguna.update({
      where: { id },
      data: {
        verificationStatus: 'verified',
        adminVerifiedAt: new Date(),
      }
    })

    // Jika pengguna adalah anggota koperasi, ubah statusnya menjadi aktif
    if (pengguna.koperasiAnggota) {
      await db.koperasiAnggota.update({
        where: { id: pengguna.koperasiAnggota.id },
        data: {
          status: 'aktif',
          tanggalBergabung: new Date()
        }
      })
    }

    // Kirim notifikasi WhatsApp ke pengguna bahwa akunnya telah disetujui
    try {
      const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
      if (pengguna.phone) {
        await sendWhatsAppMessage(
          pengguna.phone, 
          `Halo ${pengguna.name},\n\nPendaftaran akun Anda di Bank Sampah / Koperasi Sukamaju Sejahtera telah disetujui oleh Admin!\n\nSekarang Anda sudah bisa login ke dalam aplikasi.\n\nTerima kasih.`
        )
      }
    } catch (err) {
      console.error('Gagal mengirim WA notifikasi approve:', err)
    }

    return NextResponse.json({ success: true, pengguna: updatedUser })
  } catch (error: any) {
    console.error('Approve error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
