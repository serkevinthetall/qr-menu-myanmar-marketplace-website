import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { fetchContactTags } from '@/services/customers';
import {
  fetchProductDetail,
  setProductFavorite,
  updateProductAppAccess,
  updateProductPrices,
} from '@/services/products';
import {
  ProductAppUpdate,
  ProductDetail,
  ProductPricesUpdate,
} from '@/types/product';

export const productKeys = {
  all: ['products'] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  contactTags: () => [...productKeys.all, 'contact-tags'] as const,
};

export function useProductDetailQuery(token: string | undefined, id: string | null) {
  return useQuery({
    queryKey: productKeys.detail(id ?? ''),
    queryFn: () => fetchProductDetail(token!, id!),
    enabled: Boolean(token && id),
  });
}

export function useContactTagsQuery(
  token: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: productKeys.contactTags(),
    queryFn: () => fetchContactTags(token!),
    enabled: Boolean(token && enabled),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateProductAppAccessMutation(token: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: ProductAppUpdate;
    }) => updateProductAppAccess(token!, id, updates),
    onSuccess: (appAccess, { id }) => {
      queryClient.setQueryData<ProductDetail>(productKeys.detail(id), prev =>
        prev ? { ...prev, appAccess } : prev,
      );
    },
  });
}

export function useUpdateProductPricesMutation(token: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: ProductPricesUpdate;
    }) => updateProductPrices(token!, id, updates),
    onSuccess: (saved, { id }) => {
      queryClient.setQueryData<ProductDetail>(productKeys.detail(id), prev =>
        prev
          ? {
              ...prev,
              price: saved.price,
              premiumPrice: saved.premiumPrice ?? prev.premiumPrice,
              proPrice: saved.proPrice ?? prev.proPrice,
            }
          : prev,
      );
    },
  });
}

export function useSetProductFavoriteMutation(token: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) =>
      setProductFavorite(token!, id, favorite),
    onSuccess: (result, { id }) => {
      queryClient.setQueryData<ProductDetail>(productKeys.detail(id), prev =>
        prev ? { ...prev, favorite: result.favorite } : prev,
      );
    },
  });
}
