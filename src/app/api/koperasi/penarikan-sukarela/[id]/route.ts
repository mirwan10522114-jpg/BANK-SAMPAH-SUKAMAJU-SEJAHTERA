import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, recordKasTx, tarikSimpananSukarela } from '@/lib/business'
import { toNumber } from '@/lib/format'

// PUT: approve / reject / cairkan penarikan sukarela
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const actor = await getActingUser(req)
  const { status, namaPengurus } = body as { status: 'disetujui' | 'ditolak' | 'dicairkan'; namaPengurus?: string }

  const ps = await db.koperasiPenarikanSukarela.findUnique({ where: { id }, include: { anggota: true } })
  if (!ps) return NextResponse.json({ error: 'Pengajuan tidak ditemukan' }, { status: 404 })

  const data: any = { status }
  if (status === 'disetujui') {
    data.tanggalPersetujuan = new Date()
    data.namaPengurus = namaPengurus || actor?.name
  } else if (status === 'dicairkan') {
    data.tanggalPencairan = new Date()
    data.namaPengurus = namaPengurus || actor?.name
    // execute the actual sukarela withdrawal + kas keluar
    try {
      await tarikSimpananSukarela(ps.koperasiAnggotaId, toNumber(ps.jumlah), actor?.id, `Pencairan pengajuan ${ps.nomorPengajuan}`)
    } catch (e: any) {
      return NextResponse.json({ error: `Gagal mencairkan: ${e.message}` }, { status: 400 })
    }
  }
  const updated = await db.koperasiPenarikanSukarela.update({ where: { id }, data, include: { anggota: true } })
  return NextResponse.json(updated)
}
