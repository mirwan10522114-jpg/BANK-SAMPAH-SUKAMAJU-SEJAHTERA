/**
 * Utility functions untuk validasi dan sanitasi input.
 */

/**
 * Menghapus semua angka dan simbol tertentu, hanya menyisakan huruf, spasi, kutip, dan strip.
 * Berguna untuk input Nama Orang.
 * @param value String input asli
 * @returns String yang sudah dibersihkan
 */
export function sanitizeName(value: string): string {
  // Hanya izinkan huruf (a-z, A-Z), spasi, tanda kutip tunggal, dan strip
  return value.replace(/[^a-zA-Z\s'\-]/g, '')
}

/**
 * Menghapus semua karakter selain angka (0-9).
 * Berguna untuk NIK, Nomor HP, atau Input Number text base.
 * @param value String input asli
 * @returns String yang hanya berisi angka
 */
export function sanitizeNumber(value: string): string {
  // Hanya izinkan angka 0-9
  return value.replace(/[^0-9]/g, '')
}
