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
  phoneNumber: string;
  /** Studio "Sale Person Name" (`x_studio_sale_person_name`). */
  salePersonName: string;
};

export type QuotationLine = {
  id: string;
  productId: string;
  product: string;
  quantity: number;
  /** Odoo qty_delivered — same as online sale "Delivered". */
  deliveredQty: number;
  /** Odoo qty_invoiced — same as online sale "Invoiced". */
  invoicedQty: number;
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
  /** Studio "Sale Person Name" char field (`x_studio_sale_person_name`). */
  salePersonName: string;
  pricelist: string;
  paymentTerms: string;
  paymentMethod: string;
  membershipCouponTicket: string;
  membershipCouponStatus: string;
  phoneNumber: string;
  preferredDeliveryDate: string;
  deliveryNotes: string;
  lines: QuotationLine[];
  /** Outgoing delivery / picking count (Odoo Delivery smart button). */
  deliveryCount?: number;
  /** Customer invoice count (Odoo Invoice smart button). */
  invoiceCount?: number;
  /** True when an outgoing Odoo delivery can be validated. */
  canValidateDelivery?: boolean;
  /** True when Odoo invoice_status is "to invoice" on sale/done. */
  canCreateInvoice?: boolean;
  /** True when an unpaid customer invoice exists. */
  canPayInvoice?: boolean;
  /** First unpaid invoice summary for Pay dialog. */
  payableInvoice?: {
    id: string;
    name: string;
    amountResidual: number;
    currency: string;
  };
  /** Set after create-invoice succeeds (Odoo invoice number(s)). */
  invoiceName?: string;
  /** Set after pay succeeds. */
  paymentLabel?: string;
};
