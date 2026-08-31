import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser, generateTxNo, calcAngsuranSchedule, recordKasTx } from '@/lib/business'
import { toNumber, formatRupiah } from '@/lib/format'

// GET: list pinjaman
// Query params:
//   anggotaId — filter by anggota
//   status    — 'berjalan' | 'lunas' | 'all'
//   dari      — ISO date (gte tanggalPengajuan)
//   sampai    — ISO date (lte tanggalPengajuan)
//   q         — search by nomorPinjaman (case-insensitive contains)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const anggotaId = searchParams.get('anggotaId')
  const status = searchParams.get('status')
  const dari = searchParams.get('dari')
  const sampai = searchParams.get('sampai')
  const q = (searchParams.get('q') || '').trim()

  const where: any = {}
  if (anggotaId) where.koperasiAnggotaId = anggotaId
  if (status && status !== 'all') where.status = status
  if (dari || sampai) {
    where.tanggalPengajuan = {}
    if (dari) where.tanggalPengajuan.gte = new Date(dari)
    if (sampai) {
      const s = new Date(sampai)
      s.setHours(23, 59, 59, 999)
      where.tanggalPengajuan.lte = s
    }
  }
  if (q) {
    where.nomorPinjaman = { contains: q }
  }
  const pinjaman = await db.koperasiPinjaman.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { anggota: true, angsurans: { orderBy: { angsuranKe: 'asc' } } },
    take: 100,
  })
  return NextResponse.json(pinjaman)
}

// POST: pemberian pinjaman baru (langsung berstatus 'berjalan' & kas keluar dicatat)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const actor = await getActingUser(req)
  const { anggotaId, jumlahPinjaman, tenorBulan, sukuBunga: inputBunga, keterangan } = body as {
    anggotaId: string
    jumlahPinjaman: number
    tenorBulan: number
    sukuBunga?: number
    keterangan?: string
  }
  if (!anggotaId) return NextResponse.json({ error: 'Anggota wajib dipilih' }, { status: 400 })
  if (jumlahPinjaman <= 0) return NextResponse.json({ error: 'Jumlah pinjaman harus > 0' }, { status: 400 })
  if (tenorBulan <= 0) return NextResponse.json({ error: 'Tenor harus > 0' }, { status: 400 })

  // Server-side eligibility check
  const anggotaData = await db.koperasiAnggota.findUnique({
    where: { id: anggotaId },
    include: { pinjamans: { include: { angsurans: true } }, user: true },
  })
  if (!anggotaData) return NextResponse.json({ error: 'Anggota tidak ditemukan' }, { status: 404 })

  const setting = await db.koperasiSetting.findFirst()
  const minimalBulan = setting?.minimalBulanAnggota ?? 3
  const nowMs = Date.now()
  const joinMs = new Date(anggotaData.tanggalBergabung).getTime()
  const memberMonths = Math.max(0, Math.floor((nowMs - joinMs) / (1000 * 60 * 60 * 24 * 30.44)))
  if (memberMonths < minimalBulan) return NextResponse.json({ error: `Masa keanggotaan belum mencukupi (${memberMonths} bulan, minimal ${minimalBulan} bulan)` }, { status: 400 })
  if (anggotaData.pinjamans.some((p) => p.status === 'berjalan')) return NextResponse.json({ error: 'Masih memiliki pinjaman yang sedang berjalan' }, { status: 400 })
  if (anggotaData.pinjamanDiblokir) return NextResponse.json({ error: 'Pinjaman diblokir. Ajukan perbaikan eligibilitas terlebih dahulu.' }, { status: 400 })
  const withHistory = anggotaData.pinjamans.filter((p) => (p.status === 'lunas' || p.status === 'berjalan') && p.angsurans.length > 0)
  for (const px of withHistory) {
    for (const a of px.angsurans) {
      if (toNumber(a.dendaBayar) > 0) return NextResponse.json({ error: 'Riwayat pembayaran bermasalah. Ajukan perbaikan eligibilitas terlebih dahulu.' }, { status: 400 })
    }
  }

  const sukuBunga = inputBunga !== undefined ? Number(inputBunga) : (setting ? toNumber(setting.sukuBungaPinjaman) : 0)

  const { angsuranPerBulan } = calcAngsuranSchedule(jumlahPinjaman, tenorBulan, sukuBunga)
  const counter = await db.koperasiPinjaman.count()
  const nomor = `PNJ / ${String(counter + 1).padStart(4, '0')}`

  const pinjaman = await db.koperasiPinjaman.create({
    data: {
      nomorPinjaman: nomor,
      koperasiAnggotaId: anggotaId,
      jumlahPinjaman,
      tenorBulan,
      angsuranPerBulan,
      biayaAdmin: setting ? toNumber(setting.biayaAdminPinjaman) : 0,
      tanggalPengajuan: new Date(),
      tanggalPencairan: new Date(),
      status: 'berjalan', // Langsung berjalan (anggota datang langsung & disetujui di tempat)
      sisaPinjaman: jumlahPinjaman,
      sukuBunga,
      keterangan,
      userId: actor?.id,
    },
    include: { anggota: true },
  })

  // Record kas keluar koperasi langsung
  await recordKasTx('pinjaman', 'keluar', jumlahPinjaman, `Pemberian pinjaman koperasi ${nomor}`, actor?.id, nomor)

  // Kirim email struk pencairan pinjaman ke anggota jika ada email
  try {
    const email = anggotaData.user?.email
    if (email) {
      const { sendStrukEmail } = await import('@/lib/email')
      const fmtIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
      let html = `<div class="struk-header"><div class="icon">🤝</div><h2>Koperasi Simpan Pinjam</h2><div class="sub">Bank Sampah Sukamaju Sejahtera</div><div class="badge">STRUK PENCAIRAN PINJAMAN</div></div>`
      html += `<div class="struk-section"><div class="info-row"><span class="key">No. Pinjaman</span><span class="val mono">${nomor}</span></div><div class="info-row"><span class="key">Tanggal Pencairan</span><span class="val">${new Date().toLocaleString('id-ID')}</span></div><div class="info-row"><span class="key">Anggota</span><span class="val bold">${anggotaData.nama}</span></div><div class="info-row"><span class="key">No. Anggota</span><span class="val mono">${anggotaData.nomorAnggota}</span></div><div class="info-row"><span class="key">Status</span><span class="val bold" style="color:#047857;">BERJALAN</span></div></div>`
      html += `<div class="struk-section"><div class="summary-row highlight"><span class="key">Jumlah Pinjaman</span><span class="val">${fmtIDR(jumlahPinjaman)}</span></div><div class="summary-row"><span class="key">Tenor</span><span class="val">${tenorBulan} Bulan</span></div><div class="summary-row"><span class="key">Suku Bunga</span><span class="val">${sukuBunga}% / Tahun</span></div><div class="summary-row"><span class="key">Angsuran / Bulan</span><span class="val" style="color:#047857;font-weight:bold;">${fmtIDR(angsuranPerBulan)}</span></div></div>`
      html += `<div class="struk-footer"><div class="thanks">Dana telah diserahkan langsung. Mohon bayar angsuran tepat waktu.</div></div>`
      await sendStrukEmail({ to: email, subject: `Struk Pinjaman Koperasi ${nomor}`, strukHtml: html })
    }
  } catch (err) {
    console.error('[Pinjaman Struk Email] Error:', err)
  }

  return NextResponse.json(pinjaman, { status: 201 })
}
