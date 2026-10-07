export type ChartAccount = {
  id: string;
  code: string;
  name: string;
  accountType: string;
  typeLabel: string;
  reconcile: boolean;
};

export type ChartAccountFilter =
  | 'all'
  | 'reconcilable'
  | 'asset_receivable'
  | 'liability_payable'
  | 'asset_cash'
  | 'asset_current'
  | 'income'
  | 'expense';
