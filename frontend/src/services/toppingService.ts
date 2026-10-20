import { api } from "@/lib/api";
import type { Topping } from "@/lib/options";

export interface AdminTopping extends Topping {
  isAvailable: boolean;
  sortOrder: number;
}

export type ToppingInput = Omit<AdminTopping, "id">;

export const toppingService = {
  /** Topping đang bán (cho khách chọn) */
  async getAvailable(): Promise<Topping[]> {
    return (await api<{ data: Topping[] }>("/toppings")).data;
  },

  /* ----- Admin ----- */
  async getAll(): Promise<AdminTopping[]> {
    return (await api<{ data: AdminTopping[] }>("/toppings?all=1")).data;
  },

  async create(input: ToppingInput): Promise<AdminTopping> {
    return (await api<{ data: AdminTopping }>("/toppings", { method: "POST", body: JSON.stringify(input) })).data;
  },

  async update(id: number, input: Partial<ToppingInput>): Promise<AdminTopping> {
    return (await api<{ data: AdminTopping }>(`/toppings/${id}`, { method: "PATCH", body: JSON.stringify(input) })).data;
  },

  async remove(id: number): Promise<void> {
    await api(`/toppings/${id}`, { method: "DELETE" });
  },
};
