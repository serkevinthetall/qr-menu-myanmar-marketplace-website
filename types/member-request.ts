export const MEMBER_REQUEST_STATUSES = [
  'Requested',
  'Approved',
  'Rejected',
] as const;

export type MemberRequestStatus = (typeof MEMBER_REQUEST_STATUSES)[number];

export const MEMBER_REQUEST_PLANS = ['Premium', 'Pro'] as const;

export type MemberRequestPlan = (typeof MEMBER_REQUEST_PLANS)[number];

export type MemberRequest = {
  id: string;
  customerId: string;
  customer: string;
  requestedPlan: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  requestedAt: string;
  notes: string;
};

export type MemberRequestMeta = {
  statuses: { id: string; label: string }[];
  plans: { id: string; label: string }[];
};

export type MemberRequestDatePeriod = '' | 'today' | 'week' | 'month' | 'year';

export const MEMBER_REQUEST_DATE_PERIOD_OPTIONS: {
  id: MemberRequestDatePeriod | 'all';
  label: string;
}[] = [
  { id: 'all', label: 'All dates' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toYmd(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function yangonCalendarParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Yangon',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value ?? '';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    weekday: get('weekday'),
  };
}

/** Inclusive YYYY-MM-DD range for Requested at, in Asia/Yangon. */
export function getMemberRequestPeriodRange(
  period: MemberRequestDatePeriod,
): { from: string; to: string } | null {
  if (!period) {
    return null;
  }
  const { year, month, day, weekday } = yangonCalendarParts();
  const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
    weekday,
  );
  const mondayOffset = weekdayIndex === 0 ? -6 : 1 - weekdayIndex;

  switch (period) {
    case 'today':
      return { from: toYmd(year, month, day), to: toYmd(year, month, day) };
    case 'week': {
      const monday = new Date(Date.UTC(year, month - 1, day + mondayOffset));
      const sunday = new Date(Date.UTC(year, month - 1, day + mondayOffset + 6));
      return {
        from: toYmd(
          monday.getUTCFullYear(),
          monday.getUTCMonth() + 1,
          monday.getUTCDate(),
        ),
        to: toYmd(
          sunday.getUTCFullYear(),
          sunday.getUTCMonth() + 1,
          sunday.getUTCDate(),
        ),
      };
    }
    case 'month': {
      const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
      return { from: toYmd(year, month, 1), to: toYmd(year, month, last) };
    }
    case 'year':
      return { from: toYmd(year, 1, 1), to: toYmd(year, 12, 31) };
    default:
      return null;
  }
}
