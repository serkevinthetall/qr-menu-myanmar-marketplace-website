import { exportToXlsx } from '@/utils/export-excel';
import { formatMyanmarDate } from '@/utils/myanmar-datetime';

import type { AppPromoterCommission } from './types';

type Cell = string | number | null | undefined;

function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  return formatMyanmarDate(value) || value;
}

export function buildAppPromoterCommissionExportRows(
  items: AppPromoterCommission[],
  totalAmount: number,
): Cell[][] {
  const header = [
    'Date',
    'Promoter',
    'Customer',
    'Sale Order',
    'Amount',
    'Title',
  ];

  const dataRows = items.map(row => [
    formatDate(row.date),
    row.promoterName || '',
    row.customerName || '',
    row.saleOrderName || '',
    Number.isFinite(row.amount) ? row.amount : 0,
    row.title || '',
  ]);

  if (dataRows.length === 0) {
    return [header];
  }

  return [
    header,
    ...dataRows,
    [],
    ['', '', '', 'Total', totalAmount, ''],
  ];
}

function slugPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function appPromoterCommissionExportFilename(options: {
  monthKey: string;
  promoterName: string;
  count: number;
}): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const month = options.monthKey || stamp.slice(0, 7);
  const promoter = slugPart(options.promoterName || 'all-promoters') || 'all';
  return `app-commission-${month}-${promoter}-${options.count}-lines-${stamp}.xlsx`;
}

/** Export filtered commission rows to Excel (web only). */
export function exportAppPromoterCommissionsExcel(
  items: AppPromoterCommission[],
  options: {
    monthKey: string;
    monthLabel: string;
    promoterName: string;
    totalAmount: number;
  },
): boolean {
  if (items.length === 0) {
    return false;
  }

  return exportToXlsx(
    appPromoterCommissionExportFilename({
      monthKey: options.monthKey,
      promoterName: options.promoterName,
      count: items.length,
    }),
    buildAppPromoterCommissionExportRows(items, options.totalAmount),
    options.monthLabel.slice(0, 31) || 'Commissions',
  );
}
