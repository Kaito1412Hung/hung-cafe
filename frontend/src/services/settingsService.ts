import { api } from "@/lib/api";
import type { ShopSettings } from "@/types/settings";

export const settingsService = {
  async getShop(): Promise<ShopSettings> {
    return (await api<{ data: ShopSettings }>("/settings")).data;
  },

  async updateShop(input: ShopSettings): Promise<ShopSettings> {
    return (await api<{ data: ShopSettings }>("/settings", { method: "PUT", body: JSON.stringify(input) })).data;
  },
};
