import { Platform } from 'react-native';

import { Quotation } from '@/types/quotation';
import {
  buildQuotationSummaryPrintHtml,
  buildQuotationSummaryRows,
} from '@/utils/export-quotation-excel';
import { printHtmlDocument } from '@/utils/print-quotation';

/**
 * Opens a print preview of the same selected rows used for Excel export.
 * Choose "Save as PDF" in the print dialog to download a PDF.
 */
export function exportSelectedQuotationsPdf(quotations: Quotation[]): boolean {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return false;
  }

  const rows = buildQuotationSummaryRows(quotations);
  const html = buildQuotationSummaryPrintHtml(rows);
  return printHtmlDocument(html);
}
