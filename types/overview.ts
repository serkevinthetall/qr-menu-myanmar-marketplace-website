export type OverviewPeriod = 'day' | 'week' | 'month';

export type OverviewKpi = {
  value: number;
  trend: number;
};

export type OverviewAreaPoint = {
  bucket: string;
  value: number;
};

export type OverviewAreaSeries = {
  name: string;
  total: number;
  points: OverviewAreaPoint[];
};

export type OverviewProductRank = {
  id: string;
  name: string;
  revenue: number;
  qty: number;
};

export type OverviewStockProduct = {
  id: string;
  name: string;
  onHand: number;
};

export type OverviewDemandStockProduct = {
  id: string;
  name: string;
  demandQty: number;
  onHand: number;
  revenue: number;
};

export type OverviewSpendingCustomer = {
  id: string;
  name: string;
  total: number;
  orders: number;
};

export type OverviewRecentOrder = {
  id: string;
  number: string;
  customer: string;
  total: number;
  orderDate: string;
  status: string;
};

export type OverviewRecentPurchaseOrder = {
  id: string;
  number: string;
  vendor: string;
  total: number;
  orderDate: string;
  status: string;
};

export type AiSuggestionPriority = 'high' | 'medium' | 'low';

export type AiSuggestionSlot = 'monday' | 'friday' | 'monthly' | 'manual';

export type AiSuggestionItem = {
  title: string;
  detail: string;
  priority: AiSuggestionPriority;
};

export type AiSuggestionPack = {
  generatedAt: string;
  slot: AiSuggestionSlot;
  model: string;
  suggestions: AiSuggestionItem[];
};

export type AiSuggestionsStatus = {
  enabled: boolean;
  configured: boolean;
  latest: AiSuggestionPack | null;
  shouldGenerate: boolean;
  suggestedSlot: AiSuggestionSlot;
};

export type OverviewSummary = {
  period: OverviewPeriod;
  range: {
    from: string;
    to: string;
  };
  kpis: {
    saleAmount: OverviewKpi;
    confirmedOrders: OverviewKpi;
    buyingCustomers: OverviewKpi;
    quotations: OverviewKpi;
    itemsSold: OverviewKpi;
    avgOrderValue: OverviewKpi;
    purchaseAmount: OverviewKpi;
    purchaseOrders: OverviewKpi;
    /** @deprecated use buyingCustomers — still period-scoped */
    totalCustomers?: OverviewKpi;
    /** @deprecated use quotations — still period-scoped */
    openQuotations?: OverviewKpi;
    /** Memberships started in period */
    activeMemberships?: OverviewKpi;
  };
  areaChart: {
    buckets: string[];
    series: OverviewAreaSeries[];
  };
  topProducts: OverviewProductRank[];
  bottomProducts: OverviewProductRank[];
  lowestOnHandProducts?: OverviewStockProduct[];
  highestDemandProducts?: OverviewDemandStockProduct[];
  topSpendingCustomers: OverviewSpendingCustomer[];
  recentOrders: OverviewRecentOrder[];
  recentPurchaseOrders: OverviewRecentPurchaseOrder[];
};

export type OverviewCompareMode = 'off' | 'last_month';

export type OverviewRankingCustomer = {
  id: string;
  name: string;
  total: number;
  orders: number;
  prevTotal: number;
  prevOrders: number;
};

export type OverviewRankingArea = {
  key: string;
  name: string;
  stateId: number | null;
  stateName: string;
  total: number;
  orders: number;
  prevTotal: number;
  prevOrders: number;
};

export type OverviewRankingState = {
  id: number;
  name: string;
};

export type OverviewRankings = {
  period: OverviewPeriod;
  range: { from: string; to: string };
  compareRange: { from: string; to: string };
  compareLabel: string;
  customers: OverviewRankingCustomer[];
  areas: OverviewRankingArea[];
  states: OverviewRankingState[];
};

export type OverviewOrderType = 'sale' | 'purchase';

export type OverviewPeriodOrder = {
  id: string;
  number: string;
  partner: string;
  total: number;
  orderDate: string;
  status: string;
};

export type OverviewOrders = {
  period: OverviewPeriod;
  type: OverviewOrderType;
  range: { from: string; to: string };
  compareRange: { from: string; to: string };
  compareLabel: string;
  orders: OverviewPeriodOrder[];
  prevOrders: OverviewPeriodOrder[];
};

export type CompareAiTopic = 'customers' | 'areas' | 'sales' | 'demand';

export type OverviewDemandProduct = {
  id: string;
  name: string;
  demandQty: number;
  prevDemandQty: number;
  onHand: number;
  revenue: number;
  prevRevenue: number;
};

export type OverviewDemand = {
  period: OverviewPeriod;
  range: { from: string; to: string };
  compareRange: { from: string; to: string };
  compareLabel: string;
  products: OverviewDemandProduct[];
};
