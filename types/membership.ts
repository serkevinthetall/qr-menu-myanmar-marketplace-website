export type Membership = {
  id: string;
  name: string;
  customerId: string;
  customer: string;
  membershipLevel: string;
  pricelistId: string;
  pricelist: string;
  startDate: string;
  endDate: string;
  status: string;
  monthlyCouponAmount: number;
  totalTickets: number;
  usedTickets: number;
  missedTickets: number;
  remainingTickets: number;
  benefitsSummary: string;
};

export type MembershipCouponTicket = {
  id: string;
  name: string;
  membershipId: string;
  membership: string;
  customerId: string;
  customer: string;
  usedDate: string;
  contactId: string;
  contact: string;
  currency: string;
  usedSaleOrderId: string;
  usedSaleOrder: string;
  status: string;
  couponProgram: string;
  couponAmount: number;
  ticketMonth: string;
  couponCode: string;
};
