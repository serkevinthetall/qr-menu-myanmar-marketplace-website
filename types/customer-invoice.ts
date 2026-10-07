export type CustomerInvoice = {
  id: string;
  number: string;
  customerId: string;
  customer: string;
  reference: string;
  origin: string;
  invoiceDate: string;
  dueDate: string;
  amountUntaxed: number;
  amountTotal: number;
  amountDue: number;
  currency: string;
  state: string;
  paymentState: string;
  statusLabel: string;
};

export type CustomerInvoiceMonthGroup = {
  key: string;
  label: string;
  from: string;
  to: string;
  count: number;
  amountUntaxed: number;
  amountTotal: number;
  amountDue: number;
  currency: string;
};

export type CustomerInvoiceMonthTotals = {
  count: number;
  amountUntaxed: number;
  amountTotal: number;
  amountDue: number;
  currency: string;
};

export type CustomerInvoiceStatusFilter =
  | 'all'
  | 'draft'
  | 'not_paid'
  | 'paid'
  | 'cancel';
