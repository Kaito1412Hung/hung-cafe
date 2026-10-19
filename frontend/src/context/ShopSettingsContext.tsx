"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { settingsService } from "@/services/settingsService";
import type { ShopSettings } from "@/types/settings";

/** Hiển thị tạm trong lúc chờ API (và khi backend chưa chạy) */
const FALLBACK: ShopSettings = {
  name: "Hưng Café",
  tagline: "Từ nông trại Cầu Đất đến tách cà phê của bạn — rang mộc, pha bằng cả trái tim.",
  phone: "097 113 1945",
  email: "hungquangkid14121412@gmail.com",
  address: "Lô F, Chung cư Tây Thạnh, Phường Tây Thạnh, TP.HCM",
  openingHoursWeekday: "7:00 – 22:00",
  openingHoursWeekend: "6:30 – 23:00",
  shippingFee: 15_000,
  freeShippingThreshold: 200_000,
};

interface ShopSettingsContextValue {
  settings: ShopSettings;
  /** Cập nhật ngay trên giao diện sau khi admin lưu cài đặt */
  setSettings: (s: ShopSettings) => void;
  getShippingFee: (subtotal: number) => number;
}

const ShopSettingsContext = createContext<ShopSettingsContextValue | null>(null);

export function ShopSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ShopSettings>(FALLBACK);

  useEffect(() => {
    settingsService
      .getShop()
      .then(setSettings)
      .catch(() => {});
  }, []);

  const getShippingFee = useCallback(
    (subtotal: number) => {
      if (subtotal === 0) return 0;
      return subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFee;
    },
    [settings],
  );

  return <ShopSettingsContext.Provider value={{ settings, setSettings, getShippingFee }}>{children}</ShopSettingsContext.Provider>;
}

export function useShopSettings() {
  const ctx = useContext(ShopSettingsContext);
  if (!ctx) throw new Error("useShopSettings phải được dùng bên trong <ShopSettingsProvider>");
  return ctx;
}
