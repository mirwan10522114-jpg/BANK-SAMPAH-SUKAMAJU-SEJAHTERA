import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, addInventory, generateTxNo } from '@/lib/business'
import { toNumber } from '@/lib/format'

// GET: list sedekah transactions
// Query params:
//   userId   — filter by donor (nasabah)
//   qcStatus — 'passed' | 'adjusted' | 'failed' | 'pending'
//   dari     — ISO date (gte transactedAt)
//   sampai   — ISO date (lte transactedAt)
//   q        — search by user name OR donorName (case-insensitive contains)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const qcStatus = searchParams.get('qcStatus')
  const dari = searchParams.get('dari')
  const sampai = searchParams.get('sampai')
  const q = (searchParams.get('q') || '').trim()

  const where: any = {}
  if (userId) where.userId = userId
  if (qcStatus) where.qcStatus = qcStatus
  if (dari || sampai) {
    where.transactedAt = {}
    if (dari) where.transactedAt.gte = new Date(dari)
    if (sampai) {
      const s = new Date(sampai)
      s.setHours(23, 59, 59, 999)
      where.transactedAt.lte = s
    }
  }

  if (q) {
    // Match either user.name OR donorName (OR-combined via Prisma OR).
    const matched = await db.user.findMany({
      where: { name: { contains: q } },
      select: { id: true },
      take: 200,
    })
    const matchedUserIds = matched.map((u) => u.id)
    const orClauses: any[] = [
      { donorName: { contains: q } },
    ]
    if (matchedUserIds.length > 0) {
      orClauses.push({ userId: { in: matchedUserIds } })
    }
    where.OR = orClauses
  }

  const tx = await db.sedekahTransaction.findMany({
    where,
    orderBy: { transactedAt: 'desc' },
    include: { user: true, items: { include: { wasteItem: true } } },
    take: 100,
  })
  return NextResponse.json(tx)
}

// POST: create sedekah sampah transaction (no balance/points - pure donation to bank)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const actor = await getActingUser(req)
  const { userId, donorName, items, notes, applyQc } = body as {
    userId?: string
    donorName?: string
    items: { wasteItemId: string; quantityBeforeQc: number; quantityAfterQc?: number; qcReason?: string }[]
    notes?: string
    applyQc?: boolean
  }

  if (!userId && !donorName) return NextResponse.json({ error: 'Nasabah atau nama donatur wajib diisi' }, { status: 400 })
  if (!items?.length) return NextResponse.json({ error: 'Minimal 1 item sampah' }, { status: 400 })

  const wasteItems = await db.wasteItem.findMany({
    where: { id: { in: items.map((i) => i.wasteItemId) } },
    include: { category: true },
  })

  let totalKotor = 0
  let totalBersih = 0
  const itemRows = items.map((it) => {
    const wi = wasteItems.find((w) => w.id === it.wasteItemId)
    if (!wi) throw new Error('Barang sampah tidak ditemukan')
    const before = toNumber(it.quantityBeforeQc)
    const after = applyQc && it.quantityAfterQc != null ? toNumber(it.quantityAfterQc) : before
    const susut = Math.max(0, before - after)
    totalKotor += before
    totalBersih += after
    return {
      wasteItemId: wi.id,
      itemCodeSnapshot: wi.code,
      itemNameSnapshot: wi.name,
      categoryNameSnapshot: wi.category.name,
      unitSnapshot: wi.unit,
      quantity: after,
      quantityBeforeQc: before,
      quantityAfterQc: applyQc ? after : null,
      susutQc: susut,
      qcReason: it.qcReason || null,
    }
  })

  const qcStatus = applyQc ? (itemRows.some((r) => r.susutQc > 0) ? 'adjusted' : 'passed') : 'passed'
  const persentaseSusut = totalKotor > 0 ? (Math.round(((totalKotor - totalBersih) / totalKotor) * 10000) / 100) : 0

  // Generate kode SD SEBELUM create transaction agar sequence benar
  const { generateTxNo } = await import('@/lib/business')
  const kodeTransaksi = await generateTxNo('SD')

  const tx = await db.sedekahTransaction.create({
    data: {
      userId: userId || null,
      donorName: donorName || null,
      kodeTransaksi, // SIMPAN kode transaksi resmi (SD / DDMMYYYY / 00001)
      totalWeight: totalBersih,
      totalWeightKotor: totalKotor,
      totalWeightBersih: totalBersih,
      persentaseSusut,
      notes,
      createdById: actor?.id,
      status: 'selesai', // sedekah langsung finalize (tidak ada QC saldo)
      qcStatus,
      qcAt: new Date(),
      qcById: actor?.id,
      finalizedAt: new Date(),
      filterAt: new Date(),
      filterById: actor?.id,
      items: { create: itemRows },
    },
    include: { items: true },
  })

  // Sedekah adds to inventory as bank asset (source: sedekah), no balance/points
  for (const row of itemRows) {
    await addInventory(row.wasteItemId, 'sedekah', toNumber(row.quantity), 'sedekah', 'sedekah_transaction', tx.id, actor?.id, `Sedekah sampah`)
  }

  // Send struk via email to nasabah (or skip if no email)
  try {
    const { sendStrukEmail } = await import('@/lib/email')
    let email = ''
    let name = donorName || 'Donatur'
    if (userId) {
      const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, name: true, memberCode: true } })
      email = user?.email || ''
      name = user?.name || name
    }
    if (email) {
      let strukHtml = `<div class="struk-header"><div class="icon">🤲</div><h2>Bank Sampah</h2><div class="sub">Sukamaju Sejahtera</div><div class="badge">STRUK SEDEKAH SAMPAH</div></div>`
      strukHtml += `<div class="struk-section"><div class="info-row"><span class="key">Kode Transaksi</span><span class="val mono">${kodeTransaksi}</span></div><div class="info-row"><span class="key">Tanggal</span><span class="val">${new Date(tx.transactedAt).toLocaleString('id-ID')}</span></div><div class="info-row"><span class="key">Donatur</span><span class="val bold">${name}</span></div><div class="info-row"><span class="key">Status QC</span><span class="val capitalize">${qcStatus === 'passed' ? 'Lulus' : (qcStatus === 'adjusted' ? 'Disesuaikan' : qcStatus)}</span></div></div>`
      // Detail item dengan info QC
      strukHtml += `<div class="struk-section"><div class="label">Detail Jenis Sampah & QC</div><table class="items-table"><thead><tr><th>Kategori</th><th>Nama</th><th class="center">Kotor</th><th class="center">Bersih</th><th class="center">Susut</th></tr></thead><tbody>`
      for (const r of itemRows) {
        const kotor = toNumber(r.quantityBeforeQc)
        const bersih = r.quantityAfterQc != null ? toNumber(r.quantityAfterQc) : kotor
        const susut = toNumber(r.susutQc)
        const unit = r.unitSnapshot || 'kg'
        strukHtml += `<tr><td>${r.categoryNameSnapshot}</td><td>${r.itemNameSnapshot}</td><td class="center">${kotor} ${unit}</td><td class="center">${bersih} ${unit}</td><td class="center">${susut > 0 ? `${susut} ${unit}` : '-'}</td></tr>`
        // Tampilkan alasan QC jika ada
        if (r.qcReason) {
          strukHtml += `<tr><td colspan="5" style="font-style:italic;color:#dc2626;font-size:9px;">↳ Alasan QC: ${r.qcReason}</td></tr>`
        }
      }
      strukHtml += `</tbody></table></div>`
      // Summary QC
      strukHtml += `<div class="struk-section"><div class="summary-row"><span class="key">Total Berat Kotor</span><span class="val">${toNumber(tx.totalWeightKotor)} kg</span></div><div class="summary-row"><span class="key">Total Berat Bersih</span><span class="val">${toNumber(tx.totalWeightBersih)} kg</span></div>`
      const tSusut = toNumber(tx.totalWeightKotor) - toNumber(tx.totalWeightBersih)
      if (tSusut > 0) {
        strukHtml += `<div class="summary-row"><span class="key">Total Susut (Penyusutan)</span><span class="val">${tSusut} kg (${toNumber(tx.persentaseSusut)}%)</span></div>`
      }
      strukHtml += `<div class="summary-row highlight"><span class="key">Total Donasi Sampah</span><span class="val">${toNumber(tx.totalWeight)} kg</span></div></div>`
      strukHtml += `<div class="struk-footer"><div class="thanks">Terima kasih atas sedekah sampah Anda</div></div>`
      await sendStrukEmail({ to: email, subject: `Struk Setoran Sedekah ${kodeTransaksi}`, strukHtml })
    }
  } catch (e) {
    console.error('[Sedekah Struk Email] Error:', e)
  }

  return NextResponse.json(tx, { status: 201 })
}
