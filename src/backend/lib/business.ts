// Core business logic for Bank Sampah + Koperasi integration
import { db } from './db'
import { toNumber } from './format'

// ==================== SESSION (mock) ====================
// Simple acting-pengguna resolution. Frontend passes x-acting-pengguna header or ?actingUser=
export async function getActingUser(req: Request): Promise<{ id: string; name: string; roles: string[] } | null> {
  const url = new URL(req.url)
  const headerId = req.headers.get('x-acting-pengguna')
  const queryId = url.searchParams.get('actingUser')
  const authHeader = req.headers.get('authorization')
  let id = headerId || queryId
  if (!id && authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    if (token.startsWith('mock-')) {
      const parts = token.split('-')
      if (parts.length >= 2) {
        id = parts[1]
      }
    } else {
      id = token
    }
  }
  if (!id) {
    // default to admin
    const admin = await db.pengguna.findFirst({ where: { OR: [{ email: 'admin@gmail.com' }, { email: 'admin@test.com' }, { email: 'admin@banksampah.com' }, { roles: { contains: 'admin' } }] } })
    if (admin) return { id: admin.id, name: admin.name, roles: JSON.parse(admin.roles || '[]') }
    return null
  }
  const u = await db.pengguna.findUnique({ where: { id } })
  if (!u) {
    const admin = await db.pengguna.findFirst({ where: { OR: [{ email: 'admin@gmail.com' }, { email: 'admin@test.com' }, { email: 'admin@banksampah.com' }, { roles: { contains: 'admin' } }] } })
    if (admin) return { id: admin.id, name: admin.name, roles: JSON.parse(admin.roles || '[]') }
    return null
  }
  return { id: u.id, name: u.name, roles: JSON.parse(u.roles || '[]') }
}

// ==================== BALANCE & POINTS ====================

export async function ensureBalance(penggunaId: string) {
  return db.saldo.upsert({
    where: { penggunaId },
    update: {},
    create: { penggunaId },
  })
}

// ==================== SALDO TERSEDIA (langsung可用) ====================
// Catatan: Sebelumnya ada "saldo tertahan" yang harus di-release admin dulu.
// Sekarang nabung langsung masuk ke saldo tersedia, tidak ada release step.
export async function creditSaldoTersedia(penggunaId: string, amount: number, sourceType: string, sourceId: string, description: string, createdById?: string) {
  if (amount <= 0) throw new Error('Jumlah kredit harus > 0')
  const saldo = await ensureBalance(penggunaId)
  const newSaldo = toNumber(saldo.saldoTersedia) + amount
  const [updated] = await Promise.all([
    db.saldo.update({ where: { penggunaId }, data: { saldoTersedia: newSaldo } }),
    db.riwayatSaldo.create({
      data: {
        penggunaId,
        bucket: 'saldo_tersedia',
        type: 'credit',
        amount,
        balanceAfter: newSaldo,
        sourceType,
        sourceId,
        description,
        createdById,
      },
    }),
  ])
  return updated
}

export async function debitSaldoTersedia(penggunaId: string, amount: number, sourceType: string, sourceId: string, description: string, createdById?: string) {
  if (amount <= 0) throw new Error('Jumlah debit harus > 0')
  const saldo = await ensureBalance(penggunaId)
  const newSaldo = toNumber(saldo.saldoTersedia) - amount
  if (newSaldo < 0) throw new Error('Saldo tersedia tidak mencukupi')
  const [updated] = await Promise.all([
    db.saldo.update({ where: { penggunaId }, data: { saldoTersedia: newSaldo } }),
    db.riwayatSaldo.create({
      data: {
        penggunaId,
        bucket: 'saldo_tersedia',
        type: 'debit',
        amount,
        balanceAfter: newSaldo,
        sourceType,
        sourceId,
        description,
        createdById,
      },
    }),
  ])
  return updated
}

// Backward-compat aliases (deprecated — use creditSaldoTersedia/debitSaldoTersedia instead)
export async function creditSaldoTertahan(penggunaId: string, amount: number, sourceType: string, sourceId: string, description: string, createdById?: string) {
  return creditSaldoTersedia(penggunaId, amount, sourceType, sourceId, description, createdById)
}

export async function debitSaldoTertahan(penggunaId: string, amount: number, sourceType: string, sourceId: string, description: string, createdById?: string) {
  return debitSaldoTersedia(penggunaId, amount, sourceType, sourceId, description, createdById)
}

export async function creditPoints(penggunaId: string, points: number, sourceType: string, sourceId: string, description: string, createdById?: string, aturanPoinId?: string) {
  if (points <= 0) throw new Error('Poin kredit harus > 0')
  const saldo = await ensureBalance(penggunaId)
  const newPoints = saldo.points + points
  const [updated] = await Promise.all([
    db.saldo.update({ where: { penggunaId }, data: { points: newPoints } }),
    db.riwayatPoin.create({
      data: {
        penggunaId,
        aturanPoinId,
        type: 'earn',
        points,
        balanceAfter: newPoints,
        sourceType,
        sourceId,
        description,
        createdById,
      },
    }),
  ])
  return updated
}

export async function debitPoints(penggunaId: string, points: number, type: string, sourceType: string, sourceId: string, description: string, createdById?: string) {
  if (points <= 0) throw new Error('Poin debit harus > 0')
  const saldo = await ensureBalance(penggunaId)
  if (saldo.points < points) throw new Error('Poin tidak mencukupi')
  const newPoints = saldo.points - points
  const [updated] = await Promise.all([
    db.saldo.update({ where: { penggunaId }, data: { points: newPoints } }),
    db.riwayatPoin.create({
      data: {
        penggunaId,
        type,
        points: -points,
        balanceAfter: newPoints,
        sourceType,
        sourceId,
        description,
        createdById,
      },
    }),
  ])
  return updated
}

export async function getActivePointRule() {
  const now = new Date()
  return db.aturanPoin.findFirst({
    where: { isActive: true, effectiveFrom: { lte: now } },
    orderBy: { effectiveFrom: 'desc' },
  })
}

// Calculate points from rupiah value using active rule
// ATURAN RESMI:
// Poin diperoleh = TOTAL NILAI TABUNGAN (Rp) ÷ NILAI RUPIAH PER 1 POIN
// Berat sampah (kg) BUKAN poin dan hanya untuk menghitung nilai rupiah sampah.
export async function calcPointsForRupiah(rupiah: number) {
  const rule = await getActivePointRule()
  if (!rule) {
    const defaultRupiahPerPoint = 1000
    return {
      points: Math.floor(Math.max(0, rupiah) / defaultRupiahPerPoint),
      rule: null,
      rupiahPerPointEarn: defaultRupiahPerPoint,
    }
  }

  // Tentukan nilai rupiah per 1 poin (konfigurasi dinamis admin):
  // 1. Prioritaskan rupiahPerPointEarn (cth. 1000, 2000, 500)
  // 2. Jika 0 / null, hitung dari 1 / pointsPerRupiah (cth. 1 / 0.001 = 1000)
  // 3. Fallback: 1000
  let rupiahPerPointEarn = toNumber((rule as any).rupiahPerPointEarn)
  if (!rupiahPerPointEarn || rupiahPerPointEarn <= 0) {
    const ppr = toNumber(rule.pointsPerRupiah)
    rupiahPerPointEarn = ppr > 0 ? Math.round(1 / ppr) : 1000
  }

  // FORMULA: TOTAL NILAI TABUNGAN ÷ NILAI RUPIAH PER 1 POIN
  const safeRupiah = Math.max(0, rupiah)
  const points = Math.floor(safeRupiah / rupiahPerPointEarn)

  return { points, rule, rupiahPerPointEarn }
}

// ==================== INVENTORY ====================

export async function addInventory(jenisSampahId: string, source: string, quantity: number, reason: string, sourceRefType: string, sourceRefId: string, createdById?: string, notes?: string) {
  if (quantity <= 0) throw new Error('Kuantitas inventaris harus > 0')
  const inv = await db.inventaris.upsert({
    where: { jenisSampahId_source: { jenisSampahId, source } },
    update: { stock: { increment: quantity } },
    create: { jenisSampahId, source, stock: quantity },
  })
  await db.pergerakanInventaris.create({
    data: {
      jenisSampahId,
      source,
      direction: 'in',
      reason,
      quantity,
      stockAfter: toNumber(inv.stock),
      sourceRefType,
      sourceRefId,
      notes,
      createdById,
    },
  })
  return inv
}

export async function reduceInventory(jenisSampahId: string, source: string, quantity: number, reason: string, sourceRefType: string, sourceRefId: string, createdById?: string, notes?: string) {
  if (quantity <= 0) throw new Error('Kuantitas inventaris harus > 0')
  const inv = await db.inventaris.findUnique({ where: { jenisSampahId_source: { jenisSampahId, source } } })
  if (!inv) throw new Error('Stok inventaris tidak ditemukan untuk item & source ini')
  const current = toNumber(inv.stock)
  if (current < quantity) throw new Error(`Stok tidak mencukupi. Tersedia ${current}, diminta ${quantity}`)
  const updated = await db.inventaris.update({
    where: { id: inv.id },
    data: { stock: { decrement: quantity } },
  })
  await db.pergerakanInventaris.create({
    data: {
      jenisSampahId,
      source,
      direction: 'out',
      reason,
      quantity,
      stockAfter: toNumber(updated.stock),
      sourceRefType,
      sourceRefId,
      notes,
      createdById,
    },
  })
  return updated
}

// ==================== PRODUCT STOCK ====================

export async function addProductStock(produkId: string, quantity: number, reason: string, sourceRefType: string, sourceRefId: string, createdById?: string, notes?: string) {
  if (quantity <= 0) throw new Error('Kuantitas produk harus > 0')
  const updated = await db.produk.update({
    where: { id: produkId },
    data: { stock: { increment: quantity } },
  })
  const movementNumber = await generateTxNo('MTP')
  await db.pergerakanProduk.create({
    data: {
      movementNumber,
      produkId,
      direction: 'in',
      reason,
      quantity,
      stockAfter: toNumber(updated.stock),
      sourceRefType,
      sourceRefId,
      notes,
      createdById,
    },
  })
  return updated
}

export async function reduceProductStock(produkId: string, quantity: number, reason: string, sourceRefType: string, sourceRefId: string, createdById?: string, notes?: string) {
  if (quantity <= 0) throw new Error('Kuantitas produk harus > 0')
  const produk = await db.produk.findUnique({ where: { id: produkId } })
  if (!produk) throw new Error('Produk tidak ditemukan')
  const current = toNumber(produk.stock)
  if (current < quantity) throw new Error(`Stok produk tidak mencukupi. Tersedia ${current}, diminta ${quantity}`)
  const updated = await db.produk.update({
    where: { id: produkId },
    data: { stock: { decrement: quantity } },
  })
  const movementNumber = await generateTxNo('MTP')
  await db.pergerakanProduk.create({
    data: {
      movementNumber,
      produkId,
      direction: 'out',
      reason,
      quantity,
      stockAfter: toNumber(updated.stock),
      sourceRefType,
      sourceRefId,
      notes,
      createdById,
    },
  })
  return updated
}

// ==================== KOPERASI: KAS ====================

export async function recordKasTx(
  sumber: string,
  tipe: 'masuk' | 'keluar',
  jumlah: number,
  keterangan: string,
  penggunaId?: string,
  nomorReferensi?: string,
  tanggalTransaksi?: Date
) {
  if (jumlah <= 0) throw new Error('Jumlah kas harus > 0')
  const validSumber = [
    'simpanan', 'penarikan', 'pinjaman', 'angsuran', 'denda',
    'saldo_awal', 'operasional', 'lainnya', 'administrasi', 'pendapatan_lain'
  ]
  if (!validSumber.includes(sumber)) {
    throw new Error(`Sumber kas tidak valid: ${sumber}`)
  }
  const nomorKas = await generateTxNo('KKS')
  return db.koperasiKasTransaksi.create({
    data: {
      nomorKas,
      sumber,
      tipe,
      jumlah,
      keterangan,
      penggunaId,
      nomorReferensi,
      ...(tanggalTransaksi ? { tanggalTransaksi } : {}),
    },
  })
}

export async function getKoperasiKasBalance(): Promise<number> {
  const masuk = await db.koperasiKasTransaksi.aggregate({ where: { tipe: 'masuk' }, _sum: { jumlah: true } })
  const keluar = await db.koperasiKasTransaksi.aggregate({ where: { tipe: 'keluar' }, _sum: { jumlah: true } })
  return toNumber(masuk._sum.jumlah) - toNumber(keluar._sum.jumlah)
}

// ==================== KOPERASI: SIMPANAN ====================

export async function getSimpananSaldo(anggotaId: string, jenis: string) {
  return db.koperasiSimpananSaldo.upsert({
    where: { koperasiAnggotaId_jenisSimpanan: { koperasiAnggotaId: anggotaId, jenisSimpanan: jenis } },
    update: {},
    create: { koperasiAnggotaId: anggotaId, jenisSimpanan: jenis, saldo: 0 },
  })
}

export async function setorSimpanan(
  anggotaId: string,
  jenis: 'pokok' | 'wajib' | 'sukarela',
  jumlah: number,
  penggunaId?: string,
  keterangan?: string,
  options?: { skipEmail?: boolean }
) {
  if (jumlah <= 0) throw new Error('Jumlah setor harus > 0')
  const setting = await db.koperasiSetting.findFirst()

  // Syarat mutlak: Simpanan Wajib & Sukarela hanya bisa dilakukan jika Simpanan Pokok sudah lunas
  if (jenis !== 'pokok') {
    const saldoPokok = await getSimpananSaldo(anggotaId, 'pokok')
    const saldoPokokVal = toNumber(saldoPokok.saldo)
    const minPokok = setting ? toNumber(setting.nominalSimpananPokok) : 50000
    if (saldoPokokVal <= 0 || (minPokok > 0 && saldoPokokVal < minPokok)) {
      throw new Error(
        `Anggota belum melunasi Simpanan Pokok. Pembayaran Simpanan Pokok (${minPokok > 0 ? 'Rp ' + minPokok.toLocaleString('id-ID') : 'Simpanan Pokok'}) wajib diselesaikan terlebih dahulu sebagai biaya registrasi/deposit.`,
      )
    }
  }

  if ((jenis === 'pokok' || jenis === 'wajib')) {
    if (!setting) throw new Error('Pengaturan koperasi belum dikonfigurasi. Hubungi admin.')
    const min = toNumber(jenis === 'pokok' ? setting.nominalSimpananPokok : setting.nominalSimpananWajib)
    if (jumlah < min) throw new Error(`Simpanan ${jenis} minimal ${min}`)
  }
  const saldo = await getSimpananSaldo(anggotaId, jenis)
  const saldoSebelum = toNumber(saldo.saldo)
  const saldoSesudah = saldoSebelum + jumlah
  const nomor = await generateTxNo('SP')
  const [tx] = await Promise.all([
    db.koperasiSimpananTransaksi.create({
      data: {
        nomorTransaksi: nomor,
        koperasiAnggotaId: anggotaId,
        jenisSimpanan: jenis,
        tipe: 'setor',
        jumlah,
        saldoSebelum,
        saldoSesudah,
        keterangan,
        penggunaId,
      },
    }),
    db.koperasiSimpananSaldo.update({
      where: { id: saldo.id },
      data: { saldo: saldoSesudah },
    }),
    recordKasTx('simpanan', 'masuk', jumlah, `Setor simpanan ${jenis} - ${nomor}`, penggunaId, nomor),
  ])

  // Send struk via email (hanya jika tidak di-skip oleh pemanggil seperti Teller Wizard)
  if (!options?.skipEmail) {
    try {
      const agt = await db.koperasiAnggota.findUnique({
        where: { id: anggotaId },
        select: {
          nama: true,
          nomorAnggota: true,
          tanggalBergabung: true,
          createdAt: true,
          penggunaId: true,
          pengguna: { select: { email: true } },
        },
      })
      if (agt?.pengguna?.email) {
        const { sendStrukEmail } = await import('@/lib/email')
        const fmtIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
        const nominalWajib = setting ? toNumber(setting.nominalSimpananWajib) : 10000
        const countMonths = (jenis === 'wajib' && nominalWajib > 0) ? Math.floor(jumlah / nominalWajib) : 1

        const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
        let periodeBulanStr = ''
        if (jenis === 'wajib' && nominalWajib > 0) {
          const startMonthIndex = Math.floor(saldoSebelum / nominalWajib)
          const joinDate = agt.tanggalBergabung ? new Date(agt.tanggalBergabung) : new Date(agt.createdAt || new Date())
          const joinYear = joinDate.getFullYear()
          const joinMonth = joinDate.getMonth() + 1

          const monthLabels: string[] = []
          for (let i = 0; i < countMonths; i++) {
            const idx = startMonthIndex + i
            const mYear = joinYear + Math.floor((joinMonth - 1 + idx) / 12)
            const mMonth = ((joinMonth - 1 + idx) % 12) + 1
            monthLabels.push(`${MONTHS_ID[mMonth - 1]} ${mYear}`)
          }
          periodeBulanStr = monthLabels.join(', ')
        }

        let html = `<div class="struk-header"><div class="icon">🏦</div><h2>Bank Sampah</h2><div class="sub">Sukamaju Sejahtera</div><div class="badge">STRUK SIMPANAN KOPERASI</div></div>`
        html += `<div class="struk-section"><div class="info-row"><span class="key">No. Transaksi</span><span class="val mono">${nomor}</span></div><div class="info-row"><span class="key">Tanggal</span><span class="val">${new Date().toLocaleString('id-ID')}</span></div><div class="info-row"><span class="key">Anggota</span><span class="val bold">${agt.nama}</span></div><div class="info-row"><span class="key">Kode</span><span class="val mono">${agt.nomorAnggota}</span></div><div class="info-row"><span class="key">Jenis</span><span class="val capitalize">Setor ${jenis}</span></div></div>`

        if (jenis === 'wajib') {
          html += `<div class="struk-section"><div class="summary-row highlight"><span class="key">Bulan yang Dibayar</span><span class="val bold" style="color:#065f46">${periodeBulanStr || keterangan || '-'}</span></div>`
          html += `<div class="summary-row"><span class="key">Jumlah Bulan Disetor</span><span class="val bold">${countMonths} Bulan (@ ${fmtIDR(nominalWajib)}/bln)</span></div>`
          html += `<div class="summary-row highlight"><span class="key">Total Nilai Setoran</span><span class="val bold">${fmtIDR(jumlah)}</span></div>`
        } else {
          html += `<div class="struk-section"><div class="summary-row"><span class="key">Jumlah</span><span class="val">${fmtIDR(jumlah)}</span></div>`
          if (keterangan) {
            html += `<div class="summary-row"><span class="key">Keterangan</span><span class="val">${keterangan}</span></div>`
          }
        }
        html += `<div class="summary-row"><span class="key">Saldo Sebelum</span><span class="val">${fmtIDR(saldoSebelum)}</span></div><div class="summary-row highlight"><span class="key">Saldo Sesudah</span><span class="val">${fmtIDR(saldoSesudah)}</span></div></div>`
        html += `<div class="struk-footer"><div class="thanks">Terima kasih atas setoran simpanan Anda</div></div>`

        let emailSubject = `Struk Simpanan ${nomor} — Total ${fmtIDR(jumlah)}`
        if (jenis === 'wajib') {
          emailSubject = countMonths > 1
            ? `Struk Simpanan Wajib ${nomor} (${countMonths} Bulan: ${periodeBulanStr}) — Total ${fmtIDR(jumlah)}`
            : `Struk Simpanan Wajib ${nomor} (Bulan ${periodeBulanStr}) — Total ${fmtIDR(jumlah)}`
        }

        await sendStrukEmail({ to: agt.pengguna.email, subject: emailSubject, strukHtml: html })
      }
    } catch (e) { console.error('[SP Struk Email] Error:', e) }
  }

  return tx
}

export async function tarikSimpananSukarela(
  anggotaId: string,
  jumlah: number,
  penggunaId?: string,
  keterangan?: string,
  options?: { skipEmail?: boolean }
) {
  if (jumlah <= 0) throw new Error('Jumlah tarik harus > 0')
  const setting = await db.koperasiSetting.findFirst()
  const saldoPokok = await getSimpananSaldo(anggotaId, 'pokok')
  const saldoPokokVal = toNumber(saldoPokok.saldo)
  const minPokok = setting ? toNumber(setting.nominalSimpananPokok) : 50000
  if (saldoPokokVal <= 0 || (minPokok > 0 && saldoPokokVal < minPokok)) {
    throw new Error('Anggota belum melunasi Simpanan Pokok.')
  }
  const saldo = await getSimpananSaldo(anggotaId, 'sukarela')
  const saldoSebelum = toNumber(saldo.saldo)
  if (saldoSebelum < jumlah) throw new Error('Saldo simpanan sukarela tidak mencukupi')
  const saldoSesudah = saldoSebelum - jumlah
  const nomor = await generateTxNo('TK')
  const [tx] = await Promise.all([
    db.koperasiSimpananTransaksi.create({
      data: {
        nomorTransaksi: nomor,
        koperasiAnggotaId: anggotaId,
        jenisSimpanan: 'sukarela',
        tipe: 'tarik',
        jumlah,
        saldoSebelum,
        saldoSesudah,
        keterangan,
        penggunaId,
      },
    }),
    db.koperasiSimpananSaldo.update({
      where: { id: saldo.id },
      data: { saldo: saldoSesudah },
    }),
    recordKasTx('penarikan', 'keluar', jumlah, `Tarik simpanan sukarela - ${nomor}`, penggunaId, nomor),
  ])

  // Send struk via email (hanya jika tidak di-skip)
  if (!options?.skipEmail) {
    try {
      const agt = await db.koperasiAnggota.findUnique({ where: { id: anggotaId }, select: { nama: true, nomorAnggota: true, penggunaId: true, pengguna: { select: { email: true } } } })
      if (agt?.pengguna?.email) {
        const { sendStrukEmail } = await import('@/lib/email')
        const fmtIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
        let html = `<div class="struk-header"><div class="icon">💰</div><h2>Bank Sampah</h2><div class="sub">Sukamaju Sejahtera</div><div class="badge">STRUK TARIK SIMPANAN SUKARELA</div></div>`
        html += `<div class="struk-section"><div class="info-row"><span class="key">No. Transaksi</span><span class="val mono">${nomor}</span></div><div class="info-row"><span class="key">Tanggal</span><span class="val">${new Date().toLocaleString('id-ID')}</span></div><div class="info-row"><span class="key">Anggota</span><span class="val bold">${agt.nama}</span></div><div class="info-row"><span class="key">Kode</span><span class="val mono">${agt.nomorAnggota}</span></div></div>`
        html += `<div class="struk-section"><div class="summary-row"><span class="key">Jumlah Tarik</span><span class="val">${fmtIDR(jumlah)}</span></div><div class="summary-row"><span class="key">Saldo Sebelum</span><span class="val">${fmtIDR(saldoSebelum)}</span></div><div class="summary-row highlight"><span class="key">Saldo Sesudah</span><span class="val">${fmtIDR(saldoSesudah)}</span></div></div>`
        html += `<div class="struk-footer"><div class="thanks">Terima kasih</div></div>`
        await sendStrukEmail({ to: agt.pengguna.email, subject: `Struk Tarik Simpanan ${nomor}`, strukHtml: html })
      }
    } catch (e) { console.error('[TK Struk Email] Error:', e) }
  }

  return tx
}

// ==================== KOPERASI: PINJAMAN & ANGSURAN ====================

// Anuitas-style flat: pokok = jumlah/tenor, bunga = (jumlah * sukuBunga% * tenor/12), admin = biayaAdminPerBulan
export function calcAngsuranSchedule(
  jumlahPinjaman: number,
  tenorBulan: number,
  sukuBungaPerTahun: number = 0,
  biayaAdminPerBulan: number = 0
) {
  if (tenorBulan <= 0) throw new Error('Tenor harus > 0')
  if (jumlahPinjaman <= 0) throw new Error('Jumlah pinjaman harus > 0')
  if (sukuBungaPerTahun < 0) throw new Error('Suku bunga tidak boleh negatif')
  const pokokPerBulan = Math.ceil((jumlahPinjaman / tenorBulan) / 1000) * 1000
  const bungaPerBulan = Math.ceil(((jumlahPinjaman * (sukuBungaPerTahun / 100)) / 12) / 1000) * 1000
  const adminPerBulan = Math.round(biayaAdminPerBulan || 0)
  const rawAngsuran = pokokPerBulan + bungaPerBulan + adminPerBulan
  const angsuranPerBulan = Math.ceil(rawAngsuran / 1000) * 1000
  const totalBunga = bungaPerBulan * tenorBulan
  const totalAdmin = adminPerBulan * tenorBulan
  const total = angsuranPerBulan * tenorBulan
  return { pokokPerBulan, bungaPerBulan, adminPerBulan, angsuranPerBulan, totalBunga, totalAdmin, total }
}

export async function cairkanPinjaman(pinjamanId: string, penggunaId?: string) {
  const pinjaman = await db.koperasiPinjaman.findUnique({ where: { id: pinjamanId } })
  if (!pinjaman) throw new Error('Pinjaman tidak ditemukan')
  if (pinjaman.status !== 'disetujui') throw new Error('Pinjaman harus berstatus disetujui untuk dicairkan')
  const jumlah = toNumber(pinjaman.jumlahPinjaman)
  const tenor = pinjaman.tenorBulan
  const setting = await db.koperasiSetting.findFirst()
  const sukuBunga = pinjaman.sukuBunga != null ? toNumber(pinjaman.sukuBunga) : (setting ? toNumber(setting.sukuBungaPinjaman) : 0)
  const biayaAdmin = pinjaman.biayaAdmin != null ? toNumber(pinjaman.biayaAdmin) : (setting ? toNumber(setting.biayaAdminPinjaman) : 0)
  const { angsuranPerBulan } = calcAngsuranSchedule(jumlah, tenor, sukuBunga, biayaAdmin)
  const updated = await db.koperasiPinjaman.update({
    where: { id: pinjamanId },
    data: {
      status: 'berjalan',
      tanggalPencairan: new Date(),
      sisaPinjaman: jumlah,
      angsuranPerBulan,
      sukuBunga,
      biayaAdmin,
    },
  })

  await recordKasTx('pinjaman', 'keluar', jumlah, `Pencairan pinjaman ${pinjaman.nomorPinjaman}`, penggunaId, pinjaman.nomorPinjaman)
  return updated
}

// Bayar angsuran - supports paying 1, N, or all remaining (lunas)
// jumlahAngsuran: number of installments to pay (default 1). If 'lunas', pay all remaining.
export async function bayarAngsuran(
  pinjamanId: string,
  penggunaId?: string,
  keterangan?: string,
  tanggalBayar?: Date,
  jumlahAngsuran?: number | 'lunas',
  options?: { skipEmail?: boolean }
) {
  const pinjaman = await db.koperasiPinjaman.findUnique({ where: { id: pinjamanId }, include: { angsurans: { orderBy: { angsuranKe: 'asc' } } } })
  if (!pinjaman) throw new Error('Pinjaman tidak ditemukan')
  if (pinjaman.status !== 'berjalan') throw new Error('Pinjaman tidak berjalan')

  const sudahBayar = pinjaman.angsurans.length
  const sisaAngsuran = pinjaman.tenorBulan - sudahBayar
  if (sisaAngsuran <= 0) throw new Error('Semua angsuran sudah lunas')

  // Determine how many to pay
  let count: number
  if (jumlahAngsuran === 'lunas') {
    count = sisaAngsuran
  } else {
    count = Math.max(1, Math.min(jumlahAngsuran || 1, sisaAngsuran))
  }

  const angsuranPerBulan = toNumber(pinjaman.angsuranPerBulan)
  const pokokPerBulan = Math.ceil((toNumber(pinjaman.jumlahPinjaman) / Math.max(1, pinjaman.tenorBulan)) / 1000) * 1000

  const results: any[] = []
  let currentSisa = toNumber(pinjaman.sisaPinjaman)
  const txDate = tanggalBayar || new Date()

  // Pay `count` installments in a loop
  for (let i = 0; i < count; i++) {
    const nextKe = sudahBayar + i + 1
    const newSisa = Math.max(0, currentSisa - pokokPerBulan)

    const nomorAngsuran = await generateTxNo('AGT')
    const angsuran = await db.koperasiPinjamanAngsuran.create({
      data: {
        nomorAngsuran,
        koperasiPinjamanId: pinjamanId,
        angsuranKe: nextKe,
        jumlahBayar: angsuranPerBulan,
        tanggalBayar: txDate,
        sisaPinjamanSetelah: newSisa,
        keterangan: `${keterangan || 'Pembayaran angsuran'}${count > 1 ? ` (angsuran ke-${nextKe})` : ''}`,
        penggunaId,
      },
    })

    // Record kas masuk per angsuran
    await recordKasTx('angsuran', 'masuk', angsuranPerBulan, `Angsuran ke-${nextKe} ${pinjaman.nomorPinjaman}`, penggunaId, pinjaman.nomorPinjaman)

    currentSisa = newSisa
    results.push(angsuran)
  }

  const updatedPinjaman = await db.koperasiPinjaman.update({
    where: { id: pinjamanId },
    data: { sisaPinjaman: currentSisa, status: currentSisa <= 0.01 ? 'lunas' : 'berjalan' },
  })

  // Hitung nama bulan untuk tiap angsuran yang dibayar
  const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  const baseDate = new Date(pinjaman.tanggalPencairan || pinjaman.tanggalPengajuan || pinjaman.createdAt || new Date())
  const baseYear = baseDate.getFullYear()
  const baseMonth = baseDate.getMonth() + 1

  const paidMonthsWithNames = results.map((r: any) => {
    const idx = r.angsuranKe - 1
    const mYear = baseYear + Math.floor((baseMonth - 1 + idx) / 12)
    const mMonth = ((baseMonth - 1 + idx) % 12) + 1
    return {
      angsuranKe: r.angsuranKe,
      monthLabel: `${MONTHS_ID[mMonth - 1]} ${mYear}`,
      jumlah: r.jumlahBayar,
      sisa: r.sisaPinjamanSetelah,
    }
  })
  const paidMonthsLabels = paidMonthsWithNames.map((p: any) => p.monthLabel)
  const periodeBulanAngsuranStr = paidMonthsLabels.join(', ')

  // Send struk via email to anggota (hanya 1 email akumulatif jika tidak di-skip)
  if (!options?.skipEmail) {
    try {
      const agt = await db.koperasiAnggota.findFirst({
        where: { pinjamans: { some: { id: pinjamanId } } },
        select: { nama: true, nomorAnggota: true, pengguna: { select: { email: true } } },
      })
      if (agt?.pengguna?.email) {
        const { sendStrukEmail } = await import('@/lib/email')
        const fmtIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
        const totalPaid = count * angsuranPerBulan
        let html = `<div class="struk-header"><div class="icon">💳</div><h2>Bank Sampah</h2><div class="sub">Sukamaju Sejahtera</div><div class="badge">STRUK PEMBAYARAN ANGSURAN</div></div>`
        html += `<div class="struk-section"><div class="info-row"><span class="key">No. Pinjaman</span><span class="val mono">${pinjaman.nomorPinjaman}</span></div><div class="info-row"><span class="key">Tanggal</span><span class="val">${new Date().toLocaleString('id-ID')}</span></div><div class="info-row"><span class="key">Anggota</span><span class="val bold">${agt.nama}</span></div><div class="info-row"><span class="key">Kode</span><span class="val mono">${agt.nomorAnggota}</span></div></div>`
        html += `<div class="struk-section"><div class="label">Detail Angsuran & Bulan Dibayar</div><table class="items-table"><thead><tr><th class="center">Angsuran</th><th>Periode Bulan</th><th class="right">Jumlah</th><th class="right">Sisa Pinjaman</th></tr></thead><tbody>`
        for (const p of paidMonthsWithNames) {
          html += `<tr><td class="center">Ke-${p.angsuranKe}</td><td><strong>${p.monthLabel}</strong></td><td class="right">${fmtIDR(toNumber(p.jumlah))}</td><td class="right">${fmtIDR(toNumber(p.sisa))}</td></tr>`
        }
        html += `</tbody></table></div>`
        html += `<div class="struk-section"><div class="summary-row highlight"><span class="key">Bulan yang Dibayar</span><span class="val bold" style="color:#065f46">${periodeBulanAngsuranStr}</span></div><div class="summary-row"><span class="key">Jumlah Angsuran Dibayar</span><span class="val bold">${count}x Pembayaran (Ke-${results[0]?.angsuranKe} s/d Ke-${results[results.length - 1]?.angsuranKe})</span></div><div class="summary-row highlight"><span class="key">Total Pembayaran</span><span class="val bold">${fmtIDR(totalPaid)}</span></div><div class="summary-row"><span class="key">Sisa Pinjaman</span><span class="val">${fmtIDR(currentSisa)}</span></div><div class="summary-row"><span class="key">Status Pinjaman</span><span class="val bold capitalize">${updatedPinjaman.status}</span></div></div>`
        html += `<div class="struk-footer"><div class="thanks">Terima kasih atas pembayaran angsuran Anda</div></div>`

        const emailSubject = count > 1
          ? `Struk Pembayaran Angsuran ${pinjaman.nomorPinjaman} (${count}x Angsuran: ${periodeBulanAngsuranStr}) — Total ${fmtIDR(totalPaid)}`
          : `Struk Pembayaran Angsuran ${pinjaman.nomorPinjaman} (Bulan ${periodeBulanAngsuranStr}) — Total ${fmtIDR(totalPaid)}`

        await sendStrukEmail({ to: agt.pengguna.email, subject: emailSubject, strukHtml: html })
      }
    } catch (e) { console.error('[AGT Struk Email] Error:', e) }
  }

  return {
    angsurans: results,
    pinjaman: updatedPinjaman,
    countPaid: count,
    totalPaid: count * angsuranPerBulan,
    sisaAngsuran: sisaAngsuran - count,
    isLunas: currentSisa <= 0.01,
    periodeBulan: periodeBulanAngsuranStr,
    paidMonths: paidMonthsLabels,
  }
}

// ==================== HELPERS: NUMBER GENERATORS ====================

export async function nextMemberCode(prefix = 'BS') {
  // Find the max existing number for this prefix to avoid collisions
  const allUsers = await db.pengguna.findMany({
    where: { memberCode: { startsWith: prefix } },
    select: { memberCode: true },
  })
  let maxNum = 0
  for (const u of allUsers) {
    if (!u.memberCode) continue
    const m = u.memberCode.replace(prefix, '').trim().match(/^0*(\d+)/)
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10))
  }
  const nextNum = maxNum + 1
  // Also sync the counter
  await db.penghitungKodeAnggota.upsert({
    where: { prefix },
    update: { lastNumber: nextNum },
    create: { prefix, lastNumber: nextNum },
  })
  return `${prefix}${String(nextNum).padStart(3, '0')}`
}

// Generate transaction codes: PREFIX / DDMMYYYY / XXX (slash separator, DDMMYYYY date)
// Special: INV uses MMYYYY → INV / 082026 / 001
// Special: PNJ uses global seq → PNJ / 0001
// Special: POS uses 4-digit seq → POS / 11082026 / 0001
// Also checks old dash-format (PREFIX-YYYYMMDD-XXX) for backward compatibility
// IMPORTANT: When a record is deleted, the next call will REUSE that number (gap-fill)

// In-memory counter for prefixes that have no dedicated DB column (KWT, BS)
const _txCounters: Record<string, number> = {}

// Find the smallest unused sequence number for a given prefix + pattern
// by scanning ALL existing records and finding the first gap
async function findFirstAvailableSeq(
  existingNumbers: string[],
  startFrom: number = 1
): Promise<number> {
  if (existingNumbers.length === 0) return startFrom
  const usedSeqs = new Set<number>()
  for (const num of existingNumbers) {
    // Extract last numeric portion after the last separator
    const m = num.match(/(\d+)\s*$/)
    if (m) usedSeqs.add(parseInt(m[1], 10))
  }
  // Find smallest unused sequence number starting from `startFrom`
  let seq = startFrom
  while (usedSeqs.has(seq)) seq++
  return seq
}

// Helper: collect all existing codes for a given prefix + date pattern from a model field
async function collectExistingCodes(
  model: any,
  field: string,
  pattern: string,
  oldPattern?: string
): Promise<string[]> {
  const results: string[] = []
  // New format
  const rows = await model.findMany({
    where: { [field]: { startsWith: pattern } },
    select: { [field]: true },
  }).catch(() => [])
  for (const r of rows) if (r?.[field]) results.push(r[field])
  // Old format (backward compat)
  if (oldPattern) {
    const oldRows = await model.findMany({
      where: { [field]: { startsWith: oldPattern } },
      select: { [field]: true },
    }).catch(() => [])
    for (const r of oldRows) if (r?.[field]) results.push(r[field])
  }
  return results
}

export async function generateTxNo(prefix: string): Promise<string> {
  const now = new Date()
  // DDMMYYYY format (e.g., 11082026 for 11 Aug 2026)
  const ddmmyyyy = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`
  // MMYYYY format for INV (e.g., 082026 for Aug 2026)
  const mmyyyy = `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`

  // INV uses MMYYYY, all others use DDMMYYYY
  const dateStr = prefix === 'INV' ? mmyyyy : ddmmyyyy
  const pattern = `${prefix} / ${dateStr} / `
  // Old format pattern for backward compat: "PREFIX-YYYYMMDD-"
  const oldYmd = dateStr.length === 8 ? `${dateStr.slice(4)}${dateStr.slice(2, 4)}${dateStr.slice(0, 2)}` : dateStr
  const oldPattern = `${prefix}-${oldYmd}-`

  // Collect existing codes for this prefix from the relevant model
  let existingCodes: string[] = []
  let seqWidth = 3 // default 3-digit (001, 002, ...)
  let useDate = true // most prefixes use date

  if (prefix === 'SP' || prefix === 'TK') {
    existingCodes = await collectExistingCodes(db.koperasiSimpananTransaksi, 'nomorTransaksi', pattern, oldPattern)
  } else if (prefix === 'WD') {
    existingCodes = await collectExistingCodes(db.permintaanPenarikan, 'receiptNo', pattern, oldPattern)
  } else if (prefix === 'PNJ') {
    // PNJ uses global seq without date: "PNJ / XXXX" (4-digit)
    existingCodes = await collectExistingCodes(db.koperasiPinjaman, 'nomorPinjaman', 'PNJ / ', 'PNJ-')
    seqWidth = 4
    useDate = false
  } else if (prefix === 'POS') {
    existingCodes = await collectExistingCodes(db.penjualanProduk, 'invoiceNumber', pattern, oldPattern)
    seqWidth = 4
  } else if (prefix === 'MTP') {
    existingCodes = await collectExistingCodes(db.pergerakanProduk, 'movementNumber', pattern, oldPattern)
  } else if (prefix === 'AGT') {
    existingCodes = await collectExistingCodes(db.koperasiPinjamanAngsuran, 'nomorAngsuran', pattern, oldPattern)
  } else if (prefix === 'KKS') {
    existingCodes = await collectExistingCodes(db.koperasiKasTransaksi, 'nomorKas', pattern, oldPattern)
  } else if (prefix === 'INV') {
    existingCodes = await collectExistingCodes(db.transaksiPenjualanMitra, 'invoiceNumber', pattern, oldPattern)
  } else if (prefix === 'KWT') {
    // KWT is stored in transaksiNabung.notes; check there if needed
    // For KWT, we just return next sequence based on in-memory counter (no DB check needed)
    const key = `KWT-${dateStr}`
    if (!_txCounters[key]) _txCounters[key] = 0
    _txCounters[key]++
    const kwtSeq = String(_txCounters[key]).padStart(5, '0')
    return `KWT / ${dateStr} / ${kwtSeq}`
  } else if (prefix === 'NB' || prefix === 'SD') {
    // NB and SD are not stored in a dedicated column; they are computed from savingTx.transactedAt + per-date count
    // We count existing transactions for this date — and reuse any gaps (e.g., if a record was deleted)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    const where = { transactedAt: { gte: startOfDay, lte: endOfDay } }
    const count = prefix === 'NB'
      ? await db.transaksiNabung.count({ where })
      : await db.transaksiSedekah.count({ where })
    // For NB/SD, the next sequence = count + 1 (since they are ordered by transactedAt)
    // If a record is deleted, count decreases, so next number will reuse the gap
    const seq = count + 1
    return `${prefix} / ${ddmmyyyy} / ${String(seq).padStart(5, '0')}`
  } else if (prefix === 'BS') {
    // BS = kode setor sampah keseluruhan (reserved for teller receipt grouping)
    const key = `BS-${dateStr}`
    if (!_txCounters[key]) _txCounters[key] = 0
    _txCounters[key]++
    const seq = String(_txCounters[key]).padStart(5, '0')
    return `BS / ${dateStr} / ${seq}`
  }

  // Find first available sequence number (reuses deleted numbers)
  const nextSeq = await findFirstAvailableSeq(existingCodes, 1)

  // PNJ: 4-digit, no date
  if (prefix === 'PNJ') {
    return `PNJ / ${String(nextSeq).padStart(seqWidth, '0')}`
  }

  // TKOFF / POS: 4-digit sequence with hyphens (e.g., TKOFF-20260310-0001)
  if (prefix === 'TKOFF' || prefix === 'POS') {
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const tkoffPattern = `TKOFF-${ymd}-`
    const sales = await db.penjualanProduk.findMany({
      where: { invoiceNumber: { startsWith: tkoffPattern } },
      select: { invoiceNumber: true },
    })
    const existingTkoffCodes = sales.map((s) => s.invoiceNumber || '')
    const nextSeq = await findFirstAvailableSeq(existingTkoffCodes, 1)
    return `TKOFF-${ymd}-${String(nextSeq).padStart(4, '0')}`
  }

  // Default: 3-digit sequence with slash separator
  return `${prefix} / ${dateStr} / ${String(nextSeq).padStart(seqWidth, '0')}`
}

// ==================== BANK SAMPAH KAS (Buku Kas Utama Institusi) ====================

export async function getBankSampahKasBalance(buku?: 'utama' | 'nasabah'): Promise<number> {
  const where = buku ? { buku } : {}
  const res = await db.kasBankSampah.aggregate({
    _sum: { jumlah: true },
    where: { ...where, tipe: 'masuk' },
  })
  const resOut = await db.kasBankSampah.aggregate({
    _sum: { jumlah: true },
    where: { ...where, tipe: 'keluar' },
  })
  return toNumber(res._sum.jumlah) - toNumber(resOut._sum.jumlah)
}

export async function recordBankSampahKas(
  tipe: 'masuk' | 'keluar',
  sumber: string,
  jumlah: number,
  keterangan: string,
  createdById?: string,
  links?: { withdrawalId?: string; salesTxId?: string; penjualanProdukId?: string },
  overrideBuku?: 'utama' | 'nasabah'
): Promise<{ saldoSetelah: number }> {
  // Tentukan buku berdasarkan sumber
  const buku = overrideBuku || ((sumber === 'penjualan_mitra' || sumber === 'penarikan_nasabah') ? 'nasabah' : 'utama')
  
  const kasBalance = await getBankSampahKasBalance(buku)
  const saldoSetelah = tipe === 'masuk' ? kasBalance + jumlah : kasBalance - jumlah
  await db.kasBankSampah.create({
    data: {
      buku,
      tipe,
      sumber,
      jumlah,
      saldoSetelah,
      keterangan,
      createdById,
      withdrawalId: links?.withdrawalId,
      salesTxId: links?.salesTxId,
      penjualanProdukId: links?.penjualanProdukId,
    },
  })
  return { saldoSetelah }
}



// Total saldo tertahan across all nasabah (what institution "owes" to nasabah)
export async function getTotalSaldoTertahan(): Promise<number> {
  const agg = await db.saldo.aggregate({ _sum: { saldoTertahan: true } })
  return toNumber(agg._sum.saldoTertahan)
}

// Total saldo tersedia across all nasabah (liquid, ready to withdraw)
export async function getTotalSaldoTersedia(): Promise<number> {
  const agg = await db.saldo.aggregate({ _sum: { saldoTersedia: true } })
  return toNumber(agg._sum.saldoTersedia)
}

// ==================== RELEASE SALDO (saldoTertahan → saldoTersedia) ====================

// Release saldo tertahan → saldo tersedia for a nasabah
// Validation (prinsip kehati-hatian): kas institusi must be >= total saldo tersedia + amount being released
// (because saldo tersedia is a promise to pay cash on demand)
export async function releaseSaldo(penggunaId: string, amount: number, releasedById?: string, keterangan?: string) {
  if (amount <= 0) throw new Error('Nominal release harus > 0')
  const saldo = await ensureBalance(penggunaId)
  const saldoTertahan = toNumber(saldo.saldoTertahan)
  if (saldoTertahan < amount) throw new Error(`Saldo tertahan tidak mencukupi. Tersedia: ${saldoTertahan}, diminta: ${amount}`)

  // Prinsip kehati-hatian: kas nasabah must cover all saldo tersedia + this release
  const kasSaldo = await getBankSampahKasBalance('nasabah')
  const totalTersedia = await getTotalSaldoTersedia()
  const required = totalTersedia + amount
  if (kasSaldo < required) {
    throw new Error(`Buku Kas Nasabah (Rp ${kasSaldo}) tidak cukup untuk menjamin likuiditas. Dibutuhkan minimal Rp ${required} (saldo tersedia existing + release ini). Lakukan penjualan sampah ke mitra terlebih dahulu.`)
  }

  const saldoTersediaSebelum = toNumber(saldo.saldoTersedia)
  const saldoTertahanSesudah = saldoTertahan - amount
  const saldoTersediaSesudah = saldoTersediaSebelum + amount

  const [updated] = await Promise.all([
    db.saldo.update({
      where: { penggunaId },
      data: { saldoTertahan: saldoTertahanSesudah, saldoTersedia: saldoTersediaSesudah },
    }),
    db.riwayatSaldo.create({
      data: {
        penggunaId,
        bucket: 'saldo_tertahan',
        type: 'debit',
        amount,
        balanceAfter: saldoTertahanSesudah,
        sourceType: 'balance_release',
        sourceId: null,
        description: `Release saldo ke tersedia`,
        createdById: releasedById,
      },
    }),
    db.riwayatSaldo.create({
      data: {
        penggunaId,
        bucket: 'saldo_tersedia',
        type: 'credit',
        amount,
        balanceAfter: saldoTersediaSesudah,
        sourceType: 'balance_release',
        sourceId: null,
        description: `Release saldo dari tertahan`,
        createdById: releasedById,
      },
    }),
    db.pelepasanSaldo.create({
      data: {
        penggunaId,
        amount,
        saldoTertahanSebelum: saldoTertahan,
        saldoTertahanSesudah,
        saldoTersediaSebelum,
        saldoTersediaSesudah,
        keterangan: keterangan || 'Release saldo oleh admin',
        kasSaldoSnapshot: kasSaldo,
        totalTertahanSnapshot: await getTotalSaldoTertahan(),
        releasedById,
      },
    }),
  ])
  return { saldo: updated, saldoTertahanSesudah, saldoTersediaSesudah, kasSaldoSnapshot: kasSaldo }
}

// ==================== PENARIKAN (Withdrawal from saldoTersedia) ====================

// Execute withdrawal: validate saldoTersedia real-time, cut saldo, record kas keluar + receipt
export async function executeWithdrawal(
  penggunaId: string,
  amount: number,
  method: string,
  notes: string,
  processedById?: string,
  bankInfo?: { bankName?: string; accountNumber?: string; accountName?: string }
) {
  if (amount <= 0) throw new Error('Nominal penarikan harus > 0')
  const saldo = await ensureBalance(penggunaId)
  const saldoTersedia = toNumber(saldo.saldoTersedia)
  if (saldoTersedia < amount) {
    throw new Error(`Saldo tersedia tidak mencukupi. Saldo tersedia: Rp ${saldoTersedia}, diminta: Rp ${amount}.`)
  }

  // Kas institusi must have the cash
  const kasSaldo = await getBankSampahKasBalance('nasabah')
  if (kasSaldo < amount) {
    throw new Error(`Buku Kas Nasabah (Rp ${kasSaldo}) tidak cukup untuk penarikan Rp ${amount}. Tunggu hasil penjualan ke mitra.`)
  }

  const saldoTersediaSesudah = saldoTersedia - amount
  const receiptNo = await generateTxNo('WD')

  const [withdrawal, ,] = await Promise.all([
    db.permintaanPenarikan.create({
      data: {
        penggunaId,
        amount,
        method,
        bankName: bankInfo?.bankName,
        accountNumber: bankInfo?.accountNumber,
        accountName: bankInfo?.accountName,
        notes,
        status: 'sukses',
        receiptNo,
        processedById,
        processedAt: new Date(),
      },
    }),
    db.saldo.update({
      where: { penggunaId },
      data: { saldoTersedia: saldoTersediaSesudah },
    }),
    db.riwayatSaldo.create({
      data: {
        penggunaId,
        bucket: 'saldo_tersedia',
        type: 'debit',
        amount,
        balanceAfter: saldoTersediaSesudah,
        sourceType: 'withdrawal',
        sourceId: null,
        description: `Penarikan tunai ${receiptNo}`,
        createdById: processedById,
      },
    }),
  ])

  // Record kas keluar in Buku Kas Utama institusi (Cash Outward)
  await recordBankSampahKas('keluar', 'penarikan_nasabah', amount, `Penarikan nasabah ${receiptNo}`, processedById, { withdrawalId: withdrawal.id })

  // Send struk via email
  try {
    const pengguna = await db.pengguna.findUnique({ where: { id: penggunaId }, select: { email: true, name: true, memberCode: true } })
    if (pengguna?.email) {
      const { sendStrukEmail } = await import('@/lib/email')
      const fmtIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
      let html = `<div class="struk-header"><div class="icon">💸</div><h2>Bank Sampah</h2><div class="sub">Sukamaju Sejahtera</div><div class="badge">STRUK PENARIKAN SALDO</div></div>`
      html += `<div class="struk-section"><div class="info-row"><span class="key">No. Transaksi</span><span class="val mono">${receiptNo}</span></div><div class="info-row"><span class="key">Tanggal</span><span class="val">${new Date().toLocaleString('id-ID')}</span></div><div class="info-row"><span class="key">Nasabah</span><span class="val bold">${pengguna.name}</span></div><div class="info-row"><span class="key">Kode</span><span class="val mono">${pengguna.memberCode || '-'}</span></div><div class="info-row"><span class="key">Metode</span><span class="val capitalize">${method}</span></div></div>`
      html += `<div class="struk-section"><div class="summary-row highlight"><span class="key">Nominal</span><span class="val">${fmtIDR(amount)}</span></div><div class="summary-row"><span class="key">Saldo Tersedia</span><span class="val">${fmtIDR(saldoTersediaSesudah)}</span></div></div>`
      html += `<div class="struk-footer"><div class="thanks">Terima kasih</div></div>`
      await sendStrukEmail({ to: pengguna.email, subject: `Struk Penarikan Saldo ${receiptNo}`, strukHtml: html })
    }
  } catch (e) { console.error('[WD Struk Email] Error:', e) }

  return { withdrawal, saldoTersediaSesudah, receiptNo, kasSaldoSesudah: kasSaldo - amount }
}

// ==================== AUTO-EXPIRE ONLINE ORDERS ====================
export async function expirePendingOnlineOrders() {
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000)
  
  const expiredOrders = await db.pesananToko.findMany({
    where: {
      paymentMethod: "midtrans",
      paymentStatus: "menunggu",
      createdAt: { lt: thirtyMinsAgo }
    },
    include: { items: true }
  })

  if (expiredOrders.length === 0) return 0

  for (const order of expiredOrders) {
    await db.pesananToko.update({
      where: { id: order.id },
      data: {
        orderStatus: "dibatalkan",
        paymentStatus: "expired",
        notes: "Pembayaran expired (tidak dibayar dalam waktu 30 menit)"
      }
    })

    // Release reserved stock
    for (const item of order.items) {
      await addProductStock(
        item.produkId,
        Number(item.quantity),
        "online_release",
        "toko_order",
        order.id,
        undefined,
        `Pembatalan otomatis pesanan ${order.orderNumber} karena expired`
      )
    }
  }

  return expiredOrders.length
}

// ==================== KOPERASI: ANGGOTA KELUAR ====================

export async function prosesAnggotaKeluar(anggotaId: string, penggunaId?: string) {
  const anggota = await db.koperasiAnggota.findUnique({
    where: { id: anggotaId },
    include: {
      simpananSaldos: true,
      pinjamans: {
        where: { status: { in: ['berjalan', 'menunggu_persetujuan'] } }
      }
    }
  })

  if (!anggota) throw new Error('Anggota tidak ditemukan')
  if (anggota.status === 'keluar') throw new Error('Anggota sudah berstatus keluar')

  // 1. Cek pinjaman aktif
  if (anggota.pinjamans.length > 0) {
    throw new Error('Anggota masih memiliki pinjaman berjalan atau menunggu persetujuan. Lunasi pinjaman terlebih dahulu sebelum keluar.')
  }

  // 2. Hitung total simpanan & catat transaksi tarik untuk tiap simpanan
  let totalSimpanan = 0
  const simpananUpdates: any[] = []
  const txDate = new Date()

  for (const saldo of anggota.simpananSaldos) {
    const val = toNumber(saldo.saldo)
    if (val > 0) {
      totalSimpanan += val
      // Buat nomor transaksi per simpanan
      const nomor = await generateTxNo('TK')
      simpananUpdates.push(
        db.koperasiSimpananTransaksi.create({
          data: {
            nomorTransaksi: nomor,
            koperasiAnggotaId: anggotaId,
            jenisSimpanan: saldo.jenisSimpanan,
            tipe: 'tarik',
            jumlah: val,
            saldoSebelum: val,
            saldoSesudah: 0,
            keterangan: 'Penarikan dana karena anggota keluar',
            penggunaId,
            tanggalTransaksi: txDate
          }
        }),
        db.koperasiSimpananSaldo.update({
          where: { id: saldo.id },
          data: { saldo: 0 }
        })
      )
    }
  }

  // 3. Catat di KoperasiAnggotaKeluar & update status
  const outRecord = db.koperasiAnggotaKeluar.create({
    data: {
      koperasiAnggotaId: anggotaId,
      totalSimpanan: totalSimpanan,
      sisaPinjaman: 0, // Karena kita sudah tolak jika ada pinjaman
      danaDikembalikan: totalSimpanan,
      tanggalKeluar: txDate,
      keterangan: 'Keluar mandiri / dihapus',
      penggunaId
    }
  })

  const updateStatus = db.koperasiAnggota.update({
    where: { id: anggotaId },
    data: { status: 'keluar', tanggalKeluar: txDate }
  })

  // 4. Catat pengeluaran di Kas Koperasi jika total > 0
  if (totalSimpanan > 0) {
    await db.$transaction([
      ...simpananUpdates,
      outRecord,
      updateStatus
    ])
    await recordKasTx('penarikan', 'keluar', totalSimpanan, `Pengembalian dana anggota keluar - ${anggota.nomorAnggota || anggotaId}`, penggunaId, 'KELUAR')
  } else {
    await db.$transaction([outRecord, updateStatus])
  }

  return true
}
