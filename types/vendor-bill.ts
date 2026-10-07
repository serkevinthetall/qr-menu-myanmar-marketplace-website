export type VendorBill = {
  id: string;
  number: string;
  vendorId: string;
  vendor: string;
  billDate: string;
  dueDate: string;
  reference: string;
  amountUntaxed: number;
  amountTotal: number;
  amountDue: number;
  currency: string;
  state: string;
  paymentState: string;
  statusLabel: string;
};

export type VendorBillStatusFilter =
  | 'all'
  | 'draft'
  | 'not_paid'
  | 'paid'
  | 'cancel';
