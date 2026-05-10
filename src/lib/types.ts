export type Product = {
  id: string;
  name: string;
  description: string;
  image_url: string;
  base_price: number;
  tag?: string;
  expiry_date?: string; // YYYY-MM-DD
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
  tag?: string;
};

export type Tag = {
  id?: number | string;
  name: string;
};

export type OrderStatus = "pending" | "bought" | "canceled";

export type OrderAssignment = {
  id?: number;
  order_id: number;
  customer_name: string;
  contact_info: string;
  tracking_number: string;
  quantity_bought: number; // Sửa từ quantity thành quantity_bought cho khớp DB
  markup_earned: number;
  total_billed: number;
};

export type Order = {
  id: number;
  product_id: string;
  product_name: string;
  simple_description: string;
  split_sets: number;
  product_price: number;
  markup_fee: number;
  total_amount: number;
  status: string;
  assigned_quantity?: number; // Thêm trường này để hiện số lượng đã gán
  assignments?: OrderAssignment[];
};

export type PaymentStatus = "paid" | "unpaid" | "partial";

export type CustomerProduct = {
  product_id: string;
  product_name: string;
  product_price: number;
  markup_fee: number;
  quantity: number;
  tracking_number: string;
};

export type Customer = {
  id: number | string;
  name: string;
  contact_info: string;
  purchase_date: string;
  product_ids: string[];
  product_details?: CustomerProduct[];
  description: string;
  payment_status: PaymentStatus;
  suggested_amount: number;
  final_amount: number;
};

export const calcTotal = (
  price: number,
  markup: number,
  splitSets: number
) => (Number(price) + Number(markup)) * Number(splitSets);
