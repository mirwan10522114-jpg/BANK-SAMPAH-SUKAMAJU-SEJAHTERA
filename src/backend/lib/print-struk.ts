'use client'

import { formatRupiah, formatNumber, formatDateTime, toNumber } from './format'

// ============================================================
// Print Struk — opens a new window with clean HTML for printing
// This avoids all CSS/Radix Dialog conflicts by using a dedicated print window.
// ============================================================
export function printStruk(htmlContent: string) {
  const printWindow = window.open('', '_blank', 'width=420,height=600')
  if (!printWindow) {
    alert('Popup diblokir. Mohon izinkan popup untuk mencetak struk.')
    return
  }

  printWindow.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Struk Transaksi</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', 'Consolas', monospace;
      background: #fff;
      color: #18181b;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      width: 80mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 4mm;
      font-size: 11px;
      line-height: 1.4;
    }
    @page { margin: 0; size: 80mm auto; }
    table { width: 100%; border-collapse: collapse; }
    .struk-header {
      border-bottom: 1px dashed #999;
      text-align: center;
      padding: 8px 0 10px;
    }
    .struk-header .icon { font-size: 20px; margin-bottom: 2px; }
    .struk-header h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: #065f46; }
    .struk-header .sub { font-size: 11px; font-weight: 600; color: #047857; }
    .struk-header .desc { font-size: 9px; color: #666; margin-top: 1px; }
    .struk-header .badge {
      display: inline-block;
      border: 1px solid #059669;
      color: #059669;
      padding: 1px 8px;
      border-radius: 0;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 4px;
    }
    .struk-section {
      border-bottom: 1px dashed #999;
      padding: 8px 0;
    }
    .struk-section .label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: #999;
      margin-bottom: 4px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 4px;
      font-size: 11px;
      margin-bottom: 3px;
    }
    .info-row:last-child { margin-bottom: 0; }
    .info-row .key { color: #666; flex-shrink: 0; font-size: 10px; }
    .info-row .val { text-align: right; color: #18181b; font-weight: 500; font-size: 11px; }
    .info-row .val.mono { font-family: 'Courier New', monospace; }
    .info-row .val.bold { font-weight: 700; }
    .info-row .val.capitalize { text-transform: capitalize; }
    .items-table { width: 100%; font-size: 10px; }
    .items-table th {
      font-size: 8px;
      text-transform: uppercase;
      color: #999;
      font-weight: 600;
      padding: 3px 0;
      border-bottom: 1px solid #ccc;
      text-align: left;
    }
    .items-table th.right { text-align: right; }
    .items-table th.center { text-align: center; }
    .items-table td {
      padding: 4px 0;
      border-bottom: 1px dotted #ddd;
      color: #333;
      vertical-align: top;
    }
    .items-table td.right { text-align: right; font-weight: 500; color: #18181b; }
    .items-table td.center { text-align: center; }
    .items-table tr:last-child td { border-bottom: none; }
    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      margin-bottom: 3px;
    }
    .summary-row:last-child { margin-bottom: 0; }
    .summary-row .key { color: #666; font-size: 10px; }
    .summary-row .val { font-weight: 500; color: #18181b; }
    .summary-row.highlight {
      border-top: 1px solid #999;
      border-bottom: 1px solid #999;
      padding: 6px 0;
      margin-top: 4px;
      font-size: 13px;
      font-weight: 700;
    }
    .summary-row.highlight .key { color: #065f46; font-size: 11px; }
    .summary-row.highlight .val { color: #047857; }
    .notes {
      font-size: 10px;
      font-style: italic;
      color: #666;
      line-height: 1.4;
    }
    .struk-footer {
      padding: 10px 0 6px;
      text-align: center;
    }
    .struk-footer .thanks { font-size: 10px; font-weight: 600; color: #666; }
    .struk-footer .sub-thanks { font-size: 9px; color: #999; margin-top: 1px; }
    .signature-area {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-top: 12px;
      font-size: 9px;
      color: #999;
    }
    .signature-area .sig { flex: 1; text-align: center; }
    .signature-area .sig .line { height: 28px; }
    .signature-area .sig .label {
      border-top: 1px solid #999;
      padding-top: 1px;
      font-weight: 500;
      color: #666;
    }
    .steps-list { font-size: 10px; }
    .steps-list .step {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 4px;
      color: #333;
    }
    .steps-list .step:last-child { margin-bottom: 0; }
    .steps-list .step .check { color: #10b981; font-size: 10px; }
    .steps-list .step .cross { color: #ef4444; font-size: 10px; }
    @media print {
      body { width: 80mm; max-width: 80mm; padding: 0; }
      @page { margin: 2mm; size: 80mm auto; }
    }
    @media screen {
      body { box-shadow: 0 0 8px rgba(0,0,0,0.1); margin: 10px auto; }
    }
  </style>
</head>
<body>
${htmlContent}
<script>
  window.onload = function() {
    setTimeout(function() {
      window.print();
      setTimeout(function() { window.close(); }, 200);
    }, 250);
  };
</script>
</body>
</html>`)
  printWindow.document.close()
}

// ============================================================
// Helper: Build struk HTML from StrukData (shared format)
// ============================================================
export type StrukData = {
  type: string
  title: string
  icon: string
  desc?: string
  receiptNo: string
  tanggal: string
  personLabel: string // "Nasabah" or "Anggota"
  personName: string
  personCode: string
  teller?: string
  extraInfo?: { label: string; value: string }[]
  items?: { label: string; qty?: string; price?: string; subtotal?: string }[]
  summary?: { label: string; value: string; highlight?: boolean }[]
  saldoInfo?: { sebelum: number; sesudah: number }
  steps?: { label: string; value: string; ok?: boolean }[]
  notes?: string
  footerText?: string
  signatureLabels?: [string, string] // default ["Nasabah", "Petugas"]
}

export function buildStrukHtml(d: StrukData): string {
  const sigLabels = d.signatureLabels || ['Nasabah', 'Petugas']
  let html = ''

  // Header
  html += `<div class="struk-header">
    <div class="icon">${d.icon}</div>
    <h2>Bank Sampah</h2>
    <div class="sub">Sukamaju Sejahtera</div>
    ${d.desc ? `<div class="desc">${d.desc}</div>` : ''}
    <div class="badge">${d.title}</div>
  </div>`

  // Info Section
  html += `<div class="struk-section">
    <div class="info-row"><span class="key">No. Transaksi</span><span class="val mono">${d.receiptNo}</span></div>
    <div class="info-row"><span class="key">Tanggal</span><span class="val">${formatDateTime(d.tanggal)}</span></div>
    <div class="info-row"><span class="key">${d.personLabel}</span><span class="val bold">${d.personName}</span></div>
    <div class="info-row"><span class="key">Kode</span><span class="val mono">${d.personCode}</span></div>`
  if (d.teller) {
    html += `<div class="info-row"><span class="key">Petugas</span><span class="val">${d.teller}</span></div>`
  }
  if (d.extraInfo) {
    for (const e of d.extraInfo) {
      html += `<div class="info-row"><span class="key">${e.label}</span><span class="val">${e.value}</span></div>`
    }
  }
  html += `</div>`

  // Items Table
  if (d.items && d.items.length > 0) {
    const hasQty = d.items[0].qty !== undefined
    const hasPrice = d.items[0].price !== undefined
    html += `<div class="struk-section">
      <div class="label">Detail Item</div>
      <table class="items-table">
        <thead><tr>
          <th>Barang</th>
          ${hasQty ? '<th class="center">Qty</th>' : ''}
          ${hasPrice ? '<th class="right">Harga</th>' : ''}
          <th class="right">Subtotal</th>
        </tr></thead>
        <tbody>`
    for (const it of d.items) {
      html += `<tr>
        <td>${it.label}</td>
        ${hasQty ? `<td class="center">${it.qty || '-'}</td>` : ''}
        ${hasPrice ? `<td class="right">${it.price || '-'}</td>` : ''}
        <td class="right">${it.subtotal || '-'}</td>
      </tr>`
    }
    html += `</tbody></table></div>`
  }

  // Summary
  if (d.summary && d.summary.length > 0) {
    html += `<div class="struk-section">
      <div class="label">Ringkasan</div>`
    for (const s of d.summary) {
      if (s.highlight) {
        html += `<div class="summary-row highlight"><span class="key">${s.label}</span><span class="val">${s.value}</span></div>`
      } else {
        html += `<div class="summary-row"><span class="key">${s.label}</span><span class="val">${s.value}</span></div>`
      }
    }
    html += `</div>`
  }

  // Saldo Info (Mutasi Saldo)
  if (d.saldoInfo) {
    html += `<div class="struk-section">
      <div class="label">Mutasi Saldo</div>
      <div class="summary-row"><span class="key">Saldo Sebelum</span><span class="val">${formatRupiah(toNumber(d.saldoInfo.sebelum))}</span></div>
      <div class="summary-row"><span class="key">Saldo Sesudah</span><span class="val" style="font-weight:700;color:#047857">${formatRupiah(toNumber(d.saldoInfo.sesudah))}</span></div>
    </div>`
  }

  // Steps
  if (d.steps && d.steps.length > 0) {
    html += `<div class="struk-section">
      <div class="label">Langkah Diproses</div>
      <div class="steps-list">`
    for (const s of d.steps) {
      const icon = s.ok === false ? '<span class="cross">✗</span>' : '<span class="check">✓</span>'
      html += `<div class="step">${icon}<span>${s.label}</span><span style="margin-left:auto;font-weight:500">${s.value || ''}</span></div>`
    }
    html += `</div></div>`
  }

  // Notes
  if (d.notes) {
    html += `<div class="struk-section">
      <div class="label">Catatan</div>
      <div class="notes">${d.notes}</div>
    </div>`
  }

  // Footer
  const footerText = d.footerText || 'Terima kasih telah berkontribusi menjaga lingkungan & membangun ekonomi komunitas'
  html += `<div class="struk-footer">
    <div class="thanks">${footerText.split(' & ')[0] || footerText}</div>
    ${footerText.includes(' & ') ? `<div class="sub-thanks">${footerText.split(' & ')[1] || ''}</div>` : ''}
    <div class="signature-area">
      <div class="sig"><div class="line"></div><div class="label">${sigLabels[0]}</div></div>
      <div class="sig"><div class="line"></div><div class="label">${sigLabels[1]}</div></div>
    </div>
  </div>`

  return html
}
