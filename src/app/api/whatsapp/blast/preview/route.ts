import { NextRequest, NextResponse } from 'next/server'
import { getActingUser } from '@/lib/business'
import { resolveBlastTargets } from '../helper'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const actor = await getActingUser(req)
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const tipe = searchParams.get('tipe')
    const tagihanFilter = searchParams.get('tagihanFilter') || undefined
    const ids = searchParams.get('ids') // comma separated for perorangan

    if (!tipe) {
      return NextResponse.json({ error: 'Parameter tipe wajib diisi' }, { status: 400 })
    }

    let targetIds: string[] = []
    if (tipe === 'perorangan' && ids) {
      targetIds = ids.split(',').filter(Boolean)
    }

    const targets = await resolveBlastTargets(tipe, tagihanFilter, targetIds)

    return NextResponse.json({
      success: true,
      count: targets.length,
      targets: targets.map(t => ({
        nama: t.nama,
        phone: t.phone,
        nilai: t.variables.nilai, // nominal_pokok / wajib / sisa_pinjaman / angsuran
        jatuh_tempo: t.variables.jatuh_tempo,
        selisih_hari: t.variables.selisih_hari
      }))
    })

  } catch (err: any) {
    console.error('ERROR IN WA BLAST PREVIEW API:', err)
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan saat memuat preview' }, { status: 500 })
  }
}
