import type { ItemOptions, ProductOptionConfig, Topping } from "@/lib/options";
import type { Category } from "./product";

/** 1 dòng trong giỏ. Cùng món nhưng khác size / đường / nóng-đá / topping / ghi chú là 2 dòng khác nhau */
export interface CartItem extends Omit<ItemOptions, "toppings">, ProductOptionConfig {
  /** Mã dòng (dùng khi đổi số lượng / xoá) */
  id: number;
  productId: number;
  slug: string;
  name: string;
  /** Giá gốc (size S, chưa topping) */
  price: number;
  /** Giá 1 phần đã cộng phụ thu size + topping */
  unitPrice: number;
  toppings: Topping[];
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
