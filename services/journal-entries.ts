import { JournalEntry } from '@/types/journal-entry';
import { webApiRequest } from '@/services/web/client';

type ListResponse = {
  data: JournalEntry[];
  meta?: {
    limit: number;
    offset: number;
    count: number;
    hasMore: boolean;
  };
};

export async function fetchJournalEntries(
  token: string,
  options?: {
    q?: string;
    status?: string;
    limit?: number;
    offset?: number;
  },
): Promise<JournalEntry[]> {
  const params = new URLSearchParams();
  if (options?.q) params.set('q', options.q);
  if (options?.status) params.set('status', options.status);
  if (options?.limit !== undefined) params.set('limit', String(options.limit));
  if (options?.offset !== undefined) {
    params.set('offset', String(options.offset));
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await webApiRequest<ListResponse>(
    `/journal-entries${query}`,
    { token },
  );
  return response.data;
}
