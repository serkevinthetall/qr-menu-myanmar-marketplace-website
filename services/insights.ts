import { webApiRequest } from '@/services/web/client';
import { OverviewPeriod, OverviewSummary } from '@/types/overview';

type SummaryResponse = { data: OverviewSummary };

export async function fetchOverviewSummary(
  token: string,
  period: OverviewPeriod,
): Promise<OverviewSummary> {
  const response = await webApiRequest<SummaryResponse>(
    `/insights/summary?period=${period}`,
    { token },
  );
  return response.data;
}
