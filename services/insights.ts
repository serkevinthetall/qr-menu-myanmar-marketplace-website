import { webApiRequest } from '@/services/web/client';
import {
  AiSuggestionPack,
  AiSuggestionSlot,
  AiSuggestionsStatus,
  CompareAiTopic,
  OverviewChatTurn,
  OverviewChatResult,
  OverviewDemand,
  OverviewOrders,
  OverviewOrderType,
  OverviewPeriod,
  OverviewRankings,
  OverviewSummary,
} from '@/types/overview';

type SummaryResponse = { data: OverviewSummary };
type RankingsResponse = { data: OverviewRankings };
type OrdersResponse = { data: OverviewOrders };
type DemandResponse = { data: OverviewDemand };
type SuggestionsResponse = { data: AiSuggestionsStatus };
type GenerateResponse = { data: AiSuggestionPack };
type ChatResponse = { data: OverviewChatResult };

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
  compare = false,
): Promise<OverviewRankings> {
  const compareQuery = compare ? '&compare=1' : '';
  const response = await webApiRequest<RankingsResponse>(
    `/insights/rankings?period=${period}${compareQuery}`,
    { token },
  );
  return response.data;
}

export async function fetchOverviewOrders(
  token: string,
  period: OverviewPeriod,
  type: OverviewOrderType,
  compare = false,
): Promise<OverviewOrders> {
  const compareQuery = compare ? '&compare=1' : '';
  const response = await webApiRequest<OrdersResponse>(
    `/insights/orders?period=${period}&type=${type}${compareQuery}`,
    { token },
  );
  return response.data;
}

export async function fetchOverviewDemand(
  token: string,
  period: OverviewPeriod,
  compare = false,
): Promise<OverviewDemand> {
  const compareQuery = compare ? '&compare=1' : '';
  const response = await webApiRequest<DemandResponse>(
    `/insights/demand?period=${period}${compareQuery}`,
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

export async function generateSixMonthAiSuggestions(
  token: string,
): Promise<AiSuggestionPack> {
  const response = await webApiRequest<GenerateResponse>(
    '/insights/suggestions/generate-six-month',
    { method: 'POST', token, body: {} },
  );
  return response.data;
}

export async function generateCompareAiSuggestions(
  token: string,
  topic: CompareAiTopic,
  period: OverviewPeriod,
): Promise<AiSuggestionPack> {
  const response = await webApiRequest<GenerateResponse>(
    '/insights/suggestions/compare',
    {
      method: 'POST',
      token,
      body: { topic, period },
    },
  );
  return response.data;
}

export async function sendOverviewChat(
  token: string,
  message: string,
  period: OverviewPeriod,
  history: OverviewChatTurn[] = [],
): Promise<OverviewChatResult> {
  const response = await webApiRequest<ChatResponse>('/insights/chat', {
    method: 'POST',
    token,
    body: { message, period, history },
  });
  return response.data;
}
