import { NextRequest, NextResponse } from 'next/server'
import { getActingUser } from '@/lib/business'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'

// POST: Upload product image to /public/uploads/products/
// Returns { url } on success — the URL is stored in Product.image / Product.images
export async function POST(req: NextRequest) {
  // Auth — same convention as the rest of /toko/admin/*
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file')

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'File tidak ditemukan pada request' }, { status: 400 })
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Tipe file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.' },
      { status: 400 }
    )
  }

  // Validate file size (max 2MB — matches the client-side check in penjualan-produk.tsx)
  const maxBytes = 2 * 1024 * 1024
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: 'Ukuran file terlalu besar. Maksimal 2MB.' },
      { status: 400 }
    )
  }

  // Build a safe, collision-resistant filename:
  //   produk-<timestamp>-<rand>.<ext>
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().slice(0, 5)
  const rand = randomBytes(6).toString('hex')
  const timestamp = Date.now()
  const filename = `produk-${timestamp}-${rand}.${ext}`

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products')
  // Make sure the directory exists (idempotent)
  await mkdir(uploadDir, { recursive: true })

  const fullPath = path.join(uploadDir, filename)
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(fullPath, buffer)

  // Return the public URL (relative path works from any deployment root)
  const url = `/uploads/products/${filename}`
  return NextResponse.json({ url }, { status: 201 })
}
