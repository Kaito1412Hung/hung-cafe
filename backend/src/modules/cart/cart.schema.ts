import { z } from "zod";
import { itemOptionsSchema, type ItemOptions } from "./options";

const quantity = z
  .number({ error: "Số lượng phải là số" })
  .int("Số lượng là số nguyên")
  .min(1, "Số lượng tối thiểu là 1")
  .max(99, "Mỗi món tối đa 99 phần");

export const addItemSchema = itemOptionsSchema.extend({
  productId: z.number({ error: "Thiếu productId" }).int().positive(),
  quantity: quantity.default(1),
});

export const updateItemSchema = z.object({ quantity });

export type AddItemInput = z.infer<typeof addItemSchema>;

export interface CartItem extends ItemOptions {
  /** Mã dòng trong giỏ (cùng món khác size = 2 dòng) */
  id: number;
  productId: number;
  slug: string;
  name: string;
  /** Giá gốc của món (size S) */
  price: number;
  /** Giá 1 phần sau khi cộng phụ thu size */
  unitPrice: number;
  image: string;
  category: string;
  stock: number;
  isAvailable: boolean;
  hasOptions: boolean;
  quantity: number;
  lineTotal: number;
}

export interface Cart {
  items: CartItem[];
  totalQuantity: number;
  /** Chỉ tính các món còn bán */
  subtotal: number;
}
