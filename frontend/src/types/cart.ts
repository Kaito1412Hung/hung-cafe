import type { ItemOptions } from "@/lib/options";
import type { Category } from "./product";

/** 1 dòng trong giỏ. Cùng món nhưng khác size / đường / đá / ghi chú là 2 dòng khác nhau */
export interface CartItem extends ItemOptions {
  /** Mã dòng (dùng khi đổi số lượng / xoá) */
  id: number;
  productId: number;
  slug: string;
  name: string;
  /** Giá gốc (size S) */
  price: number;
  /** Giá 1 phần đã cộng phụ thu size */
  unitPrice: number;
  image: string;
  category: Category;
  stock: number;
  isAvailable: boolean;
  hasOptions: boolean;
  quantity: number;
  lineTotal: number;
}

export interface Cart {
  items: CartItem[];
  totalQuantity: number;
  /** Tổng tiền các món còn bán (backend tính) */
  subtotal: number;
}
