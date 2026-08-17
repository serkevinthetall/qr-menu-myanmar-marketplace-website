import { useLocalSearchParams } from 'expo-router';

import { OverviewOrdersDetailView } from '@/components/overview/OverviewOrdersDetailView';
import { useModuleSearch } from '@/contexts/search-context';
import { OverviewPeriod } from '@/types/overview';

function first(raw?: string | string[]): string {
  return Array.isArray(raw) ? String(raw[0] ?? '') : String(raw ?? '');
}

function parsePeriod(raw?: string | string[]): OverviewPeriod {
  const value = first(raw);
  if (value === 'day' || value === 'week' || value === 'month') {
    return value;
  }
  return 'month';
}

export default function OverviewPurchasesDetailScreen() {
  const { period } = useLocalSearchParams<{ period?: string }>();
  useModuleSearch('', false);

  return (
    <OverviewOrdersDetailView type="purchase" period={parsePeriod(period)} />
  );
}
