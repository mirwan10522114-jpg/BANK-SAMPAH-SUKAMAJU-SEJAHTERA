import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, reduceInventory, addProductStock, recordBankSampahKas } from '@/lib/business'
import { toNumber } from '@/lib/format'

// GET: list processing transactions
// Query params:
//   dari   — ISO date (gte transactedAt)
//   sampai — ISO date (lte transactedAt)
//   q      — search by waste item name in inputs OR produk name in outputs (case-insensitive contains)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dari = searchParams.get('dari')
  const sampai = searchParams.get('sampai')
  const q = (searchParams.get('q') || '').trim()

  const where: any = {}
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
    where.OR = [
      { inputs: { some: { itemNameSnapshot: { contains: q } } } },
      { outputs: { some: { productNameSnapshot: { contains: q } } } },
    ]
  }
  const list = await db.transaksiPengolahan.findMany({
    where,
    orderBy: { transactedAt: 'desc' },
    include: {
      inputs: { include: { jenisSampah: true } },
      outputs: { include: { produk: true } },
      biayaItems: true,
      createdBy: true,
    },
    take: 100,
  })
  return NextResponse.json(list)
}

// POST: create processing transaction (waste -> produk)
// inputs reduce inventaris (source nabung/sedekah), outputs add produk stock
// biayaItems records operational costs to KasBankSampah
// HPP bahan baku dari nabung otomatis dihitung dan dicatat sebagai kas keluar
export async function POST(req: NextRequest) {
  const body = await req.json()
  const actor = await getActingUser(req)
  const { inputs, outputs, notes, biayaItems } = body as {
    inputs: { jenisSampahId: string; quantity: number; source?: string }[]
    outputs: {
      produkId?: string
      quantity: number
    }[]
    notes?: string
    biayaItems?: { kategori: string; keterangan: string; jumlah: number }[]
  }
  if (!inputs?.length || !outputs?.length) return NextResponse.json({ error: 'Input dan output wajib diisi' }, { status: 400 })

  // ============================================================
  // 1. Validasi produk terdaftar di master data
  // ============================================================
  const jenisSampahs = await db.jenisSampah.findMany({
    where: { id: { in: inputs.map((i) => i.jenisSampahId) } },
    include: { category: true, prices: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })

  const productIds: string[] = []
  const outputProductMap: Map<number, { id: string; name: string; unit: string }> = new Map()

  for (let idx = 0; idx < outputs.length; idx++) {
    const o = outputs[idx]
    if (!o.produkId) {
      return NextResponse.json({ error: `Output #${idx + 1}: pilih produk yang sudah terdaftar di Master Data` }, { status: 400 })
    }
    productIds.push(o.produkId)
    const p = await db.produk.findUnique({ where: { id: o.produkId }, select: { id: true, name: true, unit: true } })
    if (!p) {
      return NextResponse.json({ error: `Produk #${idx + 1} tidak ditemukan di Master Data` }, { status: 404 })
    }
    outputProductMap.set(idx, { id: p.id, name: p.name, unit: p.unit })
  }

  // ============================================================
  // 2. Validasi stok bahan baku SEBELUM proses
  // ============================================================
  for (const inp of inputs) {
    const source = inp.source || 'nabung'
    const qty = toNumber(inp.quantity)
    const inv = await db.inventaris.findUnique({
      where: { jenisSampahId_source: { jenisSampahId: inp.jenisSampahId, source } },
    })
    const currentStock = inv ? toNumber(inv.stock) : 0
    if (currentStock < qty) {
      const wi = jenisSampahs.find((w) => w.id === inp.jenisSampahId)
      return NextResponse.json({
        error: `Stok tidak cukup untuk ${wi?.name || 'bahan baku'} (sumber: ${source}). Tersedia: ${currentStock} ${wi?.unit || 'kg'}, Dibutuhkan: ${qty} ${wi?.unit || 'kg'}`,
      }, { status: 400 })
    }
  }

  // ============================================================
  // 3. Hitung HPP bahan baku
  // ============================================================
  const totalInputWeight = inputs.reduce((s, i) => s + toNumber(i.quantity), 0)
  let totalHppBahanBaku = 0
  const inputsWithHpp = inputs.map((inp) => {
    const wi = jenisSampahs.find((w) => w.id === inp.jenisSampahId)!
    const source = inp.source || 'nabung'
    // Harga beli hanya berlaku untuk sumber "nabung" (Bank Sampah membeli dari nasabah)
    const hargaSatuan = source === 'nabung' ? toNumber(wi.prices?.[0]?.pricePerUnit ?? wi.pricePerUnit ?? 0) : 0
    const qty = toNumber(inp.quantity)
    const subtotal = hargaSatuan * qty
    totalHppBahanBaku += subtotal
    return { ...inp, source, hargaSatuan, subtotal, wi }
  })

  // ============================================================
  // 4. Hitung total biaya operasional
  // ============================================================
  const totalBiayaOperasional = (biayaItems || []).reduce((s, b) => s + toNumber(b.jumlah), 0)
  const totalBiayaProduksi = totalHppBahanBaku + totalBiayaOperasional

  // ============================================================
  // 5. Create transaksi pengolahan
  // ============================================================
  const tx = await db.transaksiPengolahan.create({
    data: {
      totalInputWeight,
      totalHppBahanBaku,
      totalBiayaOperasional,
      totalBiayaProduksi,
      notes,
      createdById: actor?.id,
      inputs: {
        create: inputsWithHpp.map((i) => ({
          jenisSampahId: i.jenisSampahId,
          itemCodeSnapshot: i.wi.code,
          itemNameSnapshot: i.wi.name,
          categoryNameSnapshot: i.wi.category.name,
          unitSnapshot: i.wi.unit,
          quantity: toNumber(i.quantity),
          source: i.source,
          hargaSatuan: i.hargaSatuan,
          subtotal: i.subtotal,
        })),
      },
      outputs: {
        create: outputs.map((o, idx) => {
          const p = outputProductMap.get(idx)!
          return {
            produkId: p.id,
            productNameSnapshot: p.name,
            unitSnapshot: p.unit,
            quantity: toNumber(o.quantity),
          }
        }),
      },
      biayaItems: (biayaItems && biayaItems.length > 0)
        ? {
            create: biayaItems.filter((b) => b.jumlah > 0).map((b) => ({
              kategori: b.kategori,
              keterangan: b.keterangan,
              jumlah: toNumber(b.jumlah),
            })),
          }
        : undefined,
    },
    include: { inputs: true, outputs: true, biayaItems: true },
  })

  // ============================================================
  // 6. Reduce inventaris for each input
  // ============================================================
  for (const inp of inputsWithHpp) {
    try {
      await reduceInventory(inp.jenisSampahId, inp.source, toNumber(inp.quantity), 'processing_input', 'processing_transaction', tx.id, actor?.id, `Pengolahan ${tx.id.slice(-6)}`)
    } catch (e: any) {
      return NextResponse.json({ error: `Stok tidak cukup untuk pengolahan: ${e.message}` }, { status: 400 })
    }
  }

  // ============================================================
  // 7. Add produk stock for each output
  // ============================================================
  for (let idx = 0; idx < outputs.length; idx++) {
    const o = outputs[idx]
    const p = outputProductMap.get(idx)!
    await addProductStock(p.id, toNumber(o.quantity), 'processing_output', 'processing_transaction', tx.id, actor?.id, `Hasil pengolahan ${tx.id.slice(-6)}`)
  }

  // ============================================================
  // 8. Catat biaya ke Kas Bank Sampah
  // ============================================================
  // HPP bahan baku dari nabung → kas keluar (pembelian bahan baku = sudah dibayar ke nasabah saat nabung)
  if (totalHppBahanBaku > 0) {
    await recordBankSampahKas(
      'keluar',
      'hpp_bahan_baku',
      totalHppBahanBaku,
      `HPP bahan baku pengolahan #${tx.id.slice(-6)}`,
      actor?.id,
    )
  }
  // Biaya operasional → kas keluar (tenaga kerja, bahan pendukung, dll)
  if (totalBiayaOperasional > 0) {
    await recordBankSampahKas(
      'keluar',
      'biaya_produksi',
      totalBiayaOperasional,
      `Biaya produksi pengolahan #${tx.id.slice(-6)}`,
      actor?.id,
    )
  }

  // ============================================================
  // 9. Rekam Log Tindakan Harian
  // ============================================================
  try {
    const { recordDailyTaskLog } = await import('@/backend/lib/daily-task-log')
    await recordDailyTaskLog({
      taskKey: 'stok_produk_monitoring',
      action: 'pengolahan_stok',
      sentCount: outputs.length,
      notes: `Pengolahan ${outputs.length} varian produk olahan | HPP: Rp ${totalHppBahanBaku.toLocaleString('id-ID')} | Biaya Op: Rp ${totalBiayaOperasional.toLocaleString('id-ID')}`,
    })
  } catch (logErr) {
    console.warn('[Pengolahan Stok] Gagal catat log harian:', logErr)
  }

  return NextResponse.json(tx, { status: 201 })
}
