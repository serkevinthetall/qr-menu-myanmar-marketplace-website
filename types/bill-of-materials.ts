export type BomType = 'normal' | 'phantom' | 'subcontract' | string;

export type BillOfMaterials = {
  id: string;
  reference: string;
  productId: string;
  product: string;
  variantId: string;
  variant: string;
  quantity: number;
  unit: string;
  type: BomType;
  typeLabel: string;
  company: string;
};

export type BillOfMaterialsLine = {
  id: string;
  productId: string;
  product: string;
  quantity: number;
  unit: string;
};

export type BillOfMaterialsDetail = BillOfMaterials & {
  lines: BillOfMaterialsLine[];
};

export type CreateBomLinePayload = {
  productId: string;
  quantity: number;
};

export type CreateBomPayload = {
  productId: string;
  quantity?: number;
  code?: string;
  type?: BomType;
  lines: CreateBomLinePayload[];
};
