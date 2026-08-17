import { useLocalSearchParams } from 'expo-router';

import { OverviewOrdersDetailView } from '@/components/overview/OverviewOrdersDetailView';
import { OverviewRankingDetailView } from '@/components/overview/OverviewRankingDetailView';
import { useModuleSearch } from '@/contexts/search-context';
import { OverviewPeriod } from '@/types/overview';

type DetailKind = 'customers' | 'areas' | 'sales' | 'purchases';

function parseKind(raw?: string): DetailKind {
  if (raw === 'areas' || raw === 'sales' || raw === 'purchases') {
    return raw;
  }
  return 'customers';
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

  const parsedKind = parseKind(kind);
  const parsedPeriod = parsePeriod(period);

  if (parsedKind === 'sales' || parsedKind === 'purchases') {
    return (
      <OverviewOrdersDetailView
        type={parsedKind === 'purchases' ? 'purchase' : 'sale'}
        period={parsedPeriod}
      />
    );
  }

  return (
    <OverviewRankingDetailView kind={parsedKind} period={parsedPeriod} />
  );
}
