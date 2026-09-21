import { QR_SHOP_LOGO_DATA_URI } from '@/constants/qr-shop-logo';
import { InvoicePreview } from '@/types/invoice';
import { formatMyanmarDate } from '@/utils/myanmar-datetime';
import { PrintFormat } from '@/utils/print-quotation';

const COMPANY = {
  name: 'QR SHOP Myanmar',
  address:
    'Building 11, Room 503, Myanmar ICT Park, Hlaing Township, Yangon, Myanmar.',
  phone: '+95 9 123 456 789',
};

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

function formatMoneyWhole(value: number): string {
  const safe = Number.isFinite(value) ? Math.round(value) : 0;
  return safe.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatQty(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatQtyWhole(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return Math.round(safe).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatDate(value: string): string {
  return formatMyanmarDate(value, { includeYear: true }) || '—';
}

function displayValue(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? escapeHtml(trimmed) : '—';
}

function moneyWithCurrency(value: number, currency: string): string {
  const suffix = currency.trim() ? ` ${escapeHtml(currency.trim())}` : '';
  return `${formatMoney(value)}${suffix}`;
}

function buildA4Html(detail: InvoicePreview): string {
  const tax = Math.max(0, detail.amountTotal - detail.amountUntaxed);
  const lineRows =
    detail.lines.length === 0
      ? `<tr><td colspan="5" class="empty">No invoice lines.</td></tr>`
      : detail.lines
          .map(
            (line, index) => `
        <tr>
          <td class="num">${String(index + 1).padStart(2, '0')}</td>
          <td>
            <div class="product-name">${escapeHtml(line.product)}</div>
          </td>
          <td class="num">${formatQty(line.quantity)} ${escapeHtml(line.unit || 'Units')}</td>
          <td class="num">${formatMoney(line.unitPrice)}</td>
          <td class="num strong">${formatMoney(line.amount)}</td>
        </tr>`,
          )
          .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(detail.name)}</title>
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
      body { background: #cbd5e1; padding: 24px 16px; }
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
    .company-logo {
      width: 96px;
      height: 96px;
      object-fit: contain;
      display: block;
      margin-bottom: 8px;
    }
    .company-meta { color: #64748b; font-size: 10px; line-height: 1.5; }
    .doc-box { text-align: right; min-width: 160px; }
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
        <img src="${QR_SHOP_LOGO_DATA_URI}" alt="QR Shop Myanmar" class="company-logo" />
        <div class="company-meta">
          ${escapeHtml(COMPANY.address)}<br />
          ${escapeHtml(COMPANY.phone)}
        </div>
      </div>
      <div class="doc-box">
        <div class="doc-badge">INVOICE</div>
        <div class="doc-number">${escapeHtml(detail.name)}</div>
        <div class="doc-date">${formatDate(detail.invoiceDate)}</div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-block">
        <h3>BILL TO</h3>
        <p><strong>${displayValue(detail.partner)}</strong></p>
      </div>
      <div class="info-block">
        <h3>INVOICE DETAILS</h3>
        <p><span class="info-label">STATUS:</span> <strong>${displayValue(detail.stateLabel || detail.state)}</strong></p>
        <p><span class="info-label">PAYMENT:</span> <strong>${displayValue(detail.paymentStateLabel || detail.paymentState)}</strong></p>
        <p><span class="info-label">SOURCE DOCUMENT:</span> <strong>${displayValue(detail.origin)}</strong></p>
        <p><span class="info-label">INVOICE DATE:</span> <strong>${formatDate(detail.invoiceDate)}</strong></p>
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
      <div></div>
      <div class="totals">
        <div class="total-row"><span>UNTAXED AMOUNT</span><span>${moneyWithCurrency(detail.amountUntaxed, detail.currency)}</span></div>
        <div class="total-row"><span>TAX</span><span>${moneyWithCurrency(tax, detail.currency)}</span></div>
        <div class="total-row grand"><span>TOTAL</span><span>${moneyWithCurrency(detail.amountTotal, detail.currency)}</span></div>
        <div class="total-row"><span>AMOUNT DUE</span><span>${moneyWithCurrency(detail.amountResidual, detail.currency)}</span></div>
      </div>
    </div>

    <div class="footer">
      <strong>Thank you for choosing us</strong>
      ${escapeHtml(COMPANY.name)}
    </div>
  </div>
</body>
</html>`;
}

function buildThermalHtml(detail: InvoicePreview): string {
  const lineRows =
    detail.lines.length === 0
      ? `<tr><td colspan="3" class="muted">No lines</td></tr>`
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
  <title>${escapeHtml(detail.name)}</title>
  <style>
    @page { size: 80mm auto; margin: 2mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      color: #000;
      font-size: 12px;
      line-height: 1.35;
    }
    @media screen {
      body { background: #e2e8f0; padding: 12px; }
      .receipt {
        width: 72mm;
        margin: 0 auto;
        background: #fff;
        padding: 8px 6px;
      }
    }
    .center { text-align: center; }
    .brand-row {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      margin-bottom: 6px;
    }
    .brand-logo { width: 72px; height: 72px; object-fit: contain; }
    .meta { font-size: 11px; margin-top: 4px; }
    .divider { border: none; border-top: 1px dashed #000; margin: 8px 0; }
    .customer-line { margin: 4px 0; word-break: break-word; }
    table.lines {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
      font-size: 12px;
    }
    table.lines th {
      text-align: left;
      font-weight: 700;
      padding: 4px 2px;
      border-bottom: 1px solid #000;
      font-size: 11px;
    }
    table.lines td {
      padding: 5px 2px;
      vertical-align: top;
      border-bottom: 1px dashed #ccc;
    }
    table.lines td.product { word-break: break-word; width: 55%; }
    table.lines .qty-col { text-align: center; white-space: nowrap; width: 18%; }
    table.lines .amount-col { text-align: right; white-space: nowrap; width: 27%; }
    table.lines th.qty-col { text-align: center; }
    table.lines th.amount-col { text-align: right; }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 16px;
      font-weight: 700;
      margin: 8px 0 4px;
      padding-top: 6px;
      border-top: 2px solid #000;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      font-weight: 700;
      margin-top: 10px;
    }
    .muted { color: #000; font-style: italic; text-align: center; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="center">
      <div class="brand-row">
        <img src="${QR_SHOP_LOGO_DATA_URI}" alt="QR Shop Myanmar" class="brand-logo" />
      </div>
      <div class="meta">INVOICE # ${escapeHtml(detail.name)} · ${formatDate(detail.invoiceDate)}</div>
    </div>
    <hr class="divider" />
    <div class="customer-line"><strong>CUSTOMER:</strong> <strong>${displayValue(detail.partner)}</strong></div>
    <div class="customer-line"><strong>STATUS:</strong> <strong>${displayValue(detail.stateLabel || detail.state)}</strong></div>
    <div class="customer-line"><strong>PAYMENT:</strong> <strong>${displayValue(detail.paymentStateLabel || detail.paymentState)}</strong></div>
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
      <span>${formatMoneyWhole(detail.amountTotal)}</span>
    </div>
    <hr class="divider" />
    <div class="footer">Thank you for choosing us</div>
  </div>
</body>
</html>`;
}

export function buildInvoicePrintHtml(
  detail: InvoicePreview,
  format: PrintFormat,
): string {
  return format === 'a4' ? buildA4Html(detail) : buildThermalHtml(detail);
}
