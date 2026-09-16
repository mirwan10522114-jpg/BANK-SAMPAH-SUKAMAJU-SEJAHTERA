import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET — fetch own profile (safe fields only)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: penggunaId } = await params
    const pengguna = await db.pengguna.findUnique({
      where: { id: penggunaId },
      select: {
        id: true,
        memberCode: true,
        name: true,
        email: true,
        nik: true,
        phone: true,
        address: true,
        roles: true,
        isMember: true,
        memberJoinedAt: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    })
    if (!pengguna) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 })
    }
    return NextResponse.json({ pengguna })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Gagal memuat profil' }, { status: 500 })
  }
}

// PATCH — update own profile (name, phone, address, nik) + optional password change
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: penggunaId } = await params
    const body = await req.json()
    const { name, phone, address, nik, currentPassword, newPassword } = body as {
      name?: string
      phone?: string
      address?: string
      nik?: string
      currentPassword?: string
      newPassword?: string
    }

    // Fetch existing pengguna (with password for verification)
    const existing = await db.pengguna.findUnique({ where: { id: penggunaId } })
    if (!existing) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 })
    }

    const updateData: any = {}
    if (name && name.trim()) updateData.name = name.trim()
    if (phone !== undefined) updateData.phone = phone.trim() || null
    if (address !== undefined) updateData.address = address.trim() || null
    if (nik !== undefined && nik.trim()) {
      // Check uniqueness if changing
      if (nik.trim() !== existing.nik) {
        const conflict = await db.pengguna.findFirst({
          where: { nik: nik.trim(), NOT: { id: penggunaId } },
        })
        if (conflict) {
          return NextResponse.json({ error: 'NIK sudah digunakan pengguna lain' }, { status: 400 })
        }
        updateData.nik = nik.trim()
      }
    }

    // Password change (optional)
    if (newPassword && newPassword.trim()) {
      if (newPassword.length < 8) {
        return NextResponse.json({ error: 'Password baru minimal 8 karakter' }, { status: 400 })
      }
      if (!currentPassword || currentPassword !== existing.password) {
        return NextResponse.json({ error: 'Password saat ini salah' }, { status: 400 })
      }
      updateData.password = newPassword.trim()
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Tidak ada perubahan untuk disimpan' }, { status: 400 })
    }

    const updated = await db.pengguna.update({
      where: { id: penggunaId },
      data: updateData,
      select: {
        id: true,
        memberCode: true,
        name: true,
        email: true,
        nik: true,
        phone: true,
        address: true,
        roles: true,
        isMember: true,
      },
    })

    return NextResponse.json({ pengguna: updated, message: 'Profil berhasil diperbarui' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Gagal memperbarui profil' }, { status: 500 })
  }
}
