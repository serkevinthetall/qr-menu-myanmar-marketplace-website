export type SaleOrderLine = {
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
  /** True when an outgoing Odoo delivery can be validated (list + detail). */
  canValidateDelivery?: boolean;
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
  /** Outgoing delivery / picking count (Odoo Delivery smart button). */
  deliveryCount?: number;
  /** True when Odoo invoice_status is "to invoice". */
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
