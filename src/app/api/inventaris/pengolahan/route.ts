import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, reduceInventory, addProductStock } from '@/lib/business'
import { toNumber } from '@/lib/format'

// GET: list processing transactions
// Query params:
//   dari   — ISO date (gte transactedAt)
//   sampai — ISO date (lte transactedAt)
//   q      — search by waste item name in inputs OR product name in outputs (case-insensitive contains)
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
  const list = await db.processingTransaction.findMany({
    where,
    orderBy: { transactedAt: 'desc' },
    include: { inputs: { include: { wasteItem: true } }, outputs: { include: { product: true } }, createdBy: true },
    take: 100,
  })
  return NextResponse.json(list)
}

// POST: create processing transaction (waste -> product)
// inputs reduce inventory (source nabung/sedekah), outputs add product stock
export async function POST(req: NextRequest) {
  const body = await req.json()
  const actor = await getActingUser(req)
  const { inputs, outputs, notes } = body as {
    inputs: { wasteItemId: string; quantity: number; source?: string }[]
    outputs: { productId: string; quantity: number }[]
    notes?: string
  }
  if (!inputs?.length || !outputs?.length) return NextResponse.json({ error: 'Input dan output wajib diisi' }, { status: 400 })

  const wasteItems = await db.wasteItem.findMany({ where: { id: { in: inputs.map((i) => i.wasteItemId) } }, include: { category: true } })
  const products = await db.product.findMany({ where: { id: { in: outputs.map((o) => o.productId) } } })

  const totalInputWeight = inputs.reduce((s, i) => s + toNumber(i.quantity), 0)

  const tx = await db.processingTransaction.create({
    data: {
      totalInputWeight,
      notes,
      createdById: actor?.id,
      inputs: {
        create: inputs.map((i) => {
          const wi = wasteItems.find((w) => w.id === i.wasteItemId)!
          return {
            wasteItemId: i.wasteItemId,
            itemCodeSnapshot: wi.code,
            itemNameSnapshot: wi.name,
            categoryNameSnapshot: wi.category.name,
            unitSnapshot: wi.unit,
            quantity: toNumber(i.quantity),
          }
        }),
      },
      outputs: {
        create: outputs.map((o) => {
          const p = products.find((pr) => pr.id === o.productId)!
          return {
            productId: o.productId,
            productNameSnapshot: p.name,
            unitSnapshot: p.unit,
            quantity: toNumber(o.quantity),
          }
        }),
      },
    },
    include: { inputs: true, outputs: true },
  })

  // Reduce inventory for each input (prefer nabung source, fallback sedekah)
  for (const inp of inputs) {
    const source = inp.source || 'nabung'
    try {
      await reduceInventory(inp.wasteItemId, source, toNumber(inp.quantity), 'processing_input', 'processing_transaction', tx.id, actor?.id, `Pengolahan ${tx.id.slice(-6)}`)
    } catch {
      // fallback to sedekah source if nabung stock insufficient
      try {
        await reduceInventory(inp.wasteItemId, 'sedekah', toNumber(inp.quantity), 'processing_input', 'processing_transaction', tx.id, actor?.id, `Pengolahan ${tx.id.slice(-6)}`)
      } catch (e: any) {
        return NextResponse.json({ error: `Stok tidak cukup untuk pengolahan: ${e.message}` }, { status: 400 })
      }
    }
  }
  // Add product stock for each output
  for (const out of outputs) {
    await addProductStock(out.productId, toNumber(out.quantity), 'processing_output', 'processing_transaction', tx.id, actor?.id, `Hasil pengolahan ${tx.id.slice(-6)}`)
  }

  return NextResponse.json(tx, { status: 201 })
}
