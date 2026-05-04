export type Product = {
  id: string;
  name: string;
  description: string;
  image_url: string;
  base_price: number;
};

export type CartItem = {
  id: number | string;
  product_id: string;
  product_name: string;
  simple_description: string;
  base_sets: number;
  split_sets: number;
  units_per_set: number;
  product_price: number;
  markup_fee: number;
  expiry_date: string; // YYYY-MM-DD
};

export type OrderStatus = "pending" | "bought" | "canceled";

export type Order = {
  id: number | string;
  product_id: string;
  product_name: string;
  simple_description: string;
  base_sets: number;
  split_sets: number;
  units_per_set: number;
  product_price: number;
  markup_fee: number;
  status: OrderStatus;
  customer_id?: number | string | null;
  customer_name?: string | null;
};

export type PaymentStatus = "paid" | "unpaid" | "partial";

export type Customer = {
  id: number | string;
  name: string;
  contact_info: string;
  purchase_date: string;
  product_ids: string[];
  description: string;
  payment_status: PaymentStatus;
  suggested_amount: number;
  final_amount: number;
};

export const calcTotal = (
  price: number,
  markup: number,
  baseSets: number,
  splitSets: number,
  units: number
) => (Number(price) + Number(markup)) * Number(baseSets) * Number(splitSets) * Number(units);
