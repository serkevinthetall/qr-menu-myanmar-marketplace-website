export type VendorPayment = {
  id: string;
  date: string;
  number: string;
  journal: string;
  vendorId: string;
  vendor: string;
  paymentMethod: string;
  amount: number;
  currency: string;
  state: string;
  statusLabel: string;
};

export type VendorPaymentStatusFilter =
  | 'all'
  | 'draft'
  | 'in_process'
  | 'paid'
  | 'cancel';
