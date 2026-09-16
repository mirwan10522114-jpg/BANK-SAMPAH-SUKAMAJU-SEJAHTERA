import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, addInventory, generateTxNo } from '@/lib/business'
import { toNumber, parseFilterStartDate, parseFilterEndDate } from '@/lib/format'

// GET: list sedekah transactions
// Query params:
//   penggunaId   — filter by donor (nasabah)
//   qcStatus — 'passed' | 'adjusted' | 'failed' | 'pending' | 'all'
//   dari     — YYYY-MM-DD, YYYY-MM, DD/MM/YYYY, or ISO date
//   sampai   — YYYY-MM-DD, YYYY-MM, DD/MM/YYYY, or ISO date
//   q        — search by pengguna name, donorName, memberCode, or kodeTransaksi
//   limit    — max rows (default 5000)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const penggunaId = searchParams.get('penggunaId')
  const qcStatus = searchParams.get('qcStatus')
  const dari = searchParams.get('dari')
  const sampai = searchParams.get('sampai')
  const q = (searchParams.get('q') || '').trim()
  const limit = parseInt(searchParams.get('limit') || '5000', 10)

  const where: any = {}
  if (penggunaId) where.penggunaId = penggunaId
  if (qcStatus && qcStatus !== 'all' && qcStatus !== 'Semua') where.qcStatus = qcStatus

  const startDate = parseFilterStartDate(dari)
  const endDate = parseFilterEndDate(sampai)
  if (startDate || endDate) {
    where.transactedAt = {}
    if (startDate) where.transactedAt.gte = startDate
    if (endDate) where.transactedAt.lte = endDate
  }

  if (q) {
    const matched = await db.pengguna.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { memberCode: { contains: q } },
        ],
      },
      select: { id: true },
      take: 500,
    })
    const matchedUserIds = matched.map((u) => u.id)
    const orClauses: any[] = [
      { kodeTransaksi: { contains: q } },
      { donorName: { contains: q } },
    ]
    if (matchedUserIds.length > 0) {
      orClauses.push({ penggunaId: { in: matchedUserIds } })
    }
    where.OR = orClauses
  }

  const [tx, countAgg, sumAgg] = await Promise.all([
    db.transaksiSedekah.findMany({
      where,
      orderBy: { transactedAt: 'desc' },
      include: { pengguna: true, items: { include: { jenisSampah: true } } },
      take: limit,
    }),
    db.transaksiSedekah.count({ where }),
    db.transaksiSedekah.aggregate({ where, _sum: { totalWeight: true, totalWeightBersih: true } }),
  ])

  const totalCount = countAgg
  const totalWeight = toNumber(sumAgg._sum.totalWeightBersih || sumAgg._sum.totalWeight)

  const format = searchParams.get('format')
  if (format === 'wrapped') {
    return NextResponse.json({ list: tx, totalCount, totalWeight })
  }

  return NextResponse.json(tx, {
    headers: {
      'x-total-count': String(totalCount),
      'x-total-weight': String(totalWeight),
    },
  })
}

// POST: create sedekah sampah transaction (no saldo/points - pure donation to bank)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const actor = await getActingUser(req)
  const { penggunaId, donorName, items, notes, applyQc, skipQc, qcMode } = body as {
    penggunaId?: string
    donorName?: string
    items: { jenisSampahId: string; quantityBeforeQc: number; quantityAfterQc?: number; qcReason?: string }[]
    notes?: string
    applyQc?: boolean
    skipQc?: boolean
    qcMode?: 'langsung' | 'nanti' | 'bersih'
  }

  if (!penggunaId && !donorName) return NextResponse.json({ error: 'Nasabah atau nama donatur wajib diisi' }, { status: 400 })
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

  const jenisSampahs = await db.jenisSampah.findMany({
    where: { id: { in: items.map((i) => i.jenisSampahId) } },
    include: { category: true },
  })

  let totalKotor = 0
  let totalBersih = 0
  const itemRows = items.map((it: any) => {
    const wi = jenisSampahs.find((w) => w.id === it.jenisSampahId)
    if (!wi) throw new Error('Barang sampah tidak ditemukan')
    const before = toNumber(it.quantityBeforeQc !== undefined ? it.quantityBeforeQc : (it.weight !== undefined ? it.weight : (it.berat !== undefined ? it.berat : it.quantity || 0)))
    const after = isApplyQc && it.quantityAfterQc != null ? toNumber(it.quantityAfterQc) : before
    const susut = Math.max(0, before - after)
    totalKotor += before
    totalBersih += after
    return {
      jenisSampahId: wi.id,
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

  const tx = await db.transaksiSedekah.create({
    data: {
      penggunaId: penggunaId || null,
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

  // Only add to inventaris if transaction is finalized immediately (not pending QC)
  if (shouldFinalize) {
    for (const row of itemRows) {
      await addInventory(row.jenisSampahId, 'sedekah', toNumber(row.quantity), 'sedekah', 'sedekah_transaction', tx.id, actor?.id, `Sedekah sampah (${qcStatus})`)
    }

    // Send struk via email to nasabah (or skip if no email)
    try {
      const { sendStrukEmail } = await import('@/lib/email')
      let email = ''
      let name = donorName || 'Donatur'
      if (penggunaId) {
        const pengguna = await db.pengguna.findUnique({ where: { id: penggunaId }, select: { email: true, name: true, memberCode: true } })
        email = pengguna?.email || ''
        name = pengguna?.name || name
      }
      if (email) {
        let strukHtml = `<div class="struk-header"><div class="icon">🤲</div><h2>Bank Sampah</h2><div class="sub">Sukamaju Sejahtera</div><div class="badge">STRUK SEDEKAH SAMPAH</div></div>`
        strukHtml += `<div class="struk-section"><h3 style="margin:0 0 12px 0; color:#064e3b; font-size:15px; text-transform:uppercase; text-align:center;">Sedekah Sampah</h3><div class="info-row"><span class="key">Kode Transaksi</span><span class="val mono">${kodeTransaksi}</span></div><div class="info-row"><span class="key">Tanggal</span><span class="val">${new Date(tx.transactedAt).toLocaleString('id-ID')}</span></div><div class="info-row"><span class="key">Donatur</span><span class="val bold">${name}</span></div><div class="info-row"><span class="key">Status QC</span><span class="val capitalize">${qcStatus === 'passed' ? 'Lulus' : (qcStatus === 'adjusted' ? 'Disesuaikan' : (qcStatus === 'tidak_perlu' ? 'Sampah Bersih' : qcStatus))}</span></div></div>`
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
          subject: `Sedekah Sampah: ${kodeTransaksi}`,
          strukHtml: strukHtml
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
