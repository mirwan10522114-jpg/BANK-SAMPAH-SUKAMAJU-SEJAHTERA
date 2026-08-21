import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'

// GET /api/public/stats — public stats for landing page
// Pisahkan total sampah nabung vs sedekah (tidak digabung lagi)
// HANYA menghitung transaksi dengan status='selesai' (sudah QC)
export async function GET() {
  const [nasabahCount, savingTx, sedekahTx, edukasiCount, kegiatanCount] = await Promise.all([
    db.user.count({ where: { OR: [{ roles: { contains: 'nasabah' } }, { roles: { contains: 'koperasi' } }] } }),
    db.savingTransaction.findMany({ where: { status: 'selesai' }, select: { totalWeight: true } }),
    db.sedekahTransaction.findMany({ where: { status: 'selesai' }, select: { totalWeightBersih: true, totalWeight: true } }),
    db.article.count({ where: { publishedAt: { not: null } } }),
    db.kegiatan.count({ where: { publishedAt: { not: null } } }),
  ])

  // Hitung terpisah
  const totalNabung = savingTx.reduce((s, t) => s + toNumber(t.totalWeight), 0)
  const totalSedekah = sedekahTx.reduce((s, t) => s + toNumber(t.totalWeightBersih || t.totalWeight), 0)
  const totalSampah = totalNabung + totalSedekah // gabungan (untuk backward compat)

  return NextResponse.json({
    nasabahCount,
    totalSampah: Math.round(totalSampah * 100) / 100,
    totalNabung: Math.round(totalNabung * 100) / 100,
    totalSedekah: Math.round(totalSedekah * 100) / 100,
    edukasiCount,
    kegiatanCount,
  })
}
