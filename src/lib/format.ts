// Formatting helpers for Bank Sampah + Koperasi

export function formatRupiah(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return 'Rp 0'
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(n)) return 'Rp 0'
  const formatted = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(Math.abs(n))
  return (n < 0 ? '-Rp ' : 'Rp ') + formatted
}

export function formatNumber(value: number | string | null | undefined, digits = 2): string {
  if (value === null || value === undefined) return '0'
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(n)) return '0'
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits }).format(n)
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '-'
  let d: Date
  if (typeof value === 'string') {
    // Handle date-only strings (YYYY-MM-DD) by appending T00:00:00 to avoid timezone shift
    d = value.length === 10 ? new Date(value + 'T00:00:00') : new Date(value)
  } else {
    d = value
  }
  if (isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return '-'
  const d = typeof value === 'string' ? new Date(value) : value
  if (isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d)
}

// Convert Prisma Decimal to number safely
export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'object') {
    // Handle Prisma Decimal objects which have a .toString() method
    if (value !== null && typeof (value as any).toString === 'function') {
      const s = (value as any).toString()
      // Only accept if it looks like a number (Prisma Decimal returns "123.45")
      if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s)
    }
    return 0 // Reject arrays and non-Decimal objects
  }
  const n = parseFloat(String(value))
  return isNaN(n) ? 0 : n
}

export function parseRoles(roles: string | null | undefined): string[] {
  if (!roles) return []
  try {
    const arr = JSON.parse(roles)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function roleLabel(roles: string[]): string {
  const map: Record<string, string> = {
    admin: 'Admin',
    owner: 'Owner',
    teller: 'Teller',
    nasabah: 'Nasabah',
    koperasi: 'Anggota Koperasi',
  }
  return roles.map((r) => map[r] || r).join(', ') || 'Nasabah'
}
