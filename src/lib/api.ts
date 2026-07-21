// Frontend API client for Bank Sampah + Koperasi

const ACTING_USER_KEY = 'bs-acting-user'

export function getActingUserHeader(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACTING_USER_KEY) || null
}

export function setActingUser(id: string) {
  if (typeof window !== 'undefined') localStorage.setItem(ACTING_USER_KEY, id)
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const actingUser = getActingUserHeader()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (actingUser) headers['x-acting-user'] = actingUser
  const sep = path.includes('?') ? '&' : '?'
  const url = actingUser ? `/api${path}${sep}actingUser=${actingUser}` : `/api${path}`
  const res = await fetch(url, { ...options, headers: { ...headers, ...(options?.headers as any) } })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  // Auth
  auth: {
    login: (email: string, password: string) => fetchApi<any>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (data: any) => fetchApi<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    verifyOtp: (userId: string, otp: string) => fetchApi<any>('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ userId, otp }) }),
    me: (token: string) => fetchApi<any>('/auth/me', { headers: { 'x-auth-token': token } as any }),
  },
  public: {
    stats: () => fetchApi<any>('/public/stats'),
  },

  // Dashboard Bank Sampah
  dashboard: (filters?: { q?: string; tipe?: string; statusQc?: string; kategori?: string; barang?: string; range?: string; logDari?: string; logSampai?: string; chartRange?: string; chartDari?: string; chartSampai?: string }) =>
    fetchApi<any>(`/dashboard${filters ? '?' + new URLSearchParams(filters as any).toString() : ''}`),

  // Dashboard Koperasi
  dashboardKoperasi: (filters?: { periode?: string; dari?: string; sampai?: string; q?: string; waktu?: string; logDari?: string; logSampai?: string; jenis?: string; status?: string }) =>
    fetchApi<any>(`/dashboard-koperasi${filters ? '?' + new URLSearchParams(filters as any).toString() : ''}`),

  // Dashboard Penjualan Produk (offline + online)
  dashboardPenjualanProduk: (filters?: { periode?: string; dari?: string; sampai?: string }) =>
    fetchApi<any>(`/dashboard-penjualan-produk${filters ? '?' + new URLSearchParams(filters as any).toString() : ''}`),

  // Master - Nasabah
  nasabah: {
    list: (q = '', role = '') => fetchApi<any[]>(`/master/nasabah?q=${encodeURIComponent(q)}&role=${role}`),
    get: (id: string) => fetchApi<any>(`/master/nasabah/${id}`),
    create: (data: any) => fetchApi<any>('/master/nasabah', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchApi<any>(`/master/nasabah/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<any>(`/master/nasabah/${id}`, { method: 'DELETE' }),
  },

  // Master - Kategori
  kategori: {
    list: () => fetchApi<any[]>('/master/kategori'),
    create: (data: any) => fetchApi<any>('/master/kategori', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchApi<any>(`/master/kategori/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<any>(`/master/kategori/${id}`, { method: 'DELETE' }),
  },

  // Master - Barang Sampah
  barang: {
    list: (categoryId = '') => fetchApi<any[]>(`/master/barang?categoryId=${categoryId}`),
    get: (id: string) => fetchApi<any>(`/master/barang/${id}`),
    create: (data: any) => fetchApi<any>('/master/barang', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchApi<any>(`/master/barang/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<any>(`/master/barang/${id}`, { method: 'DELETE' }),
  },

  // Master - Koperasi Setting
  koperasiSetting: {
    get: () => fetchApi<any>('/master/koperasi-setting'),
    update: (data: any) => fetchApi<any>('/master/koperasi-setting', { method: 'PUT', body: JSON.stringify(data) }),
  },

  // Master - Anggota Koperasi
  anggota: {
    list: () => fetchApi<any[]>('/master/anggota'),
    get: (id: string) => fetchApi<any>(`/master/anggota/${id}`),
    create: (data: any) => fetchApi<any>('/master/anggota', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchApi<any>(`/master/anggota/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<any>(`/master/anggota/${id}`, { method: 'DELETE' }),
  },

  // Master - Mitra
  mitra: {
    list: () => fetchApi<any[]>('/master/mitra'),
    create: (data: any) => fetchApi<any>('/master/mitra', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchApi<any>(`/master/mitra/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<any>(`/master/mitra/${id}`, { method: 'DELETE' }),
  },

  // Master - Produk
  produk: {
    list: () => fetchApi<any[]>('/master/produk'),
    create: (data: any) => fetchApi<any>('/master/produk', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchApi<any>(`/master/produk/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<any>(`/master/produk/${id}`, { method: 'DELETE' }),
  },

  // Master - Point Rules
  pointRules: {
    list: () => fetchApi<any[]>('/master/point-rules'),
    create: (data: any) => fetchApi<any>('/master/point-rules', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Master - Manajemen Akun (sync-integrated user management)
  manajemenAkun: {
    list: (q = '', role = '') => fetchApi<any[]>(`/master/manajemen-akun?q=${encodeURIComponent(q)}&role=${role}`),
    create: (data: any) => fetchApi<any>('/master/manajemen-akun', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchApi<any>(`/master/manajemen-akun/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<any>(`/master/manajemen-akun/${id}`, { method: 'DELETE' }),
  },

  // Operasional
  operasional: {
    nabungList: (userId = '', filters?: { qcStatus?: string; dari?: string; sampai?: string; q?: string }) => {
      const params = new URLSearchParams()
      if (userId) params.set('userId', userId)
      if (filters?.qcStatus) params.set('qcStatus', filters.qcStatus)
      if (filters?.dari) params.set('dari', filters.dari)
      if (filters?.sampai) params.set('sampai', filters.sampai)
      if (filters?.q) params.set('q', filters.q)
      const qs = params.toString()
      return fetchApi<any[]>(`/operasional/nabung${qs ? '?' + qs : ''}`)
    },
    nabungGet: (id: string) => fetchApi<any>(`/operasional/nabung/${id}`),
    nabungCreate: (data: any) => fetchApi<any>('/operasional/nabung', { method: 'POST', body: JSON.stringify(data) }),
    nabungEditQc: (id: string, data: any) => fetchApi<any>(`/operasional/nabung/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    sedekahList: (userId = '', filters?: { qcStatus?: string; dari?: string; sampai?: string; q?: string }) => {
      const params = new URLSearchParams()
      if (userId) params.set('userId', userId)
      if (filters?.qcStatus) params.set('qcStatus', filters.qcStatus)
      if (filters?.dari) params.set('dari', filters.dari)
      if (filters?.sampai) params.set('sampai', filters.sampai)
      if (filters?.q) params.set('q', filters.q)
      const qs = params.toString()
      return fetchApi<any[]>(`/operasional/sedekah${qs ? '?' + qs : ''}`)
    },
    sedekahCreate: (data: any) => fetchApi<any>('/operasional/sedekah', { method: 'POST', body: JSON.stringify(data) }),
    sedekahGet: (id: string) => fetchApi<any>(`/operasional/sedekah/${id}`),
    sedekahEditQc: (id: string, data: any) => fetchApi<any>(`/operasional/sedekah/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    nasabahList: (q = '') => fetchApi<any[]>(`/operasional/nasabah-list?q=${encodeURIComponent(q)}`),
    nasabahBalance: (userId: string) => fetchApi<any>(`/operasional/nasabah-balance/${userId}`),
  },

  // Koperasi
  koperasi: {
    simpananList: (
      anggotaId = '',
      filters?: { jenisSimpanan?: string; tipe?: string; dari?: string; sampai?: string; q?: string },
    ) => {
      const params = new URLSearchParams()
      if (anggotaId) params.set('anggotaId', anggotaId)
      if (filters?.jenisSimpanan) params.set('jenisSimpanan', filters.jenisSimpanan)
      if (filters?.tipe) params.set('tipe', filters.tipe)
      if (filters?.dari) params.set('dari', filters.dari)
      if (filters?.sampai) params.set('sampai', filters.sampai)
      if (filters?.q) params.set('q', filters.q)
      const qs = params.toString()
      return fetchApi<any[]>(`/koperasi/simpanan${qs ? '?' + qs : ''}`)
    },
    simpananTx: (data: any) => fetchApi<any>('/koperasi/simpanan', { method: 'POST', body: JSON.stringify(data) }),
    pinjamanList: (
      anggotaId = '',
      status = '',
      filters?: { dari?: string; sampai?: string; q?: string },
    ) => {
      const params = new URLSearchParams()
      if (anggotaId) params.set('anggotaId', anggotaId)
      if (status) params.set('status', status)
      if (filters?.dari) params.set('dari', filters.dari)
      if (filters?.sampai) params.set('sampai', filters.sampai)
      if (filters?.q) params.set('q', filters.q)
      const qs = params.toString()
      return fetchApi<any[]>(`/koperasi/pinjaman${qs ? '?' + qs : ''}`)
    },
    pinjamanGet: (id: string) => fetchApi<any>(`/koperasi/pinjaman/${id}`),
    pinjamanCreate: (data: any) => fetchApi<any>('/koperasi/pinjaman', { method: 'POST', body: JSON.stringify(data) }),
    pinjamanCairkan: (id: string) => fetchApi<any>(`/koperasi/pinjaman/${id}/cairkan`, { method: 'POST' }),
    pinjamanApprove: (id: string) => fetchApi<any>(`/koperasi/pinjaman/${id}/approve`, { method: 'POST' }),
    pinjamanAngsuran: (id: string, data: any) => fetchApi<any>(`/koperasi/pinjaman/${id}/angsuran`, { method: 'POST', body: JSON.stringify(data) }),
    penarikanList: (
      anggotaId = '',
      filters?: { status?: string; dari?: string; sampai?: string; q?: string },
    ) => {
      const params = new URLSearchParams()
      if (anggotaId) params.set('anggotaId', anggotaId)
      if (filters?.status) params.set('status', filters.status)
      if (filters?.dari) params.set('dari', filters.dari)
      if (filters?.sampai) params.set('sampai', filters.sampai)
      if (filters?.q) params.set('q', filters.q)
      const qs = params.toString()
      return fetchApi<any[]>(`/koperasi/penarikan-sukarela${qs ? '?' + qs : ''}`)
    },
    penarikanCreate: (data: any) => fetchApi<any>('/koperasi/penarikan-sukarela', { method: 'POST', body: JSON.stringify(data) }),
    penarikanUpdate: (id: string, data: any) => fetchApi<any>(`/koperasi/penarikan-sukarela/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    kas: (dari = '', sampai = '') => {
      const params = new URLSearchParams()
      if (dari) params.set('dari', dari)
      if (sampai) params.set('sampai', sampai)
      const qs = params.toString()
      return fetchApi<any>(`/koperasi/kas${qs ? '?' + qs : ''}`)
    },
    checkPinjamanEligibility: (anggotaId: string) => fetchApi<any>(`/koperasi/pinjaman/check-eligibility?anggotaId=${anggotaId}`),
    perbaikanList: (anggotaId = '', status = '') => fetchApi<any[]>(`/koperasi/pinjaman-perbaikan?anggotaId=${anggotaId}&status=${status}`),
    perbaikanCreate: (data: any) => fetchApi<any>('/koperasi/pinjaman-perbaikan', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Inventaris
  inventaris: {
    stok: () => fetchApi<any[]>('/inventaris/stok'),
    pengolahanList: (filters?: { dari?: string; sampai?: string; q?: string }) => {
      const params = new URLSearchParams()
      if (filters?.dari) params.set('dari', filters.dari)
      if (filters?.sampai) params.set('sampai', filters.sampai)
      if (filters?.q) params.set('q', filters.q)
      const qs = params.toString()
      return fetchApi<any[]>(`/inventaris/pengolahan${qs ? '?' + qs : ''}`)
    },
    pengolahanCreate: (data: any) => fetchApi<any>('/inventaris/pengolahan', { method: 'POST', body: JSON.stringify(data) }),
    penjualanMitraList: (filters?: { partnerId?: string; dari?: string; sampai?: string; q?: string }) => {
      const params = new URLSearchParams()
      if (filters?.partnerId) params.set('partnerId', filters.partnerId)
      if (filters?.dari) params.set('dari', filters.dari)
      if (filters?.sampai) params.set('sampai', filters.sampai)
      if (filters?.q) params.set('q', filters.q)
      const qs = params.toString()
      return fetchApi<any[]>(`/inventaris/penjualan-mitra${qs ? '?' + qs : ''}`)
    },
    penjualanMitraCreate: (data: any) => fetchApi<any>('/inventaris/penjualan-mitra', { method: 'POST', body: JSON.stringify(data) }),
    penjualanProdukList: (filters?: { paymentMethod?: string; dari?: string; sampai?: string; q?: string }) => {
      const params = new URLSearchParams()
      if (filters?.paymentMethod) params.set('paymentMethod', filters.paymentMethod)
      if (filters?.dari) params.set('dari', filters.dari)
      if (filters?.sampai) params.set('sampai', filters.sampai)
      if (filters?.q) params.set('q', filters.q)
      const qs = params.toString()
      return fetchApi<any[]>(`/inventaris/penjualan-produk${qs ? '?' + qs : ''}`)
    },
    penjualanProdukCreate: (data: any) => fetchApi<any>('/inventaris/penjualan-produk', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Teller
  teller: {
    wizard: (data: any) => fetchApi<any>('/teller/wizard', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Personal Dashboards
  personalDashboard: (userId: string, filters?: { chartRange?: string; chartDari?: string; chartSampai?: string }) => {
    const params = new URLSearchParams()
    if (filters?.chartRange) params.set('chartRange', filters.chartRange)
    if (filters?.chartDari) params.set('chartDari', filters.chartDari)
    if (filters?.chartSampai) params.set('chartSampai', filters.chartSampai)
    const qs = params.toString()
    return fetchApi<any>(`/personal-dashboard/${userId}${qs ? '?' + qs : ''}`)
  },
  personalDashboardKoperasi: (anggotaId: string) => fetchApi<any>(`/personal-dashboard-koperasi/${anggotaId}`),

  // Notifications (user)
  notifications: (userId: string, filters?: { type?: string; limit?: number }) => {
    const params = new URLSearchParams()
    if (filters?.type) params.set('type', filters.type)
    if (filters?.limit) params.set('limit', String(filters.limit))
    const qs = params.toString()
    return fetchApi<any>(`/notifications/user/${userId}${qs ? '?' + qs : ''}`)
  },

  // Edukasi (articles)
  edukasi: {
    list: () => fetchApi<any[]>('/edukasi'),
    get: (id: string) => fetchApi<any>(`/edukasi/${id}`),
    getBySlug: (slug: string) => fetchApi<any>(`/edukasi?slug=${encodeURIComponent(slug)}`),
    create: (data: { title: string; excerpt?: string; content: string; featuredImage?: string; publishedAt?: string }) =>
      fetchApi<any>('/edukasi', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchApi<any>(`/edukasi/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<any>(`/edukasi/${id}`, { method: 'DELETE' }),
  },

  // Kegiatan (activity documentation)
  kegiatan: {
    list: () => fetchApi<any[]>('/kegiatan'),
    get: (id: string) => fetchApi<any>(`/kegiatan/${id}`),
    getBySlug: (slug: string) => fetchApi<any>(`/kegiatan?slug=${encodeURIComponent(slug)}`),
    create: (data: any) => fetchApi<any>('/kegiatan', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchApi<any>(`/kegiatan/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<any>(`/kegiatan/${id}`, { method: 'DELETE' }),
  },

  // Finansial Bank Sampah (Release Saldo, Penarikan, Kas Utama)
  finansial: {
    releaseList: () => fetchApi<any>('/finansial/release-saldo'),
    releaseSaldo: (data: any) => fetchApi<any>('/finansial/release-saldo', { method: 'POST', body: JSON.stringify(data) }),
    penarikanList: (
      userId = '',
      filters?: { status?: string; method?: string; dari?: string; sampai?: string; q?: string },
    ) => {
      const params = new URLSearchParams()
      if (userId) params.set('userId', userId)
      if (filters?.status) params.set('status', filters.status)
      if (filters?.method) params.set('method', filters.method)
      if (filters?.dari) params.set('dari', filters.dari)
      if (filters?.sampai) params.set('sampai', filters.sampai)
      if (filters?.q) params.set('q', filters.q)
      const qs = params.toString()
      return fetchApi<any>(`/finansial/penarikan${qs ? '?' + qs : ''}`)
    },
    penarikanExecute: (data: any) => fetchApi<any>('/finansial/penarikan', { method: 'POST', body: JSON.stringify(data) }),
    kasBankSampah: (tipe = '', sumber = '', dari = '', sampai = '') => {
      const params = new URLSearchParams()
      if (tipe) params.set('tipe', tipe)
      if (sumber) params.set('sumber', sumber)
      if (dari) params.set('dari', dari)
      if (sampai) params.set('sampai', sampai)
      const qs = params.toString()
      return fetchApi<any>(`/finansial/kas-bank-sampah${qs ? '?' + qs : ''}`)
    },
    kasTopUp: (data: any) => fetchApi<any>('/finansial/kas-bank-sampah', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Toko Online & Kasir Offline
  toko: {
    katalog: (params?: string) => fetchApi<any[]>(`/toko/katalog${params ? '?' + params : ''}`),
    produkDetail: (slug: string) => fetchApi<any>(`/toko/produk/${slug}`),
    checkout: (data: any) => fetchApi<any>('/toko/checkout', { method: 'POST', body: JSON.stringify(data) }),
    trackOrder: (orderNumber: string, phone: string) => fetchApi<any>(`/toko/order/${orderNumber}?phone=${encodeURIComponent(phone)}`),
    confirmPayment: (orderNumber: string) => fetchApi<any>(`/toko/order/${orderNumber}/confirm-payment`, { method: 'POST' }),
    adminOrders: (params?: string) => fetchApi<any[]>(`/toko/admin/orders${params ? '?' + params : ''}`),
    adminOrderStatus: (id: string, data: any) => fetchApi<any>(`/toko/admin/orders/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),
    adminPos: (data: any) => fetchApi<any>('/toko/admin/pos', { method: 'POST', body: JSON.stringify(data) }),
    adminSettings: () => fetchApi<any>('/toko/admin/settings'),
    adminSettingsUpdate: (data: any) => fetchApi<any>('/toko/admin/settings', { method: 'PUT', body: JSON.stringify(data) }),
    adminAturan: () => fetchApi<any[]>('/toko/admin/aturan'),
    adminAturanCreate: (data: any) => fetchApi<any>('/toko/admin/aturan', { method: 'POST', body: JSON.stringify(data) }),
    adminAturanUpdate: (id: string, data: any) => fetchApi<any>(`/toko/admin/aturan/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    adminAturanDelete: (id: string) => fetchApi<any>(`/toko/admin/aturan/${id}`, { method: 'DELETE' }),
    adminKategori: () => fetchApi<any[]>('/toko/admin/kategori'),
    adminKategoriCreate: (data: any) => fetchApi<any>('/toko/admin/kategori', { method: 'POST', body: JSON.stringify(data) }),
    adminKategoriUpdate: (id: string, data: any) => fetchApi<any>(`/toko/admin/kategori/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    adminKategoriDelete: (id: string) => fetchApi<any>(`/toko/admin/kategori/${id}`, { method: 'DELETE' }),
    adminProduk: (params?: string) => fetchApi<any[]>(`/toko/admin/produk${params ? '?' + params : ''}`),
    adminProdukCreate: (data: any) => fetchApi<any>('/toko/admin/produk', { method: 'POST', body: JSON.stringify(data) }),
    adminProdukUpdate: (id: string, data: any) => fetchApi<any>(`/toko/admin/produk/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    adminProdukDelete: (id: string) => fetchApi<any>(`/toko/admin/produk/${id}`, { method: 'DELETE' }),
    adminStokAdjust: (data: any) => fetchApi<any>('/toko/admin/stok/adjust', { method: 'POST', body: JSON.stringify(data) }),
    adminPenjualan: (params?: string) => fetchApi<any>(`/toko/admin/penjualan${params ? '?' + params : ''}`),
  },

  // Laporan Laba Rugi
  laporan: {
    bankSampah: (filters?: { periode?: string; dari?: string; sampai?: string }) =>
      fetchApi<any>(`/laporan/bank-sampah${filters ? '?' + new URLSearchParams(filters as any).toString() : ''}`),
    koperasi: (filters?: { periode?: string; dari?: string; sampai?: string }) =>
      fetchApi<any>(`/laporan/koperasi${filters ? '?' + new URLSearchParams(filters as any).toString() : ''}`),
    penjualanProduk: (filters?: { periode?: string; dari?: string; sampai?: string }) =>
      fetchApi<any>(`/laporan/penjualan-produk${filters ? '?' + new URLSearchParams(filters as any).toString() : ''}`),
  },
}
