import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, reduceInventory, generateTxNo } from '@/lib/business'
import { toNumber } from '@/lib/format'

// GET: list sales to mitra (with margin detail: harga beli nasabah vs harga jual mitra)
// Query params:
//   mitraId — filter by mitra
//   dari      — ISO date (gte transactedAt)
//   sampai    — ISO date (lte transactedAt)
//   q         — search by mitra name OR item name (case-insensitive contains)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mitraId = searchParams.get('mitraId')
  const dari = searchParams.get('dari')
  const sampai = searchParams.get('sampai')
  const q = (searchParams.get('q') || '').trim()

  const where: any = {}
  if (mitraId) where.mitraId = mitraId
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
      { mitra: { name: { contains: q } } },
      { items: { some: { itemNameSnapshot: { contains: q } } } },
    ]
  }

  const list = await db.transaksiPenjualanMitra.findMany({
    where,
    orderBy: { transactedAt: 'desc' },
    include: {
      mitra: true,
      items: {
        include: {
          jenisSampah: {
            include: {
              category: true,
              prices: { orderBy: { effectiveFrom: 'desc' }, take: 1 },
            },
          },
        },
      },
      createdBy: true,
    },
    take: 100,
  })

  // Compute margin for each transaction
  const enriched = list.map((tx) => {
    let totalBeliNasabah = 0
    let totalJualMitra = 0
    let totalMargin = 0
    const itemsWithMargin = tx.items.map((item) => {
      const hargaJualMitra = toNumber(item.pricePerUnit)
      const qty = toNumber(item.quantity)
      // Harga beli dari nasabah = harga terbaru dari HargaSampah, fallback ke jenisSampah.pricePerUnit
      const hargaBeliNasabah = item.jenisSampah.prices?.[0]
        ? toNumber(item.jenisSampah.prices[0].pricePerUnit)
        : toNumber(item.jenisSampah.pricePerUnit)
      const subtotalJual = hargaJualMitra * qty
      const subtotalBeli = hargaBeliNasabah * qty
      const margin = subtotalJual - subtotalBeli
      const marginPerUnit = hargaJualMitra - hargaBeliNasabah
      const marginPersen = subtotalBeli > 0 ? (margin / subtotalBeli) * 100 : 0

      totalBeliNasabah += subtotalBeli
      totalJualMitra += subtotalJual
      totalMargin += margin

      return {
        ...item,
        hargaBeliNasabah,
        hargaJualMitra,
        marginPerUnit,
        subtotalBeli,
        subtotalJual,
        margin,
        marginPersen,
        isProfit: margin >= 0,
      }
    })

    return {
      ...tx,
      items: itemsWithMargin,
      totalBeliNasabah,
      totalJualMitra: toNumber(tx.totalValue),
      totalMargin,
      totalMarginPersen: totalBeliNasabah > 0 ? (totalMargin / totalBeliNasabah) * 100 : 0,
      isProfit: totalMargin >= 0,
    }
  })

  return NextResponse.json(enriched)
}

// POST: create sale to mitra (reduces inventaris, records revenue)
// Items must come from existing inventaris (stok hasil nabung/sedekah).
// source: 'nabung' | 'sedekah' — determines harga beli (0 for sedekah, harga acuan for nabung)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const actor = await getActingUser(req)
  const { mitraId, items, notes } = body as {
    mitraId: string
    items: { jenisSampahId: string; pricePerUnit: number; quantity: number; source?: string }[]
    notes?: string
  }
  if (!mitraId) return NextResponse.json({ error: 'Mitra wajib dipilih' }, { status: 400 })
  if (!items?.length) return NextResponse.json({ error: 'Minimal 1 item' }, { status: 400 })

  // Fetch waste items with latest prices (for harga beli calculation)
  const jenisSampahs = await db.jenisSampah.findMany({
    where: { id: { in: items.map((i) => i.jenisSampahId) } },
    include: { category: true, prices: { orderBy: { effectiveFrom: 'desc' }, take: 1 } },
  })

  // Fetch current inventaris for validation
  const inventories = await db.inventaris.findMany({
    where: { jenisSampahId: { in: items.map((i) => i.jenisSampahId) } },
  })

  let totalWeight = 0
  let totalValue = 0
  let totalBeliNasabah = 0
  let itemRows: any[]
  try {
    itemRows = items.map((it) => {
      const wi = jenisSampahs.find((w) => w.id === it.jenisSampahId)!
      if (!wi) throw new Error(`Barang sampah tidak ditemukan: ${it.jenisSampahId}`)
      const price = toNumber(it.pricePerUnit)
      const qty = toNumber(it.quantity)
      const source = it.source || 'nabung'

      // Validate price
      if (price < 0) {
        throw new Error(`Harga tidak valid untuk ${wi.name}. Harga tidak boleh bernilai negatif.`)
      }

      // Validate quantity
      if (qty <= 0) {
        throw new Error(`Qty tidak valid untuk ${wi.name}. Qty harus lebih dari 0.`)
      }

      // Validate stock availability for the chosen source
      const inv = inventories.find((i) => i.jenisSampahId === it.jenisSampahId && i.source === source)
      const availableStock = inv ? toNumber(inv.stock) : 0
      if (availableStock < qty) {
        throw new Error(`Stok ${wi.name} (sumber: ${source}) tidak cukup. Tersedia: ${availableStock} kg, diminta: ${qty} kg`)
      }

      // Harga beli nasabah: 0 untuk sedekah (donasi), harga acuan untuk nabung
      const hargaAcuan = wi.prices?.[0] ? toNumber(wi.prices[0].pricePerUnit) : toNumber(wi.pricePerUnit)
      const hargaBeliNasabah = source === 'sedekah' ? 0 : hargaAcuan

      const subtotal = price * qty
      const subtotalBeli = hargaBeliNasabah * qty

      totalWeight += qty
      totalValue += subtotal
      totalBeliNasabah += subtotalBeli

      return {
        jenisSampahId: wi.id,
        itemCodeSnapshot: wi.code,
        itemNameSnapshot: wi.name,
        categoryNameSnapshot: wi.category.name,
        unitSnapshot: wi.unit,
        pricePerUnit: price,
        quantity: qty,
        subtotal,
      }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }


  const invoiceNumber = await generateTxNo('INV')
  const tx = await db.transaksiPenjualanMitra.create({
    data: {
      invoiceNumber,
      mitraId,
      totalWeight,
      totalValue,
      notes,
      createdById: actor?.id,
      items: { create: itemRows },
    },
    include: { items: true, mitra: true },
  })

  // Send invoice struk via email to mitra (if mitra has email)
  try {
    const { sendStrukEmail } = await import('@/lib/email')
    if (tx.mitra?.email) {
      const fmtIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
      let html = `<div class="struk-header"><div class="icon">🤝</div><h2>Bank Sampah</h2><div class="sub">Sukamaju Sejahtera</div><div class="desc">Penjualan Sampah ke Mitra Pengepul</div><div class="badge">INVOICE PENJUALAN MITRA</div></div>`
      html += `<div class="struk-section"><h3 style="margin:0 0 12px 0; color:#064e3b; font-size:15px; text-transform:uppercase; text-align:center;">Invoice Penjualan Mitra</h3><div class="info-row"><span class="key">No. Invoice</span><span class="val mono">${invoiceNumber}</span></div><div class="info-row"><span class="key">Tanggal</span><span class="val">${new Date().toLocaleString('id-ID')}</span></div><div class="info-row"><span class="key">Mitra</span><span class="val bold">${tx.mitra.name}</span></div></div>`
      html += `<div class="struk-section"><div class="label">Detail Item</div><table class="items-table"><thead><tr><th>Kode</th><th>Nama</th><th class="center">Qty</th><th class="right">Harga</th><th class="right">Subtotal</th></tr></thead><tbody>`
      for (const r of itemRows) {
        html += `<tr><td>${r.itemCodeSnapshot || '-'}</td><td>${r.itemNameSnapshot}</td><td class="center">${r.quantity}</td><td class="right">${fmtIDR(r.pricePerUnit)}</td><td class="right">${fmtIDR(r.subtotal)}</td></tr>`
      }
      html += `</tbody></table></div>`
      html += `<div class="struk-section"><div class="summary-row highlight"><span class="key">Total Nilai</span><span class="val">${fmtIDR(totalValue)}</span></div></div>`
      html += `<div class="struk-footer"><div class="thanks">Terima kasih atas kerja sama ini</div><div class="signature-area"><div class="sig"><div class="line"></div><div class="label">Mitra Pengepul</div></div><div class="sig"><div class="line"></div><div class="label">Petugas Bank Sampah</div></div></div></div>`
      await sendStrukEmail({ to: tx.mitra.email, subject: `Invoice Penjualan ${invoiceNumber}`, strukHtml: html })
    }
  } catch (e) { console.error('[INV Struk Email] Error:', e) }

  // Reduce inventaris from the specific source chosen
  for (const it of items) {
    const source = it.source || 'nabung'
    try {
      await reduceInventory(it.jenisSampahId, source, toNumber(it.quantity), 'sale', 'sales_transaction', tx.id, actor?.id, `Penjualan ke mitra ${tx.id.slice(-6)}`)
    } catch (e: any) {
      // If specific source fails, try fallback to other source
      const fallbackSource = source === 'nabung' ? 'sedekah' : 'nabung'
      try {
        await reduceInventory(it.jenisSampahId, fallbackSource, toNumber(it.quantity), 'sale', 'sales_transaction', tx.id, actor?.id, `Penjualan ke mitra ${tx.id.slice(-6)}`)
      } catch (e2: any) {
        return NextResponse.json({ error: `Stok tidak cukup untuk penjualan: ${e2.message}` }, { status: 400 })
      }
    }
  }

  // Split Kas Masuk:
  // 1. Modal Sampah (Hak Nasabah) -> Masuk ke Buku Kas Nasabah
  // 2. Keuntungan (Margin) -> Masuk ke Buku Kas Utama
  try {
    const { recordBankSampahKas } = await import('@/lib/business')
    const margin = totalValue - totalBeliNasabah
    
    // 1. Modal masuk ke Kas Nasabah
    if (totalBeliNasabah > 0) {
      await recordBankSampahKas('masuk', 'penjualan_mitra', totalBeliNasabah, `Pencairan modal jual mitra ${tx.id.slice(-6)}`, actor?.id, { salesTxId: tx.id }, 'nasabah')
    }

    // 2. Keuntungan masuk ke Kas Utama
    if (margin > 0) {
      await recordBankSampahKas('masuk', 'penjualan_mitra', margin, `Keuntungan jual mitra ${tx.id.slice(-6)}`, actor?.id, { salesTxId: tx.id }, 'utama')
    } else if (margin < 0) {
      // Jika jual rugi, catat uang keluar dari kas utama sebagai subsidi/kerugian
      await recordBankSampahKas('keluar', 'penjualan_mitra', Math.abs(margin), `Kerugian jual mitra ${tx.id.slice(-6)}`, actor?.id, { salesTxId: tx.id }, 'utama')
    }
  } catch (e) {
    console.error('Failed to record bank sampah kas:', e)
  }

  return NextResponse.json({
    ...tx,
    _meta: {
      totalBeliNasabah,
      totalMargin: totalValue - totalBeliNasabah,
      marginPersen: totalBeliNasabah > 0 ? ((totalValue - totalBeliNasabah) / totalBeliNasabah) * 100 : 0,
    },
  }, { status: 201 })
}
