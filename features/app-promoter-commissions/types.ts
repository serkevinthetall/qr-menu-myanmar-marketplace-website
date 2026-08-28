export type AppPromoterCommission = {
  id: string;
  title: string;
  date: string;
  promoterId: string;
  promoterName: string;
  customerId: string;
  customerName: string;
  amount: number;
  updatedAt: string | null;
  saleOrderId: string;
  saleOrderName: string;
};

export type AppPromoterCommissionMeta = {
  limit: number;
  offset: number;
  count: number;
  totalAmount: number;
  hasMore: boolean;
};
