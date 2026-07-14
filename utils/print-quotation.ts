import { Platform } from 'react-native';

import { QR_SHOP_LOGO_DATA_URI } from '@/constants/qr-shop-logo';
import { QuotationDetail } from '@/types/quotation';

export type PrintFormat = 'a4' | 'thermal';

const COMPANY = {
  name: 'QR SHOP Myanmar',
  address:
    'Building 11, Room 503, Myanmar ICT Park, Hlaing Township, Yangon, Myanmar.',
  phone: '+95 9 123 456 789',
  website: 'www.qrshopmyanmar.com',
  email: 'billing@qrshopmyanmar.com',
};

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMoneyMmk(value: number): string {
  return `${formatMoney(value)} MMK`;
}

function formatDate(value: string): string {
  if (!value?.trim()) {
    return '—';
  }
  const datePart = value.trim().split(/[T ]/)[0];
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) {
    return escapeHtml(value.trim());
  }
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

function formatDateTime(value: string): string {
  if (!value?.trim()) {
    return '—';
  }
  const trimmed = value.trim();
  const normalized = trimmed.replace('T', ' ').replace(/\.\d+Z?$/, '').replace(/Z$/, '');
  const [datePart, timePart = ''] = normalized.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) {
    return escapeHtml(trimmed);
  }
  const dateLabel = `${MONTHS[month - 1]} ${day}, ${year}`;
  if (!timePart || timePart.startsWith('00:00:00')) {
    return dateLabel;
  }
  const [hourRaw, minuteRaw] = timePart.split(':').map(Number);
  const hours = Number.isFinite(hourRaw) ? hourRaw : 0;
  const minutes = Number.isFinite(minuteRaw) ? minuteRaw : 0;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${dateLabel} ${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

function buildA4Html(detail: QuotationDetail): string {
  const untaxed =
    detail.untaxedAmount > 0
      ? detail.untaxedAmount
      : detail.lines.reduce((sum, line) => sum + line.amount, 0);
  const tax = Math.max(0, detail.total - untaxed);

  const lineRows =
    detail.lines.length === 0
      ? `<tr><td colspan="5" class="empty">No order lines.</td></tr>`
      : detail.lines
          .map(
            (line, index) => `
        <tr>
          <td class="num">${String(index + 1).padStart(2, '0')}</td>
          <td>
            <div class="product-name">${escapeHtml(line.product)}</div>
          </td>
          <td class="num">${line.quantity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${escapeHtml(line.unit || 'Units')}</td>
          <td class="num">${formatMoney(line.unitPrice)}</td>
          <td class="num strong">${formatMoney(line.amount)}</td>
        </tr>`,
          )
          .join('');

  const customerCode = detail.membershipCouponTicket?.trim() || '—';
  const membershipStatus = detail.membershipCouponStatus?.trim() || '—';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(detail.number)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      font-size: 11px;
      line-height: 1.45;
    }
    @media screen {
      body {
        background: #cbd5e1;
        padding: 24px 16px;
      }
      .page {
        max-width: 210mm;
        margin: 0 auto;
        background: #fff;
        padding: 14mm;
        box-shadow: 0 8px 32px rgba(15, 23, 42, 0.18);
      }
    }
    @media print {
      body { background: #fff; padding: 0; }
      .page { box-shadow: none; max-width: none; padding: 0; }
    }
    .top {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 22px;
    }
    .company-name { font-size: 20px; font-weight: 800; margin-bottom: 6px; }
    .company-meta { color: #64748b; font-size: 10px; line-height: 1.5; }
    .doc-box {
      text-align: right;
      min-width: 160px;
    }
    .doc-badge {
      display: inline-block;
      background: #0f172a;
      color: #fff;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.6px;
      padding: 5px 10px;
      margin-bottom: 8px;
    }
    .doc-number { font-size: 22px; font-weight: 800; }
    .doc-date { color: #64748b; margin-top: 4px; }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-bottom: 20px;
    }
    .info-block h3 {
      margin: 0 0 8px;
      font-size: 9px;
      color: #94a3b8;
      letter-spacing: 0.5px;
    }
    .info-block p { margin: 0 0 4px; }
    .info-label { color: #64748b; font-size: 10px; }
    table.lines {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
    }
    table.lines th {
      background: #f8fafc;
      color: #64748b;
      font-size: 9px;
      letter-spacing: 0.4px;
      text-align: left;
      padding: 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    table.lines td {
      padding: 10px 8px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
    }
    .product-name { font-weight: 700; }
    .num { text-align: right; white-space: nowrap; }
    .strong { font-weight: 700; }
    .bottom {
      display: grid;
      grid-template-columns: 1fr 240px;
      gap: 18px;
      align-items: start;
    }
    .note-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 12px;
    }
    .note-box h4 {
      margin: 0 0 6px;
      font-size: 9px;
      color: #64748b;
      letter-spacing: 0.4px;
    }
    .terms { color: #64748b; font-size: 10px; line-height: 1.6; }
    .terms li { margin-bottom: 4px; }
    .totals { border-top: 2px solid #0f172a; padding-top: 10px; }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 11px;
    }
    .total-row.grand {
      font-size: 16px;
      font-weight: 800;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
    }
    .footer {
      margin-top: 28px;
      text-align: center;
      color: #64748b;
      font-size: 10px;
    }
    .footer strong { display: block; color: #0f172a; font-size: 12px; margin-bottom: 6px; }
    .empty { color: #94a3b8; font-style: italic; text-align: center; }
  </style>
</head>
<body>
  <div class="page">
    <div class="top">
      <div>
        <div class="company-name">${escapeHtml(COMPANY.name)}</div>
        <div class="company-meta">
          ${escapeHtml(COMPANY.address)}<br />
          ${escapeHtml(COMPANY.phone)}
        </div>
      </div>
      <div class="doc-box">
        <div class="doc-badge">QUOTATION</div>
        <div class="doc-number">${escapeHtml(detail.number)}</div>
        <div class="doc-date">${formatDateTime(detail.orderDate)}</div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-block">
        <h3>BILL TO</h3>
        <p><strong>${escapeHtml(detail.customer)}</strong></p>
        <p class="info-label">Customer Code: ${escapeHtml(customerCode)}</p>
        <p class="info-label">Membership Status: ${escapeHtml(membershipStatus)}</p>
        ${detail.deliveryAddress?.trim() ? `<p class="info-label">${escapeHtml(detail.deliveryAddress)}</p>` : ''}
        ${detail.phoneNumber?.trim() ? `<p class="info-label">${escapeHtml(detail.phoneNumber)}</p>` : ''}
      </div>
      <div class="info-block">
        <h3>ORDER DETAILS</h3>
        <p><span class="info-label">EXPECTED DELIVERY:</span> <strong>${formatDate(detail.preferredDeliveryDate)}</strong></p>
        <p><span class="info-label">PAYMENT METHOD:</span> <strong>${escapeHtml(detail.paymentMethod?.trim() || '—')}</strong></p>
        <p><span class="info-label">VALID UNTIL:</span> <strong>${formatDate(detail.expiration)}</strong></p>
        ${detail.paymentTerms?.trim() ? `<p><span class="info-label">PAYMENT TERMS:</span> ${escapeHtml(detail.paymentTerms)}</p>` : ''}
      </div>
    </div>

    <table class="lines">
      <thead>
        <tr>
          <th style="width:40px">NO.</th>
          <th>DESCRIPTION</th>
          <th class="num" style="width:90px">QTY</th>
          <th class="num" style="width:90px">UNIT PRICE</th>
          <th class="num" style="width:90px">TOTAL</th>
        </tr>
      </thead>
      <tbody>${lineRows}</tbody>
    </table>

    <div class="bottom">
      <div>
        <div class="note-box">
          <h4>DELIVERY INSTRUCTIONS</h4>
          <div>${escapeHtml(detail.deliveryNotes?.trim() || '—')}</div>
        </div>
        <div class="terms">
          <strong style="color:#0f172a;font-size:10px;">TERMS &amp; CONDITIONS</strong>
          <ul>
            <li>This quotation is valid for 14 days from the date of issue.</li>
            <li>Prices are subject to change without prior notice.</li>
            <li>Payment must be made before delivery unless otherwise agreed.</li>
          </ul>
        </div>
      </div>
      <div class="totals">
        <div class="total-row"><span>UNTAXED AMOUNT</span><span>${formatMoneyMmk(untaxed)}</span></div>
        <div class="total-row"><span>TAX (${untaxed > 0 ? Math.round((tax / untaxed) * 100) : 0}%)</span><span>${formatMoneyMmk(tax)}</span></div>
        <div class="total-row grand"><span>TOTAL AMOUNT</span><span>${formatMoneyMmk(detail.total)}</span></div>
      </div>
    </div>

    <div class="footer">
      <strong>Thank you for your business!</strong>
      ${escapeHtml(COMPANY.website)} · ${escapeHtml(COMPANY.email)}
    </div>
  </div>
</body>
</html>`;
}

function displayValue(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? escapeHtml(trimmed) : '—';
}

/** Omits postal/zip segments for compact thermal receipts. */
function formatThermalDeliveryAddress(address: string | undefined): string {
  const trimmed = address?.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed
    .split(',')
    .map(part => part.trim())
    .filter(part => part && !/^\d{4,6}$/.test(part))
    .join(', ');
}

function displayThermalDeliveryAddress(address: string | undefined): string {
  const formatted = formatThermalDeliveryAddress(address);
  return formatted ? escapeHtml(formatted) : '—';
}

function formatMoneyWhole(value: number): string {
  const safe = Number.isFinite(value) ? Math.round(value) : 0;
  return safe.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatQtyWhole(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return Math.round(safe).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function buildThermalHtml(detail: QuotationDetail): string {
  const lineRows =
    detail.lines.length === 0
      ? `<tr><td colspan="3" class="muted">No order lines</td></tr>`
      : detail.lines
          .map(
            line => `
        <tr>
          <td class="product">${escapeHtml(line.product)}</td>
          <td class="qty-col">${formatQtyWhole(line.quantity)}</td>
          <td class="amount-col">${formatMoneyWhole(line.amount)}</td>
        </tr>`,
          )
          .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(detail.number)}</title>
  <style>
  /* Avoid "size: 80mm auto" — Chrome treats it as a blank page. */
    @page { margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  @media screen {
      html, body {
        min-height: 100%;
        background: #0f172a;
      }
      .receipt {
        width: 80mm;
        min-width: 80mm;
        max-width: 80mm;
        margin: 20px auto;
        padding: 10px 8px 16px;
        background: #fff;
        color: #000;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
      }
    }
    @media print {
      html, body {
        width: 80mm;
        background: #fff;
      }
      .receipt {
        width: 80mm;
        min-width: 80mm;
        max-width: 80mm;
        margin: 0;
        padding: 2mm 3mm;
        box-shadow: none;
      }
    }
    .receipt {
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      line-height: 1.4;
      color: #000;
      font-weight: 700;
    }
    .receipt * {
      font-weight: 700;
    }
    .center { text-align: center; }
    .brand-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .brand-logo {
      width: 44px;
      height: 44px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .brand { font-size: 18px; font-weight: 700; letter-spacing: 0.5px; }
    .meta { font-size: 11px; margin-top: 4px; color: #000; }
    .divider {
      border: none;
      border-top: 1px dashed #000;
      margin: 8px 0;
    }
    .field { margin: 4px 0; word-break: break-word; color: #000; }
    .field-label { font-weight: 700; }
    .customer-line {
      margin: 4px 0;
      line-height: 1.45;
      word-break: break-word;
      color: #000;
    }
    .customer-line strong { font-weight: 700; }
    table.lines {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
      font-size: 12px;
      color: #000;
    }
    table.lines th {
      text-align: left;
      font-weight: 700;
      padding: 4px 2px;
      border-bottom: 1px solid #000;
      font-size: 11px;
      letter-spacing: 0.3px;
    }
    table.lines td {
      padding: 5px 2px;
      vertical-align: top;
      border-bottom: 1px dashed #ccc;
    }
    table.lines td.product { word-break: break-word; }
    table.lines .qty-col {
      text-align: right;
      white-space: nowrap;
      width: 1%;
      padding-right: 2px;
      padding-left: 4px;
    }
    table.lines .amount-col {
      text-align: right;
      white-space: nowrap;
      width: 1%;
      padding-left: 2px;
      padding-right: 0;
    }
    table.lines th.qty-col { text-align: right; padding-right: 2px; padding-left: 4px; }
    table.lines th.amount-col { text-align: right; padding-left: 2px; padding-right: 0; }
    .delivery-address {
      margin: 6px 0 4px;
      padding: 6px;
      border: 1px dashed #000;
      word-break: break-word;
      color: #000;
    }
    .split {
      display: flex;
      justify-content: space-between;
      gap: 6px;
      margin: 4px 0;
      font-size: 13px;
      color: #000;
    }
    .item { margin: 8px 0; color: #000; }
    .item-qty { font-weight: 700; }
    .item-price { font-size: 10px; color: #000; }
    .item-total { text-align: right; font-weight: 700; margin-top: 2px; }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 16px;
      font-weight: 700;
      margin: 8px 0 4px;
      padding-top: 6px;
      border-top: 2px solid #000;
      color: #000;
    }
    .note-box {
      border: 1px solid #000;
      padding: 6px;
      margin: 8px 0;
      font-size: 13px;
      color: #000;
    }
    .note-box strong { display: block; margin-bottom: 4px; }
    .footer {
      text-align: center;
      font-size: 12px;
      font-weight: 700;
      margin-top: 10px;
      letter-spacing: 0.3px;
      color: #000;
    }
    .muted { color: #000; font-style: italic; text-align: center; }
    @media print {
      .receipt,
      .receipt * {
        color: #000 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="center">
      <div class="brand-row">
        <img src="${QR_SHOP_LOGO_DATA_URI}" alt="" class="brand-logo" />
        <div class="brand">QR SHOP</div>
      </div>
      <div class="meta">QUOTE # ${escapeHtml(detail.number)} · ${formatDate(detail.orderDate)}</div>
    </div>

    <hr class="divider" />

    <div class="customer-line">
      <strong>CUSTOMER:</strong> <strong>${escapeHtml(detail.customer)}</strong>
    </div>
    <div class="customer-line">
      <strong>PHONE:</strong> <strong>${displayValue(detail.phoneNumber)}</strong>
    </div>

    <hr class="divider" />

    <table class="lines">
      <thead>
        <tr>
          <th>PRODUCT</th>
          <th class="qty-col">QTY</th>
          <th class="amount-col">AMOUNT</th>
        </tr>
      </thead>
      <tbody>${lineRows}</tbody>
    </table>

    <div class="total-row">
      <span>TOTAL</span>
      <span>${formatMoneyWhole(detail.total)}</span>
    </div>

    <hr class="divider" />

    <div class="split">
      <span><strong>DELIVERY DATE:</strong> ${formatDate(detail.preferredDeliveryDate)}</span>
    </div>

    <div class="field">
      <strong>PAYMENT METHOD:</strong> ${displayValue(detail.paymentMethod)}
    </div>

    <div class="delivery-address">
      <span class="field-label">DELIVERY ADDRESS:</span><br />
      ${displayThermalDeliveryAddress(detail.deliveryAddress)}
    </div>

    <div class="note-box">
      <strong>DELIVERY NOTE:</strong>
      <div>${displayValue(detail.deliveryNotes)}</div>
    </div>

    <div class="footer">Thank you for choosing us</div>
  </div>
</body>
</html>`;
}

/** Builds printable HTML for the chosen format. */
export function buildPrintHtml(detail: QuotationDetail, format: PrintFormat): string {
  return format === 'a4' ? buildA4Html(detail) : buildThermalHtml(detail);
}

/** Prints HTML via a hidden iframe (reliable on web, no popup blocker issues). */
export function printHtmlDocument(html: string): boolean {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return false;
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute(
    'style',
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden',
  );
  iframe.setAttribute('title', 'Print');
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDoc = frameWindow?.document;
  if (!frameDoc) {
    document.body.removeChild(iframe);
    return false;
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  const cleanup = () => {
    window.setTimeout(() => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    }, 500);
  };

  const triggerPrint = () => {
    frameWindow?.focus();
    frameWindow?.print();
    cleanup();
  };

  if (frameDoc.readyState === 'complete') {
    window.setTimeout(triggerPrint, 150);
  } else {
    iframe.onload = () => window.setTimeout(triggerPrint, 150);
    window.setTimeout(triggerPrint, 500);
  }

  return true;
}

/** @deprecated Use buildPrintHtml + print preview modal instead. */
export function printQuotation(detail: QuotationDetail, format: PrintFormat): boolean {
  return printHtmlDocument(buildPrintHtml(detail, format));
}
