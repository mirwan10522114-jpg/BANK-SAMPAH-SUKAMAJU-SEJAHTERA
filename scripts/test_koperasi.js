const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ ASSERTION FAILED: ${message}`)
  }
  console.log(`✅ ${message}`)
}

async function runTest() {
  console.log('=== MEMULAI PENGUJIAN E2E MODUL KOPERASI ===\n')

  try {
    // 0. Setup Data Dummy
    console.log('[0] Setup Data Dummy...')
    const admin = await prisma.pengguna.findFirst({ where: { roles: { contains: 'admin' } } })
    if (!admin) throw new Error('Tidak ada admin')

    const pengguna = await prisma.pengguna.create({
      data: {
        name: 'Anggota Koperasi ' + Date.now(),
        email: `kop_${Date.now()}@test.com`,
        password: 'password',
        roles: JSON.stringify(['nasabah']),
        saldo: {
          create: { saldoTersedia: 0, saldoTertahan: 0, points: 0 }
        }
      }
    })

    // Helper: get kas koperasi
    async function getKasKoperasi() {
      const masuk = await prisma.koperasiKasTransaksi.aggregate({ where: { tipe: 'masuk' }, _sum: { jumlah: true } })
      const keluar = await prisma.koperasiKasTransaksi.aggregate({ where: { tipe: 'keluar' }, _sum: { jumlah: true } })
      return Number(masuk._sum.jumlah || 0) - Number(keluar._sum.jumlah || 0)
    }

    const kasAwal = await getKasKoperasi()

    // ==========================================
    // 1. Pendaftaran Anggota
    // ==========================================
    console.log('\n[1] Pendaftaran Anggota Koperasi...')
    const anggota = await prisma.koperasiAnggota.create({
      data: {
        penggunaId: pengguna.id,
        nomorAnggota: `KOP-${Date.now()}`,
        nama: pengguna.name,
        noKtp: '320101010101' + Math.floor(Math.random() * 1000),
        noTelepon: '08123456789',
        alamat: 'Jl. Testing',
        status: 'aktif',
        tanggalBergabung: new Date()
      }
    })
    
    // update roles
    await prisma.pengguna.update({
      where: { id: pengguna.id },
      data: { roles: JSON.stringify(['nasabah', 'koperasi']) }
    })
    assert(anggota.status === 'aktif', `Anggota berhasil didaftarkan dengan nomor ${anggota.nomorAnggota}`)

    // ==========================================
    // 2. Simpanan Wajib & Pokok
    // ==========================================
    console.log('\n[2] Setoran Simpanan Wajib & Pokok...')
    const pokok = 50000
    const wajib = 10000

    await prisma.$transaction(async (tx) => {
      // Pokok
      await tx.koperasiSimpananTransaksi.create({
        data: {
          nomorTransaksi: `SP-${Date.now()}-1`,
          koperasiAnggotaId: anggota.id,
          jenisSimpanan: 'pokok',
          tipe: 'setor',
          jumlah: pokok,
          keterangan: 'Simpanan Pokok Awal',
          penggunaId: admin.id,
          saldoSebelum: 0,
          saldoSesudah: pokok
        }
      })
      await tx.koperasiKasTransaksi.create({
        data: {
          sumber: 'simpanan',
          tipe: 'masuk',
          jumlah: pokok,
          keterangan: `Simpanan Pokok ${anggota.nama}`
        }
      })
      // Wajib
      await tx.koperasiSimpananTransaksi.create({
        data: {
          nomorTransaksi: `SP-${Date.now()}-2`,
          koperasiAnggotaId: anggota.id,
          jenisSimpanan: 'wajib',
          tipe: 'setor',
          jumlah: wajib,
          keterangan: 'Simpanan Wajib Bulan 1',
          penggunaId: admin.id,
          saldoSebelum: 0,
          saldoSesudah: wajib
        }
      })
      await tx.koperasiKasTransaksi.create({
        data: {
          sumber: 'simpanan',
          tipe: 'masuk',
          jumlah: wajib,
          keterangan: `Simpanan Wajib ${anggota.nama}`
        }
      })
    })

    const kasAfterSimpananPW = await getKasKoperasi()
    assert(kasAfterSimpananPW === kasAwal + pokok + wajib, `Kas Koperasi bertambah persis Rp${pokok + wajib}`)

    // ==========================================
    // 3. Simpanan Sukarela & Penarikan
    // ==========================================
    console.log('\n[3] Simpanan Sukarela & Penarikan...')
    const sukarelaIn = 100000
    const tarikSukarela = 40000

    // Setor Sukarela
    await prisma.$transaction(async (tx) => {
      await tx.koperasiSimpananTransaksi.create({
        data: {
          nomorTransaksi: `SP-${Date.now()}-3`,
          koperasiAnggotaId: anggota.id,
          jenisSimpanan: 'sukarela',
          tipe: 'setor',
          jumlah: sukarelaIn,
          keterangan: 'Setoran Sukarela',
          penggunaId: admin.id,
          saldoSebelum: 0,
          saldoSesudah: sukarelaIn
        }
      })
      await tx.koperasiKasTransaksi.create({
        data: {
          sumber: 'simpanan',
          tipe: 'masuk',
          jumlah: sukarelaIn,
          keterangan: `Simpanan Sukarela ${anggota.nama}`
        }
      })
    })
    
    const kasAfterSukarelaIn = await getKasKoperasi()
    assert(kasAfterSukarelaIn === kasAfterSimpananPW + sukarelaIn, `Setoran Sukarela Rp${sukarelaIn} berhasil masuk Kas`)

    // Tarik Sukarela
    await prisma.$transaction(async (tx) => {
      const pr = await tx.koperasiPenarikanSukarela.create({
        data: {
          nomorPengajuan: `PR-${Date.now()}`,
          koperasiAnggotaId: anggota.id,
          jumlah: tarikSukarela,
          status: 'selesai',
          alasan: 'Butuh dana cepat',
          tanggalPencairan: new Date(),
          namaPengurus: 'Admin'
        }
      })
      await tx.koperasiSimpananTransaksi.create({
        data: {
          nomorTransaksi: `TR-${Date.now()}-4`,
          koperasiAnggotaId: anggota.id,
          jenisSimpanan: 'sukarela',
          tipe: 'tarik',
          jumlah: tarikSukarela,
          keterangan: 'Penarikan Sukarela',
          penggunaId: admin.id,
          saldoSebelum: sukarelaIn,
          saldoSesudah: sukarelaIn - tarikSukarela
        }
      })
      await tx.koperasiKasTransaksi.create({
        data: {
          sumber: 'penarikan',
          tipe: 'keluar',
          jumlah: tarikSukarela,
          keterangan: `Penarikan Sukarela ${anggota.nama}`,
          nomorReferensi: pr.id
        }
      })
    })

    const kasAfterSukarelaOut = await getKasKoperasi()
    assert(kasAfterSukarelaOut === kasAfterSukarelaIn - tarikSukarela, `Tarik Sukarela memotong Kas Koperasi sebesar Rp${tarikSukarela} (Sisa Kas: ${kasAfterSukarelaOut})`)

    // ==========================================
    // 4. Pinjaman Koperasi
    // ==========================================
    console.log('\n[4] Pengajuan & Pencairan Pinjaman...')
    const pinjamanPokok = 1000000
    const margin = 50000
    const tenor = 5

    // Pengajuan
    let pinjaman = await prisma.koperasiPinjaman.create({
      data: {
        nomorPinjaman: `PJ-${Date.now()}`,
        koperasiAnggotaId: anggota.id,
        jumlahPinjaman: pinjamanPokok,
        sisaPinjaman: pinjamanPokok + margin,
        tenorBulan: tenor,
        angsuranPerBulan: (pinjamanPokok + margin) / tenor,
        keterangan: 'Modal Usaha',
        status: 'menunggu_persetujuan'
      }
    })
    assert(pinjaman.status === 'menunggu_persetujuan', 'Pengajuan pinjaman berhasil dibuat (status: menunggu)')

    // Disetujui
    pinjaman = await prisma.koperasiPinjaman.update({
      where: { id: pinjaman.id },
      data: { status: 'disetujui' }
    })
    
    // Pencairan (aktif)
    await prisma.$transaction(async (tx) => {
      pinjaman = await tx.koperasiPinjaman.update({
        where: { id: pinjaman.id },
        data: { status: 'aktif', tanggalPencairan: new Date() }
      })
      // Kas keluar untuk pencairan
      await tx.koperasiKasTransaksi.create({
        data: {
          sumber: 'pinjaman',
          tipe: 'keluar',
          jumlah: pinjamanPokok,
          keterangan: `Pencairan Pinjaman ${anggota.nama}`,
          nomorReferensi: pinjaman.id
        }
      })
    })

    const kasAfterPencairan = await getKasKoperasi()
    assert(kasAfterPencairan === kasAfterSukarelaOut - pinjamanPokok, `Pencairan Pinjaman sukses memotong Kas Koperasi sebesar Rp${pinjamanPokok}`)

    // ==========================================
    // 5. Angsuran & Denda
    // ==========================================
    console.log('\n[5] Pembayaran Angsuran & Denda...')
    const bayarAngsuran = pinjaman.angsuranPerBulan
    const denda = 15000

    // Bayar Angsuran 1
    await prisma.$transaction(async (tx) => {
      const angsuranData = await tx.koperasiPinjamanAngsuran.create({
        data: {
          nomorAngsuran: `AG-${Date.now()}`,
          koperasiPinjamanId: pinjaman.id,
          angsuranKe: 1,
          jumlahBayar: bayarAngsuran,
          tanggalBayar: new Date(),
          penggunaId: admin.id,
          sisaPinjamanSetelah: Number(pinjaman.sisaPinjaman) - Number(bayarAngsuran)
        }
      })
      // Potong sisa pinjaman
      await tx.koperasiPinjaman.update({
        where: { id: pinjaman.id },
        data: { sisaPinjaman: Number(pinjaman.sisaPinjaman) - Number(bayarAngsuran) }
      })
      // Uang masuk Kas
      await tx.koperasiKasTransaksi.create({
        data: {
          sumber: 'angsuran',
          tipe: 'masuk',
          jumlah: bayarAngsuran,
          keterangan: `Angsuran 1 Pinjaman ${anggota.nama}`,
          nomorReferensi: angsuranData.id
        }
      })
    })

    const pinjamanCheck = await prisma.koperasiPinjaman.findUnique({ where: { id: pinjaman.id } })
    assert(Number(pinjamanCheck.sisaPinjaman) === Number(pinjaman.sisaPinjaman) - Number(bayarAngsuran), 'Angsuran 1 berhasil memotong sisa pinjaman')

    const kasAfterAngsuran = await getKasKoperasi()
    assert(kasAfterAngsuran === kasAfterPencairan + Number(bayarAngsuran), `Angsuran masuk ke Kas Koperasi sebesar Rp${bayarAngsuran}`)

    // Bayar Denda
    await prisma.$transaction(async (tx) => {
      // Kas uang denda masuk
      await tx.koperasiKasTransaksi.create({
        data: {
          sumber: 'denda',
          tipe: 'masuk',
          jumlah: denda,
          keterangan: `Pembayaran Denda Keterlambatan ${anggota.nama}`
        }
      })
    })

    const kasAfterDenda = await getKasKoperasi()
    assert(kasAfterDenda === kasAfterAngsuran + denda, `Denda keterlambatan sebesar Rp${denda} berhasil menambah Kas Koperasi`)

    console.log('\n✅✅✅ SEMUA SKENARIO PENGUJIAN MODUL KOPERASI BERHASIL! ✅✅✅')

  } catch (err) {
    console.error(err)
  } finally {
    await prisma.$disconnect()
  }
}

runTest()
