// Mock auth context using localStorage on client side
// Real auth is handled via API routes that check the database

export interface AuthUser {
  id: string
  name: string
  email: string
  memberCode: string | null
  anggotaId: string | null
  nomorAnggota: string | null
  roles: string[]
  isMember: boolean
  phone: string | null
  address: string | null
  nik: string | null
  verificationStatus: string
}

const AUTH_KEY = 'bs-auth-token'
const AUTH_USER_KEY = 'bs-auth-pengguna'

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(AUTH_KEY)
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(AUTH_USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setAuth(token: string, pengguna: AuthUser) {
  if (typeof window === 'undefined') return
  localStorage.setItem(AUTH_KEY, token)
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(pengguna))
}

export function clearAuth() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(AUTH_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
  // Also clear the acting pengguna used by admin
  localStorage.removeItem('bs-acting-pengguna')
}

export function isAdmin(pengguna: AuthUser | null): boolean {
  if (!pengguna) return false
  const roles = pengguna.roles || []
  return roles.includes('admin') || roles.includes('owner')
}

export function isNasabah(pengguna: AuthUser | null): boolean {
  if (!pengguna) return false
  const roles = pengguna.roles || []
  return roles.includes('nasabah') || roles.includes('koperasi')
}
