import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getActingUser,
  creditSaldoTertahan,
  creditPoints,
  addInventory,
  calcPointsForRupiah,
  setorSimpanan,
  tarikSimpananSukarela,
  bayarAngsuran,
  generateTxNo,
  calcAngsuranSchedule,
} from '@/lib/business'
import { toNumber } from '@/lib/format'

// Teller Wizard: integrated one-door service
// Combines: nabung sampah + sedekah sampah + setor simpanan + tarik sukarela + pengajuan pinjaman + bayar angsuran
// Returns a single receipt summary
export async function POST(req: NextRequest) {
  const body = await req.json()
  const actor = await getActingUser(req)
  const receiptNo = await generateTxNo('KWT')
  const result: any = { receiptNo, steps: [] }

  const { userId, anggotaId, operations } = body as {
    userId: string
    anggotaId?: string
    operations: {
      type: 'nabung' | 'sedekah_sampah' | 'setor_simpanan' | 'tarik_sukarela' | 'pengajuan_pinjaman' | 'bayar_angsuran'
      // nabung
      items?: { wasteItemId: string; quantityBeforeQc: number; quantityAfterQc?: number; qcReason?: string }[]
      applyQc?: boolean
      skipQc?: boolean // TELLER menandai sampah bersih → langsung finalize, saldo masuk
      // sedekah sampah
      sedekahItems?: { wasteItemId: string; quantityBeforeQc: number; quantityAfterQc?: number; qcReason?: string }[]
      // setor simpanan
      jenisSimpanan?: 'pokok' | 'wajib' | 'sukarela'
      jumlah?: number
      keterangan?: string
      // pengajuan pinjaman
      jumlahPinjaman?: number
      tenorBulan?: number
      // bayar angsuran
      pinjamanId?: string
      jumlahAngsuran?: number | 'lunas'
    }[]
  }

  if (!userId) return NextResponse.json({ error: 'Nasabah wajib dipilih' }, { status: 400 })

  let totalSaldoDitahan = 0
  let totalSaldoDiambil = 0
  let totalPoin = 0
  let totalBerat = 0
  let totalSedekahBerat = 0

  for (const op of operations) {
    try {
      if (op.type === 'nabung' && op.items?.length) {
        const wasteItems = await db.wasteItem.findMany({
          where: { id: { in: op.items.map((i) => i.wasteItemId) } },
          include: { category: true, prices: { orderBy: { effectiveFrom: 'desc' }, take: 1 } },
        })
        // ============================================================
        // Alur baru QC:
        // - skipQc=true → teller menandai sampah bersih → langsung finalize, saldo masuk
        // - applyQc=true → teller input berat bersih saat itu juga → langsung finalize, saldo masuk
        // - default (skipQc=false & applyQc=false) → status "menunggu_qc", saldo BELUM masuk
        // ============================================================
        const isSkipQc = op.skipQc === true
        const isApplyQc = op.applyQc === true
        const shouldFinalize = isSkipQc || isApplyQc
        let tw = 0, tv = 0
        const itemRows = op.items.map((it) => {
          const wi = wasteItems.find((w) => w.id === it.wasteItemId)!
          const price = wi.prices[0] ? toNumber(wi.prices[0].pricePerUnit) : toNumber(wi.pricePerUnit)
          const before = toNumber(it.quantityBeforeQc)
          // after = berat bersih final. Kalau tidak difinalize, pakai before (sebagai estimasi).
          // Kalau skipQc → before = after (sampah dianggap bersih)
          // Kalau applyQc → pakai input after dari teller
          const after = isSkipQc ? before : (isApplyQc && it.quantityAfterQc != null ? toNumber(it.quantityAfterQc) : before)
          const subtotal = after * price
          tw += after; tv += subtotal
          return { wi, price, wastePriceId: wi.prices[0]?.id, before, after, subtotal }
        })
        const { points, rule } = await calcPointsForRupiah(tv)
        const qcStatus = isSkipQc ? 'tidak_perlu' : (isApplyQc ? (itemRows.some((r) => r.before > r.after) ? 'adjusted' : 'passed') : 'pending')
        const txStatus = shouldFinalize ? 'selesai' : 'menunggu_qc'

        // Generate kode NB SEBELUM create transaction
        const kodeNabung = await generateTxNo('NB')
        const tx = await db.savingTransaction.create({
          data: {
            userId,
            kodeTransaksi: kodeNabung, // SIMPAN kode transaksi resmi (NB / DDMMYYYY / 00001)
            totalWeight: shouldFinalize ? tw : 0,
            totalValue: shouldFinalize ? tv : 0,
            pointsAwarded: shouldFinalize ? points : 0,
            notes: `Teller Wizard ${receiptNo}`,
            createdById: actor?.id,
            status: txStatus,
            qcStatus,
            qcAt: shouldFinalize ? new Date() : null,
            qcById: shouldFinalize ? actor?.id : null,
            finalizedAt: shouldFinalize ? new Date() : null,
            items: { create: itemRows.map((r) => ({
              wasteItemId: r.wi.id, wastePriceId: r.wastePriceId,
              itemCodeSnapshot: r.wi.code, itemNameSnapshot: r.wi.name,
              categoryNameSnapshot: r.wi.category.name, unitSnapshot: r.wi.unit,
              pricePerUnitSnapshot: r.price,
              quantity: shouldFinalize ? r.after : r.before, // kalau pending, simpan berat kotor
              subtotal: shouldFinalize ? r.subtotal : (r.before * r.price), // kalau pending, simpan estimasi
              quantityBeforeQc: r.before,
              quantityAfterQc: shouldFinalize ? r.after : null,
              susutQc: shouldFinalize ? Math.max(0, r.before - r.after) : 0,
              subtotalBeforeQc: r.before * r.price,
              qcReason: null,
            })) },
          },
        })

        // ============================================================
        // Saldo, poin, inventory HANYA kalau finalize (skipQc atau applyQc)
        // Kalau "menunggu_qc" → tidak ada perubahan saldo di sini
        // ============================================================
        if (shouldFinalize) {
          await creditSaldoTertahan(userId, tv, 'saving_transaction', tx.id, `Nabung (Wizard ${receiptNo})`, actor?.id)
          if (points > 0) await creditPoints(userId, points, 'saving_transaction', tx.id, `Poin nabung (Wizard ${receiptNo})`, actor?.id, rule?.id)
          for (const r of itemRows) await addInventory(r.wi.id, 'nabung', r.after, 'saving', 'saving_transaction', tx.id, actor?.id)
          totalSaldoDitahan += tv; totalPoin += points; totalBerat += tw
        } else {
          // Transaksi pending → saldo belum masuk. Catat estimasi untuk info saja.
          console.log(`[Teller Wizard] Tx ${kodeNabung} pending QC. Estimasi saldo: ${tv}. Saldo belum dikredit.`)
        }
        // Simpan detail item + QC untuk struk
        const nabungItemDetail = itemRows.map((r) => ({
          kategori: r.wi.category.name,
          nama: r.wi.name,
          kotor: r.before,
          bersih: r.after,
          susut: Math.max(0, r.before - r.after),
          unit: r.wi.unit,
          harga: r.price,
          subtotal: r.subtotal,
        }))
        result.steps.push({ type: 'nabung', status: 'ok', txId: tx.id, kodeTransaksi: kodeNabung, totalValue: tv, totalWeight: tw, points, items: nabungItemDetail, qcStatus: shouldFinalize ? (qcStatus === 'adjusted' ? 'Disesuaikan' : 'Lulus') : 'Menunggu QC', txStatus })

      } else if (op.type === 'sedekah_sampah' && op.sedekahItems?.length) {
        // Sedekah Sampah - pure donation, no balance/points, but inventory goes to bank
        const wasteItems = await db.wasteItem.findMany({
          where: { id: { in: op.sedekahItems.map((i) => i.wasteItemId) } },
          include: { category: true },
        })
        let totalKotor = 0, totalBersih = 0
        const itemRows = op.sedekahItems.map((it) => {
          const wi = wasteItems.find((w) => w.id === it.wasteItemId)!
          const before = toNumber(it.quantityBeforeQc)
          const after = op.applyQc && it.quantityAfterQc != null ? toNumber(it.quantityAfterQc) : before
          totalKotor += before; totalBersih += after
          return {
            wasteItemId: wi.id,
            itemCodeSnapshot: wi.code,
            itemNameSnapshot: wi.name,
            categoryNameSnapshot: wi.category.name,
            unitSnapshot: wi.unit,
            quantity: after,
            quantityBeforeQc: before,
            quantityAfterQc: op.applyQc ? after : null,
            susutQc: Math.max(0, before - after),
            qcReason: it.qcReason || null,
          }
        })
        const qcStatus = op.applyQc ? (itemRows.some((r) => r.susutQc > 0) ? 'adjusted' : 'passed') : 'passed'
        const persentaseSusut = totalKotor > 0 ? (Math.round(((totalKotor - totalBersih) / totalKotor) * 10000) / 100) : 0

        // Generate kode SD SEBELUM create transaction agar sequence benar (00001 untuk transaksi pertama)
        const kodeSedekah = await generateTxNo('SD')
        const tx = await db.sedekahTransaction.create({
          data: {
            userId,
            totalWeight: totalBersih,
            totalWeightKotor: totalKotor,
            totalWeightBersih: totalBersih,
            persentaseSusut,
            notes: `Sedekah via Teller Wizard ${receiptNo}`,
            createdById: actor?.id,
            qcStatus,
            qcAt: new Date(),
            qcById: actor?.id,
            filterAt: new Date(),
            filterById: actor?.id,
            items: { create: itemRows },
          },
        })

        // Add to inventory as bank asset (source: sedekah)
        for (const row of itemRows) {
          await addInventory(row.wasteItemId, 'sedekah', toNumber(row.quantity), 'sedekah', 'sedekah_transaction', tx.id, actor?.id, `Sedekah sampah (Wizard ${receiptNo})`)
        }

        totalSedekahBerat += totalBersih
        // Simpan detail item + QC untuk struk
        const sedekahItemDetail = itemRows.map((r) => ({
          kategori: r.categoryNameSnapshot,
          nama: r.itemNameSnapshot,
          kotor: r.quantityBeforeQc,
          bersih: r.quantityAfterQc != null ? r.quantityAfterQc : r.quantityBeforeQc,
          susut: r.susutQc,
          unit: r.unitSnapshot,
          qcReason: r.qcReason,
        }))
        result.steps.push({ type: 'sedekah_sampah', status: 'ok', txId: tx.id, kodeTransaksi: kodeSedekah, totalWeight: totalBersih, totalWeightKotor: totalKotor, itemCount: itemRows.length, items: sedekahItemDetail, qcStatus: qcStatus === 'adjusted' ? 'Disesuaikan' : 'Lulus' })

      } else if (op.type === 'setor_simpanan' && anggotaId && op.jenisSimpanan && op.jumlah) {
        const tx = await setorSimpanan(anggotaId, op.jenisSimpanan, op.jumlah, actor?.id, `Setor ${op.jenisSimpanan} (Wizard ${receiptNo})`)
        result.steps.push({ type: 'setor_simpanan', status: 'ok', txId: tx.id, kodeTransaksi: tx.nomorTransaksi, jenis: op.jenisSimpanan, jumlah: op.jumlah, saldoSetelahnya: tx.saldoSesudah })

      } else if (op.type === 'tarik_sukarela' && anggotaId && op.jumlah) {
        const tx = await tarikSimpananSukarela(anggotaId, op.jumlah, actor?.id, `Tarik sukarela (Wizard ${receiptNo})`)
        totalSaldoDiambil += op.jumlah
        result.steps.push({ type: 'tarik_sukarela', status: 'ok', txId: tx.id, kodeTransaksi: tx.nomorTransaksi, jumlah: op.jumlah, saldoSetelahnya: tx.saldoSesudah })

      } else if (op.type === 'pengajuan_pinjaman' && anggotaId && op.jumlahPinjaman && op.tenorBulan) {
        // Server-side eligibility check
        const anggotaData = await db.koperasiAnggota.findUnique({
          where: { id: anggotaId },
          include: { pinjamans: { include: { angsurans: true } } },
        })
        if (!anggotaData) throw new Error('Anggota koperasi tidak ditemukan')

        const setting = await db.koperasiSetting.findFirst()
        const minimalBulan = setting?.minimalBulanAnggota ?? 3
        const nowMs = Date.now()
        const joinMs = new Date(anggotaData.tanggalBergabung).getTime()
        const memberMonths = Math.max(0, Math.floor((nowMs - joinMs) / (1000 * 60 * 60 * 24 * 30.44)))
        if (memberMonths < minimalBulan) throw new Error(`Anggota belum memenuhi syarat masa keanggotaan (${memberMonths} bulan, minimal ${minimalBulan} bulan)`)
        if (anggotaData.pinjamans.some((p) => p.status === 'berjalan')) throw new Error('Masih memiliki pinjaman yang sedang berjalan')
        if (anggotaData.pinjamanDiblokir) throw new Error('Pinjaman diblokir karena riwayat pembayaran bermasalah. Ajukan perbaikan eligibilitas terlebih dahulu.')
        // Check payment history
        const withHistory = anggotaData.pinjamans.filter((p) => (p.status === 'lunas' || p.status === 'berjalan') && p.angsurans.length > 0)
        for (const px of withHistory) {
          for (const a of px.angsurans) {
            if (toNumber(a.dendaBayar) > 0) throw new Error('Riwayat pembayaran angsuran bermasalah (pernah terlambat). Ajukan perbaikan eligibilitas terlebih dahulu.')
          }
        }

        const sukuBunga = setting ? toNumber(setting.sukuBungaPinjaman) : 0
        const { angsuranPerBulan } = calcAngsuranSchedule(op.jumlahPinjaman, op.tenorBulan, sukuBunga)
        const nomor = await generateTxNo('PNJ')
        const pinjaman = await db.koperasiPinjaman.create({
          data: {
            nomorPinjaman: nomor,
            koperasiAnggotaId: anggotaId,
            jumlahPinjaman: op.jumlahPinjaman,
            tenorBulan: op.tenorBulan,
            angsuranPerBulan,
            biayaAdmin: setting ? toNumber(setting.biayaAdminPinjaman) : 0,
            tanggalPengajuan: new Date(),
            status: 'diajukan',
            sisaPinjaman: op.jumlahPinjaman,
            sukuBunga,
            keterangan: op.keterangan || `Pengajuan via Teller Wizard ${receiptNo}`,
            userId: actor?.id,
          },
        })
        result.steps.push({
          type: 'pengajuan_pinjaman',
          status: 'ok',
          txId: pinjaman.id,
          kodeTransaksi: pinjaman.nomorPinjaman,
          nomorPinjaman: pinjaman.nomorPinjaman,
          jumlahPinjaman: op.jumlahPinjaman,
          tenorBulan: op.tenorBulan,
          angsuranPerBulan,
          sukuBunga,
        })

      } else if (op.type === 'bayar_angsuran' && op.pinjamanId) {
        const res = await bayarAngsuran(op.pinjamanId, actor?.id, `Bayar angsuran (Wizard ${receiptNo})`, undefined, op.jumlahAngsuran)
        // Get all kode angsuran
        const kodeAngsuranList = res.angsurans.map((a: any) => a.nomorAngsuran)
        result.steps.push({
          type: 'bayar_angsuran',
          status: 'ok',
          kodeTransaksi: kodeAngsuranList.join(', '),
          angsuranId: res.angsurans[0]?.id,
          pinjamanId: op.pinjamanId,
          countPaid: res.countPaid,
          totalPaid: res.totalPaid,
          sisaAngsuran: res.sisaAngsuran,
          sisaPinjaman: toNumber(res.pinjaman.sisaPinjaman),
          lunas: res.isLunas,
        })
      }
    } catch (e: any) {
      // Pass through operation context so receipt can show meaningful info instead of "undefined Rp 0"
      result.steps.push({
        type: op.type,
        status: 'error',
        error: e.message,
        // Context for display
        jenis: op.jenisSimpanan,
        jumlah: op.jumlah,
        jumlahPinjaman: op.jumlahPinjaman,
        tenorBulan: op.tenorBulan,
      })
    }
  }

  // final balance snapshot
  const balance = await db.balance.findUnique({ where: { userId } })
  result.summary = {
    receiptNo,
    totalSaldoDitahan,
    totalSaldoDiambil,
    totalPoin,
    totalBerat,
    totalSedekahBerat,
    saldoTertahanAkhir: balance ? toNumber(balance.saldoTertahan) : 0,
    poinAkhir: balance?.points || 0,
    transactedAt: new Date().toISOString(),
    teller: actor?.name,
  }

  // Send combined struk via email to nasabah HANYA jika TIDAK ADA operasi nabung yang pending QC
  const hasPendingQcNabung = result.steps.some(
    (s: any) => s.type === 'nabung' && (s.txStatus === 'menunggu_qc' || s.qcStatus === 'pending' || s.qcStatus === 'Menunggu QC')
  )

  if (hasPendingQcNabung) {
    console.log(`[Teller Wizard] Transaksi ${receiptNo} memiliki setoran nabung yang berstatus Menunggu QC. Email struk ditangguhkan hingga verifikasi QC selesai di antrian QC.`)
    ;(result as any)._meta = {
      ...(result as any)._meta,
      emailSent: false,
      emailDeferredForQc: true,
      qcMessage: 'Email struk tabungan akan otomatis dikirimkan ke nasabah setelah verifikasi QC disetujui di Antrian QC.',
    }
  } else {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, memberCode: true },
      })
      if (user?.email) {
        const { sendStrukEmail } = await import('@/lib/email')
        const fmtIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
        const ddmmyyyy = `${String(new Date().getDate()).padStart(2, '0')}${String(new Date().getMonth() + 1).padStart(2, '0')}${new Date().getFullYear()}`
        const kodeTransaksi = `KWT / ${ddmmyyyy} / ${receiptNo.slice(-5)}`

        let html = `<div class="struk-header"><div class="icon">🧾</div><h2>Bank Sampah</h2><div class="sub">Sukamaju Sejahtera</div><div class="desc">Teller Wizard — Multi Transaksi</div><div class="badge">KUITANSI TRANSAKSI</div></div>`
        html += `<div class="struk-section"><div class="info-row"><span class="key">No. Transaksi</span><span class="val mono">${kodeTransaksi}</span></div><div class="info-row"><span class="key">Tanggal</span><span class="val">${new Date().toLocaleString('id-ID')}</span></div><div class="info-row"><span class="key">Nasabah</span><span class="val bold">${user.name}</span></div><div class="info-row"><span class="key">Kode</span><span class="val mono">${user.memberCode || '-'}</span></div><div class="info-row"><span class="key">Teller</span><span class="val">${actor?.name || '-'}</span></div></div>`

        // Detail per operasi dengan kode transaksi
        const okSteps = result.steps.filter((s: any) => s.status === 'ok')
        if (okSteps.length > 0) {
          // Header tabel ringkasan operasi
          html += `<div class="struk-section"><div class="label">Rincian Operasi & Kode Transaksi</div><table class="items-table"><thead><tr><th>Operasi</th><th>Kode Transaksi</th><th class="right">Jumlah/Detail</th></tr></thead><tbody>`
          for (const s of okSteps) {
            let label = s.type.replace(/_/g, ' ')
            let detail = ''
            if (s.type === 'nabung') detail = `${fmtIDR(s.totalValue)} (${toNumber(s.totalWeight)} kg)`
            else if (s.type === 'sedekah_sampah') detail = `${toNumber(s.totalWeight)} kg`
            else if (s.type === 'setor_simpanan') detail = `${fmtIDR(s.jumlah)} (${s.jenis})`
            else if (s.type === 'tarik_sukarela') detail = `${fmtIDR(s.jumlah)}`
            else if (s.type === 'pengajuan_pinjaman') detail = `${fmtIDR(s.jumlahPinjaman)} (${s.tenorBulan} bln)`
            else if (s.type === 'bayar_angsuran') detail = `${fmtIDR(s.totalPaid)}`
            const kode = s.kodeTransaksi || '-'
            html += `<tr><td>${label}</td><td class="mono">${kode}</td><td class="right">${detail}</td></tr>`
          }
          html += `</tbody></table></div>`

          // Detail item per operasi nabung
          const nabungSteps = okSteps.filter((s: any) => s.type === 'nabung' && s.items?.length)
          for (const s of nabungSteps) {
            html += `<div class="struk-section"><div class="label">Detail Nabung: ${s.kodeTransaksi} (QC: ${s.qcStatus || '-'})</div><table class="items-table"><thead><tr><th>Kategori</th><th>Nama</th><th class="center">Kotor</th><th class="center">Bersih</th><th class="center">Susut</th><th class="right">Harga</th><th class="right">Subtotal</th></tr></thead><tbody>`
            let tKotor = 0, tBersih = 0, tSubtotal = 0
            for (const r of s.items) {
              const kotor = toNumber(r.kotor)
              const bersih = toNumber(r.bersih)
              const susut = toNumber(r.susut)
              const unit = r.unit || 'kg'
              tKotor += kotor; tBersih += bersih; tSubtotal += toNumber(r.subtotal)
              html += `<tr><td>${r.kategori}</td><td>${r.nama}</td><td class="center">${kotor} ${unit}</td><td class="center">${bersih} ${unit}</td><td class="center">${susut > 0 ? `${susut} ${unit}` : '-'}</td><td class="right">${fmtIDR(toNumber(r.harga))}</td><td class="right">${fmtIDR(toNumber(r.subtotal))}</td></tr>`
            }
            html += `<tr class="total-row"><td colspan="2">TOTAL</td><td class="center">${tKotor} kg</td><td class="center">${tBersih} kg</td><td class="center">${tKotor - tBersih > 0 ? `${tKotor - tBersih} kg` : '-'}</td><td></td><td class="right">${fmtIDR(tSubtotal)}</td></tr>`
            html += `</tbody></table></div>`
          }

          // Detail item per operasi sedekah
          const sedekahSteps = okSteps.filter((s: any) => s.type === 'sedekah_sampah' && s.items?.length)
          for (const s of sedekahSteps) {
            html += `<div class="struk-section"><div class="label">Detail Sedekah: ${s.kodeTransaksi} (QC: ${s.qcStatus || '-'})</div><table class="items-table"><thead><tr><th>Kategori</th><th>Nama</th><th class="center">Kotor</th><th class="center">Bersih</th><th class="center">Susut</th></tr></thead><tbody>`
            let tKotor = 0, tBersih = 0
            for (const r of s.items) {
              const kotor = toNumber(r.kotor)
              const bersih = toNumber(r.bersih)
              const susut = toNumber(r.susut)
              const unit = r.unit || 'kg'
              tKotor += kotor; tBersih += bersih
              html += `<tr><td>${r.kategori}</td><td>${r.nama}</td><td class="center">${kotor} ${unit}</td><td class="center">${bersih} ${unit}</td><td class="center">${susut > 0 ? `${susut} ${unit}` : '-'}</td></tr>`
              if (r.qcReason) {
                html += `<tr><td colspan="5" style="font-style:italic;color:#dc2626;font-size:11px;padding:6px 6px 8px;">↳ Alasan QC: ${r.qcReason}</td></tr>`
              }
            }
            html += `<tr class="total-row"><td colspan="2">TOTAL</td><td class="center">${tKotor} kg</td><td class="center">${tBersih} kg</td><td class="center">${tKotor - tBersih > 0 ? `${tKotor - tBersih} kg` : '-'}</td></tr>`
            html += `</tbody></table></div>`
          }
        }

        // Summary
        html += `<div class="struk-section"><div class="summary-row"><span class="key">Total Saldo Ditahan</span><span class="val">${fmtIDR(totalSaldoDitahan)}</span></div><div class="summary-row"><span class="key">Total Saldo Diambil</span><span class="val">${fmtIDR(totalSaldoDiambil)}</span></div><div class="summary-row"><span class="key">Total Berat Nabung</span><span class="val">${toNumber(totalBerat)} kg</span></div><div class="summary-row"><span class="key">Total Berat Sedekah</span><span class="val">${toNumber(totalSedekahBerat)} kg</span></div><div class="summary-row highlight"><span class="key">Poin Didapat</span><span class="val">${totalPoin}</span></div><div class="summary-row"><span class="key">Saldo Tertahan Akhir</span><span class="val">${fmtIDR(toNumber(balance?.saldoTertahan || 0))}</span></div><div class="summary-row"><span class="key">Poin Akhir</span><span class="val">${balance?.points || 0}</span></div></div>`
        html += `<div class="struk-footer"><div class="thanks">Terima kasih telah bertransaksi</div></div>`

        await sendStrukEmail({
          to: user.email,
          subject: `Kuitansi Transaksi ${kodeTransaksi}`,
          strukHtml: html,
        })
      }
    } catch (e) {
      console.error('[Teller Wizard Struk Email] Error:', e)
    }
  }

  return NextResponse.json(result, { status: 201 })
}