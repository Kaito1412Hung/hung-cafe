import { api } from "@/lib/api";
import type { OpenStatus, ShopSettings } from "@/types/settings";

type SettingsResponse = { data: ShopSettings; openStatus: OpenStatus };

export const settingsService = {
  async getShop(): Promise<SettingsResponse> {
    return api<SettingsResponse>("/settings");
  },

  async updateShop(input: ShopSettings): Promise<SettingsResponse> {
    return api<SettingsResponse>("/settings", { method: "PUT", body: JSON.stringify(input) });
  },
};
