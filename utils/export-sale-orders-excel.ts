import { SaleOrder } from '@/types/sale-order';
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

export function saleOrderExportFilename(
  orders: SaleOrder[],
  extension: 'xlsx' = 'xlsx',
): string {
  if (orders.length === 1) {
    const safeNumber = String(orders[0].number || orders[0].id).replace(
      /[^\w.-]+/g,
      '_',
    );
    return `sale-order-${safeNumber}.${extension}`;
  }
  return `sale-orders-selected-${orders.length}.${extension}`;
}

/** Shared table rows for Sale Order Excel export. */
export function buildSaleOrderSummaryRows(orders: SaleOrder[]): Cell[][] {
  return [
    [
      'Number',
      'Order Date',
      'Customer',
      'Phone',
      'Total',
      'Status',
      'Sale Person',
    ],
    ...orders.map(order => [
      String(order.number ?? ''),
      formatMyanmarDateTime(order.orderDate) || order.orderDate || '',
      order.customer || '',
      order.phoneNumber?.trim() || '',
      formatMoney(order.total),
      statusLabel(order.status),
      order.salePersonName?.trim() || order.salesperson?.trim() || '',
    ]),
  ];
}

export function exportSelectedSaleOrders(orders: SaleOrder[]): boolean {
  if (orders.length === 0) {
    return false;
  }
  return exportToXlsx(
    saleOrderExportFilename(orders).replace(/\.xlsx$/, ''),
    buildSaleOrderSummaryRows(orders),
    'Sale Orders',
  );
}
