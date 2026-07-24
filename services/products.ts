import { webApiRequest } from '@/services/web/client';
import { Product, ProductDetail } from '@/types/product';

type ProductsResponse = {
  data: Product[];
  meta?: {
    limit: number;
    offset: number;
    count: number;
    hasMore: boolean;
  };
};

type ProductDetailResponse = { data: ProductDetail };

export type ProductsPage = {
  data: Product[];
  hasMore: boolean;
  offset: number;
  limit: number;
};

export async function fetchProducts(
  token: string,
  options?: { limit?: number; offset?: number },
): Promise<Product[]> {
  const page = await fetchProductsPage(token, options);
  return page.data;
}

export async function fetchProductsPage(
  token: string,
  options?: { limit?: number; offset?: number },
): Promise<ProductsPage> {
  const params = new URLSearchParams();
  if (options?.limit !== undefined) {
    params.set('limit', String(options.limit));
  }
  if (options?.offset !== undefined) {
    params.set('offset', String(options.offset));
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await webApiRequest<ProductsResponse>(`/products${query}`, {
    token,
  });
  const limit = options?.limit ?? response.meta?.limit ?? response.data.length;
  const offset = options?.offset ?? response.meta?.offset ?? 0;
  return {
    data: response.data,
    hasMore: response.meta?.hasMore ?? false,
    offset,
    limit,
  };
}

export async function fetchProductDetail(
  token: string,
  id: string,
): Promise<ProductDetail> {
  const response = await webApiRequest<ProductDetailResponse>(`/products/${id}`, {
    token,
  });
  return response.data;
}
