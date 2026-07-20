import { Quotation } from '@/types/quotation';
import { exportToXlsx } from '@/utils/export-excel';
import { formatMyanmarDateTime } from '@/utils/myanmar-datetime';

type Cell = string | number | null | undefined;

function statusLabel(state: string): string {
  switch (state) {
    case 'draft':
      return 'Quotation';
    case 'sent':
      return 'Quotation Sent';
    case 'sale':
      return 'Sales Order';
    case 'done':
      return 'Locked';
    case 'cancel':
      return 'Cancelled';
    default:
      return state || '—';
  }
}

function formatMoney(value: unknown): string {
  const num = Number(value ?? 0);
  const safe = Number.isFinite(num) ? num : 0;
  return `${safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MMK`;
}

function formatDateTime(value: unknown): string {
  return formatMyanmarDateTime(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cellText(cell: Cell): string {
  return escapeHtml(cell === null || cell === undefined ? '' : String(cell));
}

export function quotationExportFilename(
  quotations: Quotation[],
  extension: 'xlsx' | 'pdf',
): string {
  if (quotations.length === 1) {
    const safeNumber = quotations[0].number.replace(/[^\w.-]+/g, '_');
    return `quotation-${safeNumber}.${extension}`;
  }
  return `quotations-selected.${extension}`;
}

/** Shared table rows for Excel and PDF export. */
export function buildQuotationSummaryRows(quotations: Quotation[]): Cell[][] {
  return [
    [
      'Number',
      'Creation Date',
      'Customer',
      'Total',
      'Status',
      'Payment Method',
      'Remark',
      'Sign',
    ],
    ...quotations.map(quotation => [
      quotation.number,
      formatDateTime(quotation.createDate),
      quotation.customer,
      formatMoney(quotation.total),
      statusLabel(quotation.status),
      quotation.paymentMethod?.trim() || '—',
      '',
      '',
    ]),
  ];
}

/** Printable HTML using the same rows as the Excel export. */
export function buildQuotationSummaryPrintHtml(rows: Cell[][]): string {
  const [header, ...body] = rows;
  const headerCells = header.map(label => `<th>${cellText(label)}</th>`).join('');
  const bodyRows = body
    .map(
      row => `<tr>${row.map(cell => `<td>${cellText(cell)}</td>`).join('')}</tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="my">
<head>
  <meta charset="utf-8" />
  <title>Quotations</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Myanmar:wght@400;700&display=swap" rel="stylesheet" />
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #1e293b;
      font-family: 'Noto Sans Myanmar', sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body { padding: 16px; }
    h1 {
      font-size: 18px;
      margin: 0 0 12px;
      font-weight: 700;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th {
      background: #2563eb;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 8px 6px;
      border: 1px solid #1d4ed8;
    }
    td {
      padding: 7px 6px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
      background: #ffffff;
    }
    tbody tr:nth-child(even) td {
      background: #f8fafc;
    }
    td:nth-child(4) { text-align: right; }
    td:nth-child(7),
    td:nth-child(8) { min-width: 100px; }
  </style>
</head>
<body>
  <h1>Quotations</h1>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`;
}

export function exportQuotationSummaries(
  quotations: Quotation[],
  filename = 'quotations',
): boolean {
  return exportToXlsx(filename, buildQuotationSummaryRows(quotations));
}

export function exportSelectedQuotations(quotations: Quotation[]): boolean {
  return exportQuotationSummaries(
    quotations,
    quotationExportFilename(quotations, 'xlsx').replace(/\.xlsx$/, ''),
  );
}
