/**
 * Helper untuk generate kode transaksi sesuai perancangan kodifikasi.
 * Format:
 * - Setoran Nabung: NB / DDMMYYYY / XXXXX (5 digit urut per tanggal)
 * - Setoran Sedekah: SD / DDMMYYYY / XXXXX (5 digit urut per tanggal)
 * - Invoice Mitra: INV / MMYYYY / XXX (3 digit urut per periode bulan)
 * - Batch Pengolahan: BPRO / DDMMYYYY / XXX (3 digit urut per tanggal)
 * - Penarikan Saldo: WD / DDMMYYYY / XXX (3 digit urut per tanggal)
 * - Simpanan: SP / DDMMYYYY / XXX (3 digit urut per tanggal)
 * - Tarik Simpanan: TK / DDMMYYYY / XXX (3 digit urut per tanggal)
 * - Pinjaman: PNJ / XXXX (4 digit urut global)
 * - Angsuran: AGT / DDMMYYYY / XXX (3 digit urut per tanggal)
 * - Kas Koperasi: KKS / DDMMYYYY / XXX (3 digit urut per tanggal)
 * - POS Sale: POS / DDMMYYYY / XXXX (4 digit urut per tanggal)
 */

function pad(n: number, len: number): string {
  return String(n).padStart(len, '0')
}

function ddMMYYYY(d: Date | string): string {
  const date = new Date(d)
  return `${pad(date.getDate(), 2)}${pad(date.getMonth() + 1, 2)}${date.getFullYear()}`
}

function mmYYYY(d: Date | string): string {
  const date = new Date(d)
  return `${pad(date.getMonth() + 1, 2)}${date.getFullYear()}`
}

// Generate kode untuk Setoran Nabung: NB / DDMMYYYY / XXXXX
export function formatNabungCode(transactedAt: Date | string, seq: number): string {
  return `NB / ${ddMMYYYY(transactedAt)} / ${pad(seq, 5)}`
}

// Generate kode untuk Setoran Sedekah: SD / DDMMYYYY / XXXXX
export function formatSedekahCode(transactedAt: Date | string, seq: number): string {
  return `SD / ${ddMMYYYY(transactedAt)} / ${pad(seq, 5)}`
}

// Generate kode untuk Invoice Penjualan Mitra: INV / MMYYYY / XXX
export function formatInvoiceCode(transactedAt: Date | string, seq: number): string {
  return `INV / ${mmYYYY(transactedAt)} / ${pad(seq, 3)}`
}

// Generate kode untuk Batch Pengolahan: BPRO / DDMMYYYY / XXX
export function formatBatchCode(transactedAt: Date | string, seq: number): string {
  return `BPRO / ${ddMMYYYY(transactedAt)} / ${pad(seq, 3)}`
}

// Generate kode untuk Penarikan Saldo: WD / DDMMYYYY / XXX
export function formatWithdrawalCode(processedAt: Date | string, seq: number): string {
  return `WD / ${ddMMYYYY(processedAt)} / ${pad(seq, 3)}`
}

// Generate kode untuk Setor Simpanan: SP / DDMMYYYY / XXX
export function formatSimpananCode(tanggal: Date | string, seq: number): string {
  return `SP / ${ddMMYYYY(tanggal)} / ${pad(seq, 3)}`
}

// Generate kode untuk Tarik Simpanan: TK / DDMMYYYY / XXX
export function formatTarikCode(tanggal: Date | string, seq: number): string {
  return `TK / ${ddMMYYYY(tanggal)} / ${pad(seq, 3)}`
}

// Generate kode untuk Pinjaman: PNJ / XXXX
export function formatPinjamanCode(seq: number): string {
  return `PNJ / ${pad(seq, 4)}`
}

// Generate kode untuk Angsuran: AGT / DDMMYYYY / XXX
export function formatAngsuranCode(tanggalBayar: Date | string, seq: number): string {
  return `AGT / ${ddMMYYYY(tanggalBayar)} / ${pad(seq, 3)}`
}

// Generate kode untuk Kas Koperasi: KKS / DDMMYYYY / XXX
export function formatKasKoperasiCode(tanggal: Date | string, seq: number): string {
  return `KKS / ${ddMMYYYY(tanggal)} / ${pad(seq, 3)}`
}

// Generate kode untuk POS Sale: POS / DDMMYYYY / XXXX
export function formatPOSCode(transactedAt: Date | string, seq: number): string {
  return `POS / ${ddMMYYYY(transactedAt)} / ${pad(seq, 4)}`
}

// Generate kode berdasarkan tipe transaksi (untuk display generik)
// seq adalah urutan transaksi tersebut (1-based)
export function formatTransactionCode(tipe: string, date: Date | string, seq: number): string {
  switch (tipe) {
    case 'nabung':
      return formatNabungCode(date, seq)
    case 'sedekah':
      return formatSedekahCode(date, seq)
    case 'invoice':
    case 'penjualan_mitra':
      return formatInvoiceCode(date, seq)
    case 'pengolahan':
      return formatBatchCode(date, seq)
    case 'penarikan':
    case 'withdrawal':
      return formatWithdrawalCode(date, seq)
    case 'simpanan':
      return formatSimpananCode(date, seq)
    case 'tarik':
      return formatTarikCode(date, seq)
    case 'pinjaman':
      return formatPinjamanCode(seq)
    case 'angsuran':
      return formatAngsuranCode(date, seq)
    case 'kas':
      return formatKasKoperasiCode(date, seq)
    case 'pos':
      return formatPOSCode(date, seq)
    default:
      return `TRX / ${ddMMYYYY(date)} / ${pad(seq, 3)}`
  }
}
