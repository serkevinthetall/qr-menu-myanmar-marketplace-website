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

export type AppUserListDateFilters = {
  startDate: string;
  endDate: string;
};

export const EMPTY_APP_USER_LIST_DATE_FILTERS: AppUserListDateFilters = {
  startDate: '',
  endDate: '',
};

export function hasAppUserListDateFilters(filters: AppUserListDateFilters): boolean {
  return Boolean(filters.startDate || filters.endDate);
}

/** Compare created/requested ISO timestamps to YYYY-MM-DD range. */
export function matchesAppUserListDateFilters(
  requestedAt: string | null | undefined,
  filters: AppUserListDateFilters,
): boolean {
  if (!filters.startDate && !filters.endDate) {
    return true;
  }
  const day = String(requestedAt ?? '').trim().slice(0, 10);
  if (!day) {
    return false;
  }
  if (filters.startDate && day < filters.startDate) {
    return false;
  }
  if (filters.endDate && day > filters.endDate) {
    return false;
  }
  return true;
}
