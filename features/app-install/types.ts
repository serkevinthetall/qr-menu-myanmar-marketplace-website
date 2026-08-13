/** @temp-feature app-install-call-list */
export type AppInstallStatus =
  | 'new'
  | 'not_installed'
  | 'waiting'
  | 'please_come_and_install'
  | 'installed';

export type AppInstallReason =
  | 'no_smartphone'
  | 'not_interested'
  | 'will_install_later'
  | 'other';

export type AppInstallRecord = {
  id: string;
  odooPartnerId: string;
  name: string;
  phone: string;
  township?: string;
  status: AppInstallStatus;
  statusLabel: string;
  reason: AppInstallReason | null;
  /** Free-text when reason is `other`. */
  reasonNote?: string;
  reasonLabel: string;
  requestedAt: string | null;
  updatedAt: string | null;
  updatedByEmail: string;
  updatedByName: string;
  /** How many App Orders this partner has (0 if none). */
  appOrderCount?: number;
  lastAppOrderNumber?: string;
  lastAppOrderDate?: string;
};

export const APP_INSTALL_STATUS_OPTIONS: {
  id: AppInstallStatus | 'all';
  label: string;
}[] = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'not_installed', label: 'Not installed' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'please_come_and_install', label: 'Please come and install' },
  { id: 'installed', label: 'Installed' },
];

export const APP_INSTALL_REASON_OPTIONS: {
  id: AppInstallReason;
  label: string;
}[] = [
  { id: 'no_smartphone', label: 'No smartphone' },
  { id: 'not_interested', label: 'Not interested' },
  { id: 'will_install_later', label: 'Will install later' },
  { id: 'other', label: 'Other' },
];

export type AppUserListDatePeriod = '' | 'today' | 'week' | 'month';

export const APP_USER_LIST_DATE_PERIOD_OPTIONS: {
  id: AppUserListDatePeriod | 'all';
  label: string;
}[] = [
  { id: 'all', label: 'All dates' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
];

export type AppUserListDateFilters = {
  period: AppUserListDatePeriod;
  startDate: string;
  endDate: string;
};

export const EMPTY_APP_USER_LIST_DATE_FILTERS: AppUserListDateFilters = {
  period: '',
  startDate: '',
  endDate: '',
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

function getPresetCreatedRange(
  period: AppUserListDatePeriod,
): { from: string; to: string } | null {
  if (!period) {
    return null;
  }
  const today = todayDate();
  switch (period) {
    case 'today':
      return { from: toISO(today), to: toISO(today) };
    case 'week':
      return { from: toISO(startOfWeek(today)), to: toISO(endOfWeek(today)) };
    case 'month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { from: toISO(start), to: toISO(end) };
    }
    default:
      return null;
  }
}

export function getAppUserListCreatedDateRange(
  filters: AppUserListDateFilters,
): { from: string; to: string } | null {
  const { startDate, endDate, period } = filters;

  if (startDate && endDate) {
    return startDate <= endDate
      ? { from: startDate, to: endDate }
      : { from: endDate, to: startDate };
  }

  if (period) {
    return getPresetCreatedRange(period);
  }

  if (!startDate && !endDate) {
    return null;
  }

  if (startDate) {
    return { from: startDate, to: startDate };
  }

  return { from: endDate, to: endDate };
}

export function hasAppUserListDateFilters(filters: AppUserListDateFilters): boolean {
  return Boolean(filters.period || filters.startDate || filters.endDate);
}

/** Compare created/requested ISO timestamps to period or custom YYYY-MM-DD range. */
export function matchesAppUserListDateFilters(
  requestedAt: string | null | undefined,
  filters: AppUserListDateFilters,
): boolean {
  const range = getAppUserListCreatedDateRange(filters);
  if (!range) {
    return true;
  }
  const day = String(requestedAt ?? '').trim().slice(0, 10);
  if (!day) {
    return false;
  }
  if (day < range.from || day > range.to) {
    return false;
  }
  return true;
}
