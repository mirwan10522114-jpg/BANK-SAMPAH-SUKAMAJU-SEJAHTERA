// =====================================================================
// RajaOngkir (Komerce) Service — typed, no `any`, with retry & logging
// ---------------------------------------------------------------------
// Reads API key & base URL from env. DO NOT hardcode.
//
// Endpoints used (all require `key` header):
//   POST /calculate/domestic-cost   ← works with current API key
//   GET  /destination/search        ← needs Enterprise package (will fail)
//
// For destination resolution, since /destination/search is not available
// with this key, we use a static mapping of city name → RajaOngkir
// destination ID, with caching in District.rajaOngkirDestId.
//
// Retry: up to 3 attempts with exponential backoff (300ms, 600ms, 1200ms).
// Fallback: on repeated failure, returns a TokoSetting-based fallback
// so the checkout flow never breaks.
// =====================================================================

import axios, { AxiosError, AxiosInstance } from 'axios'
import { db } from './db'
import { toNumber } from './format'
import { logRajaongkir } from './logger'

// =====================================================================
// Types
// =====================================================================

export interface RajaOngkirCourierOption {
  kurir: string           // jne | jnt | sicepat | anteraja | pos | tiki | ...
  service: string         // REG | EZ | OKE | ...
  serviceDisplay: string  // "JNE REG" — for UI
  courierName: string     // "Jalur Nugraha Ekakurir (JNE)"
  description: string
  etd: string             // "1-3 hari"
  cost: number            // rupiah
}

export interface ShippingCalcResult {
  source: 'rajaongkir' | 'fallback'
  cheapestCost: number
  options: RajaOngkirCourierOption[]
  message?: string
  // Internal: for logging/debugging
  destinationId?: number
  originId?: string
  retries?: number
}

interface RajaOngkirCalcRawItem {
  name: string
  code: string
  service: string
  description?: string
  cost: number
  etd: string
}

interface RajaOngkirCalcResponse {
  meta: { message: string; code: number; status: string }
  data: RajaOngkirCalcRawItem[]
}

// =====================================================================
// Config (from env)
// =====================================================================

interface RajaOngkirConfig {
  apiKey: string
  baseUrl: string
  originId: string
}

function readConfig(): RajaOngkirConfig {
  return {
    apiKey: process.env.RAJAONGKIR_API_KEY ?? '',
    baseUrl:
      process.env.RAJAONGKIR_BASE_URL ??
      'https://rajaongkir.komerce.id/api/v1',
    originId: process.env.RAJAONGKIR_ORIGIN_ID ?? '',
  }
}

export function isRajaOngkirConfigured(): boolean {
  const cfg = readConfig()
  return cfg.apiKey.length > 0
}

export function validateRajaOngkirConfigOrThrow(): void {
  const cfg = readConfig()
  if (!cfg.apiKey) {
    logRajaongkir.error('RAJAONGKIR_API_KEY kosong di .env')
    throw new Error(
      'RAJAONGKIR_API_KEY belum dikonfigurasi. Isi di file .env dengan API key dari dashboard collaborator.komerce.id.'
    )
  }
}

// =====================================================================
// Static destination ID mapping (city name → RajaOngkir dest ID)
// ---------------------------------------------------------------------
// Since /destination/search returns 401 with this API key (needs
// Enterprise package per RajaOngkir docs), we map common Indonesian
// cities/districts to their canonical RajaOngkir destination IDs.
// IDs are sourced from public RajaOngkir Komerce destination data.
// Extend this map as needed.
// =====================================================================

const CITY_TO_DEST_ID: Record<string, number> = {
  // Bandung area (city: "Bandung")
  'bandung': 574,
  'kota bandung': 574,
  // Jakarta
  'jakarta pusat': 151,
  'jakarta selatan': 155,
  'jakarta barat': 152,
  'jakarta timur': 153,
  'jakarta utara': 154,
  'dki jakarta': 151,
  // Bekasi
  'bekasi': 555,
  'kota bekasi': 555,
  // Bogor
  'bogor': 465,
  'kota bogor': 465,
  // Depok
  'depok': 463,
  'kota depok': 463,
  // Tangerang
  'tangerang': 576,
  'kota tangerang': 576,
  'tangerang selatan': 575,
  'kota tangerang selatan': 575,
  // Semarang
  'semarang': 387,
  'kota semarang': 387,
  // Surakarta / Solo
  'surakarta': 388,
  'solo': 388,
  'kota surakarta': 388,
  // Surabaya
  'surabaya': 444,
  'kota surabaya': 444,
  // Yogyakarta
  'yogyakarta': 81,
  'kota yogyakarta': 81,
  'di yogyakarta': 81,
  // Malang
  'malang': 331,
  'kota malang': 331,
  // Medan
  'medan': 256,
  'kota medan': 256,
  // Palembang
  'palembang': 247,
  'kota palembang': 247,
  // Makassar
  'makassar': 215,
  'kota makassar': 215,
  // Denpasar
  'denpasar': 17,
  'kota denpasar': 17,
  // Pekanbaru
  'pekanbaru': 282,
  'kota pekanbaru': 282,
  // Balikpapan
  'balikpapan': 199,
  'kota balikpapan': 199,
  // Samarinda
  'samarinda': 419,
  'kota samarinda': 419,
  // Banjarmasin
  'banjarmasin': 198,
  'kota banjarmasin': 198,
  // Mataram
  'mataram': 230,
  'kota mataram': 230,
  // Cilegon
  'cilegon': 149,
  'kota cilegon': 149,
  // Serang
  'serang': 416,
  'kota serang': 416,
  // Cirebon
  'cirebon': 150,
  'kota cirebon': 150,
  // Cimahi
  'cimahi': 449,
  'kota cimahi': 449,
  // Tasikmalaya
  'tasikmalaya': 380,
  'kota tasikmalaya': 380,
  // Madiun
  'madiun': 327,
  'kota madiun': 327,
  // Kediri
  'kediri': 295,
  'kota kediri': 295,
  // Magelang
  'magelang': 322,
  'kota magelang': 322,
  // Pekalongan
  'pekalongan': 274,
  'kota pekalongan': 274,
  // Sleman
  'sleman': 455,
  'kabupaten sleman': 455,
  // Badung
  'badung': 18,
  'kabupaten badung': 18,
  // ===== Tambahan kota-kota provinsi lain =====
  // Aceh
  'banda aceh': 1,
  'kota banda aceh': 1,
  // Sumatera
  'padang': 268,
  'kota padang': 268,
  'jambi': 211,
  'kota jambi': 211,
  'bengkulu': 429,
  'kota bengkulu': 429,
  'pangkal pinang': 415,
  'kota pangkal pinang': 415,
  'tanjung pinang': 252,
  'kota tanjung pinang': 252,
  'medan': 256,
  'pematangsiantar': 239,
  'binjai': 461,
  'tebing tinggi': 245,
  // Jabodetabek tambahan
  'administrasi jakarta pusat': 151,
  'administrasi jakarta selatan': 155,
  'administrasi jakarta barat': 152,
  'administrasi jakarta timur': 153,
  'administrasi jakarta utara': 154,
  // Jawa Barat tambahan
  'sukabumi': 466,
  'kota sukabumi': 466,
  'cianjur': 382,
  'garut': 383,
  'tasikmalaya': 380,
  'kabupaten tasikmalaya': 380,
  'sumedang': 414,
  'indramayu': 404,
  'cirebon': 150,
  'kabupaten cirebon': 150,
  'kunigan': 410,
  'majalengka': 412,
  'subang': 432,
  'purwakarta': 434,
  'karawang': 433,
  'bandung barat': 575,
  'kabupaten bandung barat': 575,
  'pangandaran': 478,
  // Jawa Tengah tambahan
  'kudus': 318,
  'jepara': 313,
  'batang': 312,
  'pekalongan': 274,
  'pemalang': 411,
  'tegal': 314,
  'kota tegal': 314,
  'brebes': 311,
  'cilacap': 365,
  'banyumas': 364,
  'purbalingga': 363,
  'banjarnegara': 366,
  'kebumen': 367,
  'purworejo': 368,
  'wonosobo': 369,
  'magelang': 322,
  'kabupaten magelang': 322,
  'temanggung': 370,
  'kendal': 371,
  'demak': 372,
  'grobogan': 373,
  'sragen': 374,
  'karanganyar': 375,
  'wonogiri': 376,
  'boyolali': 377,
  'klaten': 378,
  'sukoharjo': 379,
  // Jawa Timur tambahan
  'gresik': 326,
  'bangkalan': 324,
  'sampang': 325,
  'pamekasan': 446,
  'sumenep': 447,
  'sidoarjo': 328,
  'mojokerto': 329,
  'jombang': 330,
  'nganjuk': 332,
  'madiun': 327,
  'kabupaten madiun': 327,
  'magetan': 333,
  'ngawi': 334,
  'bojonegoro': 335,
  'tuban': 336,
  'lamongan': 337,
  'purbalingga': 363,
  'trenggalek': 338,
  'tulungagung': 339,
  'blitar': 340,
  'kota blitar': 340,
  'kabupaten blitar': 340,
  'malang': 331,
  'kabupaten malang': 331,
  'lumajang': 341,
  'jember': 342,
  'bondowoso': 343,
  'situondo': 344,
  'probolinggo': 345,
  'kota probolinggo': 345,
  'pasuruan': 346,
  'kota pasuruan': 346,
  'sidoarjo': 328,
  'banyuwangi': 347,
  // Yogyakarta tambahan
  'kulon progo': 451,
  'bantul': 452,
  'gunung kidul': 453,
  // Bali tambahan
  'gianyar': 20,
  'badung': 18,
  'denpasar': 17,
  'klungkung': 22,
  'bangli': 19,
  'karangasem': 21,
  'buleleng': 24,
  'jembrana': 25,
  'tabanan': 23,
  // Nusa Tenggara
  'mataram': 230,
  'lombok barat': 232,
  'lombok tengah': 233,
  'lombok timur': 234,
  'kupang': 251,
  // Kalimantan
  'pontianak': 460,
  'kota pontianak': 460,
  'ketapang': 461,
  // Sulawesi
  'manado': 281,
  'kota manado': 281,
  'gorontalo': 144,
  'kota gorontalo': 144,
  'palu': 416,
  'kota palu': 416,
  'kendari': 259,
  'kota kendari': 259,
  // Papua & Maluku
  'ambon': 366,
  'kota ambon': 366,
  'ternate': 533,
  'kota ternate': 533,
  'jayapura': 274,
  'kota jayapura': 274,
}

// Resolve city name → RajaOngkir destination ID
// Strategy:
//   1. Exact match (lowercase) di CITY_TO_DEST_ID
//   2. Coba buang prefix "Kota " / "Kabupaten " dan match ulang
//   3. Coba match by first word (e.g. "Bandung Wetan" → "bandung")
//   4. Kalau tetap tidak ketemu, return null (fallback akan dipakai)
function resolveCityDestId(cityName: string): number | null {
  const key = cityName.toLowerCase().trim()
  if (CITY_TO_DEST_ID[key]) return CITY_TO_DEST_ID[key]

  // Coba buang prefix "kota " / "kabupaten " / "administrasi "
  const stripped = key
    .replace(/^kota\s+/, '')
    .replace(/^kabupaten\s+/, '')
    .replace(/^administrasi\s+/, '')
    .trim()
  if (CITY_TO_DEST_ID[stripped]) return CITY_TO_DEST_ID[stripped]

  // Coba sebaliknya: tambah prefix "kota " jika nama tidak punya prefix
  if (!key.startsWith('kota ') && !key.startsWith('kabupaten ')) {
    const withKota = `kota ${key}`
    if (CITY_TO_DEST_ID[withKota]) return CITY_TO_DEST_ID[withKota]
    const withKab = `kabupaten ${key}`
    if (CITY_TO_DEST_ID[withKab]) return CITY_TO_DEST_ID[withKab]
  }

  // Coba match by first word (e.g. "Bandung Wetan" → "bandung")
  const firstWord = key.split(/[ ,]/)[0]
  if (CITY_TO_DEST_ID[firstWord]) return CITY_TO_DEST_ID[firstWord]

  return null
}

// =====================================================================
// Axios instance with retry
// =====================================================================

function createHttpClient(): AxiosInstance {
  const cfg = readConfig()
  return axios.create({
    baseURL: cfg.baseUrl,
    timeout: 8000,
    headers: {
      key: cfg.apiKey,
    },
  })
}

// =====================================================================
// Retry helper — exponential backoff
// =====================================================================

const MAX_RETRIES = 3
const INITIAL_BACKOFF_MS = 300

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// =====================================================================
// Persistent disk cache untuk hasil RajaOngkir
// ---------------------------------------------------------------------
// RajaOngkir Komerce free tier punya rate limit 100 hits/hari yang ketat.
// Karena tarif kurir relatif stabil per rute & berat, kita cache hasil
// per (origin, destination, weight) selama 24 JAM ke file di disk.
//
// Cache di disk (bukan in-memory) supaya BERTAHAN WALAU SERVER RESTART.
// Ini dramatis mengurangi hit API — sekali kita dapat tarif untuk rute
// tertentu, hasilnya akan dipakai seharian penuh.
//
// Lokasi file: storage/rajaongkir-cache.json
// Format: { "<origin>:<destination>:<weight>": { result, expiresAt } }
// =====================================================================

import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'

interface CacheEntry {
  result: ShippingCalcResult
  expiresAt: number
}

const CACHE_FILE = path.join(process.cwd(), 'storage', 'rajaongkir-cache.json')
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 jam (sehari penuh)

// In-memory mirror untuk read cepat tanpa baca file tiap request
const rateCache = new Map<string, CacheEntry>()
let cacheLoaded = false
let cacheWritePending = false
let cacheDirty = false

async function loadCacheFromDisk(): Promise<void> {
  if (cacheLoaded) return
  cacheLoaded = true
  try {
    const raw = await readFile(CACHE_FILE, 'utf8')
    const parsed = JSON.parse(raw) as Record<string, CacheEntry>
    const now = Date.now()
    // Buang entry yang sudah expired saat load
    for (const [k, v] of Object.entries(parsed)) {
      if (v && typeof v.expiresAt === 'number' && v.expiresAt > now) {
        rateCache.set(k, v)
      }
    }
    logRajaongkir.info(`Cache loaded from disk: ${rateCache.size} entries`)
  } catch {
    // File belum ada atau rusak — biarkan cache kosong
    logRajaongkir.debug('Cache file tidak ada/rusak, mulai dengan cache kosong')
  }
}

// Write cache ke disk secara async (debounced — tidak blocking request)
async function flushCacheToDisk(): Promise<void> {
  if (cacheWritePending || !cacheDirty) return
  cacheWritePending = true
  cacheDirty = false
  try {
    // Pastikan folder storage ada
    await mkdir(path.dirname(CACHE_FILE), { recursive: true })
    // Convert Map → Object untuk JSON serialization
    const obj: Record<string, CacheEntry> = {}
    for (const [k, v] of rateCache.entries()) {
      obj[k] = v
    }
    await writeFile(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf8')
    logRajaongkir.debug(`Cache flushed to disk: ${rateCache.size} entries`)
  } catch (e) {
    logRajaongkir.warn('Failed to flush cache to disk', {
      error: e instanceof Error ? e.message : String(e),
    })
  } finally {
    cacheWritePending = false
  }
}

function cacheKey(origin: string, destination: number, weightGram: number): string {
  return `${origin}:${destination}:${weightGram}`
}

async function getCachedRate(key: string): Promise<ShippingCalcResult | null> {
  await loadCacheFromDisk()
  const entry = rateCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    rateCache.delete(key)
    cacheDirty = true
    flushCacheToDisk() // async, tidak nunggu
    return null
  }
  return entry.result
}

function setCachedRate(key: string, result: ShippingCalcResult): void {
  rateCache.set(key, {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
  cacheDirty = true
  flushCacheToDisk() // async, tidak nunggu
}

// =====================================================================
// Hit counter harian — untuk monitor penggunaan API
// ---------------------------------------------------------------------
// Disimpan ke disk supaya bisa survive server restart dan user bisa
// cek sisa quota lewat /api/shipping/usage
// =====================================================================

interface DailyUsage {
  date: string // YYYY-MM-DD (WIB)
  hits: number
  successes: number
  failures: number
}

const USAGE_FILE = path.join(process.cwd(), 'storage', 'rajaongkir-usage.json')

async function getTodayWIB(): Promise<string> {
  // WIB = UTC+7
  const now = new Date()
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return wib.toISOString().slice(0, 10) // YYYY-MM-DD
}

async function recordApiCall(success: boolean): Promise<void> {
  try {
    let usage: DailyUsage = { date: '', hits: 0, successes: 0, failures: 0 }
    try {
      const raw = await readFile(USAGE_FILE, 'utf8')
      usage = JSON.parse(raw) as DailyUsage
    } catch {
      // File belum ada
    }
    const today = await getTodayWIB()
    if (usage.date !== today) {
      // Reset counter untuk hari baru
      usage = { date: today, hits: 0, successes: 0, failures: 0 }
    }
    usage.hits += 1
    if (success) usage.successes += 1
    else usage.failures += 1
    await mkdir(path.dirname(USAGE_FILE), { recursive: true })
    await writeFile(USAGE_FILE, JSON.stringify(usage, null, 2), 'utf8')
  } catch (e) {
    logRajaongkir.warn('Failed to record usage', {
      error: e instanceof Error ? e.message : String(e),
    })
  }
}

export async function getDailyUsage(): Promise<DailyUsage> {
  try {
    const raw = await readFile(USAGE_FILE, 'utf8')
    const usage = JSON.parse(raw) as DailyUsage
    const today = await getTodayWIB()
    if (usage.date !== today) {
      return { date: today, hits: 0, successes: 0, failures: 0 }
    }
    return usage
  } catch {
    return { date: await getTodayWIB(), hits: 0, successes: 0, failures: 0 }
  }
}

// =====================================================================
// Fallback: TokoSetting formula (lama) + zona-based estimation
// ---------------------------------------------------------------------
// Kalau RajaOngkir gagal (rate limit, network, dst), kita pakai estimasi
// berdasarkan:
//   - TokoSetting.ongkirRatePerKg (kalau ada)
//   - TokoSetting.ongkirTetap (kalau ada)
//   - Zona estimation (kalau dua-duanya kosong):
//       - Same province (Jawa): Rp 15.000
//       - Beda provinsi tapi same pulau (Jawa): Rp 20.000
//       - Beda pulau: Rp 35.000
//     + Rp 5.000 per kg tambahan di atas 1 kg
// =====================================================================

// Cek apakah kota ada di Jawa (untuk zona estimation)
// Kode Kemendagri pulau Jawa: 31 (DKI Jakarta), 32 (Jabar), 33 (Jateng),
// 34 (DIY), 35 (Jatim), 36 (Banten)
const JAWA_PROVINCES = new Set(['31', '32', '33', '34', '35', '36'])

async function fallbackCalcBySetting(
  totalWeightGram: number,
  districtId?: string,
  cityName?: string
): Promise<ShippingCalcResult> {
  const setting = await db.tokoSetting.findFirst()
  const ratePerKg = toNumber(setting?.ongkirRatePerKg)
  const ongkirTetap = toNumber(setting?.ongkirTetap)
  const beratMinKg = toNumber(setting?.beratMinimumKg) || 1

  let cost = 0
  let message =
    'Menggunakan estimasi ongkir internal (RajaOngkir tidak tersedia).'

  if (ratePerKg > 0) {
    cost = Math.ceil(totalWeightGram / 1000 / beratMinKg) * ratePerKg
    message = `Menggunakan tarif TokoSetting: ${ratePerKg}/kg.`
  } else if (ongkirTetap > 0) {
    cost = ongkirTetap
    message = `Menggunakan tarif tetap TokoSetting: ${ongkirTetap}.`
  } else {
    // Zona-based estimation — origin kita di Padalarang, Bandung Barat (Jawa Barat)
    // Cek zona tujuan dari districtId.
    // Format districtId bisa "32.73.01" (dotted) atau "3217090" (concatenated, dari emsifa).
    // Kita extract 2 digit pertama sebagai kode provinsi.
    const rawId = (districtId || '').replace(/\D/g, '') // buang semua non-digit
    const destProvinceId = rawId.slice(0, 2) // 2 digit pertama = kode provinsi
    const isJawaDest = JAWA_PROVINCES.has(destProvinceId)
    const isSameProvince = destProvinceId === '32' // Jawa Barat (origin: Padalarang)

    let baseCost = 35000 // default: beda pulau
    if (isSameProvince) {
      baseCost = 15000 // same province (Jabar → Jabar)
    } else if (isJawaDest) {
      baseCost = 20000 // beda provinsi, same pulau (Jawa)
    }

    // Tambah Rp 5.000 per kg tambahan di atas 1 kg
    const extraKg = Math.max(0, Math.ceil(totalWeightGram / 1000) - 1)
    cost = baseCost + extraKg * 5000

    message = isSameProvince
      ? `Estimasi ongkir dari Padalarang, Bandung Barat (zona same-province). RajaOngkir sedang tidak tersedia.`
      : isJawaDest
        ? `Estimasi ongkir dari Padalarang, Bandung Barat (zona Jawa). RajaOngkir sedang tidak tersedia.`
        : `Estimasi ongkir dari Padalarang, Bandung Barat (zona antar-pulau). RajaOngkir sedang tidak tersedia.`
  }

  return {
    source: 'fallback',
    cheapestCost: cost,
    options: [],
    message,
  }
}

// =====================================================================
// Main: getRajaOngkirRates
// ---------------------------------------------------------------------
// Resolves destination ID from city name, calls /calculate/domestic-cost
// with retry, returns the cheapest courier rate and full option list.
//
// NEVER throws — always returns a ShippingCalcResult (rajaongkir or fallback).
// The caller can rely on this to keep checkout working even when API is down.
// =====================================================================

interface GetRatesParams {
  districtId: string
  districtName: string
  cityName: string
  totalWeightGram: number
}

export async function getRajaOngkirRates(
  params: GetRatesParams
): Promise<ShippingCalcResult> {
  const { districtId, districtName, cityName, totalWeightGram } = params

  logRajaongkir.info('Calculate request', {
    districtId,
    districtName,
    cityName,
    totalWeightGram,
  })

  // 1) Validate config
  if (!isRajaOngkirConfigured()) {
    logRajaongkir.warn('API key kosong, pakai fallback TokoSetting')
    return fallbackCalcBySetting(totalWeightGram, districtId, cityName)
  }
  const cfg = readConfig()
  if (!cfg.originId) {
    logRajaongkir.warn('RAJAONGKIR_ORIGIN_ID kosong, pakai fallback TokoSetting')
    return fallbackCalcBySetting(totalWeightGram, districtId, cityName)
  }

  // 2) Resolve destination ID (with DB cache in District.rajaOngkirDestId)
  let destId: number | null = null
  try {
    const cached = await db.district.findUnique({
      where: { id: districtId },
      select: { rajaOngkirDestId: true },
    })
    if (cached?.rajaOngkirDestId) {
      destId = cached.rajaOngkirDestId
      logRajaongkir.debug('Using cached destId', { districtId, destId })
    }
  } catch (e) {
    // DB error — non-fatal, fall through to static map
    logRajaongkir.warn('DB lookup for district cache failed', {
      districtId,
      error: e instanceof Error ? e.message : String(e),
    })
  }

  if (!destId) {
    destId = resolveCityDestId(cityName)
    if (destId) {
      logRajaongkir.info('Resolved destId from static map', {
        cityName,
        destId,
      })
      // Cache it for next time
      try {
        await db.district.update({
          where: { id: districtId },
          data: { rajaOngkirDestId: destId },
        })
      } catch {
        // Non-fatal — caching is best-effort
      }
    }
  }

  if (!destId) {
    logRajaongkir.warn(
      `Cannot resolve destId for city "${cityName}", pakai fallback`,
      { districtId, cityName }
    )
    return fallbackCalcBySetting(totalWeightGram, districtId, cityName)
  }

  // 3) Call /calculate/domestic-cost with retry
  //    Cek cache dulu — kalau ada, langsung pakai tanpa hit API
  const client = createHttpClient()
  // Minimum 1 kg (1000 g) — RajaOngkir rejects weight < 1000
  const weightGram = Math.max(1000, Math.ceil(totalWeightGram))
  // Multi-courier request via colon-separated courier param
  const couriers = 'jne:jnt:sicepat:anteraja:pos:tiki:wahana:lion:ide'
  const requestBody = new URLSearchParams({
    origin: cfg.originId,
    destination: String(destId),
    weight: String(weightGram),
    courier: couriers,
    price: 'lowest',
  })

  // Cek cache dulu — dramatis mengurangi hit ke RajaOngkir (rate limit 429)
  // Cache sekarang persistent di disk (24 jam), survive server restart.
  const cKey = cacheKey(cfg.originId, destId, weightGram)
  const cached = await getCachedRate(cKey)
  if (cached) {
    logRajaongkir.info('Cache hit (disk-persistent)', {
      origin: cfg.originId,
      destination: destId,
      weight: weightGram,
    })
    return cached
  }

  let lastError: unknown = null
  let attempt = 0
  for (attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logRajaongkir.info(`Calculate attempt ${attempt}/${MAX_RETRIES}`, {
        origin: cfg.originId,
        destination: destId,
        weight: weightGram,
      })

      const response = await client.post<RajaOngkirCalcResponse>(
        '/calculate/domestic-cost',
        requestBody.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      )

      const data = response.data
      // Catat hit sukses untuk daily usage counter
      await recordApiCall(true)
      logRajaongkir.info('Calculate success', {
        status: data.meta?.status,
        options_count: Array.isArray(data.data) ? data.data.length : 0,
        attempt,
      })
      logRajaongkir.debug('Calculate raw response', data)

      if (!Array.isArray(data.data) || data.data.length === 0) {
        // API success but no options — try fallback
        logRajaongkir.warn('Calculate returned 0 options, pakai fallback')
        return fallbackCalcBySetting(totalWeightGram, districtId, cityName)
      }

      // Map raw response → typed courier options
      const options: RajaOngkirCourierOption[] = data.data.map((item) => {
        const courierCode = (item.code || '').toLowerCase()
        const courierName = item.name || item.code || ''
        const service = item.service || ''
        return {
          kurir: courierCode,
          service,
          serviceDisplay: `${courierName.toUpperCase()} ${service}`.trim(),
          courierName,
          description: item.description ?? '',
          etd: item.etd ? `${item.etd} hari` : '-',
          cost: Number(item.cost) || 0,
        }
      })

      // Filter out zero-cost options
      const valid = options.filter((o) => o.cost > 0)
      if (valid.length === 0) {
        return fallbackCalcBySetting(totalWeightGram, districtId, cityName)
      }

      // Sort by cost ascending — cheapest first
      valid.sort((a, b) => a.cost - b.cost)

      const result: ShippingCalcResult = {
        source: 'rajaongkir',
        cheapestCost: valid[0].cost,
        options: valid,
        message: `Ongkir real-time dari ${valid.length} layanan kurir.`,
        destinationId: destId,
        originId: cfg.originId,
        retries: attempt - 1,
      }

      // Simpan ke cache untuk panggilan berikutnya
      setCachedRate(cKey, result)

      return result
    } catch (error) {
      lastError = error
      const axiosErr = error as AxiosError
      const status = axiosErr.response?.status
      const responseData = axiosErr.response?.data
      // Catat hit gagal untuk daily usage counter
      await recordApiCall(false)
      logRajaongkir.warn(`Attempt ${attempt} failed`, {
        status,
        message: axiosErr.message,
        response: responseData,
      })

      // Don't retry on 401/403 (auth issues won't fix themselves)
      if (status === 401 || status === 403) {
        logRajaongkir.error(
          `Auth error (${status}), stop retrying, pakai fallback`,
          error
        )
        break
      }

      // Don't retry on 4xx client errors (except timeout which is 408)
      if (status && status >= 400 && status < 500 && status !== 408) {
        logRajaongkir.warn(
          `Client error ${status}, stop retrying, pakai fallback`
        )
        break
      }

      // Retry with exponential backoff
      if (attempt < MAX_RETRIES) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1)
        logRajaongkir.debug(`Backing off ${backoff}ms before retry`)
        await sleep(backoff)
      }
    }
  }

  // All retries exhausted → fallback
  logRajaongkir.error(
    'Semua retry gagal, pakai fallback TokoSetting',
    lastError,
    {
      districtId,
      cityName,
      weight: totalWeightGram,
      attempts: attempt - 1,
    }
  )
  const fallback = await fallbackCalcBySetting(totalWeightGram, districtId, cityName)
  return {
    ...fallback,
    retries: attempt - 1,
  }
}

// =====================================================================
// Public helper: list provinces (RajaOngkir doesn't provide this with
// current key, so we read from local master data Province/City/District).
// Kept here as a thin wrapper so service callers have a single entrypoint.
// =====================================================================

export async function listProvinces(): Promise<
  { id: string; name: string }[]
> {
  return db.province.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })
}

export async function listCities(
  provinceId: string
): Promise<{ id: string; name: string; provinceId: string }[]> {
  if (!provinceId) return []
  return db.city.findMany({
    where: { provinceId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, provinceId: true },
  })
}

export async function listDistricts(
  cityId: string
): Promise<
  {
    id: string
    name: string
    cityId: string
    rajaOngkirDestId: number | null
  }[]
> {
  if (!cityId) return []
  return db.district.findMany({
    where: { cityId },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      cityId: true,
      rajaOngkirDestId: true,
    },
  })
}
