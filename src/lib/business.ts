// Core business logic for Bank Sampah + Koperasi integration
import { db } from './db'
import { toNumber } from './format'

// ==================== SESSION (mock) ====================
// Simple acting-user resolution. Frontend passes x-acting-user header or ?actingUser=
export async function getActingUser(req: Request): Promise<{ id: string; name: string; roles: string[] } | null> {
  const url = new URL(req.url)
  const headerId = req.headers.get('x-acting-user')
  const queryId = url.searchParams.get('actingUser')
  const id = headerId || queryId
  if (!id) {
    // default to admin
    const admin = await db.user.findFirst({ where: { email: 'admin@gmail.com' } })
    if (admin) return { id: admin.id, name: admin.name, roles: JSON.parse(admin.roles || '[]') }
    return null
  }
  const u = await db.user.findUnique({ where: { id } })
  if (!u) return null
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
  await db.productMovement.create({
    data: {
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
  await db.productMovement.create({
    data: {
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
  return db.koperasiKasTransaksi.create({
    data: { sumber, tipe, jumlah, keterangan, userId, nomorReferensi },
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
  const setting = await db.koperasiSetting.findFirst()
  const sukuBunga = setting ? toNumber(setting.sukuBungaPinjaman) : 0
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

    const angsuran = await db.koperasiPinjamanAngsuran.create({
      data: {
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

// Generate clean transaction codes: PREFIX-YYYYMMDD-NNN
// e.g., SP-20260710-001, TK-20260710-001, KWT-20260710-001, WD-20260710-001
// Uses a per-prefix-per-day counter with DB-aware initialization to prevent
// unique constraint violations after server restart (in-memory counter resets).
const _txCounters: Record<string, number> = {}
const _txInitialized: Record<string, boolean> = {}

async function initTxCounter(key: string, prefix: string, ymd: string) {
  if (_txInitialized[key]) return
  const pattern = `${prefix}-${ymd}-`
  let maxSeq = 0
  // Check KoperasiSimpananTransaksi (SP, TK prefixes)
  const simTx = await db.koperasiSimpananTransaksi.findFirst({
    where: { nomorTransaksi: { startsWith: pattern } },
    select: { nomorTransaksi: true },
    orderBy: { nomorTransaksi: 'desc' },
  })
  if (simTx) {
    const m = simTx.nomorTransaksi.replace(pattern, '').match(/^0*(\d+)/)
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10))
  }
  // Check WithdrawalRequest (WD prefix)
  if (prefix === 'WD') {
    const wdTx = await db.withdrawalRequest.findFirst({
      where: { receiptNo: { startsWith: pattern } },
      select: { receiptNo: true },
      orderBy: { receiptNo: 'desc' },
    })
    if (wdTx) {
      const m = wdTx.receiptNo.replace(pattern, '').match(/^0*(\d+)/)
      if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10))
    }
  }
  // Check KoperasiPinjaman (PNJ prefix)
  if (prefix === 'PNJ') {
    const pnjTx = await db.koperasiPinjaman.findFirst({
      where: { nomorPinjaman: { startsWith: pattern } },
      select: { nomorPinjaman: true },
      orderBy: { nomorPinjaman: 'desc' },
    })
    if (pnjTx) {
      const m = pnjTx.nomorPinjaman.replace(pattern, '').match(/^0*(\d+)/)
      if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10))
    }
  }
  _txCounters[key] = Math.max(_txCounters[key] || 0, maxSeq)
  _txInitialized[key] = true
}

export async function generateTxNo(prefix: string): Promise<string> {
  const now = new Date()
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const key = `${prefix}-${ymd}`
  await initTxCounter(key, prefix, ymd)
  _txCounters[key] = (_txCounters[key] || 0) + 1
  const seq = String(_txCounters[key]).padStart(3, '0')
  return `${prefix}-${ymd}-${seq}`
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

  return { withdrawal, saldoTersediaSesudah, receiptNo, kasSaldoSesudah: kasSaldo - amount }
}
