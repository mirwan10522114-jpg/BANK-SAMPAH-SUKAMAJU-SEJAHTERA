import nodemailer from 'nodemailer'

export interface SendMailOptions {
  to: string
  subject: string
  html: string
}

export async function sendMail(options: SendMailOptions) {
  const { to, subject, html } = options

  if (!to) {
    console.error('Email tidak dikirim karena alamat tujuan kosong.')
    return { success: false, error: 'Email tujuan kosong' }
  }

  // Baca konfigurasi dari environment variables
  const pengguna = process.env.SMTP_USER || process.env.EMAIL_USER
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com'
  const port = process.env.SMTP_PORT
    ? parseInt(process.env.SMTP_PORT, 10)
    : process.env.EMAIL_PORT
      ? parseInt(process.env.EMAIL_PORT, 10)
      : 587
  const from = process.env.SMTP_FROM_EMAIL || process.env.EMAIL_FROM || pengguna

  if (!pengguna || !pass) {
    console.error('EMAIL_USER atau EMAIL_PASS tidak dikonfigurasi di .env')
    // Fallback ke console log untuk development/testing jika belum ada kredensial
    console.log('\n[MOCK EMAIL SENT]')
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log(`Body:\n${html}\n`)
    return { success: true, mock: true }
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user: pengguna,
        pass,
      },
    })

    const info = await transporter.sendMail({
      from: `"Bank Sampah Sukamaju Sejahtera" <${from}>`,
      to,
      subject,
      html,
    })

    console.log('Email terkirim: %s', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Gagal mengirim email:', error)
    throw error
  }
}

export async function sendStrukEmail({ to, subject, strukHtml }: { to: string; subject: string; strukHtml: string }) {
  return sendMail({ to, subject, html: strukHtml })
}

interface SendOrderEmailParams {
  to: string
  buyerName: string
  orderNumber: string
  items: any[]
  subtotal: number
  ongkir: number
  total: number
  paymentMethod: string
  buyerAddress?: string
  buyerPhone?: string
  kurirNama?: string
  notes?: string
  paidAt?: Date
}

export async function sendOrderConfirmationEmail(params: SendOrderEmailParams): Promise<{ success: boolean; error?: string }> {
  const { to, buyerName, orderNumber, items, subtotal, ongkir, total, paymentMethod, buyerAddress, buyerPhone, kurirNama, notes, paidAt } = params
  
  const formatRp = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val)
  
  // Format the address if it's a JSON string
  let parsedAddress = buyerAddress || '-'
  let isJsonAddress = false
  if (buyerAddress && buyerAddress.startsWith('{')) {
    try {
      const addrObj = JSON.parse(buyerAddress)
      const lines = [
        addrObj.detailAlamat || addrObj.address || addrObj.alamat,
        (addrObj.kecamatan || addrObj.district) ? `Kec. ${addrObj.kecamatan || addrObj.district}` : null,
        addrObj.kota || addrObj.city,
        `${addrObj.provinsi || addrObj.province || ''} ${addrObj.kodePos || addrObj.postalCode || ''}`.trim()
      ].filter(Boolean)

      parsedAddress = `
        <div style="font-size: 14px; color: #475569; line-height: 1.5;">
          <strong style="color: #1e293b;">${buyerName}</strong><br/>
          ${lines.join('<br/>')}
        </div>
      `
      isJsonAddress = true
    } catch (e) {
      // fallback to plain text if JSON parse fails
    }
  }

  const itemsHtml = items.map((i: any) => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #334155;">
        <div style="font-weight: 500;">${i.productName}</div>
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #475569; text-align: center;">
        ${i.quantity} ${i.unit}
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #334155; text-align: right; font-weight: 500;">
        ${formatRp(i.subtotal)}
      </td>
    </tr>
  `).join('')

  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; min-height: 100vh;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        
        <!-- Header -->
        <div style="background-color: #059669; padding: 32px 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">Bank Sampah Sukamaju Sejahtera</h1>
          <p style="color: #a7f3d0; margin: 8px 0 0 0; font-size: 15px;">Terima kasih atas pesanan Anda!</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px 24px;">
          <div style="text-align: center; padding-bottom: 24px; border-bottom: 1px dashed #cbd5e1; margin-bottom: 24px;">
            <div style="display: inline-block; background-color: #d1fae5; color: #059669; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 12px;">
              PEMBAYARAN BERHASIL
            </div>
            <h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">${formatRp(total)}</h2>
            <p style="color: #64748b; margin: 0; font-size: 14px;">Nomor Pesanan: <strong>#${orderNumber}</strong></p>
          </div>

          <!-- Order Info Grid -->
          <table style="width: 100%; margin-bottom: 24px;">
            <tr>
              <td style="width: 50%; padding-right: 12px; vertical-align: top;">
                <p style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px 0;">Waktu Pembayaran</p>
                <p style="font-size: 14px; color: #334155; font-weight: 500; margin: 0;">Dibayar ${paidAt ? new Date(paidAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'} jam ${paidAt ? new Date(paidAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</p>
              </td>
              <td style="width: 50%; padding-left: 12px; vertical-align: top;">
                <p style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px 0;">Metode Pembayaran</p>
                <p style="font-size: 14px; color: #334155; font-weight: 500; margin: 0;">${paymentMethod}</p>
              </td>
            </tr>
          </table>

          <!-- Items Table -->
          <div style="margin-bottom: 32px;">
            <h3 style="font-size: 16px; color: #0f172a; margin: 0 0 12px 0; font-weight: 600;">Ringkasan Belanja</h3>
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead style="background-color: #f8fafc;">
                  <tr>
                    <th style="padding: 12px 16px; text-align: left; color: #64748b; font-weight: 500; border-bottom: 1px solid #e2e8f0;">Produk</th>
                    <th style="padding: 12px 16px; text-align: center; color: #64748b; font-weight: 500; border-bottom: 1px solid #e2e8f0;">Qty</th>
                    <th style="padding: 12px 16px; text-align: right; color: #64748b; font-weight: 500; border-bottom: 1px solid #e2e8f0;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot style="background-color: #f8fafc;">
                  <tr>
                    <td colspan="2" style="padding: 12px 16px; text-align: right; color: #64748b; border-bottom: 1px solid #e2e8f0;">Subtotal Produk</td>
                    <td style="padding: 12px 16px; text-align: right; color: #334155; font-weight: 500; border-bottom: 1px solid #e2e8f0;">${formatRp(subtotal)}</td>
                  </tr>
                  ${ongkir !== undefined ? `
                  <tr>
                    <td colspan="2" style="padding: 12px 16px; text-align: right; color: #64748b; border-bottom: 1px solid #e2e8f0;">Ongkos Kirim</td>
                    <td style="padding: 12px 16px; text-align: right; color: #334155; font-weight: 500; border-bottom: 1px solid #e2e8f0;">${formatRp(ongkir)}</td>
                  </tr>` : ''}
                  <tr>
                    <td colspan="2" style="padding: 16px; text-align: right; color: #0f172a; font-size: 16px; font-weight: 600;">Total Belanja</td>
                    <td style="padding: 16px; text-align: right; color: #059669; font-size: 16px; font-weight: 700;">${formatRp(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- Shipping Info -->
          ${buyerAddress ? `
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="font-size: 14px; color: #0f172a; margin: 0 0 12px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Alamat Pengiriman</h3>
            ${isJsonAddress ? parsedAddress : `<p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.5;">${parsedAddress}</p>`}
          </div>` : ''}

          <!-- Notes -->
          ${notes ? `
          <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 13px; color: #92400e;"><strong>Catatan untuk penjual:</strong> ${notes}</p>
          </div>` : ''}

          <div style="text-align: center; margin-top: 40px;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/toko" style="background-color: #0f172a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 15px; display: inline-block; transition: background-color 0.2s;">Kembali ke Toko</a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 13px; color: #64748b;">Pesan ini dikirim secara otomatis. Mohon tidak membalas email ini.</p>
          <p style="margin: 8px 0 0 0; font-size: 13px; color: #94a3b8;">&copy; ${new Date().getFullYear()} Bank Sampah Sukamaju Sejahtera</p>
        </div>
      </div>
    </div>
  `

  return sendMail({
    to,
    subject: `Bukti Pembayaran Pesanan - ${orderNumber}`,
    html
  })
}

export async function sendOrderStatusEmail(params: any) {
  const { to, buyerName, orderNumber, status, keterangan, noResi, kurirNama, updatedAt } = params

  const dateToUse = updatedAt || new Date()
  const formattedDate = dateToUse.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
  const formattedTime = dateToUse.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  const timeStr = `${formattedDate} jam ${formattedTime}`

  let title = 'Status Pesanan Diperbarui'
  let color = '#0284c7' // blue
  let message = `Pesanan Anda <b>#${orderNumber}</b> saat ini sedang dalam status: <b>${status.toUpperCase()}</b> pada ${timeStr}.`

  if (status === 'diproses') {
    title = 'Pesanan Sedang Diproses'
    color = '#f59e0b' // amber
    message = `Hore! Pesanan Anda <b>#${orderNumber}</b> saat ini sedang kami siapkan dan proses pada ${timeStr}.`
  } else if (status === 'dikirim') {
    title = 'Pesanan Sedang Dikirim'
    color = '#059669' // emerald
    message = `Pesanan Anda <b>#${orderNumber}</b> telah diserahkan kepada kurir dan sedang dalam perjalanan ke alamat Anda pada ${timeStr}.`
  } else if (status === 'selesai' || status === 'diterima') {
    title = 'Pesanan Selesai'
    color = '#16a34a' // green
    message = `Pesanan Anda <b>#${orderNumber}</b> telah selesai pada ${timeStr}. Terima kasih telah berbelanja di Bank Sampah Sukamaju Sejahtera!`
  } else if (status === 'dibatalkan') {
    title = 'Pesanan Dibatalkan'
    color = '#dc2626' // red
    message = `Mohon maaf, pesanan Anda <b>#${orderNumber}</b> telah dibatalkan pada ${timeStr}.`
  }

  const html = `
    <div style="font-family: sans-serif; background: #f3f4f6; padding: 24px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 24px; border-top: 4px solid ${color};">
        <h2 style="color: ${color}; margin-top: 0; text-align: center;">${title}</h2>
        <p>Halo <b>${buyerName}</b>,</p>
        <p>${message}</p>
        
        ${status === 'dikirim' ? `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <h3 style="margin-top: 0; font-size: 14px; color: #334155;">Informasi Pengiriman</h3>
          <p style="margin: 4px 0; font-size: 14px;"><b>Kurir:</b> ${kurirNama || 'Tidak diketahui'}</p>
          <p style="margin: 4px 0; font-size: 14px;"><b>No. Resi:</b> ${noResi || 'Tidak ada resi'}</p>
        </div>
        ` : ''}

        ${keterangan ? `
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <h3 style="margin-top: 0; font-size: 14px; color: #991b1b;">Catatan:</h3>
          <p style="margin: 0; font-size: 14px; color: #7f1d1d;">${keterangan}</p>
        </div>
        ` : ''}

        <div style="text-align: center; margin-top: 32px;">
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/toko" style="background-color: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Lihat Pesanan Saya</a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #6b7280; text-align: center; margin-bottom: 0;">Bank Sampah Sukamaju Sejahtera</p>
      </div>
    </div>
  `

  return sendMail({
    to,
    subject: `Update Pesanan #${orderNumber} - ${status.toUpperCase()}`,
    html
  })
}
