/**
 * Odoo stores datetimes in UTC (naive strings like "2026-07-20 07:36:21").
 * Display them in Asia/Yangon so they match the Odoo web UI.
 */

export const MYANMAR_TIME_ZONE = 'Asia/Yangon';

const MONTHS = [
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

/** Parse Odoo datetime / ISO string as UTC. */
export function parseOdooDateTime(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  // Already human-formatted — leave callers to pass through if needed.
  if (/AM|PM/i.test(trimmed) && !/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return null;
  }

  if (/Z|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const dated = new Date(trimmed);
    return Number.isNaN(dated.getTime()) ? null : dated;
  }

  const normalized = trimmed
    .replace(' ', 'T')
    .replace(/\.\d+$/, '');
  const withUtc = /T\d{2}:\d{2}/.test(normalized)
    ? `${normalized}Z`
    : `${normalized}T00:00:00Z`;
  const dated = new Date(withUtc);
  return Number.isNaN(dated.getTime()) ? null : dated;
}

function yangonParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MYANMAR_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value ?? '';

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour12: Number(get('hour')),
    minute: get('minute').padStart(2, '0'),
    dayPeriod: get('dayPeriod').toUpperCase(),
  };
}

/** Calendar date in Myanmar (for date-only fields, no time shift). */
export function formatMyanmarDate(value: string, options?: { includeYear?: boolean }): string {
  if (!value?.trim()) {
    return '';
  }
  const datePart = value.trim().split(/[T ]/)[0];
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) {
    return value.trim();
  }
  const includeYear =
    options?.includeYear ?? year !== new Date().getFullYear();
  return includeYear
    ? `${MONTHS[month - 1]} ${day}, ${year}`
    : `${MONTHS[month - 1]} ${day}`;
}

/**
 * Format Odoo UTC datetime for display in Asia/Yangon.
 * Example: "2026-07-20 07:36:21" → "Jul 20 2:06 PM"
 */
export function formatMyanmarDateTime(
  value: unknown,
  options?: { includeYear?: boolean; empty?: string },
): string {
  const empty = options?.empty ?? '';
  if (!value || typeof value !== 'string') {
    return empty;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return empty;
  }
  if (/AM|PM/i.test(trimmed) && !/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed;
  }

  const dated = parseOdooDateTime(trimmed);
  if (!dated) {
    return trimmed;
  }

  const { year, month, day, hour12, minute, dayPeriod } = yangonParts(dated);
  if (!year || !month || !day) {
    return trimmed;
  }

  const includeYear =
    options?.includeYear ?? year !== new Date().getFullYear();
  const dateLabel = includeYear
    ? `${MONTHS[month - 1]} ${day}, ${year}`
    : `${MONTHS[month - 1]} ${day}`;

  const hasClock = /[T ]\d{2}:\d{2}/.test(trimmed);
  if (!hasClock) {
    return dateLabel;
  }

  return `${dateLabel} ${hour12}:${minute} ${dayPeriod}`;
}
