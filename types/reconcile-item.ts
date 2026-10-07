export type ReconcileItem = {
  id: string;
  date: string;
  name: string;
  journal: string;
  journalEntryId: string;
  journalEntry: string;
  accountId: string;
  account: string;
  partnerId: string;
  partner: string;
  reference: string;
  product: string;
  debit: number;
  credit: number;
  residual: number;
  dueDate: string;
  currency: string;
};
