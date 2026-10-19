import { api } from "@/lib/api";
import type { ItemOptions } from "@/lib/options";
import type { Cart } from "@/types/cart";

/** Mọi API giỏ hàng đều trả về toàn bộ giỏ sau khi thay đổi → frontend chỉ cần setState */
export const cartService = {
  async get(): Promise<Cart> {
    return (await api<{ data: Cart }>("/cart")).data;
  },

  /** Thêm món kèm lựa chọn (size / đường / đá / ghi chú). Không gửi lựa chọn → server dùng mặc định */
  async addItem(productId: number, quantity = 1, options: Partial<ItemOptions> = {}): Promise<Cart> {
    // Bỏ các trường rỗng (món không có tuỳ chọn)
    const opts = Object.fromEntries(Object.entries(options).filter(([, v]) => v !== ""));
    return (await api<{ data: Cart }>("/cart/items", { method: "POST", body: JSON.stringify({ productId, quantity, ...opts }) })).data;
  },

  /** lineId = mã dòng trong giỏ (không phải mã món) */
  async updateQuantity(lineId: number, quantity: number): Promise<Cart> {
    return (await api<{ data: Cart }>(`/cart/items/${lineId}`, { method: "PATCH", body: JSON.stringify({ quantity }) })).data;
  },

  async removeItem(lineId: number): Promise<Cart> {
    return (await api<{ data: Cart }>(`/cart/items/${lineId}`, { method: "DELETE" })).data;
  },

  async clear(): Promise<Cart> {
    return (await api<{ data: Cart }>("/cart", { method: "DELETE" })).data;
  },
};
