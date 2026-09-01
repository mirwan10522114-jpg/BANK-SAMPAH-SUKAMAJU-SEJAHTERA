import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, creditSaldoTertahan, creditPoints, addInventory, calcPointsForRupiah, generateTxNo } from '@/lib/business'
import { toNumber } from '@/lib/format'

// GET: list all saving transactions
// Query params:
//   userId   — filter by nasabah
//   qcStatus — 'passed' | 'adjusted' | 'failed' | 'pending'
//   dari     — ISO date (gte transactedAt)
//   sampai   — ISO date (lte transactedAt)
//   q        — search by nasabah name (case-insensitive contains)
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
      // include the full end day
      s.setHours(23, 59, 59, 999)
      where.transactedAt.lte = s
    }
  }

  // Search by user name: fetch matching user IDs first, then filter.
  if (q) {
    const matched = await db.user.findMany({
      where: { name: { contains: q } },
      select: { id: true },
      take: 200,
    })
    const matchedUserIds = matched.map((u) => u.id)
    if (matchedUserIds.length === 0) {
      return NextResponse.json([])
    }
    where.userId = { in: matchedUserIds }
  }

  const tx = await db.savingTransaction.findMany({
    where,
    orderBy: { transactedAt: 'desc' },
    include: { user: true, items: { include: { wasteItem: true } } },
    take: 100,
  })
  return NextResponse.json(tx)
}

// POST: create a nabung sampah transaction with QC + balance + points + inventory integration
// Alur 3 mode QC:
// - Mode "nanti" (default): status = "menunggu_qc", saldo BELUM masuk. Sampah dikumpulkan, QC kemudian.
// - Mode "langsung" (applyQc=true): QC di tempat, teller input berat bersih → status = "selesai", saldo masuk
// - Mode "bersih" (skipQc=true): Sampah dianggap bersih, berat kotor = berat bersih → status = "selesai", saldo masuk
// Saldo hanya masuk saat status = "selesai" (via mode "langsung" / "bersih" / QC confirm belakangan)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const actor = await getActingUser(req)
  const { userId, items, notes, applyQc, skipQc } = body as {
    userId: string
    items: { wasteItemId: string; quantityBeforeQc: number; quantityAfterQc?: number; qcReason?: string }[]
    notes?: string
    applyQc?: boolean  // mode "langsung": QC di tempat, input berat bersih
    skipQc?: boolean   // mode "bersih": sampah bersih, tidak perlu QC
  }

  if (!userId) return NextResponse.json({ error: 'Nasabah wajib dipilih' }, { status: 400 })
  if (!items?.length) return NextResponse.json({ error: 'Minimal 1 item sampah' }, { status: 400 })

  // Validate berat per item: tidak boleh negatif atau 0
  for (const it of items as any[]) {
    const qty = toNumber(it.quantityBeforeQc !== undefined ? it.quantityBeforeQc : (it.weight !== undefined ? it.weight : (it.berat !== undefined ? it.berat : it.quantity || 0)))
    if (qty < 0) return NextResponse.json({ error: 'Berat tidak boleh negatif' }, { status: 400 })
    if (qty <= 0) return NextResponse.json({ error: 'Berat harus lebih dari 0' }, { status: 400 })
  }

  // Build item snapshots
  const wasteItems = await db.wasteItem.findMany({
    where: { id: { in: items.map((i) => i.wasteItemId) } },
    include: { category: true, prices: { orderBy: { effectiveFrom: 'desc' }, take: 1 } },
  })

  // ============================================================
  // Tentukan mode QC: "langsung" | "bersih" | "nanti"
  // ============================================================
  const isSkipQc = skipQc === true       // mode "bersih"
  const isApplyQc = applyQc === true     // mode "langsung"
  const shouldFinalize = isSkipQc || isApplyQc  // finalize = saldo langsung masuk

  let totalWeightKotor = 0
  let totalWeightBersih = 0
  let totalValueFinal = 0
  const itemRows = items.map((it: any) => {
    const wi = wasteItems.find((w) => w.id === it.wasteItemId)
    if (!wi) throw new Error('Barang sampah tidak ditemukan')
    const price = wi.prices[0] ? toNumber(wi.prices[0].pricePerUnit) : toNumber(wi.pricePerUnit)
    const wastePriceId = wi.prices[0]?.id
    const before = toNumber(it.quantityBeforeQc !== undefined ? it.quantityBeforeQc : (it.weight !== undefined ? it.weight : (it.berat !== undefined ? it.berat : it.quantity || 0)))
    // Tentukan berat bersih:
    // - mode "bersih" → after = before (sampah dianggap bersih)
    // - mode "langsung" → after = input quantityAfterQc dari teller
    // - mode "nanti" → after = null (belum di-QC)
    const after = isSkipQc ? before : (isApplyQc && it.quantityAfterQc != null ? toNumber(it.quantityAfterQc) : null)
    const susut = after != null ? Math.max(0, before - after) : 0
    const subtotal = after != null ? after * price : before * price // kalau pending, pakai estimasi before
    totalWeightKotor += before
    if (after != null) totalWeightBersih += after
    totalValueFinal += subtotal
    return {
      wasteItemId: wi.id,
      wastePriceId,
      itemCodeSnapshot: wi.code,
      itemNameSnapshot: wi.name,
      categoryNameSnapshot: wi.category.name,
      unitSnapshot: wi.unit,
      pricePerUnitSnapshot: price,
      quantity: after != null ? after : before, // kalau finalize, pakai bersih; kalau pending, pakai kotor
      subtotal,
      quantityBeforeQc: before,
      quantityAfterQc: after,
      susutQc: susut,
      subtotalBeforeQc: before * price,
      qcReason: it.qcReason || null,
    }
  })

  // Tentukan status & qcStatus
  const txStatus = shouldFinalize ? 'selesai' : 'menunggu_qc'
  const qcStatus = isSkipQc ? 'tidak_perlu' : (isApplyQc ? (itemRows.some((r) => r.susutQc > 0) ? 'adjusted' : 'passed') : 'pending')

  const { points } = await calcPointsForRupiah(totalValueFinal)

  // Generate kode NB SEBELUM create transaction
  const { generateTxNo } = await import('@/lib/business')
  const kodeTransaksi = await generateTxNo('NB')

  // Create transaction + items
  const tx = await db.$transaction(async (prisma) => {
    const saving = await prisma.savingTransaction.create({
      data: {
        userId,
        kodeTransaksi, // SIMPAN kode transaksi resmi (NB / DDMMYYYY / 00001)
        totalWeight: shouldFinalize ? totalWeightBersih : 0, // kalau pending, totalWeight belum final
        totalValue: shouldFinalize ? totalValueFinal : 0,
        pointsAwarded: shouldFinalize ? points : 0,
        notes,
        createdById: actor?.id,
        status: txStatus,
        qcStatus,
        qcAt: shouldFinalize ? new Date() : null,
        qcById: shouldFinalize ? actor?.id : null,
        finalizedAt: shouldFinalize ? new Date() : null,
        items: { create: itemRows },
      },
      include: { items: true },
    })
    return saving
  })

  // ============================================================
  // Post-transaction integration
  // ============================================================
  // HANYA kalau finalize (mode "langsung" atau "bersih") → kredit saldo, poin, inventory
  // Kalau "nanti" (pending QC) → TIDAK ADA penambahan saldo di sini
  if (shouldFinalize) {
    // 1. Credit saldo tersedia
    await creditSaldoTertahan(userId, totalValueFinal, 'saving_transaction', tx.id, `Setoran sampah ${tx.id.slice(-6)}`, actor?.id)
    // 2. Credit points
    if (points > 0) {
      const { rule } = await calcPointsForRupiah(totalValueFinal)
      await creditPoints(userId, points, 'saving_transaction', tx.id, `Reward poin setoran sampah`, actor?.id, rule?.id)
    }
    // 3. Add inventory stock (source: nabung) — pakai berat bersih
    for (const row of itemRows) {
      const qty = row.quantityAfterQc != null ? toNumber(row.quantityAfterQc) : toNumber(row.quantityBeforeQc)
      await addInventory(row.wasteItemId, 'nabung', qty, 'saving', 'saving_transaction', tx.id, actor?.id, `Setoran dari nasabah (${isSkipQc ? 'bersih' : 'QC langsung'})`)
    }
  }

  // ============================================================
  // Kirim email struk — HANYA jika transaksi sudah final (bukan pending QC)
  // ------------------------------------------------------------
  // Saat mode "nanti" (pending QC) → TIDAK kirim email struk dulu
  // Email struk baru dikirim saat:
  //   - Mode "langsung" (QC di tempat) → langsung kirim
  //   - Mode "bersih" (tidak perlu QC) → langsung kirim
  //   - QC confirm via PATCH → kirim struk final di sana
  // ============================================================
  if (shouldFinalize) {
    try {
      const { sendStrukEmail } = await import('@/lib/email')
      const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, name: true, memberCode: true } })
      if (user?.email) {
        const fmtIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
        let html = `<div class="struk-header"><div class="icon">♻</div><h2>Bank Sampah</h2><div class="sub">Sukamaju Sejahtera</div><div class="badge">STRUK NABUNG SAMPAH</div></div>`
        html += `<div class="struk-section"><h3 style="margin:0 0 12px 0; color:#064e3b; font-size:15px; text-transform:uppercase; text-align:center;">Nabung Sampah</h3><div class="info-row"><span class="key">Kode Transaksi</span><span class="val mono">${kodeTransaksi}</span></div><div class="info-row"><span class="key">Tanggal</span><span class="val">${new Date(tx.transactedAt).toLocaleString('id-ID')}</span></div><div class="info-row"><span class="key">Nasabah</span><span class="val bold">${user.name}</span></div><div class="info-row"><span class="key">Kode</span><span class="val mono">${user.memberCode || '-'}</span></div></div>`
        html += `<div class="struk-section"><div class="label">Detail Jenis Sampah & QC</div><table class="items-table"><thead><tr><th>Kategori</th><th>Nama</th><th class="center">Kotor</th><th class="center">Bersih</th><th class="center">Susut</th><th class="right">Harga</th><th class="right">Subtotal</th></tr></thead><tbody>`
        for (const r of itemRows) {
          const kotor = toNumber(r.quantityBeforeQc)
          const bersih = r.quantityAfterQc != null ? toNumber(r.quantityAfterQc) : kotor
          const susut = toNumber(r.susutQc)
          const unit = r.unitSnapshot || 'kg'
          html += `<tr><td>${r.categoryNameSnapshot}</td><td>${r.itemNameSnapshot}</td><td class="center">${kotor} ${unit}</td><td class="center">${bersih} ${unit}</td><td class="center">${susut > 0 ? `${susut} ${unit}` : '-'}</td><td class="right">${fmtIDR(toNumber(r.pricePerUnitSnapshot))}</td><td class="right">${fmtIDR(toNumber(r.subtotal))}</td></tr>`
        }
        html += `</tbody></table></div>`
        html += `<div class="struk-section"><div class="summary-row"><span class="key">Total Berat Kotor</span><span class="val">${totalWeightKotor} kg</span></div><div class="summary-row"><span class="key">Total Berat Bersih</span><span class="val">${totalWeightBersih} kg</span></div><div class="summary-row highlight"><span class="key">Total Nilai Dibayar</span><span class="val">${fmtIDR(totalValueFinal)}</span></div><div class="summary-row"><span class="key">Poin Didapat</span><span class="val">${points}</span></div></div>`
        html += `<div class="struk-footer"><div class="thanks">Terima kasih telah menabung sampah</div></div>`
        await sendStrukEmail({ to: user.email, subject: `Struk Setoran Nabung ${kodeTransaksi}`, strukHtml: html })
      }
    } catch (e) {
      console.error('[Nabung Struk Email] Error:', e)
    }
  }
  // Jika pending QC → TIDAK kirim email. Email baru dikirim saat QC dikonfirmasi.

  return NextResponse.json({ ...tx, _meta: { status: txStatus, qcStatus, qcMode: isSkipQc ? 'bersih' : isApplyQc ? 'langsung' : 'nanti', saldoCredited: shouldFinalize } }, { status: 201 })
}
