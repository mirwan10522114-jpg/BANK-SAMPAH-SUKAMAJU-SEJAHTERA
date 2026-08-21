import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'
import { toNumber } from '@/lib/format'

// =====================================================================
// GET /api/inventaris/resep
// List semua resep pengolahan (dengan filter opsional: ?productId=xxx)
// =====================================================================
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('productId')

  const where: { productId?: string } = {}
  if (productId) where.productId = productId

  const recipes = await db.processingRecipe.findMany({
    where,
    include: {
      product: { select: { id: true, name: true, unit: true } },
      wasteItem: { select: { id: true, name: true, code: true, unit: true } },
    },
    orderBy: { product: { name: 'asc' } },
  })

  return NextResponse.json(recipes.map((r) => ({
    id: r.id,
    productId: r.productId,
    productName: r.product.name,
    productUnit: r.product.unit,
    wasteItemId: r.wasteItemId,
    wasteItemName: r.wasteItem.name,
    wasteItemCode: r.wasteItem.code,
    wasteItemUnit: r.wasteItem.unit,
    quantityPerUnit: toNumber(r.quantityPerUnit),
    source: r.source,
    isActive: r.isActive,
    notes: r.notes,
  })))
}

// =====================================================================
// POST /api/inventaris/resep
// Buat resep baru atau update (upsert berdasarkan productId + wasteItemId)
// =====================================================================
export async function POST(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { productId, wasteItemId, quantityPerUnit, source, isActive, notes } = body as {
    productId: string
    wasteItemId: string
    quantityPerUnit: number
    source?: string
    isActive?: boolean
    notes?: string
  }

  if (!productId || !wasteItemId || !quantityPerUnit) {
    return NextResponse.json({ error: 'Produk, bahan baku, dan jumlah per unit wajib diisi' }, { status: 400 })
  }

  // Validasi produk & waste item ada
  const product = await db.product.findUnique({ where: { id: productId } })
  if (!product) return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 400 })

  const wasteItem = await db.wasteItem.findUnique({ where: { id: wasteItemId } })
  if (!wasteItem) return NextResponse.json({ error: 'Bahan baku tidak ditemukan' }, { status: 400 })

  // Upsert: kalau resep dengan kombinasi productId+wasteItemId sudah ada → update
  const existing = await db.processingRecipe.findUnique({
    where: { productId_wasteItemId: { productId, wasteItemId } },
  })

  let recipe
  if (existing) {
    recipe = await db.processingRecipe.update({
      where: { id: existing.id },
      data: {
        quantityPerUnit,
        source: source || 'nabung',
        isActive: isActive !== undefined ? isActive : true,
        notes: notes || null,
      },
    })
  } else {
    recipe = await db.processingRecipe.create({
      data: {
        productId,
        wasteItemId,
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

  const recipe = await db.processingRecipe.update({
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
  if (!id) return NextResponse.json({ error: 'ID resep wajib' }, { status: 400 })

  await db.processingRecipe.delete({ where: { id } })

  return NextResponse.json({ message: 'Resep dihapus' })
}
