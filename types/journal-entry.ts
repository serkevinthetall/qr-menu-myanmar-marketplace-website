export type JournalEntry = {
  id: string;
  date: string;
  number: string;
  partnerId: string;
  partner: string;
  reference: string;
  journal: string;
  amountTotal: number;
  currency: string;
  state: string;
  statusLabel: string;
  moveType: string;
};

export type JournalEntryLine = {
  id: string;
  account: string;
  label: string;
  debit: number;
  credit: number;
  taxGrids: string;
};

export type JournalEntryDetail = {
  id: string;
  date: string;
  number: string;
  partnerId: string;
  partner: string;
  reference: string;
  origin: string;
  journal: string;
  invoiceDate: string;
  dueDate: string;
  amountUntaxed: number;
  amountTotal: number;
  amountDue: number;
  currency: string;
  state: string;
  statusLabel: string;
  paymentState: string;
  paymentStateLabel: string;
  moveType: string;
  debitTotal: number;
  creditTotal: number;
  lines: JournalEntryLine[];
};

export type JournalEntryStatusFilter = 'all' | 'draft' | 'posted' | 'cancel';
