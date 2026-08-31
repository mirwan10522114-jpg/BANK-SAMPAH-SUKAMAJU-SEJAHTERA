// Core business logic for Bank Sampah + Koperasi integration
import { db } from './db'
import { toNumber } from './format'

// ==================== SESSION (mock) ====================
// Simple acting-user resolution. Frontend passes x-acting-user header or ?actingUser=
export async function getActingUser(req: Request): Promise<{ id: string; name: string; roles: string[] } | null> {
  const url = new URL(req.url)
  const headerId = req.headers.get('x-acting-user')
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
    const admin = await db.user.findFirst({ where: { OR: [{ email: 'admin@gmail.com' }, { email: 'admin@test.com' }] } })
    if (admin) return { id: admin.id, name: admin.name, roles: JSON.parse(admin.roles || '[]') }
    return null
  }
  const u = await db.user.findUnique({ where: { id } })
  if (!u) {
    const admin = await db.user.findFirst({ where: { OR: [{ email: 'admin@gmail.com' }, { email: 'admin@test.com' }] } })
    if (admin) return { id: admin.id, name: admin.name, roles: JSON.parse(admin.roles || '[]') }
    return null
  }
  return { id: u.id, name: u.name, roles: JSON.parse(u.roles || '[]') }
}

// ==================== BALANCE & POINTS ====================

export async function ensureBalance(userId: string) {
  return db.balance.upsert({
    where: { userId },
    update: {},
    create: { userId },
  })
}

// ==================== SALDO TERSEDIA (langsung可用) ====================
// Catatan: Sebelumnya ada "saldo tertahan" yang harus di-release admin dulu.
// Sekarang nabung langsung masuk ke saldo tersedia, tidak ada release step.
export async function creditSaldoTersedia(userId: string, amount: number, sourceType: string, sourceId: string, description: string, createdById?: string) {
  if (amount <= 0) throw new Error('Jumlah kredit harus > 0')
  const balance = await ensureBalance(userId)
  const newSaldo = toNumber(balance.saldoTersedia) + amount
  const [updated] = await Promise.all([
    db.balance.update({ where: { userId }, data: { saldoTersedia: newSaldo } }),
    db.balanceHistory.create({
      data: {
        userId,
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

export async function debitSaldoTersedia(userId: string, amount: number, sourceType: string, sourceId: string, description: string, createdById?: string) {
  if (amount <= 0) throw new Error('Jumlah debit harus > 0')
  const balance = await ensureBalance(userId)
  const newSaldo = toNumber(balance.saldoTersedia) - amount
  if (newSaldo < 0) throw new Error('Saldo tersedia tidak mencukupi')
  const [updated] = await Promise.all([
    db.balance.update({ where: { userId }, data: { saldoTersedia: newSaldo } }),
    db.balanceHistory.create({
      data: {
        userId,
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
export async function creditSaldoTertahan(userId: string, amount: number, sourceType: string, sourceId: string, description: string, createdById?: string) {
  return creditSaldoTersedia(userId, amount, sourceType, sourceId, description, createdById)
}

export async function debitSaldoTertahan(userId: string, amount: number, sourceType: string, sourceId: string, description: string, createdById?: string) {
  return debitSaldoTersedia(userId, amount, sourceType, sourceId, description, createdById)
}

export async function creditPoints(userId: string, points: number, sourceType: string, sourceId: string, description: string, createdById?: string, pointRuleId?: string) {
  if (points <= 0) throw new Error('Poin kredit harus > 0')
  const balance = await ensureBalance(userId)
  const newPoints = balance.points + points
  const [updated] = await Promise.all([
    db.balance.update({ where: { userId }, data: { points: newPoints } }),
    db.pointHistory.create({
      data: {
        userId,
        pointRuleId,
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

export async function debitPoints(userId: string, points: number, type: string, sourceType: string, sourceId: string, description: string, createdById?: string) {
  if (points <= 0) throw new Error('Poin debit harus > 0')
  const balance = await ensureBalance(userId)
  if (balance.points < points) throw new Error('Poin tidak mencukupi')
  const newPoints = balance.points - points
  const [updated] = await Promise.all([
    db.balance.update({ where: { userId }, data: { points: newPoints } }),
    db.pointHistory.create({
      data: {
        userId,
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
  return db.pointRule.findFirst({
    where: { isActive: true, effectiveFrom: { lte: now } },
    orderBy: { effectiveFrom: 'desc' },
  })
}

// Calculate points from rupiah value using active rule
export async function calcPointsForRupiah(rupiah: number) {
  const rule = await getActivePointRule()
  if (!rule) return { points: 0, rule: null }
  const rate = toNumber(rule.pointsPerRupiah)
  return { points: Math.floor(rupiah * rate), rule }
}

// ==================== INVENTORY ====================

export async function addInventory(wasteItemId: string, source: string, quantity: number, reason: string, sourceRefType: string, sourceRefId: string, createdById?: string, notes?: string) {
  if (quantity <= 0) throw new Error('Kuantitas inventaris harus > 0')
  const inv = await db.inventory.upsert({
    where: { wasteItemId_source: { wasteItemId, source } },
    update: { stock: { increment: quantity } },
    create: { wasteItemId, source, stock: quantity },
  })
  await db.inventoryMovement.create({
    data: {
      wasteItemId,
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

export async function reduceInventory(wasteItemId: string, source: string, quantity: number, reason: string, sourceRefType: string, sourceRefId: string, createdById?: string, notes?: string) {
  if (quantity <= 0) throw new Error('Kuantitas inventaris harus > 0')
  const inv = await db.inventory.findUnique({ where: { wasteItemId_source: { wasteItemId, source } } })
  if (!inv) throw new Error('Stok inventaris tidak ditemukan untuk item & source ini')
  const current = toNumber(inv.stock)
  if (current < quantity) throw new Error(`Stok tidak mencukupi. Tersedia ${current}, diminta ${quantity}`)
  const updated = await db.inventory.update({
    where: { id: inv.id },
    data: { stock: { decrement: quantity } },
  })
  await db.inventoryMovement.create({
    data: {
      wasteItemId,
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

export async function addProductStock(productId: string, quantity: number, reason: string, sourceRefType: string, sourceRefId: string, createdById?: string, notes?: string) {
  if (quantity <= 0) throw new Error('Kuantitas produk harus > 0')
  const updated = await db.product.update({
    where: { id: productId },
    data: { stock: { increment: quantity } },
  })
  const movementNumber = await generateTxNo('MTP')
  await db.productMovement.create({
    data: {
      movementNumber,
      productId,
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

export async function reduceProductStock(productId: string, quantity: number, reason: string, sourceRefType: string, sourceRefId: string, createdById?: string, notes?: string) {
  if (quantity <= 0) throw new Error('Kuantitas produk harus > 0')
  const product = await db.product.findUnique({ where: { id: productId } })
  if (!product) throw new Error('Produk tidak ditemukan')
  const current = toNumber(product.stock)
  if (current < quantity) throw new Error(`Stok produk tidak mencukupi. Tersedia ${current}, diminta ${quantity}`)
  const updated = await db.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  })
  const movementNumber = await generateTxNo('MTP')
  await db.productMovement.create({
    data: {
      movementNumber,
      productId,
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

export async function recordKasTx(sumber: string, tipe: 'masuk' | 'keluar', jumlah: number, keterangan: string, userId?: string, nomorReferensi?: string) {
  if (jumlah <= 0) throw new Error('Jumlah kas harus > 0')
  if (!['simpanan', 'penarikan', 'pinjaman', 'angsuran', 'denda', 'saldo_awal'].includes(sumber)) {
    throw new Error(`Sumber kas tidak valid: ${sumber}`)
  }
  const nomorKas = await generateTxNo('KKS')
  return db.koperasiKasTransaksi.create({
    data: { nomorKas, sumber, tipe, jumlah, keterangan, userId, nomorReferensi },
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

export async function setorSimpanan(anggotaId: string, jenis: 'pokok' | 'wajib' | 'sukarela', jumlah: number, userId?: string, keterangan?: string) {
  if (jumlah <= 0) throw new Error('Jumlah setor harus > 0')
  const setting = await db.koperasiSetting.findFirst()
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
        userId,
      },
    }),
    db.koperasiSimpananSaldo.update({
      where: { id: saldo.id },
      data: { saldo: saldoSesudah },
    }),
    recordKasTx('simpanan', 'masuk', jumlah, `Setor simpanan ${jenis} - ${nomor}`, userId, nomor),
  ])

  // Send struk via email
  try {
    const agt = await db.koperasiAnggota.findUnique({ where: { id: anggotaId }, select: { nama: true, nomorAnggota: true, userId: true, user: { select: { email: true } } } })
    if (agt?.user?.email) {
      const { sendStrukEmail } = await import('@/lib/email')
      const fmtIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
      let html = `<div class="struk-header"><div class="icon">🏦</div><h2>Bank Sampah</h2><div class="sub">Sukamaju Sejahtera</div><div class="badge">STRUK SIMPANAN KOPERASI</div></div>`
      html += `<div class="struk-section"><div class="info-row"><span class="key">No. Transaksi</span><span class="val mono">${nomor}</span></div><div class="info-row"><span class="key">Tanggal</span><span class="val">${new Date().toLocaleString('id-ID')}</span></div><div class="info-row"><span class="key">Anggota</span><span class="val bold">${agt.nama}</span></div><div class="info-row"><span class="key">Kode</span><span class="val mono">${agt.nomorAnggota}</span></div><div class="info-row"><span class="key">Jenis</span><span class="val capitalize">Setor ${jenis}</span></div></div>`
      html += `<div class="struk-section"><div class="summary-row"><span class="key">Jumlah</span><span class="val">${fmtIDR(jumlah)}</span></div><div class="summary-row"><span class="key">Saldo Sebelum</span><span class="val">${fmtIDR(saldoSebelum)}</span></div><div class="summary-row highlight"><span class="key">Saldo Sesudah</span><span class="val">${fmtIDR(saldoSesudah)}</span></div></div>`
      html += `<div class="struk-footer"><div class="thanks">Terima kasih</div></div>`
      await sendStrukEmail({ to: agt.user.email, subject: `Struk Simpanan ${nomor}`, strukHtml: html })
    }
  } catch (e) { console.error('[SP Struk Email] Error:', e) }

  return tx
}

export async function tarikSimpananSukarela(anggotaId: string, jumlah: number, userId?: string, keterangan?: string) {
  if (jumlah <= 0) throw new Error('Jumlah tarik harus > 0')
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
        userId,
      },
    }),
    db.koperasiSimpananSaldo.update({
      where: { id: saldo.id },
      data: { saldo: saldoSesudah },
    }),
    recordKasTx('penarikan', 'keluar', jumlah, `Tarik simpanan sukarela - ${nomor}`, userId, nomor),
  ])

  // Send struk via email
  try {
    const agt = await db.koperasiAnggota.findUnique({ where: { id: anggotaId }, select: { nama: true, nomorAnggota: true, userId: true, user: { select: { email: true } } } })
    if (agt?.user?.email) {
      const { sendStrukEmail } = await import('@/lib/email')
      const fmtIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
      let html = `<div class="struk-header"><div class="icon">💰</div><h2>Bank Sampah</h2><div class="sub">Sukamaju Sejahtera</div><div class="badge">STRUK TARIK SIMPANAN SUKARELA</div></div>`
      html += `<div class="struk-section"><div class="info-row"><span class="key">No. Transaksi</span><span class="val mono">${nomor}</span></div><div class="info-row"><span class="key">Tanggal</span><span class="val">${new Date().toLocaleString('id-ID')}</span></div><div class="info-row"><span class="key">Anggota</span><span class="val bold">${agt.nama}</span></div><div class="info-row"><span class="key">Kode</span><span class="val mono">${agt.nomorAnggota}</span></div></div>`
      html += `<div class="struk-section"><div class="summary-row"><span class="key">Jumlah Tarik</span><span class="val">${fmtIDR(jumlah)}</span></div><div class="summary-row"><span class="key">Saldo Sebelum</span><span class="val">${fmtIDR(saldoSebelum)}</span></div><div class="summary-row highlight"><span class="key">Saldo Sesudah</span><span class="val">${fmtIDR(saldoSesudah)}</span></div></div>`
      html += `<div class="struk-footer"><div class="thanks">Terima kasih</div></div>`
      await sendStrukEmail({ to: agt.user.email, subject: `Struk Tarik Simpanan ${nomor}`, strukHtml: html })
    }
  } catch (e) { console.error('[TK Struk Email] Error:', e) }

  return tx
}

// ==================== KOPERASI: PINJAMAN & ANGSURAN ====================

// Anuitas-style flat: pokok = jumlah/tenor, bunga = (jumlah * sukuBunga% * tenor/12)
export function calcAngsuranSchedule(jumlahPinjaman: number, tenorBulan: number, sukuBungaPerTahun: number) {
  if (tenorBulan <= 0) throw new Error('Tenor harus > 0')
  if (jumlahPinjaman <= 0) throw new Error('Jumlah pinjaman harus > 0')
  if (sukuBungaPerTahun < 0) throw new Error('Suku bunga tidak boleh negatif')
  const pokokPerBulan = jumlahPinjaman / tenorBulan
  const bungaPerBulan = (jumlahPinjaman * (sukuBungaPerTahun / 100)) / 12
  const angsuranPerBulan = pokokPerBulan + bungaPerBulan
  const totalBunga = bungaPerBulan * tenorBulan
  const total = angsuranPerBulan * tenorBulan
  return { pokokPerBulan, bungaPerBulan, angsuranPerBulan, totalBunga, total }
}

export async function cairkanPinjaman(pinjamanId: string, userId?: string) {
  const pinjaman = await db.koperasiPinjaman.findUnique({ where: { id: pinjamanId } })
  if (!pinjaman) throw new Error('Pinjaman tidak ditemukan')
  if (pinjaman.status !== 'disetujui') throw new Error('Pinjaman harus berstatus disetujui untuk dicairkan')
  const jumlah = toNumber(pinjaman.jumlahPinjaman)
  const tenor = pinjaman.tenorBulan
  const sukuBunga = pinjaman.sukuBunga != null ? toNumber(pinjaman.sukuBunga) : (setting ? toNumber(setting.sukuBungaPinjaman) : 0)
  const { angsuranPerBulan } = calcAngsuranSchedule(jumlah, tenor, sukuBunga)
  const updated = await db.koperasiPinjaman.update({
    where: { id: pinjamanId },
    data: {
      status: 'berjalan',
      tanggalPencairan: new Date(),
      sisaPinjaman: jumlah,
      angsuranPerBulan,
      sukuBunga,
    },
  })

  await recordKasTx('pinjaman', 'keluar', jumlah, `Pencairan pinjaman ${pinjaman.nomorPinjaman}`, userId, pinjaman.nomorPinjaman)
  return updated
}

// Bayar angsuran - supports paying 1, N, or all remaining (lunas)
// jumlahAngsuran: number of installments to pay (default 1). If 'lunas', pay all remaining.
export async function bayarAngsuran(
  pinjamanId: string,
  userId?: string,
  keterangan?: string,
  tanggalBayar?: Date,
  jumlahAngsuran?: number | 'lunas'
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
  const bungaPerBulan = (toNumber(pinjaman.jumlahPinjaman) * (toNumber(pinjaman.sukuBunga) / 100)) / 12
  const pokokPerBulan = angsuranPerBulan - bungaPerBulan

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
        userId,
      },
    })

    // Record kas masuk per angsuran
    await recordKasTx('angsuran', 'masuk', angsuranPerBulan, `Angsuran ke-${nextKe} ${pinjaman.nomorPinjaman}`, userId, pinjaman.nomorPinjaman)

    currentSisa = newSisa
    results.push(angsuran)
  }

  const updatedPinjaman = await db.koperasiPinjaman.update({
    where: { id: pinjamanId },
    data: { sisaPinjaman: currentSisa, status: currentSisa <= 0.01 ? 'lunas' : 'berjalan' },
  })

  // Send struk via email to anggota
  try {
    const agt = await db.koperasiAnggota.findFirst({
      where: { pinjamans: { some: { id: pinjamanId } } },
      select: { nama: true, nomorAnggota: true, user: { select: { email: true } } },
    })
    if (agt?.user?.email) {
      const { sendStrukEmail } = await import('@/lib/email')
      const fmtIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
      const totalPaid = count * angsuranPerBulan
      let html = `<div class="struk-header"><div class="icon">💳</div><h2>Bank Sampah</h2><div class="sub">Sukamaju Sejahtera</div><div class="badge">STRUK PEMBAYARAN ANGSURAN</div></div>`
      html += `<div class="struk-section"><div class="info-row"><span class="key">No. Pinjaman</span><span class="val mono">${pinjaman.nomorPinjaman}</span></div><div class="info-row"><span class="key">Tanggal</span><span class="val">${new Date().toLocaleString('id-ID')}</span></div><div class="info-row"><span class="key">Anggota</span><span class="val bold">${agt.nama}</span></div><div class="info-row"><span class="key">Kode</span><span class="val mono">${agt.nomorAnggota}</span></div></div>`
      html += `<div class="struk-section"><div class="label">Detail Angsuran Dibayar</div><table class="items-table"><thead><tr><th class="center">Ke</th><th class="right">Jumlah</th><th class="right">Sisa Pinjaman</th></tr></thead><tbody>`
      for (const r of results) {
        html += `<tr><td class="center">${r.angsuranKe}</td><td class="right">${fmtIDR(toNumber(r.jumlahBayar))}</td><td class="right">${fmtIDR(toNumber(r.sisaPinjamanSetelah))}</td></tr>`
      }
      html += `</tbody></table></div>`
      html += `<div class="struk-section"><div class="summary-row"><span class="key">Jumlah Angsuran Dibayar</span><span class="val">${count}x</span></div><div class="summary-row highlight"><span class="key">Total Dibayar</span><span class="val">${fmtIDR(totalPaid)}</span></div><div class="summary-row"><span class="key">Sisa Pinjaman</span><span class="val">${fmtIDR(currentSisa)}</span></div><div class="summary-row"><span class="key">Status</span><span class="val bold capitalize">${updatedPinjaman.status}</span></div></div>`
      html += `<div class="struk-footer"><div class="thanks">Terima kasih atas pembayaran angsuran Anda</div></div>`
      await sendStrukEmail({ to: agt.user.email, subject: `Struk Angsuran ${pinjaman.nomorPinjaman}`, strukHtml: html })
    }
  } catch (e) { console.error('[AGT Struk Email] Error:', e) }

  return {
    angsurans: results,
    pinjaman: updatedPinjaman,
    countPaid: count,
    totalPaid: count * angsuranPerBulan,
    sisaAngsuran: sisaAngsuran - count,
    isLunas: currentSisa <= 0.01,
  }
}

// ==================== HELPERS: NUMBER GENERATORS ====================

export async function nextMemberCode(prefix = 'BS') {
  // Find the max existing number for this prefix to avoid collisions
  const allUsers = await db.user.findMany({
    where: { memberCode: { startsWith: prefix } },
    select: { memberCode: true },
  })
  let maxNum = 0
  for (const u of allUsers) {
    if (!u.memberCode) continue
    const m = u.memberCode.replace(prefix, '').match(/^0*(\d+)/)
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10))
  }
  const nextNum = maxNum + 1
  // Also sync the counter
  await db.memberCodeCounter.upsert({
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
    existingCodes = await collectExistingCodes(db.withdrawalRequest, 'receiptNo', pattern, oldPattern)
  } else if (prefix === 'PNJ') {
    // PNJ uses global seq without date: "PNJ / XXXX" (4-digit)
    existingCodes = await collectExistingCodes(db.koperasiPinjaman, 'nomorPinjaman', 'PNJ / ', 'PNJ-')
    seqWidth = 4
    useDate = false
  } else if (prefix === 'POS') {
    existingCodes = await collectExistingCodes(db.productSale, 'invoiceNumber', pattern, oldPattern)
    seqWidth = 4
  } else if (prefix === 'MTP') {
    existingCodes = await collectExistingCodes(db.productMovement, 'movementNumber', pattern, oldPattern)
  } else if (prefix === 'AGT') {
    existingCodes = await collectExistingCodes(db.koperasiPinjamanAngsuran, 'nomorAngsuran', pattern, oldPattern)
  } else if (prefix === 'KKS') {
    existingCodes = await collectExistingCodes(db.koperasiKasTransaksi, 'nomorKas', pattern, oldPattern)
  } else if (prefix === 'INV') {
    existingCodes = await collectExistingCodes(db.salesTransaction, 'invoiceNumber', pattern, oldPattern)
  } else if (prefix === 'KWT') {
    // KWT is stored in savingTransaction.notes; check there if needed
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
      ? await db.savingTransaction.count({ where })
      : await db.sedekahTransaction.count({ where })
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

  // POS: 4-digit, with date
  if (prefix === 'POS') {
    return `POS / ${dateStr} / ${String(nextSeq).padStart(seqWidth, '0')}`
  }

  // Default: 3-digit sequence with slash separator
  return `${prefix} / ${dateStr} / ${String(nextSeq).padStart(seqWidth, '0')}`
}

// ==================== BANK SAMPAH KAS (Buku Kas Utama Institusi) ====================

// Record a transaction in BankSampahKas (Buku Kas Utama)
export async function recordBankSampahKas(
  tipe: 'masuk' | 'keluar',
  sumber: string,
  jumlah: number,
  keterangan: string,
  createdById?: string,
  links?: { withdrawalId?: string; salesTxId?: string; productSaleId?: string }
): Promise<{ saldoSetelah: number }> {
  const kasBalance = await getBankSampahKasBalance()
  const saldoSetelah = tipe === 'masuk' ? kasBalance + jumlah : kasBalance - jumlah
  await db.bankSampahKas.create({
    data: {
      tipe,
      sumber,
      jumlah,
      saldoSetelah,
      keterangan,
      createdById,
      withdrawalId: links?.withdrawalId,
      salesTxId: links?.salesTxId,
      productSaleId: links?.productSaleId,
    },
  })
  return { saldoSetelah }
}

export async function getBankSampahKasBalance(): Promise<number> {
  const masuk = await db.bankSampahKas.aggregate({ where: { tipe: 'masuk' }, _sum: { jumlah: true } })
  const keluar = await db.bankSampahKas.aggregate({ where: { tipe: 'keluar' }, _sum: { jumlah: true } })
  return toNumber(masuk._sum.jumlah) - toNumber(keluar._sum.jumlah)
}

// Total saldo tertahan across all nasabah (what institution "owes" to nasabah)
export async function getTotalSaldoTertahan(): Promise<number> {
  const agg = await db.balance.aggregate({ _sum: { saldoTertahan: true } })
  return toNumber(agg._sum.saldoTertahan)
}

// Total saldo tersedia across all nasabah (liquid, ready to withdraw)
export async function getTotalSaldoTersedia(): Promise<number> {
  const agg = await db.balance.aggregate({ _sum: { saldoTersedia: true } })
  return toNumber(agg._sum.saldoTersedia)
}

// ==================== RELEASE SALDO (saldoTertahan → saldoTersedia) ====================

// Release saldo tertahan → saldo tersedia for a nasabah
// Validation (prinsip kehati-hatian): kas institusi must be >= total saldo tersedia + amount being released
// (because saldo tersedia is a promise to pay cash on demand)
export async function releaseSaldo(userId: string, amount: number, releasedById?: string, keterangan?: string) {
  if (amount <= 0) throw new Error('Nominal release harus > 0')
  const balance = await ensureBalance(userId)
  const saldoTertahan = toNumber(balance.saldoTertahan)
  if (saldoTertahan < amount) throw new Error(`Saldo tertahan tidak mencukupi. Tersedia: ${saldoTertahan}, diminta: ${amount}`)

  // Prinsip kehati-hatian: kas institusi must cover all saldo tersedia + this release
  const kasSaldo = await getBankSampahKasBalance()
  const totalTersedia = await getTotalSaldoTersedia()
  const required = totalTersedia + amount
  if (kasSaldo < required) {
    throw new Error(`Kas institusi (Rp ${kasSaldo}) tidak cukup untuk menjamin likuiditas. Dibutuhkan minimal Rp ${required} (saldo tersedia existing + release ini). Lakukan penjualan ke mitra/produk terlebih dahulu atau top-up kas.`)
  }

  const saldoTersediaSebelum = toNumber(balance.saldoTersedia)
  const saldoTertahanSesudah = saldoTertahan - amount
  const saldoTersediaSesudah = saldoTersediaSebelum + amount

  const [updated] = await Promise.all([
    db.balance.update({
      where: { userId },
      data: { saldoTertahan: saldoTertahanSesudah, saldoTersedia: saldoTersediaSesudah },
    }),
    db.balanceHistory.create({
      data: {
        userId,
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
    db.balanceHistory.create({
      data: {
        userId,
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
    db.balanceRelease.create({
      data: {
        userId,
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
  return { balance: updated, saldoTertahanSesudah, saldoTersediaSesudah, kasSaldoSnapshot: kasSaldo }
}

// ==================== PENARIKAN (Withdrawal from saldoTersedia) ====================

// Execute withdrawal: validate saldoTersedia real-time, cut balance, record kas keluar + receipt
export async function executeWithdrawal(
  userId: string,
  amount: number,
  method: string,
  notes: string,
  processedById?: string,
  bankInfo?: { bankName?: string; accountNumber?: string; accountName?: string }
) {
  if (amount <= 0) throw new Error('Nominal penarikan harus > 0')
  const balance = await ensureBalance(userId)
  const saldoTersedia = toNumber(balance.saldoTersedia)
  if (saldoTersedia < amount) {
    throw new Error(`Saldo tersedia tidak mencukupi. Saldo tersedia: Rp ${saldoTersedia}, diminta: Rp ${amount}.`)
  }

  // Kas institusi must have the cash
  const kasSaldo = await getBankSampahKasBalance()
  if (kasSaldo < amount) {
    throw new Error(`Kas institusi (Rp ${kasSaldo}) tidak cukup untuk penarikan Rp ${amount}. Lakukan top-up kas terlebih dahulu.`)
  }

  const saldoTersediaSesudah = saldoTersedia - amount
  const receiptNo = await generateTxNo('WD')

  const [withdrawal, ,] = await Promise.all([
    db.withdrawalRequest.create({
      data: {
        userId,
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
    db.balance.update({
      where: { userId },
      data: { saldoTersedia: saldoTersediaSesudah },
    }),
    db.balanceHistory.create({
      data: {
        userId,
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
    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, name: true, memberCode: true } })
    if (user?.email) {
      const { sendStrukEmail } = await import('@/lib/email')
      const fmtIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
      let html = `<div class="struk-header"><div class="icon">💸</div><h2>Bank Sampah</h2><div class="sub">Sukamaju Sejahtera</div><div class="badge">STRUK PENARIKAN SALDO</div></div>`
      html += `<div class="struk-section"><div class="info-row"><span class="key">No. Transaksi</span><span class="val mono">${receiptNo}</span></div><div class="info-row"><span class="key">Tanggal</span><span class="val">${new Date().toLocaleString('id-ID')}</span></div><div class="info-row"><span class="key">Nasabah</span><span class="val bold">${user.name}</span></div><div class="info-row"><span class="key">Kode</span><span class="val mono">${user.memberCode || '-'}</span></div><div class="info-row"><span class="key">Metode</span><span class="val capitalize">${method}</span></div></div>`
      html += `<div class="struk-section"><div class="summary-row highlight"><span class="key">Nominal</span><span class="val">${fmtIDR(amount)}</span></div><div class="summary-row"><span class="key">Saldo Tersedia</span><span class="val">${fmtIDR(saldoTersediaSesudah)}</span></div></div>`
      html += `<div class="struk-footer"><div class="thanks">Terima kasih</div></div>`
      await sendStrukEmail({ to: user.email, subject: `Struk Penarikan Saldo ${receiptNo}`, strukHtml: html })
    }
  } catch (e) { console.error('[WD Struk Email] Error:', e) }

  return { withdrawal, saldoTersediaSesudah, receiptNo, kasSaldoSesudah: kasSaldo - amount }
}
