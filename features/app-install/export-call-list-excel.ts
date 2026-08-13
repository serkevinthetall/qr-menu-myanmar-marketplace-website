/** @temp-feature app-install-call-list */
import { AppInstallRecord } from './types';
import { exportToXlsx } from '@/utils/export-excel';
import { formatMyanmarDateTime } from '@/utils/myanmar-datetime';

type Cell = string | number | null | undefined;

function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  return formatMyanmarDateTime(value) || value;
}

export function buildCallListExportRows(items: AppInstallRecord[]): Cell[][] {
  return [
    [
      'Partner ID',
      'Name',
      'Phone',
      'Township',
      'Status',
      'Reason',
      'Requested At',
      'Updated At',
      'Updated By',
      'Updated By Email',
    ],
    ...items.map(item => [
      item.odooPartnerId,
      item.name || '',
      item.phone || '',
      item.township || '',
      item.statusLabel || item.status,
      item.reasonLabel || '',
      formatDate(item.requestedAt),
      formatDate(item.updatedAt),
      item.updatedByName || '',
      item.updatedByEmail || '',
    ]),
  ];
}

export function callListExportFilename(count: number): string {
  const stamp = new Date().toISOString().slice(0, 10);
  if (count === 1) {
    return `call-list-1-contact-${stamp}.xlsx`;
  }
  return `call-list-${count}-contacts-${stamp}.xlsx`;
}

/** Export the currently loaded (filtered) Call List rows to Excel. */
export function exportCallListExcel(items: AppInstallRecord[]): boolean {
  if (items.length === 0) {
    return false;
  }
  return exportToXlsx(
    callListExportFilename(items.length),
    buildCallListExportRows(items),
    'App User List',
  );
}
