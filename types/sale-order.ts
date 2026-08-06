export type SaleOrderLine = {
  id: string;
  productId: string;
  product: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
};

export type SaleOrder = {
  id: string;
  number: string;
  orderDate: string;
  customerId: string;
  customer: string;
  total: number;
  status: string;
  salesperson: string;
  phoneNumber: string;
  /** Studio "Sale Person Name" (`x_studio_sale_person_name`). */
  salePersonName: string;
};

export type SaleOrderDetail = SaleOrder & {
  untaxedAmount: number;
  currency: string;
  commitmentDate: string;
  customerReference: string;
  deliveryAddress: string;
  lines: SaleOrderLine[];
};
