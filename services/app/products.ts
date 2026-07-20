import { appApiRequest } from '@/services/app/client';

export type AppProduct = {
  id: string;
  name: string;
  sku: string;
  price: number;
  active: boolean;
  category: string;
  unit: string;
};

type ProductsResponse = {
  data: AppProduct[];
  categories?: string[];
  meta?: { limit: number; offset: number; count: number; hasMore: boolean };
};

export async function fetchAppProducts(
  token: string,
  options?: { q?: string; category?: string; limit?: number; offset?: number },
): Promise<{ products: AppProduct[]; categories: string[]; hasMore: boolean }> {
  const params = new URLSearchParams();
  if (options?.q) params.set('q', options.q);
  if (options?.category) params.set('category', options.category);
  if (options?.limit !== undefined) params.set('limit', String(options.limit));
  if (options?.offset !== undefined) params.set('offset', String(options.offset));
  const query = params.toString() ? `?${params}` : '';
  const response = await appApiRequest<ProductsResponse>(`/products${query}`, {
    token,
  });
  return {
    products: response.data,
    categories: response.categories ?? [],
    hasMore: Boolean(response.meta?.hasMore),
  };
}
