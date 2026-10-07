export type MonthlyRebateStatus =
  | 'To Review'
  | 'Approved'
  | 'Rejected'
  | 'Credit Note Created'
  | 'Paid';

export type MonthlyRebateReview = {
  id: string;
  displayName: string;
  reference: string;
  customerId: string;
  customer: string;
  month: string;
  rebateRate: number;
  paidSales: number;
  rebateAmount: number;
  status: string;
  name: string;
};

export const MONTHLY_REBATE_STATUSES: MonthlyRebateStatus[] = [
  'To Review',
  'Approved',
  'Rejected',
  'Credit Note Created',
  'Paid',
];
