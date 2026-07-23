import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toNumber } from '@/lib/format'
import { formatRupiah, formatDate } from '@/lib/format'

// GET: Aggregated notifications for a user
// Returns two kinds of notifications:
//   1. "transaction" — proof/receipt that user did a transaction
//      (nabung, sedekah, koperasi simpanan/pinjaman/angsuran, toko orders)
//   2. "reminder" — H-7 reminder & overdue alert for angsuran & simpanan wajib
//
// Query params:
//   - limit (default 30) — max number of transaction notifications to return
//   - type (optional) — 'transaction' | 'reminder' to filter
export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10) || 30, 100)
  const typeFilter = url.searchParams.get('type') || ''

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      savingTransactions: {
        orderBy: { transactedAt: 'desc' },
        take: 50,
        include: { items: true },
      },
      sedekahTransactions: {
        orderBy: { transactedAt: 'desc' },
        take: 50,
        include: { items: true },
      },
      koperasiAnggota: {
        include: {
          simpananSaldos: true,
          simpananTx: { orderBy: { tanggalTransaksi: 'desc' }, take: 50 },
          pinjamans: {
            include: { angsurans: { orderBy: { angsuranKe: 'asc' } } },
            orderBy: { tanggalPengajuan: 'desc' },
          },
        },
      },
    },
  })

  if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  // Also fetch TokoOrders — online orders are matched by buyerPhone or buyerEmail or createdBy
  const phoneMatch = user.phone ? { buyerPhone: user.phone } : null
  const emailMatch = user.email ? { buyerEmail: user.email } : null
  const orClauses: any[] = []
  if (phoneMatch) orClauses.push(phoneMatch)
  if (emailMatch) orClauses.push(emailMatch)
  orClauses.push({ createdById: user.id })

  const tokoOrders = await db.tokoOrder.findMany({
    where: { OR: orClauses },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { items: true },
  })

  // Also fetch offline ProductSales recorded for this user (matched by phone or createdBy)
  const posOrClauses: any[] = []
  if (user.phone) posOrClauses.push({ buyerPhone: user.phone })
  posOrClauses.push({ createdById: user.id })
  const productSales = await db.productSale.findMany({
    where: {
      OR: posOrClauses,
      channel: 'offline',
    },
    orderBy: { transactedAt: 'desc' },
    take: 30,
  })

  type TxNotif = {
    id: string
    category: 'bank_sampah' | 'koperasi' | 'penjualan_produk'
    type: string
    title: string
    message: string
    amount: number
    timestamp: string
    status?: string
  }

  const txNotifs: TxNotif[] = []

  // 1. Saving transactions (nabung)
  for (const t of user.savingTransactions) {
    const totalNilai = t.items.reduce((s, it) => s + toNumber(it.subtotal), 0)
    const totalBerat = t.items.reduce((s, it) => s + toNumber(it.quantity), 0)
    txNotifs.push({
      id: `nabung-${t.id}`,
      category: 'bank_sampah',
      type: 'nabung',
      title: 'Transaksi Nabung Berhasil',
      message: `Tabungan sampah ${totalBerat.toFixed(2)} kg, nilai ${formatRupiah(totalNilai)}. Status QC: ${t.qcStatus || 'pending'}.`,
      amount: totalNilai,
      timestamp: t.transactedAt.toISOString(),
      status: t.qcStatus || 'pending',
    })
  }

  // 2. Sedekah transactions
  for (const t of user.sedekahTransactions) {
    const beratBersih = t.totalWeightBersih != null ? toNumber(t.totalWeightBersih) : toNumber(t.totalWeight)
    txNotifs.push({
      id: `sedekah-${t.id}`,
      category: 'bank_sampah',
      type: 'sedekah',
      title: 'Sedekah Sampah Diterima',
      message: `Sedekah sampah ${beratBersih.toFixed(2)} kg telah diterima. Status QC: ${t.qcStatus || 'pending'}. Terima kasih atas kebaikan Anda!`,
      amount: 0,
      timestamp: t.transactedAt.toISOString(),
      status: t.qcStatus || 'pending',
    })
  }

  // 3. Koperasi simpanan transactions
  if (user.koperasiAnggota) {
    for (const tx of user.koperasiAnggota.simpananTx) {
      const isSetor = tx.tipe === 'setor'
      txNotifs.push({
        id: `simpanan-${tx.id}`,
        category: 'koperasi',
        type: `simpanan_${tx.jenisSimpanan}`,
        title: `Simpanan ${tx.jenisSimpanan} ${isSetor ? 'Ditambah' : 'Ditarik'}`,
        message: `${isSetor ? 'Setor' : 'Tarik'} simpanan ${tx.jenisSimpanan} sebesar ${formatRupiah(toNumber(tx.jumlah))}. Saldo: ${formatRupiah(toNumber(tx.saldoSesudah))}.`,
        amount: toNumber(tx.jumlah),
        timestamp: tx.tanggalTransaksi.toISOString(),
        status: 'completed',
      })
    }

    // 4. Koperasi pinjaman (pengajuan, pencairan, status changes)
    for (const loan of user.koperasiAnggota.pinjamans) {
      // Pengajuan
      txNotifs.push({
        id: `pinjaman-pengajuan-${loan.id}`,
        category: 'koperasi',
        type: 'pinjaman_pengajuan',
        title: 'Pengajuan Pinjaman Dibuat',
        message: `Pengajuan pinjaman ${formatRupiah(toNumber(loan.jumlahPinjaman))} dengan tenor ${loan.tenorBulan} bulan. Status: ${loan.status}.`,
        amount: toNumber(loan.jumlahPinjaman),
        timestamp: loan.tanggalPengajuan.toISOString(),
        status: loan.status,
      })

      // Pencairan (when approved + disbursed)
      if (loan.tanggalPencairan) {
        txNotifs.push({
          id: `pinjaman-cair-${loan.id}`,
          category: 'koperasi',
          type: 'pinjaman_cair',
          title: 'Pinjaman Dicairkan',
          message: `Pinjaman ${loan.nomorPinjaman} telah dicairkan. Cicilan ${formatRupiah(toNumber(loan.angsuranPerBulan))}/bulan selama ${loan.tenorBulan} bulan.`,
          amount: toNumber(loan.jumlahPinjaman),
          timestamp: loan.tanggalPencairan.toISOString(),
          status: 'berjalan',
        })
      }

      // 5. Angsuran payments
      for (const ang of loan.angsurans || []) {
        txNotifs.push({
          id: `angsuran-${ang.id}`,
          category: 'koperasi',
          type: 'angsuran_bayar',
          title: `Angsuran ke-${ang.angsuranKe} Terbayar`,
          message: `Pembayaran angsuran ke-${ang.angsuranKe} pinjaman ${loan.nomorPinjaman} sebesar ${formatRupiah(toNumber(ang.jumlahBayar))}${ang.dendaBayar ? ` (denda ${formatRupiah(ang.dendaBayar)})` : ''}. Sisa pinjaman: ${formatRupiah(toNumber(ang.sisaPinjamanSetelah))}.`,
          amount: toNumber(ang.jumlahBayar),
          timestamp: ang.tanggalBayar.toISOString(),
          status: 'paid',
        })
      }
    }
  }

  // 6. Toko orders (online product purchases)
  for (const o of tokoOrders) {
    const itemCount = o.items.reduce((s, it) => s + toNumber(it.quantity), 0)
    let title = 'Pesanan Produk Dibuat'
    let message = `Pesanan ${o.orderNumber}: ${itemCount} item, total ${formatRupiah(toNumber(o.totalBayar))}.`
    if (o.orderStatus === 'dibayar' || (o.paymentStatus === 'dibayar' && o.orderStatus === 'dibayar')) {
      title = 'Pembayaran Pesanan Dikonfirmasi'
      message = `Pesanan ${o.orderNumber}: pembayaran ${formatRupiah(toNumber(o.totalBayar))} telah dikonfirmasi. Pesanan siap diproses.`
    } else if (o.orderStatus === 'diproses') {
      title = 'Pesanan Diproses'
      message = `Pesanan ${o.orderNumber} sedang diproses. Total ${formatRupiah(toNumber(o.totalBayar))}.`
    } else if (o.orderStatus === 'dikirim') {
      title = 'Pesanan Dikirim'
      message = `Pesanan ${o.orderNumber} telah dikirim${o.kurirNama ? ` via ${o.kurirNama}` : ''}${o.noResi ? ` (Resi: ${o.noResi})` : ''}.`
    } else if (o.orderStatus === 'diterima') {
      title = 'Pesanan Diterima'
      message = `Pesanan ${o.orderNumber} telah diterima. Total ${formatRupiah(toNumber(o.totalBayar))}.`
    } else if (o.orderStatus === 'dibatalkan') {
      title = 'Pesanan Dibatalkan'
      message = `Pesanan ${o.orderNumber} dibatalkan.`
    }
    txNotifs.push({
      id: `toko-${o.id}-${o.orderStatus}`,
      category: 'penjualan_produk',
      type: `toko_${o.orderStatus}`,
      title,
      message,
      amount: toNumber(o.totalBayar),
      timestamp: (o.paidAt || o.updatedAt || o.createdAt).toISOString(),
      status: o.orderStatus,
    })
  }

  // 7. Offline ProductSales
  for (const s of productSales) {
    txNotifs.push({
      id: `pos-${s.id}`,
      category: 'penjualan_produk',
      type: 'pos_sale',
      title: 'Pembelian Produk (Offline)',
      message: `Pembelian ${toNumber(s.totalQuantity)} item di toko. Total ${formatRupiah(toNumber(s.totalValue))}.`,
      amount: toNumber(s.totalValue),
      timestamp: s.transactedAt.toISOString(),
      status: s.paymentStatus,
    })
  }

  // Sort transaction notifications by timestamp desc
  txNotifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // ============================
  // REMINDERS (due-date notifications)
  // ============================
  type ReminderNotif = {
    id: string
    category: 'reminder'
    type: 'angsuran_due' | 'simpanan_wajib_due'
    title: string
    message: string
    amount: number
    timestamp: string
    dueDate: string
    daysUntilDue: number
    severity: 'warning' | 'danger'
  }

  const reminders: ReminderNotif[] = []

  if (user.koperasiAnggota) {
    // Angsuran reminders for active loans
    for (const loan of user.koperasiAnggota.pinjamans) {
      if (loan.status !== 'berjalan') continue
      if (!loan.tanggalPencairan) continue
      const sudahBayar = loan.angsurans?.length || 0
      const nextAngsuranKe = sudahBayar + 1
      if (nextAngsuranKe > loan.tenorBulan) continue // already paid off

      const dueDate = new Date(loan.tanggalPencairan)
      dueDate.setMonth(dueDate.getMonth() + nextAngsuranKe)
      const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

      // Show reminder if H-7 or overdue
      if (daysUntilDue <= 7) {
        const isOverdue = daysUntilDue < 0
        reminders.push({
          id: `reminder-angsuran-${loan.id}-${nextAngsuranKe}`,
          category: 'reminder',
          type: 'angsuran_due',
          title: isOverdue
            ? `Angsuran ke-${nextAngsuranKe} SUDAH LEWAT jatuh tempo`
            : `Angsuran ke-${nextAngsuranKe} jatuh tempo dalam ${daysUntilDue} hari`,
          message: `Pinjaman ${loan.nomorPinjaman}. Jatuh tempo ${formatDate(dueDate.toISOString())}. Bayar ${formatRupiah(toNumber(loan.angsuranPerBulan))} melalui admin/teller.${isOverdue ? ' Segera bayar untuk menghindari denda.' : ''}`,
          amount: toNumber(loan.angsuranPerBulan),
          timestamp: new Date().toISOString(),
          dueDate: dueDate.toISOString(),
          daysUntilDue,
          severity: isOverdue ? 'danger' : 'warning',
        })
      }
    }

    // Simpanan wajib reminder — due date = last setor + 1 month
    const wajibTx = user.koperasiAnggota.simpananTx
      .filter((t) => t.jenisSimpanan === 'wajib' && t.tipe === 'setor')
      .sort((a, b) => b.tanggalTransaksi.getTime() - a.tanggalTransaksi.getTime())
    const lastWajib = wajibTx[0]
    if (lastWajib) {
      const lastPaid = new Date(lastWajib.tanggalTransaksi)
      const nextDue = new Date(lastPaid)
      nextDue.setMonth(nextDue.getMonth() + 1)
      const daysUntilDue = Math.ceil((nextDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (daysUntilDue <= 7) {
        const isOverdue = daysUntilDue < 0
        reminders.push({
          id: `reminder-simpanan-wajib-${lastWajib.id}`,
          category: 'reminder',
          type: 'simpanan_wajib_due',
          title: isOverdue
            ? 'Setoran Simpanan Wajib SUDAH LEWAT jatuh tempo'
            : `Setoran Simpanan Wajib jatuh tempo dalam ${daysUntilDue} hari`,
          message: `Jatuh tempo ${formatDate(nextDue.toISOString())}. Setor simpanan wajib melalui admin/teller.${isOverdue ? ' Segera setor.' : ''}`,
          amount: 0,
          timestamp: new Date().toISOString(),
          dueDate: nextDue.toISOString(),
          daysUntilDue,
          severity: isOverdue ? 'danger' : 'warning',
        })
      }
    }
  }

  // Apply type filter
  let finalTx = txNotifs
  let finalReminders = reminders
  if (typeFilter === 'transaction') {
    finalReminders = []
  } else if (typeFilter === 'reminder') {
    finalTx = []
  }

  // Sort reminders: overdue first, then by due date asc
  finalReminders.sort((a, b) => a.daysUntilDue - b.daysUntilDue)

  return NextResponse.json({
    transactions: finalTx.slice(0, limit),
    reminders: finalReminders,
    unreadCount: {
      transactions: finalTx.length,
      reminders: finalReminders.length,
      total: finalTx.length + finalReminders.length,
    },
  })
}
