import { Platform } from 'react-native';
import * as XLSX from 'xlsx';

type Cell = string | number | null | undefined;

function escapeCell(cell: Cell): string {
  const text = cell === null || cell === undefined ? '' : String(cell);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Exports tabular data to an Excel-compatible CSV file. On web this triggers a
 * browser download; on native it is currently a no-op (returns false) since the
 * ERP frontend targets the web.
 */
export function exportToCsv(filename: string, rows: Cell[][]): boolean {
  const csv = rows.map(row => row.map(escapeCell).join(',')).join('\n');

  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return false;
  }

  // Prepend BOM so Excel opens UTF-8 correctly.
  const blob = new Blob([`\ufeff${csv}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

/** Exports tabular data to a real .xlsx workbook. */
export function exportToXlsx(
  filename: string,
  rows: Cell[][],
  sheetName = 'Quotations',
): boolean {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return false;
  }

  const worksheet = XLSX.utils.aoa_to_sheet(
    rows.map(row => row.map(cell => (cell === null || cell === undefined ? '' : cell))),
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(
    workbook,
    filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`,
  );
  return true;
}
