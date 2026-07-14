export type ContactPeriod = 'day' | 'month' | 'quarter' | 'annual';

export type ContactStatusFilter = {
  key: string;
  label: string;
  match: (status: string) => boolean;
  bg: string;
  fg: string;
};

export const CONTACT_PERIOD_OPTIONS: { value: ContactPeriod; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'annual', label: 'Annual' },
];

/** Matches Odoo Studio selection values on x_studio_customer_status. */
export const CONTACT_STATUS_FILTERS: ContactStatusFilter[] = [
  {
    key: 'active',
    label: 'Active',
    match: status => {
      const value = status.toLowerCase();
      return value.includes('active') && !value.includes('inactive');
    },
    bg: '#DCFCE7',
    fg: '#166534',
  },
  {
    key: 'follow-up',
    label: 'Follow-up Needed',
    match: status => status.toLowerCase().includes('follow'),
    bg: '#FEF3C7',
    fg: '#92400E',
  },
  {
    key: 'inactive',
    label: 'Inactive',
    match: status => {
      const value = status.toLowerCase();
      return value.includes('inactive') || value.includes('over 30');
    },
    bg: '#FEE2E2',
    fg: '#991B1B',
  },
  {
    key: 'new-customer',
    label: 'New Customer',
    match: status => status.toLowerCase().includes('new customer'),
    bg: '#DBEAFE',
    fg: '#1E40AF',
  },
  {
    key: 'no-activity',
    label: 'No Recent Activity',
    match: status => status.toLowerCase().includes('no recent'),
    bg: '#E2E8F0',
    fg: '#475569',
  },
];

export type ContactFilters = {
  township: string;
  startDate: string;
  endDate: string;
  period: ContactPeriod;
  statuses: string[];
};

export const EMPTY_CONTACT_FILTERS: ContactFilters = {
  township: '',
  startDate: '',
  endDate: '',
  period: 'day',
  statuses: [],
};

function parseISO(value: string): Date | null {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function toISO(date: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfQuarter(date: Date): Date {
  const quarter = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), quarter * 3, 1);
}

function endOfQuarter(date: Date): Date {
  const quarter = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), quarter * 3 + 3, 0);
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

function endOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31);
}

export function getContactDateRange(filters: ContactFilters): {
  from: string;
  to: string;
} | null {
  const start = filters.startDate;
  const end = filters.endDate;

  if (!start && !end) {
    return null;
  }

  if (start && end) {
    return start <= end ? { from: start, to: end } : { from: end, to: start };
  }

  const anchor = parseISO(start || end);
  if (!anchor) {
    return null;
  }

  if (start && !end) {
    switch (filters.period) {
      case 'month':
        return { from: toISO(startOfMonth(anchor)), to: toISO(endOfMonth(anchor)) };
      case 'quarter':
        return { from: toISO(startOfQuarter(anchor)), to: toISO(endOfQuarter(anchor)) };
      case 'annual':
        return { from: toISO(startOfYear(anchor)), to: toISO(endOfYear(anchor)) };
      case 'day':
      default:
        return { from: start, to: start };
    }
  }

  return { from: end, to: end };
}

export function matchesContactFilters(
  customer: { township: string; status: string; lastInvoiceDate: string },
  filters: ContactFilters,
): boolean {
  if (filters.township) {
    const term = filters.township.trim().toLowerCase();
    if (!customer.township.toLowerCase().includes(term)) {
      return false;
    }
  }

  const range = getContactDateRange(filters);
  if (range) {
    const invoiceDate = customer.lastInvoiceDate.split(' ')[0];
    if (!invoiceDate || invoiceDate < range.from || invoiceDate > range.to) {
      return false;
    }
  }

  if (filters.statuses.length > 0) {
    const matches = filters.statuses.some(key => {
      const rule = CONTACT_STATUS_FILTERS.find(item => item.key === key);
      return rule ? rule.match(customer.status) : false;
    });
    if (!matches) {
      return false;
    }
  }

  return true;
}

export function hasActiveContactFilters(filters: ContactFilters) {
  return (
    !!filters.township ||
    !!filters.startDate ||
    !!filters.endDate ||
    filters.statuses.length > 0
  );
}
