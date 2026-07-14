import { apiRequest } from '@/services/api';
import { Product } from '@/types/product';

type ProductsResponse = {
  data: Product[];
};

export async function fetchProducts(token: string): Promise<Product[]> {
  const response = await apiRequest<ProductsResponse>('/products', { token });
  return response.data;
}
