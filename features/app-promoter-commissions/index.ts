const MONTH_LABELS = [
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

export type MonthOption = {
  value: string;
  label: string;
};

/** YYYY-MM for the current calendar month. */
export function currentMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function formatMonthLabel(monthKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey.trim());
  if (!match) {
    return monthKey;
  }
  const year = Number(match[1]);
  const monthNum = Number(match[2]);
  if (monthNum < 1 || monthNum > 12) {
    return monthKey;
  }
  return `${MONTH_LABELS[monthNum - 1]} ${year}`;
}

/** Recent months for the header filter (newest first). */
export function buildMonthOptions(count = 24): MonthOption[] {
  const now = new Date();
  const options: MonthOption[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const value = `${y}-${m}`;
    options.push({ value, label: formatMonthLabel(value) });
  }
  return options;
}

export function monthLabelToKey(label: string, options: MonthOption[]): string {
  const found = options.find(opt => opt.label === label);
  return found?.value ?? currentMonthKey();
}

export { fetchAppPromoterCommissions } from './api';
export type { AppPromoterCommission, AppPromoterCommissionMeta } from './types';
