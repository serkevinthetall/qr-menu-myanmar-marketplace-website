import { useLocalSearchParams } from 'expo-router';

import { OverviewDemandDetailView } from '@/components/overview/OverviewDemandDetailView';
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

export default function OverviewDemandScreen() {
  const { period } = useLocalSearchParams<{ period?: string }>();
  useModuleSearch('', false);

  return <OverviewDemandDetailView period={parsePeriod(period)} />;
}
