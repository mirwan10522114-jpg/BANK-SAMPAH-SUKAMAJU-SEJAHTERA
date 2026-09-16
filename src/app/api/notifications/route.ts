import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getActingUser } from '@/lib/business'
import { toNumber, formatRupiah } from '@/lib/format'

export type AdminNotificationItem = {
  id: string
  category: 'transaksi' | 'user_baru' | 'sistem'
  type: 'nabung' | 'sedekah' | 'penarikan' | 'penukaran' | 'toko' | 'pos' | 'simpanan' | 'pinjaman' | 'register' | 'sistem'
  title: string
  message: string
  amount?: number
  timestamp: string
  status?: string
  meta?: any
  isRead?: boolean
}

// GET: Ambil notifikasi admin (Hanya Transaksi Sukses & Pengguna Baru Mendaftar)
export async function GET(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = actor.roles?.includes('admin') || actor.roles?.includes('pengurus') || actor.roles?.includes('teller')

  // Bersihkan notifikasi log spam lama dari database
  try {
    await db.notifikasi.deleteMany({
      where: {
        OR: [
          { title: { startsWith: 'Aktivitas:' } },
          { message: { contains: 'Sistem mendeteksi proses' } },
        ],
      },
    })
  } catch {}

  // Jika bukan admin/petugas, kembalikan notifikasi langsung miliknya
  if (!isAdmin) {
    const notifs = await db.notifikasi.findMany({
      where: { penggunaId: actor.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json(notifs)
  }

  const items: AdminNotificationItem[] = []

  // 1. Transaksi Nabung Sampah (exclude dibatalkan)
  try {
    const nabungList = await db.transaksiNabung.findMany({
      where: { status: { not: 'dibatalkan' } },
      include: {
        pengguna: { select: { name: true, memberCode: true } },
      },
      orderBy: { transactedAt: 'desc' },
      take: 20,
    })

    for (const t of nabungList) {
      const berat = toNumber(t.totalWeight)
      const nilai = toNumber(t.totalValue)
      const poin = t.pointsAwarded || 0
      const nasabahName = t.pengguna?.name || 'Nasabah'
      items.push({
        id: `nabung-${t.id}`,
        category: 'transaksi',
        type: 'nabung',
        title: `Setoran Sampah: ${nasabahName}`,
        message: `Nabung ${berat.toFixed(2)} kg senilai ${formatRupiah(nilai)} (+${poin} poin). Status: ${t.status === 'selesai' ? 'Selesai (Saldo Masuk)' : 'Menunggu QC'}. Kode: ${t.kodeTransaksi || '-'}`,
        amount: nilai,
        timestamp: t.transactedAt.toISOString(),
        status: t.status,
        meta: {
          kodeTransaksi: t.kodeTransaksi,
          totalWeight: berat,
          totalValue: nilai,
          pointsAwarded: poin,
        },
      })
    }
  } catch (err) {
    console.error('[Admin Notif - Nabung Error]', err)
  }

  // 2. Transaksi Sedekah Sampah
  try {
    const sedekahList = await db.transaksiSedekah.findMany({
      orderBy: { transactedAt: 'desc' },
      take: 15,
    })

    for (const s of sedekahList) {
      const berat = toNumber(s.totalWeight)
      const nama = s.donorName || 'Warga (Anonim)'
      items.push({
        id: `sedekah-${s.id}`,
        category: 'transaksi',
        type: 'sedekah',
        title: `Sedekah Sampah: ${nama}`,
        message: `Donasi sampah seberat ${berat.toFixed(2)} kg telah diterima. Kode: ${s.kodeTransaksi || '-'}`,
        amount: 0,
        timestamp: s.transactedAt.toISOString(),
        status: 'diterima',
        meta: { kodeTransaksi: s.kodeTransaksi, totalWeight: berat },
      })
    }
  } catch (err) {
    console.error('[Admin Notif - Sedekah Error]', err)
  }

  // 3. Transaksi Penarikan Saldo (Withdrawals)
  try {
    const withdrawalList = await db.permintaanPenarikan.findMany({
      include: {
        pengguna: { select: { name: true, memberCode: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
    })

    for (const w of withdrawalList) {
      const amount = toNumber(w.amount)
      const nama = w.pengguna?.name || 'Nasabah'
      items.push({
        id: `penarikan-${w.id}`,
        category: 'transaksi',
        type: 'penarikan',
        title: `Penarikan Saldo: ${nama}`,
        message: `Penarikan saldo sebesar ${formatRupiah(amount)} (${w.status}). Kuitansi: ${w.receiptNo || '-'}`,
        amount,
        timestamp: w.createdAt.toISOString(),
        status: w.status,
        meta: { receiptNo: w.receiptNo, amount },
      })
    }
  } catch (err) {
    console.error('[Admin Notif - Penarikan Error]', err)
  }

  // 4. Penukaran Poin Reward (Redemptions)
  try {
    const redemptionList = await db.penukaranPoin.findMany({
      include: {
        pengguna: { select: { name: true, memberCode: true } },
      },
      orderBy: { redeemedAt: 'desc' },
      take: 15,
    })

    for (const r of redemptionList) {
      const nama = r.pengguna?.name || 'Nasabah'
      items.push({
        id: `penukaran-${r.id}`,
        category: 'transaksi',
        type: 'penukaran',
        title: `Penukaran Poin: ${nama}`,
        message: `Menukar ${toNumber(r.quantity)}x ${r.productNameSnapshot} dengan ${r.pointsUsed} poin.`,
        amount: 0,
        timestamp: r.redeemedAt.toISOString(),
        status: 'sukses',
        meta: { pointsUsed: r.pointsUsed, produk: r.productNameSnapshot },
      })
    }
  } catch (err) {
    console.error('[Admin Notif - Penukaran Error]', err)
  }

  // 5. Pesanan Toko Online (PesananToko)
  try {
    const pesananTokos = await db.pesananToko.findMany({
      orderBy: { createdAt: 'desc' },
      take: 15,
    })

    for (const o of pesananTokos) {
      const total = toNumber(o.totalBayar)
      items.push({
        id: `toko-${o.id}`,
        category: 'transaksi',
        type: 'toko',
        title: `Pesanan Toko: ${o.orderNumber}`,
        message: `Pesanan dari ${o.buyerName} senilai ${formatRupiah(total)}. Status: ${o.orderStatus}.`,
        amount: total,
        timestamp: o.createdAt.toISOString(),
        status: o.orderStatus,
        meta: { orderNumber: o.orderNumber, totalBayar: total },
      })
    }
  } catch (err) {
    console.error('[Admin Notif - Toko Error]', err)
  }

  // 6. Penjualan POS Offline (PenjualanProduk)
  try {
    const posSales = await db.penjualanProduk.findMany({
      where: { channel: 'offline' },
      orderBy: { transactedAt: 'desc' },
      take: 15,
    })

    for (const p of posSales) {
      const total = toNumber(p.totalValue)
      items.push({
        id: `pos-${p.id}`,
        category: 'transaksi',
        type: 'pos',
        title: `Penjualan POS Kasir: ${p.invoiceNumber}`,
        message: `Transaksi kasir offline senilai ${formatRupiah(total)}. (${p.paymentMethod}).`,
        amount: total,
        timestamp: p.transactedAt.toISOString(),
        status: p.paymentStatus,
        meta: { invoiceNumber: p.invoiceNumber, totalValue: total },
      })
    }
  } catch (err) {
    console.error('[Admin Notif - POS Error]', err)
  }

  // 7. Koperasi Simpanan (KoperasiSimpananTx)
  try {
    const simpananList = await db.koperasiSimpananTransaksi.findMany({
      include: {
        anggota: { select: { nama: true, nomorAnggota: true } },
      },
      orderBy: { tanggalTransaksi: 'desc' },
      take: 15,
    })

    for (const s of simpananList) {
      const jumlah = toNumber(s.jumlah)
      const nama = s.anggota?.nama || 'Anggota'
      items.push({
        id: `simpanan-${s.id}`,
        category: 'transaksi',
        type: 'simpanan',
        title: `Simpanan Koperasi: ${nama}`,
        message: `${s.tipe === 'setor' ? 'Setoran' : 'Penarikan'} simpanan ${s.jenisSimpanan} sebesar ${formatRupiah(jumlah)}.`,
        amount: jumlah,
        timestamp: s.tanggalTransaksi.toISOString(),
        status: 'sukses',
        meta: { nomorAnggota: s.anggota?.nomorAnggota, jenisSimpanan: s.jenisSimpanan },
      })
    }
  } catch (err) {
    console.error('[Admin Notif - Simpanan Error]', err)
  }

  // 8. Pengguna Baru yang Mendaftar
  try {
    const recentUsers = await db.pengguna.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        memberCode: true,
        createdAt: true,
      },
    })

    for (const u of recentUsers) {
      items.push({
        id: `pengguna-${u.id}`,
        category: 'user_baru',
        type: 'register',
        title: `Nasabah Baru Mendaftar: ${u.name}`,
        message: `Pengguna baru berhasil terdaftar (${u.email || u.phone || '-'}). Kode Member: ${u.memberCode || '-'}.`,
        amount: 0,
        timestamp: u.createdAt.toISOString(),
        status: 'terdaftar',
        meta: { memberCode: u.memberCode, email: u.email, phone: u.phone },
      })
    }
  } catch (err) {
    console.error('[Admin Notif - Pengguna Baru Error]', err)
  }

  // 9. Notifikasi Langsung / Siaran Khusus di database
  try {
    const directNotifs = await db.notifikasi.findMany({
      where: {
        penggunaId: actor.id,
        NOT: {
          OR: [
            { title: { startsWith: 'Aktivitas:' } },
            { message: { contains: 'Sistem mendeteksi proses' } },
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    for (const n of directNotifs) {
      items.push({
        id: n.id,
        category: 'sistem',
        type: 'sistem',
        title: n.title,
        message: n.message,
        amount: 0,
        timestamp: n.createdAt.toISOString(),
        status: n.type,
        isRead: n.isRead,
      })
    }
  } catch (err) {
    console.error('[Admin Notif - Direct Error]', err)
  }

  // Urutkan berdasarkan waktu transaksi / pendaftaran terbaru
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Ambil 60 notifikasi paling relevan
  return NextResponse.json(items.slice(0, 60))
}

// PATCH: Tandai dibaca
export async function PATCH(req: NextRequest) {
  const actor = await getActingUser(req)
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  
  if (body.id) {
    await db.notifikasi.updateMany({
      where: { id: body.id, penggunaId: actor.id },
      data: { isRead: true },
    })
    return NextResponse.json({ success: true, id: body.id })
  } else {
    await db.notifikasi.updateMany({
      where: { penggunaId: actor.id, isRead: false },
      data: { isRead: true },
    })
    return NextResponse.json({ success: true, all: true })
  }
}
