import { NextRequest, NextResponse } from 'next/server'
import { getActingUser } from '@/lib/business'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { resolveBlastTargets } from './helper'

export async function POST(req: NextRequest) {
  try {
    const actor = await getActingUser(req)
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { tipe, tagihanFilter, customMessage, targetIds } = body

    if (!tipe || !customMessage) {
      return NextResponse.json({ error: 'Tipe blast dan pesan wajib diisi' }, { status: 400 })
    }

    const targets = await resolveBlastTargets(tipe, tagihanFilter, targetIds)

    if (targets.length === 0) {
      return NextResponse.json({ error: 'Tidak ada target yang valid (tidak memiliki nomor HP atau kriteria tidak terpenuhi)' }, { status: 400 })
    }

    // Process blasting in background (non-blocking for Vercel if edge, but NextJS serverless might kill it if response is sent early. Since this is local `npm run dev`, it will finish safely.)
    // We await it here so frontend can show success after completion, but limit to small batches.
    
    let sentCount = 0
    let failCount = 0

    for (const target of targets) {
      // Parse template
      let finalMessage = customMessage.replace(/\[NAMA\]/g, target.nama)
      if (target.nomorAnggota) {
        finalMessage = finalMessage.replace(/\[KODE_ANGGOTA\]/g, target.nomorAnggota)
      } else {
        finalMessage = finalMessage.replace(/\[KODE_ANGGOTA\]/g, '') // hapus jika tidak ada
      }
      
      if (target.variables.nominal_pokok) {
        finalMessage = finalMessage.replace(/\[NOMINAL_POKOK\]/g, target.variables.nominal_pokok)
      }
      if (target.variables.nominal_wajib) {
        finalMessage = finalMessage.replace(/\[NOMINAL_WAJIB\]/g, target.variables.nominal_wajib)
      }
      if (target.variables.bulan) {
        finalMessage = finalMessage.replace(/\[BULAN\]/g, target.variables.bulan)
      }
      if (target.variables.sisa_pinjaman) {
        finalMessage = finalMessage.replace(/\[SISA_PINJAMAN\]/g, target.variables.sisa_pinjaman)
      }

      const cleanPhone = target.phone.replace(/[^0-9]/g, '')
      const success = await sendWhatsAppMessage(cleanPhone, finalMessage)
      if (success) {
        sentCount++
      } else {
        failCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Blast WhatsApp selesai. Terkirim: ${sentCount}, Gagal: ${failCount}`,
      sentCount,
      failCount,
    })
  } catch (error: any) {
    console.error('Blast API Error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan internal server' }, { status: 500 })
  }
}
