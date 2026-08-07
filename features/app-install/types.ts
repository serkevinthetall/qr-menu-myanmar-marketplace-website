/** @temp-feature app-install-call-list */
export type AppInstallStatus = 'not_installed' | 'installed';

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
  reasonLabel: string;
  requestedAt: string | null;
  updatedAt: string | null;
  updatedByEmail: string;
  updatedByName: string;
};

export const APP_INSTALL_STATUS_OPTIONS: {
  id: AppInstallStatus | 'all';
  label: string;
}[] = [
  { id: 'all', label: 'All' },
  { id: 'not_installed', label: 'Not installed' },
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
