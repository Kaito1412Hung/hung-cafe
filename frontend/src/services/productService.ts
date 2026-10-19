import { api } from "@/lib/api";
import type { Product, ProductInput } from "@/types/product";

/** Gọi REST API sản phẩm của backend Node.js */
export const productService = {
  async getAll(): Promise<Product[]> {
    const res = await api<{ data: Product[] }>("/products");
    return res.data;
  },

  async create(input: ProductInput): Promise<Product> {
    const res = await api<{ data: Product }>("/products", { method: "POST", body: JSON.stringify(input) });
    return res.data;
  },

  async update(id: number, input: Partial<ProductInput>): Promise<Product> {
    const res = await api<{ data: Product }>(`/products/${id}`, { method: "PATCH", body: JSON.stringify(input) });
    return res.data;
  },

  async remove(id: number): Promise<void> {
    await api<void>(`/products/${id}`, { method: "DELETE" });
  },
};
