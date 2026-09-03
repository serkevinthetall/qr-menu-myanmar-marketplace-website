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
  /** Odoo priority star — true when priority === '1'. */
  favorite?: boolean;
};

export type ProductMembershipPrice = {
  pricelistId: string | null;
  pricelistName: string;
  itemId: string | null;
  price: number | null;
};

export type ProductTag = {
  id: string;
  name: string;
};

export type ProductAppAccess = {
  saleOk: boolean;
  websitePublished: boolean;
  hasQrAppTag: boolean;
  hasEcommerceCategory: boolean;
  readyForApp: boolean;
  tagIds: string[];
  tags: ProductTag[];
  ecommerceCategories: ProductTag[];
};

export type ProductDetail = Product & {
  cost: number;
  barcode: string;
  description: string;
  type: string;
  premiumPrice?: ProductMembershipPrice;
  proPrice?: ProductMembershipPrice;
  appAccess?: ProductAppAccess | null;
};

export type ProductPricesUpdate = {
  salesPrice?: number;
  premiumPrice?: number;
  proPrice?: number;
};

export type ProductAppUpdate = {
  enableQrApp?: boolean;
  websitePublished?: boolean;
  tagIds?: string[];
};
