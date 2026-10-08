export type PickupPoint = {
  id: string;
  name: string;
  township: string;
  address: string;
};

export type PickupPointInput = {
  name: string;
  township?: string;
  address?: string;
};
