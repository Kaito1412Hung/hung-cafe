import { api } from "@/lib/api";
import type { Product } from "@/types/product";

export const favoriteService = {
  async getAll(): Promise<Product[]> {
    return (await api<{ data: Product[] }>("/favorites")).data;
  },

  async add(productId: number): Promise<void> {
    await api(`/favorites/${productId}`, { method: "PUT" });
  },

  async remove(productId: number): Promise<void> {
    await api(`/favorites/${productId}`, { method: "DELETE" });
  },
};
