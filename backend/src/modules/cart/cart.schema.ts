import { z } from "zod";

const quantity = z
  .number({ error: "Số lượng phải là số" })
  .int("Số lượng là số nguyên")
  .min(1, "Số lượng tối thiểu là 1")
  .max(99, "Mỗi món tối đa 99 phần");

export const addItemSchema = z.object({
  productId: z.number({ error: "Thiếu productId" }).int().positive(),
  quantity: quantity.default(1),
});

export const updateItemSchema = z.object({ quantity });

export type AddItemInput = z.infer<typeof addItemSchema>;

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  isAvailable: boolean;
  quantity: number;
  lineTotal: number;
}

export interface Cart {
  items: CartItem[];
  totalQuantity: number;
  /** Chỉ tính các món còn bán */
  subtotal: number;
}
