import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'
import { toNumber } from '@/lib/format'

// GET: Return TokoSetting (create default if not exists)
export async function GET(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let setting = await db.tokoSetting.findFirst()

  if (!setting) {
    setting = await db.tokoSetting.create({ data: {} })
  }

  return NextResponse.json({
    id: setting.id,
    ongkirRatePerKg: toNumber(setting.ongkirRatePerKg),
    ongkirRatePerKm: toNumber(setting.ongkirRatePerKm),
    ongkirTetap: toNumber(setting.ongkirTetap),
    beratMinimumKg: toNumber(setting.beratMinimumKg),
    originLatitude: setting.originLatitude ? toNumber(setting.originLatitude) : null,
    originLongitude: setting.originLongitude ? toNumber(setting.originLongitude) : null,
    originAddress: setting.originAddress,
    midtransServerKey: setting.midtransServerKey,
    midtransClientKey: setting.midtransClientKey,
    midtransIsProduction: setting.midtransIsProduction,
    stokRendahThreshold: setting.stokRendahThreshold,
    tokoOnlineAktif: setting.tokoOnlineAktif,
  })
}

// PUT: Update TokoSetting
export async function PUT(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    ongkirRatePerKg,
    ongkirRatePerKm,
    ongkirTetap,
    beratMinimumKg,
    originLatitude,
    originLongitude,
    originAddress,
    midtransServerKey,
    midtransClientKey,
    midtransIsProduction,
    stokRendahThreshold,
    tokoOnlineAktif,
  } = body

  let setting = await db.tokoSetting.findFirst()

  const data: any = {}
  if (ongkirRatePerKg !== undefined) data.ongkirRatePerKg = toNumber(ongkirRatePerKg)
  if (ongkirRatePerKm !== undefined) data.ongkirRatePerKm = toNumber(ongkirRatePerKm)
  if (ongkirTetap !== undefined) data.ongkirTetap = toNumber(ongkirTetap)
  if (beratMinimumKg !== undefined) data.beratMinimumKg = toNumber(beratMinimumKg)
  if (originLatitude !== undefined) data.originLatitude = originLatitude
  if (originLongitude !== undefined) data.originLongitude = originLongitude
  if (originAddress !== undefined) data.originAddress = originAddress
  if (midtransServerKey !== undefined) data.midtransServerKey = midtransServerKey
  if (midtransClientKey !== undefined) data.midtransClientKey = midtransClientKey
  if (midtransIsProduction !== undefined) data.midtransIsProduction = midtransIsProduction
  if (stokRendahThreshold !== undefined) data.stokRendahThreshold = stokRendahThreshold
  if (tokoOnlineAktif !== undefined) data.tokoOnlineAktif = tokoOnlineAktif

  if (!setting) {
    setting = await db.tokoSetting.create({ data })
  } else {
    setting = await db.tokoSetting.update({
      where: { id: setting.id },
      data,
    })
  }

  return NextResponse.json({
    id: setting.id,
    ongkirRatePerKg: toNumber(setting.ongkirRatePerKg),
    ongkirRatePerKm: toNumber(setting.ongkirRatePerKm),
    ongkirTetap: toNumber(setting.ongkirTetap),
    beratMinimumKg: toNumber(setting.beratMinimumKg),
    originLatitude: setting.originLatitude ? toNumber(setting.originLatitude) : null,
    originLongitude: setting.originLongitude ? toNumber(setting.originLongitude) : null,
    originAddress: setting.originAddress,
    midtransServerKey: setting.midtransServerKey,
    midtransClientKey: setting.midtransClientKey,
    midtransIsProduction: setting.midtransIsProduction,
    stokRendahThreshold: setting.stokRendahThreshold,
    tokoOnlineAktif: setting.tokoOnlineAktif,
  })
}