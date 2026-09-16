import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'
import { executeWithdrawal, getBankSampahKasBalance, getActingUser } from '@/lib/business'

// GET: list withdrawal history (with receipt)
// Query params:
//   penggunaId — filter by nasabah
//   status — 'diproses' | 'sukses' | 'ditolak'
//   method — 'cash' | 'transfer'
//   dari   — ISO date (gte processedAt)
//   sampai — ISO date (lte processedAt)
//   q      — search by pengguna name OR receiptNo (case-insensitive contains)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const penggunaId = searchParams.get('penggunaId')
  const status = searchParams.get('status')
  const method = searchParams.get('method')
  const dari = searchParams.get('dari')
  const sampai = searchParams.get('sampai')
  const q = (searchParams.get('q') || '').trim()

  const where: any = {}
  if (penggunaId) where.penggunaId = penggunaId
  if (status) where.status = status
  if (method) where.method = method
  if (dari || sampai) {
    where.processedAt = {}
    if (dari) where.processedAt.gte = new Date(dari)
    if (sampai) {
      const s = new Date(sampai)
      s.setHours(23, 59, 59, 999)
      where.processedAt.lte = s
    }
  }

  if (q) {
    // Match pengguna.name OR receiptNo (case-insensitive contains).
    const matched = await db.pengguna.findMany({
      where: { name: { contains: q } },
      select: { id: true },
      take: 200,
    })
    const matchedUserIds = matched.map((u) => u.id)
    const orClauses: any[] = [
      { receiptNo: { contains: q } },
    ]
    if (matchedUserIds.length > 0) {
      orClauses.push({ penggunaId: { in: matchedUserIds } })
    }
    where.OR = orClauses
  }

  const list = await db.permintaanPenarikan.findMany({
    where,
    orderBy: { processedAt: 'desc' },
    include: { pengguna: { select: { id: true, name: true, memberCode: true, phone: true } }, processedBy: { select: { name: true } } },
    take: 100,
  })
  const kasSaldo = await getBankSampahKasBalance('nasabah')
  return NextResponse.json({ list, kasSaldo })
}

// POST: execute withdrawal (validate saldoTersedia real-time + record kas keluar + receipt)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const actor = await getActingUser(req)
  const penggunaId = body.penggunaId
  const amount = body.amount !== undefined ? Number(body.amount) : (body.jumlah !== undefined ? Number(body.jumlah) : 0)
  const method = body.method || body.metode || 'cash'
  const notes = body.notes || body.keterangan || ''
  const bankInfo = body.bankInfo

  if (!penggunaId) return NextResponse.json({ error: 'Nasabah wajib dipilih' }, { status: 400 })
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Nominal harus > 0' }, { status: 400 })
  if (!method || method.trim() === '') return NextResponse.json({ error: 'Metode pencairan wajib dipilih' }, { status: 400 })

  try {
    const result = await executeWithdrawal(penggunaId, amount, method, notes, actor?.id, bankInfo)
    return NextResponse.json(result, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
