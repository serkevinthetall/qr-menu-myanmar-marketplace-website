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

export type JournalEntryStatusFilter = 'all' | 'draft' | 'posted' | 'cancel';
