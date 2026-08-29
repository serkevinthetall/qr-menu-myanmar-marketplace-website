import { exportToXlsx } from '@/utils/export-excel';

import type { OnHandProduct } from './types';

type Cell = string | number | null | undefined;

export function buildOnHandExportRows(
  items: OnHandProduct[],
  totalOnHand: number,
): Cell[][] {
  const header = ['Product', 'SKU', 'Category', 'On Hand', 'Unit'];
  const dataRows = items.map(row => [
    row.name || '',
    row.sku || '',
    row.category || '',
    Number.isFinite(row.onHand) ? row.onHand : 0,
    row.unit || '',
  ]);
  if (dataRows.length === 0) {
    return [header];
  }
  return [header, ...dataRows, [], ['', '', 'Total lines', items.length, ''], ['', '', 'Sum on hand', totalOnHand, '']];
}

export function exportOnHandExcel(
  items: OnHandProduct[],
  options?: { totalOnHand?: number },
): boolean {
  if (items.length === 0) return false;
  const stamp = new Date().toISOString().slice(0, 10);
  const total =
    options?.totalOnHand ??
    items.reduce((sum, row) => sum + (Number(row.onHand) || 0), 0);
  return exportToXlsx(
    `on-hand-${items.length}-products-${stamp}.xlsx`,
    buildOnHandExportRows(items, total),
    'On Hand',
  );
}
