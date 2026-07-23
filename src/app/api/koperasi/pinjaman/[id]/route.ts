import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calcAngsuranSchedule } from '@/lib/business'
import { toNumber } from '@/lib/format'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pinjaman = await db.koperasiPinjaman.findUnique({
    where: { id },
    include: { anggota: true, angsurans: { orderBy: { angsuranKe: 'asc' } } },
  })
  if (!pinjaman) return NextResponse.json({ error: 'Pinjaman tidak ditemukan' }, { status: 404 })

  // project full schedule
  const jumlah = toNumber(pinjaman.jumlahPinjaman)
  const tenor = pinjaman.tenorBulan
  const sukuBunga = toNumber(pinjaman.sukuBunga)
  const { pokokPerBulan, bungaPerBulan, angsuranPerBulan } = calcAngsuranSchedule(jumlah, tenor, sukuBunga)
  const schedule = []
  let sisa = jumlah
  const paidMap = new Map(pinjaman.angsurans.map((a) => [a.angsuranKe, a]))
  for (let i = 1; i <= tenor; i++) {
    sisa = Math.max(0, sisa - pokokPerBulan)
    const paid = paidMap.get(i)
    schedule.push({
      angsuranKe: i,
      pokok: pokokPerBulan,
      bunga: bungaPerBulan,
      total: angsuranPerBulan,
      sisaSetelah: sisa,
      status: paid ? 'lunas' : (i <= pinjaman.angsurans.length ? 'lunas' : 'belum'),
      tanggalBayar: paid?.tanggalBayar || null,
    })
  }
  return NextResponse.json({ ...pinjaman, schedule })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const pinjaman = await db.koperasiPinjaman.update({
    where: { id },
    data: { status: body.status, keterangan: body.keterangan },
  })
  return NextResponse.json(pinjaman)
}
