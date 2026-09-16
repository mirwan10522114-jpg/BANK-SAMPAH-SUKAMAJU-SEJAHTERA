import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'
import { sendSimpananPokokReminderEmail } from '@/backend/lib/email'

// ============================================================
// GET /api/koperasi/reminder-pokok
// List anggota status pembayaran Simpanan Pokok (biaya registrasi)
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') || 'belum_bayar' // belum_bayar | sudah_bayar | all
    const q = (searchParams.get('q') || '').toLowerCase().trim()

    const setting = await db.koperasiSetting.findFirst()
    const nominalPokok = setting ? toNumber(setting.nominalSimpananPokok) : 50000

    const anggotas = await db.koperasiAnggota.findMany({
      where: { status: 'aktif', deletedAt: null },
      include: {
        pengguna: { select: { name: true, email: true, phone: true } },
        simpananSaldos: true,
      },
      orderBy: { tanggalBergabung: 'desc' },
    })

    const results = anggotas.map((a) => {
      const saldoPokok = toNumber(a.simpananSaldos.find((s) => s.jenisSimpanan === 'pokok')?.saldo || 0)
      const sudahBayar = saldoPokok > 0 && (nominalPokok <= 0 || saldoPokok >= nominalPokok)
      const kekurangan = Math.max(0, nominalPokok - saldoPokok)

      return {
        id: a.id,
        nomorAnggota: a.nomorAnggota,
        nama: a.nama || a.pengguna?.name || '-',
        email: a.pengguna?.email || '',
        phone: a.pengguna?.phone || a.noTelepon || '',
        tanggalBergabung: a.tanggalBergabung ? a.tanggalBergabung.toISOString() : null,
        saldoPokok,
        nominalPokok,
        kekurangan,
        status: sudahBayar ? 'sudah_bayar' : 'belum_bayar',
        statusLabel: sudahBayar ? 'Lunas' : 'Belum Setor',
      }
    })

    // Filter status
    let filtered = results
    if (filter === 'belum_bayar') {
      filtered = results.filter((r) => r.status === 'belum_bayar')
    } else if (filter === 'sudah_bayar') {
      filtered = results.filter((r) => r.status === 'sudah_bayar')
    }

    // Filter search text
    if (q) {
      filtered = filtered.filter(
        (r) =>
          r.nama.toLowerCase().includes(q) ||
          r.nomorAnggota.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.phone.toLowerCase().includes(q),
      )
    }

    const belumBayarCount = results.filter((r) => r.status === 'belum_bayar').length
    const sudahBayarCount = results.filter((r) => r.status === 'sudah_bayar').length
    const totalTerkumpul = results.reduce((s, r) => s + r.saldoPokok, 0)

    return NextResponse.json({
      nominalPokok,
      anggotas: filtered,
      summary: {
        totalAnggota: results.length,
        belumBayar: belumBayarCount,
        sudahBayar: sudahBayarCount,
        totalTerkumpul,
        potensiTerkumpul: results.length * nominalPokok,
      },
    })
  } catch (error: any) {
    console.error('[Reminder Pokok GET] Error:', error)
    return NextResponse.json({ error: `Gagal memuat data simpanan pokok: ${error.message}` }, { status: 500 })
  }
}

// ============================================================
// POST /api/koperasi/reminder-pokok
// Blast / kirim email reminder Simpanan Pokok ke anggota koperasi
// Body: { anggotaId?: string; blastSemua?: boolean; pesanKustom?: string }
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { anggotaId, blastSemua } = body as {
      anggotaId?: string
      blastSemua?: boolean
    }

    const setting = await db.koperasiSetting.findFirst()
    const nominalPokok = setting ? toNumber(setting.nominalSimpananPokok) : 50000

    let targetAnggotas: any[] = []

    if (anggotaId) {
      const a = await db.koperasiAnggota.findUnique({
        where: { id: anggotaId },
        include: {
          pengguna: { select: { email: true, name: true } },
          simpananSaldos: true,
        },
      })
      if (!a) return NextResponse.json({ error: 'Anggota tidak ditemukan' }, { status: 404 })
      targetAnggotas = [a]
    } else if (blastSemua) {
      const allActive = await db.koperasiAnggota.findMany({
        where: { status: 'aktif', deletedAt: null },
        include: {
          pengguna: { select: { email: true, name: true } },
          simpananSaldos: true,
        },
      })

      // Hanya kirim ke anggota yang BELUM lunas Simpanan Pokok
      targetAnggotas = allActive.filter((a) => {
        const saldoPokok = toNumber(a.simpananSaldos.find((s) => s.jenisSimpanan === 'pokok')?.saldo || 0)
        return saldoPokok < nominalPokok
      })
    } else {
      return NextResponse.json({ error: 'Parameter anggotaId atau blastSemua wajib diisi' }, { status: 400 })
    }

    let sentCount = 0
    let failedCount = 0
    const errors: string[] = []

    for (const a of targetAnggotas) {
      const email = a.pengguna?.email
      if (!email) {
        failedCount++
        errors.push(`${a.nama}: Email tidak tersedia`)
        continue
      }

      try {
        const res = await sendSimpananPokokReminderEmail({
          to: email,
          userName: a.nama || a.pengguna?.name || 'Anggota Koperasi',
          nomorAnggota: a.nomorAnggota,
          nominalSimpananPokok: nominalPokok,
          nominalSimpananWajib: 0, // Fallback since this is pokok reminder
        })

        if (res.success) {
          sentCount++
        } else {
          failedCount++
          errors.push(`${a.nama}: ${res.error || 'Gagal mengirim email'}`)
        }
      } catch (err: any) {
        failedCount++
        errors.push(`${a.nama}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      totalTarget: targetAnggotas.length,
      errors: errors.slice(0, 5),
    })
  } catch (error: any) {
    console.error('[Reminder Pokok POST] Error:', error)
    return NextResponse.json({ error: `Gagal memproses pengiriman: ${error.message}` }, { status: 500 })
  }
}
