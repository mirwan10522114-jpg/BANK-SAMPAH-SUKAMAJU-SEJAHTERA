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
  const { userId, donorName, items, notes, applyQc, skipQc, qcMode } = body as {
    userId?: string
    donorName?: string
    items: { wasteItemId: string; quantityBeforeQc: number; quantityAfterQc?: number; qcReason?: string }[]
    notes?: string
    applyQc?: boolean
    skipQc?: boolean
    qcMode?: 'langsung' | 'nanti' | 'bersih'
  }

  if (!userId && !donorName) return NextResponse.json({ error: 'Nasabah atau nama donatur wajib diisi' }, { status: 400 })
  if (!items?.length) return NextResponse.json({ error: 'Minimal 1 item sampah' }, { status: 400 })

  // Validate berat per item: tidak boleh negatif atau 0
  for (const it of items as any[]) {
    const qty = toNumber(it.quantityBeforeQc !== undefined ? it.quantityBeforeQc : (it.weight !== undefined ? it.weight : (it.berat !== undefined ? it.berat : it.quantity || 0)))
    if (qty < 0) return NextResponse.json({ error: 'Berat tidak boleh negatif' }, { status: 400 })
    if (qty <= 0) return NextResponse.json({ error: 'Berat harus lebih dari 0' }, { status: 400 })
  }

  const isSkipQc = qcMode === 'bersih' || skipQc === true
  const isApplyQc = qcMode === 'langsung' || (applyQc === true && !isSkipQc)
  const isPendingQc = qcMode === 'nanti' || (!isApplyQc && !isSkipQc && qcMode !== undefined)
  const shouldFinalize = !isPendingQc

  const wasteItems = await db.wasteItem.findMany({
    where: { id: { in: items.map((i) => i.wasteItemId) } },
    include: { category: true },
  })

  let totalKotor = 0
  let totalBersih = 0
  const itemRows = items.map((it: any) => {
    const wi = wasteItems.find((w) => w.id === it.wasteItemId)
    if (!wi) throw new Error('Barang sampah tidak ditemukan')
    const before = toNumber(it.quantityBeforeQc !== undefined ? it.quantityBeforeQc : (it.weight !== undefined ? it.weight : (it.berat !== undefined ? it.berat : it.quantity || 0)))
    const after = isApplyQc && it.quantityAfterQc != null ? toNumber(it.quantityAfterQc) : before
    const susut = Math.max(0, before - after)
    totalKotor += before
    totalBersih += after
    return {
      wasteItemId: wi.id,
      itemCodeSnapshot: wi.code,
      itemNameSnapshot: wi.name,
      categoryNameSnapshot: wi.category.name,
      unitSnapshot: wi.unit,
      quantity: isPendingQc ? before : after,
      quantityBeforeQc: before,
      quantityAfterQc: isPendingQc ? null : (isApplyQc ? after : before),
      susutQc: isPendingQc ? 0 : susut,
      qcReason: it.qcReason || null,
    }
  })

  const qcStatus = isSkipQc ? 'tidak_perlu' : (isApplyQc ? (itemRows.some((r) => r.susutQc > 0) ? 'adjusted' : 'passed') : 'pending')
  const persentaseSusut = shouldFinalize && totalKotor > 0 ? (Math.round(((totalKotor - totalBersih) / totalKotor) * 10000) / 100) : 0
  const txStatus = shouldFinalize ? 'selesai' : 'menunggu_qc'

  // Generate kode SD SEBELUM create transaction agar sequence benar
  const { generateTxNo } = await import('@/lib/business')
  const kodeTransaksi = await generateTxNo('SD')

  const tx = await db.sedekahTransaction.create({
    data: {
      userId: userId || null,
      donorName: donorName || null,
      kodeTransaksi, // SIMPAN kode transaksi resmi (SD / DDMMYYYY / 00001)
      totalWeight: shouldFinalize ? totalBersih : totalKotor,
      totalWeightKotor: totalKotor,
      totalWeightBersih: shouldFinalize ? totalBersih : null,
      persentaseSusut: shouldFinalize ? persentaseSusut : null,
      notes,
      createdById: actor?.id,
      status: txStatus,
      qcStatus,
      qcAt: shouldFinalize ? new Date() : null,
      qcById: shouldFinalize ? actor?.id : null,
      finalizedAt: shouldFinalize ? new Date() : null,
      filterAt: new Date(),
      filterById: actor?.id,
      items: { create: itemRows },
    },
    include: { items: true },
  })

  // Only add to inventory if transaction is finalized immediately (not pending QC)
  if (shouldFinalize) {
    for (const row of itemRows) {
      await addInventory(row.wasteItemId, 'sedekah', toNumber(row.quantity), 'sedekah', 'sedekah_transaction', tx.id, actor?.id, `Sedekah sampah (${qcStatus})`)
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
        strukHtml += `<div class="struk-section"><div class="info-row"><span class="key">Kode Transaksi</span><span class="val mono">${kodeTransaksi}</span></div><div class="info-row"><span class="key">Tanggal</span><span class="val">${new Date(tx.transactedAt).toLocaleString('id-ID')}</span></div><div class="info-row"><span class="key">Donatur</span><span class="val bold">${name}</span></div><div class="info-row"><span class="key">Status QC</span><span class="val capitalize">${qcStatus === 'passed' ? 'Lulus' : (qcStatus === 'adjusted' ? 'Disesuaikan' : (qcStatus === 'tidak_perlu' ? 'Sampah Bersih' : qcStatus))}</span></div></div>`
        // Detail item dengan info QC
        strukHtml += `<div class="struk-section"><div class="label">Detail Jenis Sampah & QC</div><table class="items-table"><thead><tr><th>Kategori</th><th>Nama</th><th class="center">Kotor</th><th class="center">Bersih</th><th class="center">Susut</th></tr></thead><tbody>`
        for (const r of itemRows) {
          const kotor = toNumber(r.quantityBeforeQc)
          const bersih = r.quantityAfterQc != null ? toNumber(r.quantityAfterQc) : kotor
          const susut = toNumber(r.susutQc)
          strukHtml += `<tr><td>${r.categoryNameSnapshot}</td><td>${r.itemNameSnapshot}</td><td class="center">${kotor.toFixed(2)} ${r.unitSnapshot}</td><td class="center bold">${bersih.toFixed(2)} ${r.unitSnapshot}</td><td class="center" style="color:#b45309;">${susut > 0 ? `${susut.toFixed(2)} ${r.unitSnapshot}` : '-'}</td></tr>`
        }
        strukHtml += `</tbody></table></div>`
        strukHtml += `<div class="struk-section"><div class="summary-row"><span class="key">Total Berat Kotor</span><span class="val">${toNumber(tx.totalWeightKotor)} kg</span></div><div class="summary-row"><span class="key">Total Berat Bersih</span><span class="val">${toNumber(tx.totalWeightBersih)} kg</span></div>`
        const tSusut = toNumber(tx.totalWeightKotor) - toNumber(tx.totalWeightBersih)
        if (tSusut > 0) {
          strukHtml += `<div class="summary-row"><span class="key">Total Susut (Penyusutan)</span><span class="val">${tSusut.toFixed(2)} kg (${toNumber(tx.persentaseSusut)}%)</span></div>`
        }
        strukHtml += `<div class="summary-row highlight"><span class="key">Total Donasi Sampah</span><span class="val">${toNumber(tx.totalWeight)} kg</span></div></div>`
        strukHtml += `<div class="struk-footer"><div class="thanks">Terima kasih atas sedekah sampah Anda</div></div>`
        await sendStrukEmail({
          to: email,
          recipientName: name,
          receiptNo: kodeTransaksi,
          transactionType: 'sedekah',
          totalAmount: 0,
          totalWeight: toNumber(tx.totalWeight),
          pointsEarned: 0,
          customHtmlBody: strukHtml,
          transactionDate: tx.transactedAt,
        })
      }
    } catch (e) {
      console.error('[Sedekah Struk Email] Error:', e)
    }
  }

  return NextResponse.json({
    ...tx,
    _meta: {
      status: txStatus,
      qcStatus,
      qcMode: isSkipQc ? 'bersih' : isApplyQc ? 'langsung' : 'nanti',
      finalized: shouldFinalize,
      emailDeferredForQc: !shouldFinalize,
    },
  }, { status: 201 })
}
