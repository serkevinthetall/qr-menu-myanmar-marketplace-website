export type PaymentMethod = {
  id: string;
  name: string;
};

export type Quotation = {
  id: string;
  number: string;
  createDate: string;
  customer: string;
  total: number;
  status: string;
  paymentMethod: string;
};

export type QuotationLine = {
  id: string;
  productId: string;
  product: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountPercent: number;
  amount: number;
};

export type QuotationReorderLine = {
  lineId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
};

export type QuotationReorderSeed = {
  customerId?: string;
  phoneNumber?: string;
  deliveryNote?: string;
  preferredDeliveryDate?: string;
  paymentMethodLineId?: string;
  lines: QuotationReorderLine[];
};

export type QuotationDetail = Quotation & {
  customerId: string;
  paymentMethodLineId: string;
  deliveryAddress: string;
  invoiceAddress: string;
  expiration: string;
  orderDate: string;
  untaxedAmount: number;
  salesperson: string;
  pricelist: string;
  paymentTerms: string;
  paymentMethod: string;
  membershipCouponTicket: string;
  membershipCouponStatus: string;
  phoneNumber: string;
  preferredDeliveryDate: string;
  deliveryNotes: string;
  lines: QuotationLine[];
};
