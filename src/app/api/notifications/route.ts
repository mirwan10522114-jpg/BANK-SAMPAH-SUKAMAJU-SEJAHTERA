import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'

// GET: Ambil notifikasi user login
export async function GET(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const notifs = await db.notification.findMany({
    where: { userId: actor.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json(notifs)
}

// PATCH: Mark as read
export async function PATCH(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  
  if (body.id) {
    // mark single
    const updated = await db.notification.updateMany({
      where: { id: body.id, userId: actor.id },
      data: { isRead: true },
    })
    return NextResponse.json({ success: true, count: updated.count })
  } else {
    // mark all
    const updated = await db.notification.updateMany({
      where: { userId: actor.id, isRead: false },
      data: { isRead: true },
    })
    return NextResponse.json({ success: true, count: updated.count })
  }
}
