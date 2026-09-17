export type InvoicePreviewLine = {
  id: string;
  product: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  unit: string;
};

export type InvoicePreview = {
  id: string;
  name: string;
  state: string;
  stateLabel: string;
  paymentState: string;
  paymentStateLabel: string;
  invoiceDate: string;
  partner: string;
  origin: string;
  amountUntaxed: number;
  amountTotal: number;
  amountResidual: number;
  currency: string;
  canPay: boolean;
  lines: InvoicePreviewLine[];
};
