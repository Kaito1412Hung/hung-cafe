import { api } from "@/lib/api";
import type { Cart } from "@/types/cart";

/** Mọi API giỏ hàng đều trả về toàn bộ giỏ sau khi thay đổi → frontend chỉ cần setState */
export const cartService = {
  async get(): Promise<Cart> {
    return (await api<{ data: Cart }>("/cart")).data;
  },

  async addItem(productId: number, quantity = 1): Promise<Cart> {
    return (await api<{ data: Cart }>("/cart/items", { method: "POST", body: JSON.stringify({ productId, quantity }) })).data;
  },

  async updateQuantity(productId: number, quantity: number): Promise<Cart> {
    return (await api<{ data: Cart }>(`/cart/items/${productId}`, { method: "PATCH", body: JSON.stringify({ quantity }) })).data;
  },

  async removeItem(productId: number): Promise<Cart> {
    return (await api<{ data: Cart }>(`/cart/items/${productId}`, { method: "DELETE" })).data;
  },

  async clear(): Promise<Cart> {
    return (await api<{ data: Cart }>("/cart", { method: "DELETE" })).data;
  },
};
