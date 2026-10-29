export interface SaleDetail {
  product_id: number;
  product: string;
  image: string | null;
  price: string;
  quantity: number;
  subtotal: string;
}

export interface Sale {
  id: number;
  user_id: number;
  total: string;
  created_at: string | null;
  details: SaleDetail[];
}

export interface CreateSaleInput {
  user_id: 1;
  items: Array<{ product_id: number; quantity: number }>;
}

export interface CreateSaleResult {
  message: string;
  sale_id: number;
  total: string;
}

export interface MessageResult {
  message: string;
}
