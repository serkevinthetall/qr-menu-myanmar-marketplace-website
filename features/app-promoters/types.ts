export type AppPromoter = {
  id: string;
  name: string;
  /** Odoo x_studio_amount_per_customer */
  amountPerCustomer: number;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};
