import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, creditSaldoTertahan, creditPoints, addInventory, calcPointsForRupiah, generateTxNo } from '@/lib/business'
import { toNumber } from '@/lib/format'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tx = await db.savingTransaction.findUnique({
    where: { id },
    include: { user: true, items: { include: { wasteItem: { include: { category: true } } } }, createdBy: true, qcBy: true },
  })
  if (!tx) return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })
  return NextResponse.json(tx)
}

// ============================================================
// PATCH: Konfirmasi QC untuk transaksi nabung
// ------------------------------------------------------------
// Alur baru (sesuai permintaan):
// - Input: berat bersih per item (boleh sama dengan berat kotor kalau memang bersih)
// - Sistem hitung ulang nilai rupiah berdasarkan berat bersih
// - Update transaksi: status = "selesai", qcStatus = "passed" / "adjusted"
// - SAAT INI SALDO DIPKREDIT PERTAMA KALI (bukan delta)
// - Jika semua item ditolak (0kg) → status = "dibatalkan", saldo tidak masuk
// ============================================================
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const actor = await getActingUser(req)
  let editItems = body.items
  const { qcNotes, rejectAll, rejectReason } = body as {
    qcNotes?: string | null
    rejectAll?: boolean
    rejectReason?: string | null
  }

  // Fetch existing transaction
  const existing = await db.savingTransaction.findUnique({
    where: { id },
    include: { items: true, user: { select: { email: true, name: true, memberCode: true } } },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })
  }

  // If status="passed", auto-fill editItems with quantityBeforeQc
  if (!editItems && (body.status === 'passed' || body.qcStatus === 'passed' || body.status === 'selesai')) {
    editItems = existing.items.map((it) => ({
      id: it.id,
      quantityAfterQc: toNumber(it.quantityBeforeQc),
    }))
  }

  if (!editItems || !Array.isArray(editItems) || editItems.length === 0) {
    if (!rejectAll) {
      return NextResponse.json({ error: 'Item QC wajib diisi' }, { status: 400 })
    }
  }

  // Cegah double-finalize: kalau sudah "selesai", tolak PATCH
  if (existing.status === 'selesai') {
    return NextResponse.json({ error: 'Transaksi sudah difinalisasi. Tidak bisa di-QC ulang.' }, { status: 400 })
  }

  // ============================================================
  // KASUS KHUSUS: PENOLAKAN TOTAL (rejectAll)
  // ============================================================
  if (rejectAll) {
    const updated = await db.savingTransaction.update({
      where: { id },
      data: {
        status: 'dibatalkan',
        qcStatus: 'rejected',
        qcAt: new Date(),
        qcById: actor?.id ?? null,
        qcNotes: qcNotes ?? null,
        qcReason: rejectReason || 'Ditolak total saat QC',
        // Update semua item: berat bersih = 0
        items: {
          updateMany: editItems?.map((ei: any) => ({
            where: { id: ei.id },
            data: {
              quantityAfterQc: 0,
              quantity: 0,
              susutQc: 0, // akan diupdate di bawah
              subtotal: 0,
            },
          })) || [],
        },
      },
      include: { items: true },
    })

    // Update susut per item manual (karena updateMany tidak support computed)
    for (const item of existing.items) {
      const before = toNumber(item.quantityBeforeQc)
      await db.savingTransactionItem.update({
        where: { id: item.id },
        data: { susutQc: before, subtotal: 0, quantity: 0, quantityAfterQc: 0 },
      })
    }

    return NextResponse.json({ ...updated, _meta: { rejected: true, saldoCredited: false } })
  }

  // ============================================================
  // KASUS NORMAL: QC dengan berat bersih per item
  // ============================================================
  // Build map of QC updates
  const editMap = new Map<string, { quantityAfterQc: number; qcReason: string | null }>()
  for (const ei of editItems as any[]) {
    const qty = toNumber(ei.quantityAfterQc !== undefined ? ei.quantityAfterQc : (ei.weight !== undefined ? ei.weight : (ei.berat !== undefined ? ei.berat : (ei.quantity !== undefined ? ei.quantity : 0))))
    if (qty < 0) {
      return NextResponse.json({ error: 'Berat bersih tidak boleh negatif' }, { status: 400 })
    }
    const targetId = ei.id || existing.items.find((it) => it.wasteItemId === ei.wasteItemId || it.id === ei.id)?.id || existing.items[0]?.id
    if (targetId) {
      editMap.set(targetId, { quantityAfterQc: qty, qcReason: ei.qcReason ?? null })
    }
  }

  // Hitung ulang total berat bersih, nilai, per item
  let newTotalWeight = 0
  let newTotalValue = 0
  const itemUpdates: {
    id: string
    quantity: number
    quantityAfterQc: number
    susutQc: number
    subtotal: number
    qcReason: string | null
    wasteItemId: string
    pricePerUnit: number
    quantityBeforeQc: number
  }[] = []

  for (const item of existing.items) {
    const edit = editMap.get(item.id)
    if (!edit) continue
    const before = toNumber(item.quantityBeforeQc)
    const after = edit.quantityAfterQc
    const susut = Math.max(0, before - after)
    const price = toNumber(item.pricePerUnitSnapshot)
    const subtotal = after * price
    newTotalWeight += after
    newTotalValue += subtotal
    itemUpdates.push({
      id: item.id,
      quantity: after,
      quantityAfterQc: after,
      susutQc: susut,
      subtotal,
      qcReason: edit.qcReason,
      wasteItemId: item.wasteItemId,
      pricePerUnit: price,
      quantityBeforeQc: before,
    })
  }

  if (itemUpdates.length === 0) {
    return NextResponse.json({ error: 'Tidak ada item yang cocok untuk diperbarui' }, { status: 400 })
  }

  // Jika SEMUA item berat bersih = 0 → anggap rejectAll
  const allZero = itemUpdates.every((u) => u.quantityAfterQc === 0)
  if (allZero) {
    return NextResponse.json({ error: 'Semua item berat bersih = 0. Gunakan rejectAll=true dengan alasan.' }, { status: 400 })
  }

  // Hitung poin baru
  const { points: newPoints } = await calcPointsForRupiah(newTotalValue)
  const newQcStatus = itemUpdates.some((u) => u.susutQc > 0) ? 'adjusted' : 'passed'

  // ============================================================
  // Update transaksi: status → "selesai", qcStatus, totals
  // ============================================================
  const updated = await db.$transaction(async (prisma) => {
    // Update setiap item
    for (const upd of itemUpdates) {
      await prisma.savingTransactionItem.update({
        where: { id: upd.id },
        data: {
          quantity: upd.quantity,
          quantityAfterQc: upd.quantityAfterQc,
          susutQc: upd.susutQc,
          subtotal: upd.subtotal,
          qcReason: upd.qcReason,
        },
      })
    }

    // Update header transaksi
    const tx = await prisma.savingTransaction.update({
      where: { id },
      data: {
        totalWeight: newTotalWeight,
        totalValue: newTotalValue,
        pointsAwarded: newPoints,
        status: 'selesai',
        qcStatus: newQcStatus,
        qcAt: new Date(),
        qcById: actor?.id ?? null,
        qcNotes: qcNotes ?? null,
        finalizedAt: new Date(),
      },
      include: { items: true },
    })
    return tx
  })

  // ============================================================
  // POST-QC: KREDIT SALDO, POIN, INVENTORY (PERTAMA KALI)
  // ------------------------------------------------------------
  // Sesuai permintaan: penambahan saldo HANYA di titik ini
  // (saat transaksi pindah status → "selesai")
  // ============================================================
  const userId = existing.userId

  // 1. Credit saldo tersedia (full amount, bukan delta)
  if (newTotalValue > 0) {
    await creditSaldoTertahan(userId, newTotalValue, 'saving_transaction', id, `Setoran sampah (QC selesai) ${id.slice(-6)}`, actor?.id)
  }

  // 2. Credit poin
  if (newPoints > 0) {
    const { rule } = await calcPointsForRupiah(newTotalValue)
    await creditPoints(userId, newPoints, 'saving_transaction', id, `Reward poin setoran sampah (QC selesai)`, actor?.id, rule?.id)
  }

  // 3. Add inventory (full berat bersih, bukan delta)
  for (const upd of itemUpdates) {
    if (upd.quantityAfterQc > 0) {
      try {
        await addInventory(upd.wasteItemId, 'nabung', upd.quantityAfterQc, 'saving', 'saving_transaction', id, actor?.id, `Setoran dari nasabah (QC selesai)`)
      } catch (e) {
        console.error('[QC Confirm] Failed to add inventory:', e)
      }
    }
  }

  // ============================================================
  // Kirim struk email final ke nasabah
  // ============================================================
  try {
    const { sendStrukEmail } = await import('@/lib/email')
    if (existing.user?.email) {
      const kodeTransaksi = updated.kodeTransaksi || existing.kodeTransaksi || `NB / ${new Date(updated.transactedAt).getDate().toString().padStart(2, '0')}${(new Date(updated.transactedAt).getMonth() + 1).toString().padStart(2, '0')}${new Date(updated.transactedAt).getFullYear()} / ${updated.id.slice(-5)}`
      const fmtIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
      
      const latestBalance = await db.balance.findUnique({ where: { userId } })
      
      let html = `<div class="struk-header"><div class="icon">✅</div><h2>Bank Sampah</h2><div class="sub">Sukamaju Sejahtera</div><div class="desc">Verifikasi Mutu & Timbang Bersih (QC)</div><div class="badge">STRUK TABUNGAN — QC SELESAI</div></div>`
      html += `<div class="struk-section"><h3 style="margin:0 0 12px 0; color:#064e3b; font-size:15px; text-transform:uppercase; text-align:center;">Verifikasi QC Tabungan</h3><div class="info-row"><span class="key">No. Transaksi</span><span class="val mono">${kodeTransaksi}</span></div><div class="info-row"><span class="key">Tanggal Setor</span><span class="val">${new Date(existing.transactedAt).toLocaleString('id-ID')}</span></div><div class="info-row"><span class="key">Waktu Verifikasi QC</span><span class="val">${new Date().toLocaleString('id-ID')}</span></div><div class="info-row"><span class="key">Nasabah</span><span class="val bold">${existing.user.name}</span></div><div class="info-row"><span class="key">Kode Member</span><span class="val mono">${existing.user.memberCode || '-'}</span></div><div class="info-row"><span class="key">Petugas QC</span><span class="val">${actor?.name || 'Petugas QC'}</span></div><div class="info-row"><span class="key">Hasil QC</span><span class="val bold" style="color:#047857;">${newQcStatus === 'passed' ? 'Lolos Bersih' : 'Disesuaikan'}</span></div></div>`
      
      if (qcNotes) {
        html += `<div class="struk-section"><div class="info-row"><span class="key">Catatan QC</span><span class="val" style="color:#b45309;font-style:italic;">${qcNotes}</span></div></div>`
      }

      html += `<div class="struk-section"><div class="label">Rincian Hasil Timbang & Pemeriksaan Mutu (QC)</div><table class="items-table"><thead><tr><th>Kategori</th><th>Nama</th><th class="center">Kotor</th><th class="center">Bersih</th><th class="center">Susut</th><th class="right">Harga</th><th class="right">Subtotal</th></tr></thead><tbody>`
      for (const upd of itemUpdates) {
        const item = existing.items.find((i) => i.id === upd.id)
        const unit = item?.unitSnapshot || 'kg'
        const catName = item?.categoryNameSnapshot || '-'
        const itemName = item?.itemNameSnapshot || '-'
        html += `<tr><td>${catName}</td><td>${itemName}</td><td class="center">${upd.quantityBeforeQc} ${unit}</td><td class="center bold" style="color:#047857;">${upd.quantityAfterQc} ${unit}</td><td class="center">${upd.susutQc > 0 ? `${upd.susutQc} ${unit}` : '-'}</td><td class="right">${fmtIDR(upd.pricePerUnit)}</td><td class="right bold">${fmtIDR(upd.subtotal)}</td></tr>`
        if (upd.qcReason) {
          html += `<tr><td colspan="7" style="font-style:italic;color:#dc2626;font-size:11px;padding:4px 6px;">↳ Catatan Item: ${upd.qcReason}</td></tr>`
        }
      }
      html += `</tbody></table></div>`

      html += `<div class="struk-section"><div class="summary-row"><span class="key">Total Berat Bersih</span><span class="val bold">${newTotalWeight} kg</span></div><div class="summary-row highlight"><span class="key">Total Nilai Saldo Masuk</span><span class="val bold">${fmtIDR(newTotalValue)}</span></div><div class="summary-row"><span class="key">Poin Reward Diperoleh</span><span class="val">${newPoints} pt</span></div>${latestBalance ? `<div class="summary-row"><span class="key">Saldo Tersedia Saat Ini</span><span class="val">${fmtIDR(toNumber(latestBalance.saldoTersedia))}</span></div>` : ''}</div>`
      html += `<div class="struk-footer"><div class="thanks">Saldo tabungan sampah Anda telah berhasil ditambahkan.<br>Terima kasih telah berpartisipasi menjaga kelestarian lingkungan bersama Bank Sampah Sukamaju Sejahtera.</div></div>`
      
      await sendStrukEmail({
        to: existing.user.email,
        subject: `✅ Struk Tabungan Sampah (Lolos QC) — ${kodeTransaksi}`,
        strukHtml: html,
      })
    }
  } catch (e) {
    console.error('[QC Confirm Email] Error:', e)
  }

  // Rekam Log Tindakan Harian agar Checklist Tugas QC Admin Otomatis Selesai
  try {
    const { recordDailyTaskLog } = await import('@/backend/lib/daily-task-log')
    await recordDailyTaskLog({
      taskKey: 'antrian_qc_verification',
      action: 'qc_verified',
      sentCount: 1,
      notes: `Verifikasi QC Nabung: ${existing.id}`,
    })
  } catch (logErr) {
    console.warn('[QC Nabung] Gagal catat log harian:', logErr)
  }

  return NextResponse.json({
    ...updated,
    _meta: {
      oldStatus: existing.status,
      newStatus: 'selesai',
      newTotalWeight,
      newTotalValue,
      newPoints,
      qcStatus: newQcStatus,
      saldoCredited: true,
      saldoAmount: newTotalValue,
    },
  })
}

// ============================================================
// GET list antrian QC: ambil semua transaksi dengan status = "menunggu_qc"
// Dipakai oleh halaman Antrian QC di operasional
// ============================================================
export async function LIST_QC_QUEUE() {
  // Catatan: ini bukan handler standar, tapi helper untuk dipakai di API lain
  // atau bisa dipanggil via GET dengan query param ?queue=menunggu_qc
  return db.savingTransaction.findMany({
    where: { status: 'menunggu_qc' },
    orderBy: { transactedAt: 'asc' }, // FIFO: terlama dulu
    include: { user: { select: { name: true, memberCode: true } }, items: true, createdBy: true },
  })
}
