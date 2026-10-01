import { formatMyanmarDateTime } from '@/utils/myanmar-datetime';
import { exportToXlsxSheets, type XlsxSheet } from '@/utils/export-excel';
import {
  formatOrderMonthLabel,
  groupOrdersByMonthDay,
} from '@/utils/order-date-groups';
import type { SaleOrder } from '@/types/sale-order';

type Cell = string | number | null | undefined;

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Excel sheet tab: "Sep 2026" (fits 31-char limit). */
function monthSheetName(monthKey: string): string {
  if (monthKey === 'unknown') return 'Unknown';
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) {
    return monthKey.slice(0, 31);
  }
  return `${MONTH_SHORT[month - 1]} ${year}`;
}

function buildMonthRows(orders: SaleOrder[], monthTotal: number): Cell[][] {
  const header = [
    'Order Date',
    'Order Number',
    'Customer',
    'Phone',
    'Amount (MMK)',
  ];

  const dataRows = orders.map(order => [
    formatMyanmarDateTime(order.orderDate) || order.orderDate || '',
    order.number || '',
    order.customer || '',
    order.phoneNumber || '',
    Number.isFinite(order.total) ? order.total : 0,
  ]);

  return [
    header,
    ...dataRows,
    [],
    ['', '', '', 'Monthly Total', monthTotal],
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

export function appOrdersMonthlyExportFilename(options: {
  orderCount: number;
  search?: string;
}): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const searchSlug = slugPart(options.search || '');
  const searchPart = searchSlug ? `-${searchSlug}` : '';
  return `app-orders-monthly-cost${searchPart}-${options.orderCount}-orders-${stamp}.xlsx`;
}

export type AppOrdersMonthlyExportOptions = {
  /** Header search text — export only matches this list scope. */
  search?: string;
  /** Optional date-range / period label from the filter bar. */
  dateLabel?: string;
  readFilter?: 'all' | 'unread' | 'read';
};

/**
 * Export App Orders as Excel with:
 * - Summary sheet (month → order count → total cost)
 * - One sheet per month with order lines + monthly total
 *
 * Pass the same list currently visible for the search bar / filters.
 */
export function exportAppOrdersMonthlyExcel(
  orders: SaleOrder[],
  options: AppOrdersMonthlyExportOptions = {},
): boolean {
  if (orders.length === 0) {
    return false;
  }

  const months = groupOrdersByMonthDay(orders);
  if (months.length === 0) {
    return false;
  }

  const search = String(options.search ?? '').trim();
  const dateLabel = String(options.dateLabel ?? '').trim();
  const readFilter = options.readFilter ?? 'all';

  const scopeRows: Cell[][] = [
    ['Export scope'],
    ['Search', search || '(all)'],
    ['Date filter', dateLabel || '(all dates)'],
    ['Read filter', readFilter],
    ['Orders in export', orders.length],
    [],
  ];

  const grandOrders = months.reduce((sum, month) => sum + month.count, 0);
  const grandTotal = months.reduce((sum, month) => sum + month.total, 0);

  const sheets: XlsxSheet[] = [
    {
      name: 'Summary',
      rows: [
        ...scopeRows,
        ['Month', 'Orders', 'Total Cost (MMK)'],
        ...months.map(month => [
          month.key === 'unknown'
            ? 'Unknown month'
            : formatOrderMonthLabel(month.key),
          month.count,
          month.total,
        ]),
        [],
        ['Grand Total', grandOrders, grandTotal],
      ],
    },
    ...months.map(month => {
      const flatOrders = month.days.flatMap(day => day.orders);
      return {
        name: monthSheetName(month.key),
        rows: buildMonthRows(flatOrders, month.total),
      };
    }),
  ];

  return exportToXlsxSheets(
    appOrdersMonthlyExportFilename({
      orderCount: orders.length,
      search,
    }),
    sheets,
  );
}
