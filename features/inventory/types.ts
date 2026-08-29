export type OnHandProduct = {
  id: string;
  name: string;
  sku: string;
  category: string;
  onHand: number;
  unit: string;
};

export type OnHandMeta = {
  limit: number;
  offset: number;
  count: number;
  totalOnHand: number;
  hasMore: boolean;
  hideZero: boolean;
};

export type StockMoveLine = {
  id: string;
  date: string;
  reference: string;
  productId: string;
  productName: string;
  category: string;
  fromLocation: string;
  toLocation: string;
  quantity: number;
  unit: string;
  state: string;
};

export type StockMovesMeta = {
  limit: number;
  offset: number;
  count: number;
  totalQuantity: number;
  hasMore: boolean;
  month: string | null;
};
