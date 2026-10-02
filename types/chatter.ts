export type ChatterMessage = {
  id: string;
  body: string;
  date: string;
  author: string;
  messageType: string;
  isNote: boolean;
  subject: string;
};

export type ChatterActivity = {
  id: string;
  summary: string;
  note: string;
  deadline: string;
  state: string;
  activityType: string;
  activityTypeId: string;
  assignedTo: string;
  createDate: string;
};

export type ChatterActivityType = {
  id: string;
  name: string;
};

export type ChatterPayload = {
  messages: ChatterMessage[];
  activities: ChatterActivity[];
  activityTypes: ChatterActivityType[];
};

/** API base path for sale.order-backed modules. */
export type ChatterBasePath =
  | '/quotations'
  | '/sale-orders'
  | '/online-orders'
  | '/app/quotations';
