import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'

// Personal Dashboard for Anggota Koperasi
// Returns: profile, simpanan (pokok/wajib/sukarela), pinjaman aktif, sisa hutang,
// denda/histori keterlambatan, riwayat kontrak pinjaman

export async function GET(_req: NextRequest, { params }: { params: Promise<{ anggotaId: string }> }) {
  const { anggotaId } = await params

  const anggota = await db.koperasiAnggota.findUnique({
    where: { id: anggotaId },
    include: {
      pengguna: true,
      simpananSaldos: true,
      simpananTx: { orderBy: { tanggalTransaksi: 'desc' }, take: 50 },
      pinjamans: {
        orderBy: { createdAt: 'desc' },
        include: { angsurans: { orderBy: { angsuranKe: 'asc' } } },
      },
    },
  })

  if (!anggota) return NextResponse.json({ error: 'Anggota tidak ditemukan' }, { status: 404 })

  const simpananPokok = toNumber(anggota.simpananSaldos.find((s) => s.jenisSimpanan === 'pokok')?.saldo || 0)
  const simpananWajib = toNumber(anggota.simpananSaldos.find((s) => s.jenisSimpanan === 'wajib')?.saldo || 0)
  const simpananSukarela = toNumber(anggota.simpananSaldos.find((s) => s.jenisSimpanan === 'sukarela')?.saldo || 0)
  const totalKasTersimpan = simpananPokok + simpananWajib + simpananSukarela

  // Pinjaman aktif (berjalan)
  const pinjamanAktif = anggota.pinjamans.filter((p) => p.status === 'berjalan')
  const akumulasiSisaHutang = pinjamanAktif.reduce((s, p) => s + toNumber(p.sisaPinjaman), 0)

  // Histori keterlambatan (denda)
  let totalDenda = 0
  let totalTerlambat = 0
  for (const p of anggota.pinjamans) {
    for (const a of p.angsurans) {
      totalDenda += toNumber(a.dendaBayar)
      if (toNumber(a.dendaBayar) > 0) totalTerlambat++
    }
  }
  const disiplin = totalTerlambat === 0 ? 'Disiplin Tepat Waktu' : `${totalTerlambat}x Terlambat`

  // Total denda dibayar
  const totalDendaDibayar = totalDenda

  // Riwayat kontrak pinjaman
  const riwayatKontrak = anggota.pinjamans.map((p) => {
    const angsuranTerbayar = p.angsurans.length
    const progress = p.tenorBulan > 0 ? Math.round((angsuranTerbayar / p.tenorBulan) * 100) : 0
    return {
      id: p.id,
      nomorPinjaman: p.nomorPinjaman,
      tanggalPengajuan: p.tanggalPengajuan,
      tanggalPencairan: p.tanggalPencairan,
      jumlahPinjaman: toNumber(p.jumlahPinjaman),
      tenorBulan: p.tenorBulan,
      angsuranPerBulan: toNumber(p.angsuranPerBulan),
      angsuranTerbayar,
      sisaPinjaman: toNumber(p.sisaPinjaman),
      sukuBunga: toNumber(p.sukuBunga),
      status: p.status,
      progress,
      keterangan: p.keterangan,
      // Full angsuran records for payment schedule view
      angsurans: p.angsurans.map((a) => ({
        id: a.id,
        angsuranKe: a.angsuranKe,
        jumlahBayar: toNumber(a.jumlahBayar),
        dendaBayar: toNumber(a.dendaBayar),
        tanggalBayar: a.tanggalBayar,
        sisaPinjamanSetelah: toNumber(a.sisaPinjamanSetelah),
        keterangan: a.keterangan,
      })),
    }
  })

  // Lama keanggotaan (bulan)
  const now = new Date()
  const lamaBulan = anggota.tanggalBergabung
    ? Math.max(0, (now.getFullYear() - anggota.tanggalBergabung.getFullYear()) * 12 + (now.getMonth() - anggota.tanggalBergabung.getMonth()))
    : 0

  const setting = await db.koperasiSetting.findFirst()
  const nominalWajib = setting ? toNumber(setting.nominalSimpananWajib) : 10000
  const totalMonthsCovered = nominalWajib > 0 ? Math.floor(simpananWajib / nominalWajib) : 0

  const joinDate = anggota.tanggalBergabung ? new Date(anggota.tanggalBergabung) : (anggota.createdAt ? new Date(anggota.createdAt) : now)
  const joinYear = joinDate.getFullYear()
  const joinMonth = joinDate.getMonth() + 1

  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const MONTH_NAMES_ID = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ]
  const totalMonthsToGenerate = Math.max(12, totalMonthsCovered + 6)
  const jadwalSimpananWajib = Array.from({ length: totalMonthsToGenerate }, (_, i) => {
    const mYear = joinYear + Math.floor((joinMonth - 1 + i) / 12)
    const mMonth = ((joinMonth - 1 + i) % 12) + 1
    const isPaid = i < totalMonthsCovered
    const isPastOrCurrent = (mYear < currentYear) || (mYear === currentYear && mMonth <= currentMonth)
    const isCurrent = mYear === currentYear && mMonth === currentMonth

    return {
      monthIndex: i + 1,
      year: mYear,
      month: mMonth,
      label: `${MONTH_NAMES_ID[mMonth - 1]} ${mYear}`,
      isPaid,
      status: isPaid ? 'lunas' : (isPastOrCurrent ? 'tertunggak' : 'belum_tempo'),
      statusText: isPaid ? 'Sudah Lunas' : (isPastOrCurrent ? 'Belum Bayar' : 'Belum Jatuh Tempo'),
      nominal: nominalWajib,
      isCurrent,
    }
  })

  return NextResponse.json({
    profile: {
      id: anggota.id,
      nomorAnggota: anggota.nomorAnggota,
      nama: anggota.nama,
      noKtp: anggota.noKtp,
      noTelepon: anggota.noTelepon,
      alamat: anggota.alamat,
      status: anggota.status,
      tanggalBergabung: anggota.tanggalBergabung,
      lamaBulan,
      email: anggota.pengguna?.email,
    },
    simpanan: {
      pokok: simpananPokok,
      wajib: simpananWajib,
      sukarela: simpananSukarela,
      totalKasTersimpan,
    },
    simpananWajibInfo: {
      nominalWajib,
      saldoWajib: simpananWajib,
      totalMonthsCovered,
      lunasSampaiBulan: totalMonthsCovered > 0 ? jadwalSimpananWajib[totalMonthsCovered - 1]?.label : null,
      jadwal: jadwalSimpananWajib,
    },
    pinjaman: {
      pinjamanAktifCount: pinjamanAktif.length,
      akumulasiSisaHutang,
      disiplin,
      totalTerlambat,
      totalDendaDibayar,
    },
    riwayatKontrak,
  })
}
