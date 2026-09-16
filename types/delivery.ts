export type DeliveryPreviewLine = {
  id: string;
  product: string;
  demand: number;
  quantity: number;
  unit: string;
};

export type DeliveryPreview = {
  id: string;
  name: string;
  state: string;
  stateLabel: string;
  scheduledDate: string;
  effectiveDate: string;
  partner: string;
  origin: string;
  canValidate: boolean;
  lines: DeliveryPreviewLine[];
};
