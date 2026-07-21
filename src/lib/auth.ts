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
}

const AUTH_KEY = 'bs-auth-token'
const AUTH_USER_KEY = 'bs-auth-user'

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

export function setAuth(token: string, user: AuthUser) {
  if (typeof window === 'undefined') return
  localStorage.setItem(AUTH_KEY, token)
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(AUTH_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
  // Also clear the acting user used by admin
  localStorage.removeItem('bs-acting-user')
}

export function isAdmin(user: AuthUser | null): boolean {
  if (!user) return false
  const roles = user.roles || []
  return roles.includes('admin') || roles.includes('owner')
}

export function isNasabah(user: AuthUser | null): boolean {
  if (!user) return false
  const roles = user.roles || []
  return roles.includes('nasabah') || roles.includes('koperasi')
}
