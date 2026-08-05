export type SaleOrderPeriod =
  | ''
  | 'today'
  | 'yesterday'
  | 'week'
  | 'month'
  | 'year';

export const SALE_ORDER_PERIOD_OPTIONS: {
  value: SaleOrderPeriod;
  label: string;
}[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
];

export type SaleOrderFilters = {
  startDate: string;
  endDate: string;
  period: SaleOrderPeriod;
};

export const EMPTY_SALE_ORDER_FILTERS: SaleOrderFilters = {
  startDate: '',
  endDate: '',
  period: '',
};

function toISO(date: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function todayDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

function endOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31);
}

function getPresetDateRange(
  period: SaleOrderPeriod,
): { from: string; to: string } | null {
  if (!period) {
    return null;
  }

  const today = todayDate();

  switch (period) {
    case 'today':
      return { from: toISO(today), to: toISO(today) };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { from: toISO(yesterday), to: toISO(yesterday) };
    }
    case 'week':
      return { from: toISO(startOfWeek(today)), to: toISO(endOfWeek(today)) };
    case 'month':
      return { from: toISO(startOfMonth(today)), to: toISO(endOfMonth(today)) };
    case 'year':
      return { from: toISO(startOfYear(today)), to: toISO(endOfYear(today)) };
    default:
      return null;
  }
}

/** Human label for the active date filter (e.g. "Today", "2026-08-04 – 2026-08-05"). */
export function getSaleOrderFilterDateLabel(filters: SaleOrderFilters): string {
  if (filters.period) {
    return (
      SALE_ORDER_PERIOD_OPTIONS.find(item => item.value === filters.period)
        ?.label ?? 'Selected dates'
    );
  }

  const range = getSaleOrderDateRange(filters);
  if (!range) {
    return 'Selected dates';
  }

  if (range.from === range.to) {
    return range.from;
  }

  return `${range.from} – ${range.to}`;
}

export function getSaleOrderDateRange(filters: SaleOrderFilters): {
  from: string;
  to: string;
} | null {
  const { startDate, endDate, period } = filters;

  if (startDate && endDate) {
    return startDate <= endDate
      ? { from: startDate, to: endDate }
      : { from: endDate, to: startDate };
  }

  if (period) {
    return getPresetDateRange(period);
  }

  if (!startDate && !endDate) {
    return null;
  }

  if (startDate) {
    return { from: startDate, to: startDate };
  }

  return { from: endDate, to: endDate };
}

export function saleOrderDateKey(orderDate: string): string {
  return orderDate.trim().replace('T', ' ').split(' ')[0];
}

export function matchesSaleOrderFilters(
  order: { orderDate: string },
  filters: SaleOrderFilters,
): boolean {
  const range = getSaleOrderDateRange(filters);
  if (!range) {
    return true;
  }

  const orderedOn = saleOrderDateKey(order.orderDate);
  if (!orderedOn || orderedOn < range.from || orderedOn > range.to) {
    return false;
  }

  return true;
}

export function hasActiveSaleOrderFilters(filters: SaleOrderFilters): boolean {
  return !!filters.period || !!filters.startDate || !!filters.endDate;
}
