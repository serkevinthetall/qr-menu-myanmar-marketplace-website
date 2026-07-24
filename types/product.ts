export type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  active: boolean;
  category: string;
  image: string;
  unit: string;
};

export type ProductDetail = Product & {
  cost: number;
  barcode: string;
  description: string;
  type: string;
};
