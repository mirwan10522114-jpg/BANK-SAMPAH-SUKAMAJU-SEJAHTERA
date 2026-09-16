import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'
import { getKoperasiKasBalance } from '@/lib/business'

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
      simpananSaldos: true,
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

  // 5. Check Simpanan Pokok (wajib lunas sebelum bisa mengajukan pinjaman)
  const saldoPokok = await db.koperasiSimpananSaldo.findUnique({
    where: {
      koperasiAnggotaId_jenisSimpanan: {
        koperasiAnggotaId: anggotaId,
        jenisSimpanan: 'pokok',
      },
    },
  })
  const nominalSimpananPokok = toNumber(setting?.nominalSimpananPokok ?? 50000)
  const saldoPokokVal = toNumber(saldoPokok?.saldo ?? 0)
  const hasPaidPokok = saldoPokokVal > 0 && (nominalSimpananPokok <= 0 || saldoPokokVal >= nominalSimpananPokok)

  if (!hasPaidPokok) {
    reasons.push(
      `Belum membayar Simpanan Pokok (wajib membayar ${nominalSimpananPokok > 0 ? 'Rp ' + nominalSimpananPokok.toLocaleString('id-ID') : 'Simpanan Pokok'} terlebih dahulu sebagai biaya registrasi/deposit keanggotaan).`
    )
  }

  // 6. Check pending perbaikan request
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

  // 7. Check Minimal Simpanan Pinjaman & Tunggakan Simpanan Wajib
  const minimalSimpananPinjaman = toNumber(setting?.minimalSimpananPinjaman ?? 0)
  
  // Hitung total semua simpanan
  const totalSimpanan = anggota.simpananSaldos.reduce((acc, curr) => acc + toNumber(curr.saldo), 0)
  if (minimalSimpananPinjaman > 0 && totalSimpanan < minimalSimpananPinjaman) {
    reasons.push(
      `Total saldo simpanan (Rp ${totalSimpanan.toLocaleString('id-ID')}) belum mencapai batas minimal untuk meminjam (Rp ${minimalSimpananPinjaman.toLocaleString('id-ID')}).`
    )
  }

  // Hitung ekspektasi simpanan wajib
  const nominalSimpananWajib = toNumber(setting?.nominalSimpananWajib ?? 0)
  const saldoWajib = toNumber(anggota.simpananSaldos.find(s => s.jenisSimpanan === 'wajib')?.saldo ?? 0)
  
  if (nominalSimpananWajib > 0) {
    // Anggota wajib membayar 1x per bulan sejak bergabung
    const expectedBulanBayar = Math.max(1, memberMonths)
    const expectedSaldoWajib = expectedBulanBayar * nominalSimpananWajib
    
    // Cek apakah saldo wajib kurang dari ekspektasi ATAU belum ada setoran bulan ini
    // Cara sederhana: jika saldoWajib < expectedSaldoWajib berarti ada bulan yang bolong/belum bayar
    if (saldoWajib < expectedSaldoWajib) {
      reasons.push(
        `Terdapat tunggakan Simpanan Wajib atau belum membayar untuk bulan ini (Saldo Wajib saat ini: Rp ${saldoWajib.toLocaleString('id-ID')}, seharusnya: Rp ${expectedSaldoWajib.toLocaleString('id-ID')}).`
      )
    }
  }

  // Get kas koperasi balance
  const kasKoperasi = await getKoperasiKasBalance()

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
    hasPaidPokok,
    saldoPokok: saldoPokokVal,
    nominalSimpananPokok,
    pendingPerbaikan: pendingPerbaikanBool,
    perbaikanInfo,
    kasKoperasi,
    // Extra info for display
    anggotaInfo: {
      nomorAnggota: anggota.nomorAnggota,
      nama: anggota.nama,
      tanggalBergabung: anggota.tanggalBergabung,
    },
  })
}