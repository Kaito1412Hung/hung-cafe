import { api } from "@/lib/api";
import type { Category, CategoryInput } from "@/types/category";

export const categoryService = {
  async getAll(): Promise<Category[]> {
    return (await api<{ data: Category[] }>("/categories")).data;
  },

  async create(input: CategoryInput): Promise<Category> {
    return (await api<{ data: Category }>("/categories", { method: "POST", body: JSON.stringify(input) })).data;
  },

  async update(id: number, input: CategoryInput): Promise<Category> {
    return (await api<{ data: Category }>(`/categories/${id}`, { method: "PUT", body: JSON.stringify(input) })).data;
  },

  async remove(id: number): Promise<void> {
    await api(`/categories/${id}`, { method: "DELETE" });
  },
};
