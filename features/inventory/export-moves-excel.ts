import { exportToXlsx } from '@/utils/export-excel';
import { formatMyanmarDate } from '@/utils/myanmar-datetime';

import type { StockMoveLine } from './types';

type Cell = string | number | null | undefined;

function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  return formatMyanmarDate(value) || value;
}

export function buildStockMovesExportRows(
  items: StockMoveLine[],
  totalQuantity: number,
): Cell[][] {
  const sorted = [...items].sort((a, b) => {
    const cat = (a.category || '').localeCompare(b.category || '', undefined, {
      sensitivity: 'base',
    });
    if (cat !== 0) return cat;
    return (a.productName || '').localeCompare(b.productName || '', undefined, {
      sensitivity: 'base',
    });
  });

  const header = [
    'Date',
    'Category',
    'Product',
    'Reference',
    'From',
    'To',
    'Quantity',
    'Unit',
    'Status',
  ];
  const dataRows = sorted.map(row => [
    formatDate(row.date),
    row.category || '',
    row.productName || '',
    row.reference || '',
    row.fromLocation || '',
    row.toLocation || '',
    Number.isFinite(row.quantity) ? row.quantity : 0,
    row.unit || '',
    row.state || '',
  ]);
  if (dataRows.length === 0) {
    return [header];
  }
  return [
    header,
    ...dataRows,
    [],
    ['', '', '', '', '', 'Total qty', totalQuantity, '', ''],
  ];
}

export function exportStockMovesExcel(
  items: StockMoveLine[],
  options: { monthKey: string; totalQuantity: number },
): boolean {
  if (items.length === 0) return false;
  const stamp = new Date().toISOString().slice(0, 10);
  const month = options.monthKey || stamp.slice(0, 7);
  return exportToXlsx(
    `moves-history-${month}-${items.length}-lines-${stamp}.xlsx`,
    buildStockMovesExportRows(items, options.totalQuantity),
    'Moves History',
  );
}
