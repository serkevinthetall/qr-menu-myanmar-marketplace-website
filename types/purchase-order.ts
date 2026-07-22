export type PurchaseOrderLine = {
  id: string;
  productId: string;
  product: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
};

export type PurchaseOrder = {
  id: string;
  number: string;
  orderDate: string;
  vendorId: string;
  vendor: string;
  total: number;
  status: string;
  buyer: string;
};

export type PurchaseOrderDetail = PurchaseOrder & {
  untaxedAmount: number;
  currency: string;
  scheduledDate: string;
  origin: string;
  lines: PurchaseOrderLine[];
};
