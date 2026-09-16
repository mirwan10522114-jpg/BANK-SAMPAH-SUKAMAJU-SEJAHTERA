import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseRoles, toNumber } from '@/lib/format'
import { nextMemberCode } from '@/lib/business'

// PUT: update pengguna + SYNC everything (roles → create/delete anggota koperasi, saldo, member code)
// When "Perbarui & Sinkronisasi" is clicked:
// - Update pengguna fields (name, email, nik, phone, address, password, emailVerified, roles)
// - If 'nasabah' role ADDED: ensure saldo exists + generate member code BS***
// - If 'nasabah' role REMOVED: clear member code, keep saldo (for history)
// - If 'koperasi' role ADDED: create KoperasiAnggota (KP***) + 3 simpanan saldos + set isMember
// - If 'koperasi' role REMOVED: mark anggota as 'keluar' (soft delete to preserve history)
// - isMember flag synced with koperasi role

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { name, email, nik, phone, address, password, emailVerified, roles } = body as {
    name: string
    email: string
    nik?: string
    phone?: string
    address?: string
    password?: string
    emailVerified: boolean
    roles: string[]
    verificationStatus?: string
  }

  const pengguna = await db.pengguna.findUnique({ where: { id }, include: { koperasiAnggota: true, saldo: true } })
  if (!pengguna) return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 })

  const oldRoles = parseRoles(pengguna.roles)
  const newRoles = roles || []
  const hadNasabah = oldRoles.includes('nasabah')
  const hasNasabah = newRoles.includes('nasabah')
  const hadKoperasi = oldRoles.includes('koperasi')
  const hasKoperasi = newRoles.includes('koperasi')

  const syncLog: string[] = []

  const updateData: any = {
    name,
    email,
    nik: nik || null,
    phone: phone || null,
    address: address || null,
    roles: JSON.stringify(newRoles),
    isMember: hasKoperasi,
    emailVerifiedAt: emailVerified ? (pengguna.emailVerifiedAt || new Date()) : null,
  }
  
  if (body.verificationStatus) {
    updateData.verificationStatus = body.verificationStatus
    if (body.verificationStatus === 'verified' && pengguna.verificationStatus !== 'verified') {
      updateData.adminVerifiedAt = new Date()
    }
  }

  if (password && password.trim()) {
    updateData.password = password
  }
  if (hasKoperasi && !pengguna.memberJoinedAt) {
    updateData.memberJoinedAt = new Date()
  }

  // 2. Nasabah sync — ensure saldo + member code whenever nasabah role is present
  if (hasNasabah) {
    if (!pengguna.saldo) {
      await db.saldo.create({ data: { penggunaId: id } })
      syncLog.push('Created saldo record')
    }
    if (!pengguna.memberCode) {
      updateData.memberCode = await nextMemberCode('BS')
      syncLog.push(`Generated member code BS: ${updateData.memberCode}`)
    }
  }
  if (!hasNasabah && hadNasabah) {
    // Removed nasabah role → clear member code (keep saldo for history)
    if (pengguna.memberCode) {
      updateData.memberCode = null
      syncLog.push('Cleared member code (nasabah role removed)')
    }
  }

  // 3. Koperasi sync — create anggota whenever koperasi role is present but anggota missing
  if (hasKoperasi && !pengguna.koperasiAnggota) {
    // First check if there's an existing pasif anggota with same noKtp or nama — reactivate it instead of creating new
    const existingPasif = await db.koperasiAnggota.findFirst({
      where: {
        status: { in: ['pasif', 'keluar'] },
        OR: [
          ...(nik ? [{ noKtp: nik }] : []),
          { nama: name },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    })

    if (existingPasif) {
      // Reactivate the existing pasif anggota
      await db.koperasiAnggota.update({
        where: { id: existingPasif.id },
        data: {
          status: 'aktif',
          tanggalKeluar: null,
          penggunaId: id,
          nama: name,
          noKtp: nik || '',
          noTelepon: phone,
          alamat: address,
        },
      })
      // Ensure simpanan saldos exist
      const existingSaldos = await db.koperasiSimpananSaldo.count({ where: { koperasiAnggotaId: existingPasif.id } })
      if (existingSaldos < 3) {
        for (const jenis of ['pokok', 'wajib', 'sukarela'] as const) {
          const exists = await db.koperasiSimpananSaldo.findUnique({
            where: { koperasiAnggotaId_jenisSimpanan: { koperasiAnggotaId: existingPasif.id, jenisSimpanan: jenis } },
          })
          if (!exists) {
            await db.koperasiSimpananSaldo.create({ data: { koperasiAnggotaId: existingPasif.id, jenisSimpanan: jenis, saldo: 0 } })
          }
        }
      }
      syncLog.push(`Reactivated anggota koperasi: ${existingPasif.nomorAnggota}`)
    } else {
      // No existing pasif anggota — create new
      const counter = await db.koperasiAnggota.count({ where: { status: 'aktif' } })
      const existingMax = await db.koperasiAnggota.findFirst({ orderBy: { nomorAnggota: 'desc' } })
      let nextNum = counter + 1
      if (existingMax) {
        const m = existingMax.nomorAnggota.match(/(\d+)/)
        if (m) nextNum = Math.max(nextNum, parseInt(m[1], 10) + 1)
      }
      const nomor = `KP${String(nextNum).padStart(3, '0')}`
      const agt = await db.koperasiAnggota.create({
        data: {
          nomorAnggota: nomor,
          nama: name,
          noKtp: nik || '',
          noTelepon: phone,
          alamat: address,
          status: 'aktif',
          tanggalBergabung: new Date(),
          penggunaId: id,
        },
      })
      for (const jenis of ['pokok', 'wajib', 'sukarela'] as const) {
        await db.koperasiSimpananSaldo.create({
          data: { koperasiAnggotaId: agt.id, jenisSimpanan: jenis, saldo: 0 },
        })
      }
      syncLog.push(`Created anggota koperasi: ${nomor} + 3 simpanan saldos`)
    }
  }
  if (!hasKoperasi && hadKoperasi && pengguna.koperasiAnggota) {
    // Removed koperasi role → mark anggota as 'pasif' (inactive) to preserve history & allow reactivation
    await db.koperasiAnggota.update({
      where: { id: pengguna.koperasiAnggota.id },
      data: { status: 'pasif', penggunaId: null },
    })
    syncLog.push('Menonaktifkan anggota koperasi (status: pasif)')
  }
  if (hasKoperasi && pengguna.koperasiAnggota && pengguna.koperasiAnggota.status !== 'aktif') {
    // Reactivate anggota if it was pasif/keluar
    await db.koperasiAnggota.update({
      where: { id: pengguna.koperasiAnggota.id },
      data: { status: 'aktif', tanggalKeluar: null, penggunaId: id, nama: name, noKtp: nik || '', noTelepon: phone, alamat: address },
    })
    syncLog.push('Mengaktifkan kembali anggota koperasi')
  } else if (hasKoperasi && pengguna.koperasiAnggota && pengguna.koperasiAnggota.status === 'aktif') {
    // Update anggota info (name, phone, address) to keep in sync
    await db.koperasiAnggota.update({
      where: { id: pengguna.koperasiAnggota.id },
      data: {
        nama: name,
        noKtp: nik || '',
        noTelepon: phone,
        alamat: address,
      },
    })
  }

  // 4. Execute pengguna update
  const updated = await db.pengguna.update({
    where: { id },
    data: updateData,
    include: { saldo: true, koperasiAnggota: { include: { simpananSaldos: true } } },
  })

  return NextResponse.json({
    pengguna: updated,
    syncLog,
    changes: {
      rolesChanged: JSON.stringify(oldRoles.sort()) !== JSON.stringify(newRoles.sort()),
      nasabahAdded: hasNasabah && !hadNasabah,
      nasabahRemoved: !hasNasabah && hadNasabah,
      koperasiAdded: hasKoperasi && !hadKoperasi,
      koperasiRemoved: !hasKoperasi && hadKoperasi,
    },
  })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pengguna = await db.pengguna.findUnique({ where: { id }, include: { koperasiAnggota: true, saldo: true } })
  if (!pengguna) return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 })
  if (pengguna.email === 'admin@gmail.com') return NextResponse.json({ error: 'Admin utama tidak dapat dihapus' }, { status: 400 })

  // Cleanup related records
  if (pengguna.koperasiAnggota) {
    await db.koperasiAnggota.update({
      where: { id: pengguna.koperasiAnggota.id },
      data: { status: 'keluar', tanggalKeluar: new Date(), penggunaId: null },
    })
  }
  if (pengguna.saldo) {
    await db.saldo.delete({ where: { penggunaId: id } })
  }
  await db.pengguna.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
