import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

// GET: Download project source code as zip
export async function GET(req: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), 'bank-sampah-code.zip')
    const fileBuffer = await readFile(filePath)
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="bank-sampah-code.zip"',
        'Content-Length': fileBuffer.byteLength.toString(),
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'File tidak ditemukan: ' + e.message }, { status: 404 })
  }
}
