import { db } from '@/lib/db'
import { toNumber, formatRupiah } from '@/lib/format'

export async function resolveBlastTargets(tipe: string, tagihanFilter?: string, targetIds?: string[]) {
  const setting = await db.koperasiSetting.findFirst()
  const nominalPokok = setting ? toNumber(setting.nominalSimpananPokok) : 50000
  const nominalWajib = setting ? toNumber(setting.nominalSimpananWajib) : 10000

  let targets: { id: string; phone: string; nama: string; nomorAnggota?: string; variables: any }[] = []

  if (tipe === 'pengumuman') {
    // Semua pengguna (keseluruhan nasabah)
    const penggunas = await db.pengguna.findMany()
    targets = penggunas.map(u => ({
      id: u.id,
      phone: u.phone || '',
      nama: u.name,
      nomorAnggota: u.memberCode || undefined,
      variables: {},
    }))
  } else if (tipe === 'simpanan_pokok') {
    // 1. Anggota yang sudah aktif tapi saldo pokoknya masih < nominalPokok
    const anggotas = await db.koperasiAnggota.findMany({
      where: { status: 'aktif', deletedAt: null },
      include: { simpananSaldos: true, pengguna: true },
    })
    
    const belumBayar = anggotas.filter(a => {
      const saldoPokok = a.simpananSaldos.find(s => s.jenisSimpanan === 'pokok')
      return !saldoPokok || toNumber(saldoPokok.saldo) < nominalPokok
    })

    const targetsAnggota = belumBayar.map(a => ({
      id: a.id,
      phone: a.noTelepon || a.pengguna?.phone || '',
      nama: a.nama,
      nomorAnggota: a.nomorAnggota,
      variables: { nominal_pokok: formatRupiah(nominalPokok), nilai: formatRupiah(nominalPokok) },
    }))

    // 2. Pendaftar baru yang memilih role koperasi tapi belum di-approve (belum punya record koperasiAnggota)
    const calonAnggotas = await db.pengguna.findMany({
      where: { 
        roles: { contains: 'koperasi' },
        koperasiAnggota: { is: null }
      }
    })

    const targetsCalon = calonAnggotas.map(p => ({
      id: p.id,
      phone: p.phone || '',
      nama: p.name,
      nomorAnggota: p.memberCode || undefined,
      variables: { nominal_pokok: formatRupiah(nominalPokok), nilai: formatRupiah(nominalPokok) },
    }))

    targets = [...targetsAnggota, ...targetsCalon]
  } else if (tipe === 'simpanan_wajib') {
    // Anggota yang belum bayar wajib bulan ini
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const anggotas = await db.koperasiAnggota.findMany({
      where: { status: 'aktif', deletedAt: null },
      include: {
        pengguna: true,
        simpananTx: {
          where: {
            jenisSimpanan: 'wajib',
            tipe: 'setor',
            tanggalTransaksi: { gte: startDate, lte: endDate },
          },
        },
      },
    })
    
    const belumBayar = anggotas.filter(a => a.simpananTx.length === 0)
    const namaBulan = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })

    targets = belumBayar.map(a => ({
      id: a.id,
      phone: a.noTelepon || a.pengguna?.phone || '',
      nama: a.nama,
      nomorAnggota: a.nomorAnggota,
      variables: { nominal_wajib: formatRupiah(nominalWajib), bulan: namaBulan, nilai: formatRupiah(nominalWajib) },
    }))
  } else if (tipe === 'tagihan_pinjaman') {
    // Anggota dengan pinjaman aktif yang belum lunas
    const pinjamanAktif = await db.koperasiPinjaman.findMany({
      where: { status: 'berjalan' }, // Gunakan berjalan, bukan aktif (schema: diajukan|disetujui|berjalan|lunas)
      include: { anggota: { include: { pengguna: true } }, angsurans: { orderBy: { angsuranKe: 'asc' } } },
    })
    
    const today = new Date()
    today.setHours(0, 0, 0, 0) // normalize

    targets = pinjamanAktif.reduce((acc: any[], p) => {
      const paidCount = p.angsurans?.length || 0
      const nextAngsuranKe = paidCount + 1
      
      if (nextAngsuranKe > p.tenorBulan || toNumber(p.sisaPinjaman) <= 0) {
        return acc // Lunas
      }

      const baseDate = new Date(p.tanggalPencairan || p.tanggalPengajuan)
      const jatuhTempo = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())
      jatuhTempo.setMonth(jatuhTempo.getMonth() + nextAngsuranKe)
      
      const selisihHari = Math.floor((jatuhTempo.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      let includeMatch = false
      if (tagihanFilter === 'semua' || !tagihanFilter) {
        includeMatch = true
      } else if (tagihanFilter === 'menunggak' && selisihHari < 0) {
        includeMatch = true
      } else if (tagihanFilter === 'h-30' && selisihHari >= 15 && selisihHari <= 30) {
        includeMatch = true
      } else if (tagihanFilter === 'h-14' && selisihHari >= 8 && selisihHari <= 14) {
        includeMatch = true
      } else if (tagihanFilter === 'h-7' && selisihHari >= 4 && selisihHari <= 7) {
        includeMatch = true
      } else if (tagihanFilter === 'h-3' && selisihHari >= 0 && selisihHari <= 3) {
        includeMatch = true
      }

      if (includeMatch) {
        acc.push({
          id: p.anggota.id,
          phone: p.anggota.noTelepon || p.anggota.pengguna?.phone || '',
          nama: p.anggota.nama,
          nomorAnggota: p.anggota.nomorAnggota,
          variables: { 
            sisa_pinjaman: formatRupiah(toNumber(p.sisaPinjaman)),
            jatuh_tempo: jatuhTempo.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
            selisih_hari: selisihHari,
            angsuran_per_bulan: formatRupiah(toNumber(p.angsuranPerBulan)),
            nilai: formatRupiah(toNumber(p.angsuranPerBulan))
          },
        })
      }
      return acc
    }, [])
  } else if (tipe === 'perorangan') {
    if (targetIds && Array.isArray(targetIds) && targetIds.length > 0) {
      const selectedUsers = await db.pengguna.findMany({
        where: { id: { in: targetIds } },
      })
      
      targets = selectedUsers.map(u => ({
        id: u.id,
        phone: u.phone || '',
        nama: u.name || 'Pengguna',
        nomorAnggota: u.memberCode || undefined,
        variables: {},
      }))
    }
  }

  // Filter out penggunas completely without phone numbers (allow shorter numbers to show up so admin knows)
  targets = targets.filter(t => !!t.phone)

  return targets
}
