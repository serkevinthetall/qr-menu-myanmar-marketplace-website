import { exportToXlsx } from '@/utils/export-excel';

export type OverviewSixMonthExportPayload = {
  topic: 'customers' | 'sales' | 'products';
  filename: string;
  sheetName: string;
  headers: string[];
  rows: Array<Array<string | number>>;
};

/** Build and download a six-month Overview Excel file (web only). */
export function exportOverviewSixMonthExcel(
  payload: OverviewSixMonthExportPayload,
): boolean {
  if (!payload.headers.length) {
    return false;
  }
  return exportToXlsx(
    payload.filename,
    [payload.headers, ...payload.rows],
    payload.sheetName || 'Export',
  );
}
