// =====================================================================
// File-based logger for Midtrans & RajaOngkir integration
// ---------------------------------------------------------------------
// Writes to storage/logs/<channel>.log with rotation-friendly naming.
// Each line is a JSON object for easy parsing by external log shippers.
// =====================================================================

import { appendFile, mkdir } from 'fs/promises'
import path from 'path'

const LOG_ROOT = path.join(process.cwd(), 'storage', 'logs')

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  ts: string
  level: LogLevel
  channel: string
  message: string
  data?: unknown
  error?: string
}

// Ensure log directory exists (idempotent)
async function ensureDir(): Promise<void> {
  await mkdir(LOG_ROOT, { recursive: true })
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

async function writeLog(
  channel: string,
  level: LogLevel,
  message: string,
  data?: unknown,
  error?: unknown
): Promise<void> {
  try {
    await ensureDir()
    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      channel,
      message,
    }
    if (data !== undefined) entry.data = data
    if (error !== undefined) {
      entry.error =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : safeStringify(error)
    }
    const line = safeStringify(entry) + '\n'
    const filename = `${channel}.log`
    await appendFile(path.join(LOG_ROOT, filename), line, 'utf8')
  } catch (e) {
    // Logger must NEVER break the main flow — fall back to console only
    // eslint-disable-next-line no-console
    console.error('[logger] failed to write log:', e)
  }
}

// =====================================================================
// Channel-specific helpers
// =====================================================================

export const logMidtrans = {
  info: (message: string, data?: unknown) =>
    writeLog('midtrans', 'info', message, data),
  warn: (message: string, data?: unknown) =>
    writeLog('midtrans', 'warn', message, data),
  error: (message: string, error?: unknown, data?: unknown) =>
    writeLog('midtrans', 'error', message, data, error),
  debug: (message: string, data?: unknown) =>
    writeLog('midtrans', 'debug', message, data),
}

export const logRajaongkir = {
  info: (message: string, data?: unknown) =>
    writeLog('rajaongkir', 'info', message, data),
  warn: (message: string, data?: unknown) =>
    writeLog('rajaongkir', 'warn', message, data),
  error: (message: string, error?: unknown, data?: unknown) =>
    writeLog('rajaongkir', 'error', message, data, error),
  debug: (message: string, data?: unknown) =>
    writeLog('rajaongkir', 'debug', message, data),
}

export const logWebhook = {
  info: (message: string, data?: unknown) =>
    writeLog('midtrans-webhook', 'info', message, data),
  warn: (message: string, data?: unknown) =>
    writeLog('midtrans-webhook', 'warn', message, data),
  error: (message: string, error?: unknown, data?: unknown) =>
    writeLog('midtrans-webhook', 'error', message, data, error),
  debug: (message: string, data?: unknown) =>
    writeLog('midtrans-webhook', 'debug', message, data),
}

export const logCheckout = {
  info: (message: string, data?: unknown) =>
    writeLog('checkout', 'info', message, data),
  warn: (message: string, data?: unknown) =>
    writeLog('checkout', 'warn', message, data),
  error: (message: string, error?: unknown, data?: unknown) =>
    writeLog('checkout', 'error', message, data, error),
}
