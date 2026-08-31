import { db } from '@/lib/db'

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function getDailyTaskLogs(dateString?: string) {
  try {
    const targetDate = dateString || getLocalDateString()
    const logs: any[] = await db.$queryRawUnsafe(
      `SELECT * FROM AdminDailyTaskLog WHERE dateString = ?`,
      targetDate
    )
    return logs || []
  } catch (error) {
    console.warn('[getDailyTaskLogs] Error:', error)
    return []
  }
}

export async function recordDailyTaskLog({
  taskKey,
  dateString,
  action = 'blast_email',
  sentCount = 1,
  failedCount = 0,
  notes = '',
}: {
  taskKey: string
  dateString?: string
  action?: string
  sentCount?: number
  failedCount?: number
  notes?: string
}) {
  try {
    const targetDate = dateString || getLocalDateString()
    const id = `tasklog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    await db.$executeRawUnsafe(
      `INSERT INTO AdminDailyTaskLog (id, taskKey, dateString, action, sentCount, failedCount, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE 
         action = VALUES(action),
         sentCount = sentCount + VALUES(sentCount),
         failedCount = VALUES(failedCount),
         notes = VALUES(notes),
         updatedAt = NOW()`,
      id,
      taskKey,
      targetDate,
      action,
      sentCount,
      failedCount,
      notes
    )
    return { success: true }
  } catch (error: any) {
    console.error('[recordDailyTaskLog] Error:', error)
    return { success: false, error: error.message }
  }
}
