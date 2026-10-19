import type { Category } from "./product";

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  image: string;
  category: Category;
  stock: number;
  isAvailable: boolean;
  quantity: number;
  lineTotal: number;
}

export interface Cart {
  items: CartItem[];
  totalQuantity: number;
  /** Tổng tiền các món còn bán (backend tính) */
  subtotal: number;
}
