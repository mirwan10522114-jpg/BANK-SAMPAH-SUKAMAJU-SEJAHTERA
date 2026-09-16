import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'
import { toNumber } from '@/lib/format'

// =====================================================================
// GET /api/inventaris/resep
// List semua resep pengolahan (dengan filter opsional: ?produkId=xxx)
// Includes stock tracking: currentStock, maxProducible, stockStatus per ingredient
// =====================================================================
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const produkId = searchParams.get('produkId')

  const where: { produkId?: string } = {}
  if (produkId) where.produkId = produkId

  const [recipes, allInventory] = await Promise.all([
    db.resepPengolahan.findMany({
      where,
      include: {
        produk: { select: { id: true, name: true, unit: true } },
        jenisSampah: { select: { id: true, name: true, code: true, unit: true } },
      },
      orderBy: { produk: { name: 'asc' } },
    }),
    db.inventaris.findMany(),
  ])

  return NextResponse.json(recipes.map((r) => {
    const qpu = toNumber(r.quantityPerUnit)
    // Find matching inventory for this ingredient + source
    const inv = allInventory.find((i) => i.jenisSampahId === r.jenisSampahId && i.source === r.source)
    const currentStock = inv ? toNumber(inv.stock) : 0
    // Max units this ingredient can produce
    const maxProducible = qpu > 0 ? Math.floor(currentStock / qpu) : 0
    // Status: kosong (<1 unit), rendah (<10 units), tersedia (>=10)
    let stockStatus: 'tersedia' | 'rendah' | 'kosong' = 'tersedia'
    if (maxProducible < 1) stockStatus = 'kosong'
    else if (maxProducible < 10) stockStatus = 'rendah'

    return {
      id: r.id,
      produkId: r.produkId,
      productName: r.produk.name,
      productUnit: r.produk.unit,
      jenisSampahId: r.jenisSampahId,
      wasteItemName: r.jenisSampah.name,
      wasteItemCode: r.jenisSampah.code,
      wasteItemUnit: r.jenisSampah.unit,
      quantityPerUnit: qpu,
      source: r.source,
      isActive: r.isActive,
      notes: r.notes,
      // Stock tracking
      currentStock,
      maxProducible,
      stockStatus,
    }
  }))
}


// =====================================================================
// POST /api/inventaris/resep
// Buat resep baru atau update (upsert berdasarkan produkId + jenisSampahId)
// =====================================================================
export async function POST(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { produkId, items, jenisSampahId, quantityPerUnit, source, isActive, notes } = body as {
    produkId: string
    items?: Array<{
      jenisSampahId: string
      quantityPerUnit: number
      source?: string
      isActive?: boolean
      notes?: string
    }>
    jenisSampahId?: string
    quantityPerUnit?: number
    source?: string
    isActive?: boolean
    notes?: string
  }

  if (!produkId) {
    return NextResponse.json({ error: 'Produk wajib dipilih' }, { status: 400 })
  }

  // Validasi produk ada
  const produk = await db.produk.findUnique({ where: { id: produkId } })
  if (!produk) return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 400 })

  // Support batch ingredients for a produk (Multi-Bahan Baku / Mix)
  if (Array.isArray(items) && items.length > 0) {
    const validItems = items.filter(it => it.jenisSampahId && it.quantityPerUnit > 0)
    if (validItems.length === 0) {
      return NextResponse.json({ error: 'Minimal 1 bahan baku valid harus diisi' }, { status: 400 })
    }

    const results: any[] = []
    for (const it of validItems) {
      const jenisSampah = await db.jenisSampah.findUnique({ where: { id: it.jenisSampahId } })
      if (!jenisSampah) continue

      const existing = await db.resepPengolahan.findUnique({
        where: { produkId_jenisSampahId: { produkId, jenisSampahId: it.jenisSampahId } },
      })

      if (existing) {
        const updated = await db.resepPengolahan.update({
          where: { id: existing.id },
          data: {
            quantityPerUnit: it.quantityPerUnit,
            source: it.source || 'nabung',
            isActive: it.isActive !== undefined ? it.isActive : true,
            notes: it.notes || null,
          },
        })
        results.push(updated)
      } else {
        const created = await db.resepPengolahan.create({
          data: {
            produkId,
            jenisSampahId: it.jenisSampahId,
            quantityPerUnit: it.quantityPerUnit,
            source: it.source || 'nabung',
            isActive: it.isActive !== undefined ? it.isActive : true,
            notes: it.notes || null,
          },
        })
        results.push(created)
      }
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      message: `${results.length} bahan baku resep berhasil disimpan`,
    }, { status: 201 })
  }

  // Single item fallback
  if (!jenisSampahId || !quantityPerUnit) {
    return NextResponse.json({ error: 'Bahan baku dan jumlah per unit wajib diisi' }, { status: 400 })
  }

  const jenisSampah = await db.jenisSampah.findUnique({ where: { id: jenisSampahId } })
  if (!jenisSampah) return NextResponse.json({ error: 'Bahan baku tidak ditemukan' }, { status: 400 })

  // Upsert: kalau resep dengan kombinasi produkId+jenisSampahId sudah ada → update
  const existing = await db.resepPengolahan.findUnique({
    where: { produkId_jenisSampahId: { produkId, jenisSampahId } },
  })

  let recipe
  if (existing) {
    recipe = await db.resepPengolahan.update({
      where: { id: existing.id },
      data: {
        quantityPerUnit,
        source: source || 'nabung',
        isActive: isActive !== undefined ? isActive : true,
        notes: notes || null,
      },
    })
  } else {
    recipe = await db.resepPengolahan.create({
      data: {
        produkId,
        jenisSampahId,
        quantityPerUnit,
        source: source || 'nabung',
        isActive: isActive !== undefined ? isActive : true,
        notes: notes || null,
      },
    })
  }

  return NextResponse.json({
    id: recipe.id,
    message: existing ? 'Resep diperbarui' : 'Resep dibuat',
  }, { status: 201 })
}

// =====================================================================
// PUT /api/inventaris/resep
// Update resep (toggle isActive, edit quantityPerUnit, dll)
// Body: { id, isActive?, quantityPerUnit?, source?, notes? }
// =====================================================================
export async function PUT(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, isActive, quantityPerUnit, source, notes } = body as {
    id: string
    isActive?: boolean
    quantityPerUnit?: number
    source?: string
    notes?: string
  }

  if (!id) return NextResponse.json({ error: 'ID resep wajib' }, { status: 400 })

  const data: { isActive?: boolean; quantityPerUnit?: number; source?: string; notes?: string | null } = {}
  if (isActive !== undefined) data.isActive = isActive
  if (quantityPerUnit !== undefined) data.quantityPerUnit = quantityPerUnit
  if (source !== undefined) data.source = source
  if (notes !== undefined) data.notes = notes || null

  const recipe = await db.resepPengolahan.update({
    where: { id },
    data,
  })

  return NextResponse.json({ id: recipe.id, message: 'Resep diperbarui' })
}

// =====================================================================
// DELETE /api/inventaris/resep?id=xxx
// Hapus resep
// =====================================================================
export async function DELETE(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const produkId = searchParams.get('produkId')
  if (!id && !produkId) return NextResponse.json({ error: 'ID resep atau produkId wajib' }, { status: 400 })

  if (produkId) {
    await db.resepPengolahan.deleteMany({ where: { produkId } })
    return NextResponse.json({ message: 'Semua resep produk dihapus' })
  }

  await db.resepPengolahan.delete({ where: { id: id! } })

  return NextResponse.json({ message: 'Resep dihapus' })
}
