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
        let tw = 0, tv = 0
        const itemRows = op.items.map((it) => {
          const wi = wasteItems.find((w) => w.id === it.wasteItemId)!
          const price = wi.prices[0] ? toNumber(wi.prices[0].pricePerUnit) : toNumber(wi.pricePerUnit)
          const before = toNumber(it.quantityBeforeQc)
          const after = op.applyQc && it.quantityAfterQc != null ? toNumber(it.quantityAfterQc) : before
          const subtotal = after * price
          tw += after; tv += subtotal
          return { wi, price, wastePriceId: wi.prices[0]?.id, before, after, subtotal }
        })
        const { points, rule } = await calcPointsForRupiah(tv)
        const qcStatus = op.applyQc ? (itemRows.some((r) => r.before > r.after) ? 'adjusted' : 'passed') : 'passed'
        const tx = await db.savingTransaction.create({
          data: {
            userId, totalWeight: tw, totalValue: tv, pointsAwarded: points,
            notes: `Teller Wizard ${receiptNo}`, createdById: actor?.id,
            qcStatus, qcAt: new Date(), qcById: actor?.id,
            items: { create: itemRows.map((r) => ({
              wasteItemId: r.wi.id, wastePriceId: r.wastePriceId,
              itemCodeSnapshot: r.wi.code, itemNameSnapshot: r.wi.name,
              categoryNameSnapshot: r.wi.category.name, unitSnapshot: r.wi.unit,
              pricePerUnitSnapshot: r.price, quantity: r.after, subtotal: r.subtotal,
              quantityBeforeQc: r.before, quantityAfterQc: op.applyQc ? r.after : null,
              susutQc: Math.max(0, r.before - r.after), subtotalBeforeQc: r.before * r.price,
              qcReason: null,
            })) },
          },
        })
        await creditSaldoTertahan(userId, tv, 'saving_transaction', tx.id, `Nabung (Wizard ${receiptNo})`, actor?.id)
        if (points > 0) await creditPoints(userId, points, 'saving_transaction', tx.id, `Poin nabung (Wizard ${receiptNo})`, actor?.id, rule?.id)
        for (const r of itemRows) await addInventory(r.wi.id, 'nabung', r.after, 'saving', 'saving_transaction', tx.id, actor?.id)
        totalSaldoDitahan += tv; totalPoin += points; totalBerat += tw
        result.steps.push({ type: 'nabung', status: 'ok', txId: tx.id, totalValue: tv, totalWeight: tw, points })

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
        result.steps.push({ type: 'sedekah_sampah', status: 'ok', txId: tx.id, totalWeight: totalBersih, totalWeightKotor: totalKotor, itemCount: itemRows.length })

      } else if (op.type === 'setor_simpanan' && anggotaId && op.jenisSimpanan && op.jumlah) {
        const tx = await setorSimpanan(anggotaId, op.jenisSimpanan, op.jumlah, actor?.id, `Setor ${op.jenisSimpanan} (Wizard ${receiptNo})`)
        result.steps.push({ type: 'setor_simpanan', status: 'ok', txId: tx.id, jenis: op.jenisSimpanan, jumlah: op.jumlah, saldoSetelahnya: tx.saldoSesudah })

      } else if (op.type === 'tarik_sukarela' && anggotaId && op.jumlah) {
        const tx = await tarikSimpananSukarela(anggotaId, op.jumlah, actor?.id, `Tarik sukarela (Wizard ${receiptNo})`)
        totalSaldoDiambil += op.jumlah
        result.steps.push({ type: 'tarik_sukarela', status: 'ok', txId: tx.id, jumlah: op.jumlah, saldoSetelahnya: tx.saldoSesudah })

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
          nomorPinjaman: pinjaman.nomorPinjaman,
          jumlahPinjaman: op.jumlahPinjaman,
          tenorBulan: op.tenorBulan,
          angsuranPerBulan,
          sukuBunga,
        })

      } else if (op.type === 'bayar_angsuran' && op.pinjamanId) {
        const res = await bayarAngsuran(op.pinjamanId, actor?.id, `Bayar angsuran (Wizard ${receiptNo})`, undefined, op.jumlahAngsuran)
        result.steps.push({
          type: 'bayar_angsuran',
          status: 'ok',
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
  return NextResponse.json(result, { status: 201 })
}