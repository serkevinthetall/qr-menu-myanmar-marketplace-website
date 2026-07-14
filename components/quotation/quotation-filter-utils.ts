export type QuotationPeriod = '' | 'today' | 'week' | 'month' | 'year';

export const QUOTATION_PERIOD_OPTIONS: { value: QuotationPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
];

export type QuotationStatusFilter = {
  key: string;
  label: string;
  match: (status: string) => boolean;
  bg: string;
  fg: string;
};

export const QUOTATION_STATUS_FILTERS: QuotationStatusFilter[] = [
  {
    key: 'quotation',
    label: 'Quotation',
    match: status => status === 'draft' || status === 'sent',
    bg: '#E2E8F0',
    fg: '#475569',
  },
  {
    key: 'sale',
    label: 'Sales Order',
    match: status => status === 'sale' || status === 'done',
    bg: '#DCFCE7',
    fg: '#166534',
  },
  {
    key: 'cancel',
    label: 'Cancelled',
    match: status => status === 'cancel',
    bg: '#FEE2E2',
    fg: '#991B1B',
  },
];

export type QuotationFilters = {
  startDate: string;
  endDate: string;
  period: QuotationPeriod;
  statuses: string[];
};

export const EMPTY_QUOTATION_FILTERS: QuotationFilters = {
  startDate: '',
  endDate: '',
  period: '',
  statuses: [],
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

function getPresetDateRange(period: QuotationPeriod): { from: string; to: string } | null {
  if (!period) {
    return null;
  }

  const today = todayDate();

  switch (period) {
    case 'today':
      return { from: toISO(today), to: toISO(today) };
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

export function getQuotationDateRange(filters: QuotationFilters): {
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

export function quotationDateKey(createDate: string): string {
  return createDate.trim().replace('T', ' ').split(' ')[0];
}

export function matchesQuotationFilters(
  quotation: { createDate: string; status: string },
  filters: QuotationFilters,
): boolean {
  const range = getQuotationDateRange(filters);
  if (range) {
    const createdOn = quotationDateKey(quotation.createDate);
    if (!createdOn || createdOn < range.from || createdOn > range.to) {
      return false;
    }
  }

  if (filters.statuses.length > 0) {
    const matches = filters.statuses.some(key => {
      const rule = QUOTATION_STATUS_FILTERS.find(item => item.key === key);
      return rule ? rule.match(quotation.status) : false;
    });
    if (!matches) {
      return false;
    }
  }

  return true;
}

export function hasActiveQuotationFilters(filters: QuotationFilters): boolean {
  return (
    !!filters.period ||
    !!filters.startDate ||
    !!filters.endDate ||
    filters.statuses.length > 0
  );
}
