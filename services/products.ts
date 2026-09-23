import { webApiRequest } from '@/services/web/client';
import {
  CreateProductPayload,
  Product,
  ProductAppAccess,
  ProductAppUpdate,
  ProductDetail,
  ProductNamedOption,
  ProductPricesUpdate,
  ProductTag,
} from '@/types/product';

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
  options?: { limit?: number; offset?: number; filter?: 'qrApp' },
): Promise<ProductsPage> {
  const params = new URLSearchParams();
  if (options?.limit !== undefined) {
    params.set('limit', String(options.limit));
  }
  if (options?.offset !== undefined) {
    params.set('offset', String(options.offset));
  }
  if (options?.filter) {
    params.set('filter', options.filter);
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

export async function updateProductPrices(
  token: string,
  id: string,
  updates: ProductPricesUpdate,
): Promise<Pick<ProductDetail, 'id' | 'price' | 'premiumPrice' | 'proPrice'>> {
  const response = await webApiRequest<{
    data: Pick<ProductDetail, 'id' | 'price' | 'premiumPrice' | 'proPrice'>;
  }>(`/products/${id}/prices`, {
    method: 'PUT',
    token,
    body: updates,
  });
  return response.data;
}

export async function setProductFavorite(
  token: string,
  id: string,
  favorite: boolean,
): Promise<{ id: string; favorite: boolean }> {
  const response = await webApiRequest<{ data: { id: string; favorite: boolean } }>(
    `/products/${id}/favorite`,
    {
      method: 'PUT',
      token,
      body: { favorite },
    },
  );
  return response.data;
}

export async function fetchProductTags(token: string): Promise<ProductTag[]> {
  const response = await webApiRequest<{ data: ProductTag[] }>('/products/tags', {
    token,
  });
  return response.data ?? [];
}

export async function fetchProductCategories(
  token: string,
): Promise<ProductNamedOption[]> {
  const response = await webApiRequest<{ data: ProductNamedOption[] }>(
    '/products/categories',
    { token },
  );
  return response.data ?? [];
}

export async function fetchPublicCategories(
  token: string,
): Promise<ProductNamedOption[]> {
  const response = await webApiRequest<{ data: ProductNamedOption[] }>(
    '/products/public-categories',
    { token },
  );
  return response.data ?? [];
}

export async function createProductTag(
  token: string,
  name: string,
): Promise<ProductTag> {
  const response = await webApiRequest<{ data: ProductTag }>('/products/tags', {
    method: 'POST',
    token,
    body: { name },
  });
  return response.data;
}

export async function createPublicCategory(
  token: string,
  name: string,
): Promise<ProductNamedOption> {
  const response = await webApiRequest<{ data: ProductNamedOption }>(
    '/products/public-categories',
    {
      method: 'POST',
      token,
      body: { name },
    },
  );
  return response.data;
}

export async function fetchNextWebsiteSequence(
  token: string,
): Promise<number> {
  const response = await webApiRequest<{ data: { websiteSequence: number } }>(
    '/products/next-website-sequence',
    { token },
  );
  const value = Number(response.data?.websiteSequence);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

export async function createProduct(
  token: string,
  payload: CreateProductPayload,
): Promise<ProductDetail> {
  const response = await webApiRequest<{ data: ProductDetail }>(
    '/products',
    {
      method: 'POST',
      token,
      body: {
        ...payload,
        categoryId: payload.categoryId ? Number(payload.categoryId) : undefined,
        publicCategoryIds: payload.publicCategoryIds?.map(Number),
        tagIds: payload.tagIds?.map(Number),
      },
    },
  );
  return response.data;
}

export async function updateProductAppAccess(
  token: string,
  id: string,
  updates: ProductAppUpdate,
): Promise<ProductAppAccess> {
  const response = await webApiRequest<{ data: ProductAppAccess }>(
    `/products/${id}/app`,
    {
      method: 'PUT',
      token,
      body: updates,
    },
  );
  return response.data;
}
