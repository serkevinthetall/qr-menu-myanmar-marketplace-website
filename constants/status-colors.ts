import { ThemeMode } from '@/constants/colors';

type StatusPair = { bg: string; fg: string };

const quotationStatusLight: Record<string, StatusPair> = {
  quotation: { bg: '#E2E8F0', fg: '#475569' },
  sent: { bg: '#DBEAFE', fg: '#1E40AF' },
  sale: { bg: '#DCFCE7', fg: '#166534' },
  done: { bg: '#DCFCE7', fg: '#166534' },
  cancel: { bg: '#FEE2E2', fg: '#991B1B' },
  default: { bg: '#E2E8F0', fg: '#475569' },
};

const quotationStatusDark: Record<string, StatusPair> = {
  quotation: { bg: '#334155', fg: '#E2E8F0' },
  sent: { bg: '#1E3A5F', fg: '#93C5FD' },
  sale: { bg: 'rgba(16, 185, 129, 0.22)', fg: '#6EE7B7' },
  done: { bg: 'rgba(16, 185, 129, 0.22)', fg: '#6EE7B7' },
  cancel: { bg: 'rgba(239, 68, 68, 0.22)', fg: '#FCA5A5' },
  default: { bg: '#334155', fg: '#CBD5E1' },
};

export function getQuotationStatusColors(
  mode: ThemeMode,
  state: string,
): StatusPair & { label: string } {
  const palette = mode === 'dark' ? quotationStatusDark : quotationStatusLight;

  switch (state) {
    case 'draft':
    case 'sent':
      return {
        label: state === 'sent' ? 'Quotation Sent' : 'Quotation',
        ...(palette[state] ?? palette.quotation),
      };
    case 'sale':
      return { label: 'Sales Order', ...palette.sale };
    case 'done':
      return { label: 'Locked', ...palette.done };
    case 'cancel':
      return { label: 'Cancelled', ...palette.cancel };
    default:
      return { label: state || '—', ...palette.default };
  }
}

export function getContactStatusColors(
  mode: ThemeMode,
  status: string,
): StatusPair {
  const value = status.toLowerCase();

  if (mode === 'dark') {
    if (value.includes('inactive') || value.includes('over 30')) {
      return { bg: 'rgba(239, 68, 68, 0.22)', fg: '#FCA5A5' };
    }
    if (value.includes('follow')) {
      return { bg: 'rgba(245, 158, 11, 0.22)', fg: '#FCD34D' };
    }
    if (value.includes('new customer')) {
      return { bg: '#1E3A5F', fg: '#93C5FD' };
    }
    if (value.includes('active') && !value.includes('inactive')) {
      return { bg: 'rgba(16, 185, 129, 0.22)', fg: '#6EE7B7' };
    }
    return { bg: '#334155', fg: '#CBD5E1' };
  }

  if (value.includes('inactive') || value.includes('over 30')) {
    return { bg: '#FEE2E2', fg: '#991B1B' };
  }
  if (value.includes('follow')) {
    return { bg: '#FEF3C7', fg: '#92400E' };
  }
  if (value.includes('new customer')) {
    return { bg: '#DBEAFE', fg: '#1E40AF' };
  }
  if (value.includes('active') && !value.includes('inactive')) {
    return { bg: '#DCFCE7', fg: '#166534' };
  }
  return { bg: '#E2E8F0', fg: '#475569' };
}

export function getFilterStatusColors(
  mode: ThemeMode,
  key: string,
  light: StatusPair,
): StatusPair {
  if (mode === 'light') {
    return light;
  }

  const darkMap: Record<string, StatusPair> = {
    quotation: { bg: '#334155', fg: '#E2E8F0' },
    sale: { bg: 'rgba(16, 185, 129, 0.22)', fg: '#6EE7B7' },
    cancel: { bg: 'rgba(239, 68, 68, 0.22)', fg: '#FCA5A5' },
    active: { bg: 'rgba(16, 185, 129, 0.22)', fg: '#6EE7B7' },
    'follow-up': { bg: 'rgba(245, 158, 11, 0.22)', fg: '#FCD34D' },
    inactive: { bg: 'rgba(239, 68, 68, 0.22)', fg: '#FCA5A5' },
    'new-customer': { bg: '#1E3A5F', fg: '#93C5FD' },
  };

  return darkMap[key] ?? { bg: '#334155', fg: '#CBD5E1' };
}
