import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'

// GET: check eligibility for pinjaman
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const anggotaId = searchParams.get('anggotaId')
  if (!anggotaId) {
    return NextResponse.json({ error: 'anggotaId wajib diisi' }, { status: 400 })
  }

  // Fetch anggota with pinjamans (include angsurans) and perbaikanRequests
  const anggota = await db.koperasiAnggota.findUnique({
    where: { id: anggotaId },
    include: {
      pinjamans: {
        include: { angsurans: true },
        orderBy: { createdAt: 'desc' },
      },
      perbaikanRequests: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!anggota) {
    return NextResponse.json({ error: 'Anggota tidak ditemukan' }, { status: 404 })
  }

  // Get koperasi settings for minimalBulanAnggota
  const setting = await db.koperasiSetting.findFirst()
  const minimalBulanAnggota = setting?.minimalBulanAnggota ?? 3

  // Calculate memberMonths from tanggalBergabung to now
  const now = new Date()
  const bergabung = new Date(anggota.tanggalBergabung)
  const diffMs = now.getTime() - bergabung.getTime()
  const memberMonths = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44)))

  const reasons: string[] = []

  // 1. Check membership duration
  if (memberMonths < minimalBulanAnggota) {
    reasons.push(
      `Masa keanggotaan belum mencukupi (${memberMonths} bulan, minimal ${minimalBulanAnggota} bulan)`
    )
  }

  // 2. Check active pinjaman
  const adaPinjamanAktif = anggota.pinjamans.some((p) => p.status === 'berjalan')
  if (adaPinjamanAktif) {
    reasons.push('Masih memiliki pinjaman yang sedang berjalan')
  }

  // 3. Check payment history
  // For all pinjamans with angsurans (lunas or berjalan), check if ANY angsuran has dendaBayar > 0
  const pinjamansWithHistory = anggota.pinjamans.filter(
    (p) => (p.status === 'lunas' || p.status === 'berjalan') && p.angsurans.length > 0
  )

  let riwayatPembayaran: 'baik' | 'buruk' | 'baru' = 'baru'
  let totalKeterlambatan = 0

  if (pinjamansWithHistory.length === 0) {
    riwayatPembayaran = 'baru'
  } else {
    let hasLate = false
    let lateCount = 0
    for (const pinjaman of pinjamansWithHistory) {
      for (const angsuran of pinjaman.angsurans) {
        if (toNumber(angsuran.dendaBayar) > 0) {
          hasLate = true
          lateCount++
        }
      }
    }
    totalKeterlambatan = lateCount
    if (hasLate) {
      riwayatPembayaran = 'buruk'
    } else {
      riwayatPembayaran = 'baik'
    }
  }

  if (riwayatPembayaran === 'buruk') {
    reasons.push(
      `Riwayat pembayaran buruk (${totalKeterlambatan} kali terlambat bayar). Ajukan perbaikan eligibilitas terlebih dahulu.`
    )
  }

  // 4. Check pinjamanDiblokir flag
  const pinjamanDiblokir = anggota.pinjamanDiblokir
  if (pinjamanDiblokir) {
    reasons.push('Pinjaman diblokir. Ajukan permintaan perbaikan eligibilitas.')
  }

  // 5. Check pending perbaikan request
  const pendingPerbaikan = anggota.perbaikanRequests.find((r) => r.status === 'menunggu') ?? null

  let pendingPerbaikanBool: boolean | null = null
  let perbaikanInfo: {
    id: string
    status: string
    catatanAdmin: string | null
    syaratTambahan: string | null
    reviewedAt: Date | null
  } | null = null

  if (pendingPerbaikan) {
    pendingPerbaikanBool = true
    perbaikanInfo = {
      id: pendingPerbaikan.id,
      status: pendingPerbaikan.status,
      catatanAdmin: pendingPerbaikan.catatanAdmin,
      syaratTambahan: pendingPerbaikan.syaratTambahan,
      reviewedAt: pendingPerbaikan.reviewedAt,
    }
  }

  // Determine final eligibility
  const eligible = reasons.length === 0

  return NextResponse.json({
    eligible,
    reasons,
    memberMonths,
    minimalBulanAnggota,
    riwayatPembayaran,
    totalKeterlambatan,
    adaPinjamanAktif,
    pinjamanDiblokir,
    pendingPerbaikan: pendingPerbaikanBool,
    perbaikanInfo,
    // Extra info for display
    anggotaInfo: {
      nomorAnggota: anggota.nomorAnggota,
      nama: anggota.nama,
      tanggalBergabung: anggota.tanggalBergabung,
    },
  })
}