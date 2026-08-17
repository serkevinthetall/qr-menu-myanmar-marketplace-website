import { webApiRequest } from '@/services/web/client';
import {
  AiSuggestionPack,
  AiSuggestionSlot,
  AiSuggestionsStatus,
  OverviewPeriod,
  OverviewRankings,
  OverviewSummary,
} from '@/types/overview';

type SummaryResponse = { data: OverviewSummary };
type RankingsResponse = { data: OverviewRankings };
type SuggestionsResponse = { data: AiSuggestionsStatus };
type GenerateResponse = { data: AiSuggestionPack };

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

export async function fetchOverviewRankings(
  token: string,
  period: OverviewPeriod,
): Promise<OverviewRankings> {
  const response = await webApiRequest<RankingsResponse>(
    `/insights/rankings?period=${period}`,
    { token },
  );
  return response.data;
}

export async function fetchAiSuggestions(
  token: string,
): Promise<AiSuggestionsStatus> {
  const response = await webApiRequest<SuggestionsResponse>(
    '/insights/suggestions',
    { token },
  );
  return response.data;
}

export async function generateAiSuggestions(
  token: string,
  slot: AiSuggestionSlot = 'manual',
): Promise<AiSuggestionPack> {
  const response = await webApiRequest<GenerateResponse>(
    '/insights/suggestions/generate',
    {
      method: 'POST',
      token,
      body: { slot },
    },
  );
  return response.data;
}
