import { NextRequest, NextResponse } from 'next/server'
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

// POST: Upload scan KTP ke /public/uploads/ktp/
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File tidak ditemukan pada request' }, { status: 400 })
    }

    const ext = MIME_TO_EXT[file.type]
    if (!ext) {
      return NextResponse.json(
        { error: 'Tipe file tidak didukung. Gunakan JPG, PNG, atau WebP.' },
        { status: 400 }
      )
    }

    const maxBytes = 5 * 1024 * 1024
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: 'Ukuran file terlalu besar. Maksimal 5MB.' },
        { status: 400 }
      )
    }

    const rand = randomBytes(6).toString('hex')
    const timestamp = Date.now()
    const filename = `ktp-${timestamp}-${rand}.${ext}`

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'ktp')
    await mkdir(uploadDir, { recursive: true })

    const fullPath = path.join(uploadDir, filename)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(fullPath, buffer)

    const url = `/uploads/ktp/${filename}`
    return NextResponse.json({ url }, { status: 201 })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Gagal mengunggah file' }, { status: 500 })
  }
}
