import { saleOrderDateKey } from '@/components/sale-order/sale-order-filter-utils';

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

const MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export type OrderDateDayGroup<T extends { orderDate: string; total: number }> = {
  key: string;
  label: string;
  orders: T[];
  count: number;
  total: number;
};

export type OrderDateMonthGroup<T extends { orderDate: string; total: number }> = {
  key: string;
  label: string;
  days: OrderDateDayGroup<T>[];
  count: number;
  total: number;
};

/** "August 2026" from YYYY-MM */
export function formatOrderMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) {
    return monthKey;
  }
  return `${MONTH_LONG[month - 1]} ${year}`;
}

/** "01 Aug 2026" from YYYY-MM-DD (Odoo-style day group label) */
export function formatOrderDayLabel(dayKey: string): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  if (!year || !month || !day || month < 1 || month > 12) {
    return dayKey;
  }
  return `${String(day).padStart(2, '0')} ${MONTH_SHORT[month - 1]} ${year}`;
}

/**
 * Group orders by Order Date → Month → Day (newest first), matching Odoo
 * "Group By: Order Date: Month > Order Date: Day".
 */
export function groupOrdersByMonthDay<T extends { orderDate: string; total: number }>(
  orders: T[],
): OrderDateMonthGroup<T>[] {
  const monthMap = new Map<string, Map<string, T[]>>();

  for (const order of orders) {
    const dayKey = saleOrderDateKey(order.orderDate);
    if (!dayKey || dayKey.length < 7) {
      const fallbackDay = 'unknown';
      const fallbackMonth = 'unknown';
      if (!monthMap.has(fallbackMonth)) {
        monthMap.set(fallbackMonth, new Map());
      }
      const days = monthMap.get(fallbackMonth)!;
      if (!days.has(fallbackDay)) {
        days.set(fallbackDay, []);
      }
      days.get(fallbackDay)!.push(order);
      continue;
    }

    const monthKey = dayKey.slice(0, 7);
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, new Map());
    }
    const days = monthMap.get(monthKey)!;
    if (!days.has(dayKey)) {
      days.set(dayKey, []);
    }
    days.get(dayKey)!.push(order);
  }

  const months = [...monthMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  return months.map(([monthKey, dayMap]) => {
    const days = [...dayMap.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dayKey, dayOrders]) => {
        const total = dayOrders.reduce(
          (sum, order) => sum + (Number(order.total) || 0),
          0,
        );
        return {
          key: dayKey,
          label:
            dayKey === 'unknown' ? 'Unknown date' : formatOrderDayLabel(dayKey),
          orders: dayOrders,
          count: dayOrders.length,
          total,
        };
      });

    const count = days.reduce((sum, day) => sum + day.count, 0);
    const total = days.reduce((sum, day) => sum + day.total, 0);

    return {
      key: monthKey,
      label:
        monthKey === 'unknown' ? 'Unknown month' : formatOrderMonthLabel(monthKey),
      days,
      count,
      total,
    };
  });
}
