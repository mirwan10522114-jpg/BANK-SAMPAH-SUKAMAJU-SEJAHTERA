import { NextRequest, NextResponse } from 'next/server'
import { getActingUser } from '@/lib/business'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

// POST: Upload product image to /public/uploads/products/
export async function POST(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file')

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'File tidak ditemukan pada request' }, { status: 400 })
  }

  const ext = MIME_TO_EXT[file.type]
  if (!ext) {
    return NextResponse.json(
      { error: 'Tipe file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.' },
      { status: 400 }
    )
  }

  const maxBytes = 2 * 1024 * 1024
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: 'Ukuran file terlalu besar. Maksimal 2MB.' },
      { status: 400 }
    )
  }

  const rand = randomBytes(6).toString('hex')
  const timestamp = Date.now()
  const filename = `produk-${timestamp}-${rand}.${ext}`

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products')
  await mkdir(uploadDir, { recursive: true })

  const fullPath = path.join(uploadDir, filename)
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(fullPath, buffer)

  const url = `/uploads/products/${filename}`
  return NextResponse.json({ url }, { status: 201 })
}