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
      user: true,
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
      email: anggota.user?.email,
    },
    simpanan: {
      pokok: simpananPokok,
      wajib: simpananWajib,
      sukarela: simpananSukarela,
      totalKasTersimpan,
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
