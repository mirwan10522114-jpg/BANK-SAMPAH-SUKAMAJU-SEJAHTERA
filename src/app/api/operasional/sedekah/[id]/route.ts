import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, addInventory, reduceInventory } from '@/lib/business'
import { toNumber } from '@/lib/format'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tx = await db.sedekahTransaction.findUnique({
    where: { id },
    include: { user: true, items: { include: { wasteItem: { include: { category: true } } } }, createdBy: true },
  })
  if (!tx) return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })
  return NextResponse.json(tx)
}

// PATCH: edit QC for an existing sedekah transaction (recalculates weights, adjusts inventory)
// Note: sedekah does not affect saldo/points — only inventory and weight stats.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const actor = await getActingUser(req)
  const { items: editItems, qcNotes, rejectAll, rejectReason } = body as {
    items?: { id: string; quantityAfterQc: number; qcReason?: string | null }[]
    qcNotes?: string | null
    rejectAll?: boolean
    rejectReason?: string | null
  }

  const existing = await db.sedekahTransaction.findUnique({
    where: { id },
    include: { items: true, user: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })
  }

  // Handle Reject All
  if (rejectAll) {
    const updated = await db.sedekahTransaction.update({
      where: { id },
      data: {
        status: 'dibatalkan',
        qcStatus: 'rejected',
        qcReason: rejectReason || 'Ditolak saat QC',
        qcAt: new Date(),
        qcById: actor?.id ?? null,
        qcNotes: qcNotes ?? null,
      },
    })
    return NextResponse.json({ ...updated, _meta: { rejected: true } })
  }

  if (!editItems || !Array.isArray(editItems) || editItems.length === 0) {
    return NextResponse.json({ error: 'Item QC wajib diisi' }, { status: 400 })
  }

  const oldTotalBersih = toNumber(existing.totalWeightBersih ?? existing.totalWeight)
  const oldTotalKotor = toNumber(existing.totalWeightKotor ?? existing.totalWeight)
  const isFirstQc = existing.status === 'menunggu_qc'

  const editMap = new Map<string, { quantityAfterQc: number; qcReason: string | null }>()
  for (const ei of editItems) {
    const qty = toNumber(ei.quantityAfterQc)
    if (qty < 0) {
      return NextResponse.json({ error: 'Kuantitas bersih tidak boleh negatif' }, { status: 400 })
    }
    editMap.set(ei.id, { quantityAfterQc: qty, qcReason: ei.qcReason ?? null })
  }

  let newTotalBersih = 0
  let newTotalKotor = 0
  const itemUpdates: {
    id: string
    quantity: number
    quantityAfterQc: number
    susutQc: number
    qcReason: string | null
    wasteItemId: string
    oldQuantity: number
  }[] = []

  for (const item of existing.items) {
    const edit = editMap.get(item.id)
    if (!edit) continue
    const before = toNumber(item.quantityBeforeQc)
    const after = edit.quantityAfterQc
    const susut = Math.max(0, before - after)
    newTotalBersih += after
    newTotalKotor += before
    itemUpdates.push({
      id: item.id,
      quantity: after,
      quantityAfterQc: after,
      susutQc: susut,
      qcReason: edit.qcReason,
      wasteItemId: item.wasteItemId,
      oldQuantity: toNumber(item.quantity),
    })
  }

  if (itemUpdates.length === 0) {
    return NextResponse.json({ error: 'Tidak ada item yang cocok untuk diperbarui' }, { status: 400 })
  }

  const persentaseSusut = newTotalKotor > 0 ? (newTotalKotor - newTotalBersih) / newTotalKotor * 100 : 0
  const newQcStatus = itemUpdates.some((u) => u.susutQc > 0) ? 'adjusted' : 'passed'

  const updated = await db.$transaction(async (prisma) => {
    for (const upd of itemUpdates) {
      await prisma.sedekahTransactionItem.update({
        where: { id: upd.id },
        data: {
          quantity: upd.quantity,
          quantityAfterQc: upd.quantityAfterQc,
          susutQc: upd.susutQc,
          qcReason: upd.qcReason,
        },
      })
    }

    const tx = await prisma.sedekahTransaction.update({
      where: { id },
      data: {
        status: 'selesai',
        totalWeight: newTotalBersih,
        totalWeightKotor: newTotalKotor,
        totalWeightBersih: newTotalBersih,
        persentaseSusut,
        qcStatus: newQcStatus,
        qcAt: new Date(),
        qcById: actor?.id ?? null,
        qcNotes: qcNotes ?? null,
        finalizedAt: new Date(),
      },
      include: { items: { include: { wasteItem: { include: { category: true } } } }, user: true },
    })
    return tx
  })

  // Manage Inventory:
  // If this was in 'menunggu_qc', inventory was not added yet -> add full quantity.
  // If this was already 'selesai', adjust delta.
  for (const upd of itemUpdates) {
    if (isFirstQc) {
      if (upd.quantity > 0) {
        try {
          await addInventory(upd.wasteItemId, 'sedekah', upd.quantity, 'sedekah', 'sedekah_transaction', id, actor?.id, `Sedekah sampah (Lolos Verifikasi QC)`)
        } catch {}
      }
    } else {
      const qtyDelta = upd.quantity - upd.oldQuantity
      if (qtyDelta > 0) {
        try {
          await addInventory(upd.wasteItemId, 'sedekah', qtyDelta, 'qc_adjustment', 'sedekah_transaction', id, actor?.id, `Koreksi QC tambah stok sedekah`)
        } catch {}
      } else if (qtyDelta < 0) {
        try {
          await reduceInventory(upd.wasteItemId, 'sedekah', Math.abs(qtyDelta), 'qc_adjustment', 'sedekah_transaction', id, actor?.id, `Koreksi QC kurangi stok sedekah`)
        } catch {}
      }
    }
  }

  // Send struk email if transitioning from menunggu_qc
  if (isFirstQc) {
    try {
      const email = updated.user?.email
      const name = updated.user?.name || updated.donorName || 'Donatur'
      if (email) {
        const { sendStrukEmail } = await import('@/lib/email')
        const kodeTransaksi = updated.kodeTransaksi || `SD/${id.slice(-6).toUpperCase()}`
        let strukHtml = `<div class="struk-section"><div class="info-row"><span class="key">Kode Transaksi</span><span class="val mono">${kodeTransaksi}</span></div><div class="info-row"><span class="key">Tanggal Setor</span><span class="val">${new Date(updated.transactedAt).toLocaleString('id-ID')}</span></div><div class="info-row"><span class="key">Waktu Verifikasi QC</span><span class="val">${new Date().toLocaleString('id-ID')}</span></div><div class="info-row"><span class="key">Donatur</span><span class="val bold">${name}</span></div><div class="info-row"><span class="key">Status QC</span><span class="val bold" style="color:#047857;">${newQcStatus === 'passed' ? 'Lolos Bersih' : 'Disesuaikan'}</span></div></div>`
        strukHtml += `<div class="struk-section"><div class="label">Detail Sedekah Sampah & Hasil QC</div><table class="items-table"><thead><tr><th>Kategori</th><th>Nama</th><th class="center">Kotor</th><th class="center">Bersih</th><th class="center">Susut</th></tr></thead><tbody>`
        for (const item of updated.items) {
          const kotor = toNumber(item.quantityBeforeQc)
          const bersih = toNumber(item.quantityAfterQc ?? item.quantity)
          const susut = toNumber(item.susutQc)
          strukHtml += `<tr><td>${item.categoryNameSnapshot}</td><td>${item.itemNameSnapshot}</td><td class="center">${kotor.toFixed(2)} ${item.unitSnapshot}</td><td class="center bold">${bersih.toFixed(2)} ${item.unitSnapshot}</td><td class="center" style="color:#b45309;">${susut > 0 ? `${susut.toFixed(2)} ${item.unitSnapshot}` : '-'}</td></tr>`
        }
        strukHtml += `</tbody></table></div>`
        strukHtml += `<div class="struk-section"><div class="total-row"><span class="key">Total Berat Bersih</span><span class="val bold" style="font-size:16px;color:#047857;">${newTotalBersih.toFixed(2)} kg</span></div>${persentaseSusut > 0 ? `<div class="info-row"><span class="key">Total Susut</span><span class="val" style="color:#b45309;">${(newTotalKotor - newTotalBersih).toFixed(2)} kg (${persentaseSusut.toFixed(1)}%)</span></div>` : ''}</div>`

        await sendStrukEmail({
          to: email,
          recipientName: name,
          receiptNo: kodeTransaksi,
          transactionType: 'sedekah',
          totalAmount: 0,
          totalWeight: newTotalBersih,
          pointsEarned: 0,
          customHtmlBody: strukHtml,
          transactionDate: updated.transactedAt,
        })
      }
    } catch (err) {
      console.error('[Sedekah QC] Gagal kirim email struk:', err)
    }
  }

  return NextResponse.json({
    ...updated,
    _meta: {
      oldTotalBersih,
      newTotalBersih,
      oldTotalKotor,
      newTotalKotor,
      persentaseSusut,
      qcStatus: newQcStatus,
    },
  })
}
