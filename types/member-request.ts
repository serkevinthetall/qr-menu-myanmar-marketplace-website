export const MEMBER_REQUEST_STATUSES = [
  'Requested',
  'Approved',
  'Rejected',
] as const;

export type MemberRequestStatus = (typeof MEMBER_REQUEST_STATUSES)[number];

export const MEMBER_REQUEST_PLANS = ['Premium', 'Pro'] as const;

export type MemberRequestPlan = (typeof MEMBER_REQUEST_PLANS)[number];

export type MemberRequest = {
  id: string;
  customerId: string;
  customer: string;
  requestedPlan: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  requestedAt: string;
  notes: string;
};

export type MemberRequestMeta = {
  statuses: { id: string; label: string }[];
  plans: { id: string; label: string }[];
};
