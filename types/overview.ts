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

export type OverviewSummary = {
  period: OverviewPeriod;
  range: {
    from: string;
    to: string;
  };
  kpis: {
    saleAmount: OverviewKpi;
    confirmedOrders: OverviewKpi;
    totalCustomers: OverviewKpi;
    openQuotations: OverviewKpi;
    activeMemberships: OverviewKpi;
    avgOrderValue: OverviewKpi;
  };
  areaChart: {
    buckets: string[];
    series: OverviewAreaSeries[];
  };
  topProducts: OverviewProductRank[];
  bottomProducts: OverviewProductRank[];
  topSpendingCustomers: OverviewSpendingCustomer[];
  recentOrders: OverviewRecentOrder[];
};
