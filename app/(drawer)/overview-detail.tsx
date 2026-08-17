import { useLocalSearchParams } from 'expo-router';

import { OverviewRankingDetailView } from '@/components/overview/OverviewRankingDetailView';
import { useModuleSearch } from '@/contexts/search-context';
import { OverviewPeriod } from '@/types/overview';

function parseKind(raw?: string): 'customers' | 'areas' {
  return raw === 'areas' ? 'areas' : 'customers';
}

function parsePeriod(raw?: string): OverviewPeriod {
  if (raw === 'day' || raw === 'week' || raw === 'month') {
    return raw;
  }
  return 'month';
}

export default function OverviewDetailScreen() {
  const { kind, period } = useLocalSearchParams<{
    kind?: string;
    period?: string;
  }>();
  useModuleSearch('', false);

  return (
    <OverviewRankingDetailView
      kind={parseKind(kind)}
      period={parsePeriod(period)}
    />
  );
}
