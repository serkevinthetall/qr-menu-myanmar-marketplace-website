import { Platform } from 'react-native';
import * as XLSX from 'xlsx';

type Cell = string | number | null | undefined;

export type XlsxSheet = {
  name: string;
  rows: Cell[][];
};

function escapeCell(cell: Cell): string {
  const text = cell === null || cell === undefined ? '' : String(cell);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function sanitizeSheetName(name: string, used: Set<string>): string {
  const cleaned =
    String(name || 'Sheet')
      .replace(/[\\/?*[\]:]/g, '-')
      .trim()
      .slice(0, 31) || 'Sheet';
  let candidate = cleaned;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${n})`;
    candidate = `${cleaned.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
    n += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
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

/** Exports one or more sheets to a real .xlsx workbook. */
export function exportToXlsxSheets(
  filename: string,
  sheets: XlsxSheet[],
): boolean {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return false;
  }
  if (!sheets.length) {
    return false;
  }

  const workbook = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  for (const sheet of sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet(
      sheet.rows.map(row =>
        row.map(cell => (cell === null || cell === undefined ? '' : cell)),
      ),
    );
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      sanitizeSheetName(sheet.name, usedNames),
    );
  }

  XLSX.writeFile(
    workbook,
    filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`,
  );
  return true;
}

/** Exports tabular data to a real .xlsx workbook. */
export function exportToXlsx(
  filename: string,
  rows: Cell[][],
  sheetName = 'Quotations',
): boolean {
  return exportToXlsxSheets(filename, [{ name: sheetName, rows }]);
}
