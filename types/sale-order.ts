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
  /** Shared team read state for App Orders (false = read). */
  unread?: boolean;
};

export type SaleOrderDetail = SaleOrder & {
  untaxedAmount: number;
  currency: string;
  commitmentDate: string;
  customerReference: string;
  deliveryAddress: string;
  /** Studio Preferred Delivery Date (`x_studio_preferred_delivery_date`). */
  preferredDeliveryDate: string;
  /** Studio Delivery Notes (`x_studio_delivery_notes`). */
  deliveryNotes: string;
  lines: SaleOrderLine[];
};
