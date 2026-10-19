"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { settingsService } from "@/services/settingsService";
import type { OpenStatus, ShopSettings } from "@/types/settings";

/** Hiển thị tạm trong lúc chờ API (và khi backend chưa chạy) */
const FALLBACK: ShopSettings = {
  name: "Hưng Café",
  tagline: "Từ nông trại Cầu Đất đến tách cà phê của bạn — rang mộc, pha bằng cả trái tim.",
  phone: "097 113 1945",
  email: "hungquangkid14121412@gmail.com",
  address: "Lô F, Chung cư Tây Thạnh, Phường Tây Thạnh, TP.HCM",
  weekdayOpen: "07:00",
  weekdayClose: "22:00",
  weekendOpen: "06:30",
  weekendClose: "23:00",
  acceptOrders: true,
  facebookUrl: "",
  instagramUrl: "",
  tiktokUrl: "",
  shippingFee: 15_000,
  freeShippingThreshold: 200_000,
};

/** Kiểm tra lại trạng thái mở cửa mỗi 5 phút (VD: đang mở trang thì tới giờ đóng cửa) */
const REFRESH_INTERVAL = 5 * 60_000;

interface ShopSettingsContextValue {
  settings: ShopSettings;
  /** null khi chưa tải xong → coi như đang mở để không chặn nhầm */
  openStatus: OpenStatus | null;
  /** Cập nhật ngay trên giao diện sau khi admin lưu cài đặt */
  setSettings: (s: ShopSettings, status: OpenStatus) => void;
  getShippingFee: (subtotal: number) => number;
}

const ShopSettingsContext = createContext<ShopSettingsContextValue | null>(null);

export function ShopSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<ShopSettings>(FALLBACK);
  const [openStatus, setOpenStatus] = useState<OpenStatus | null>(null);

  useEffect(() => {
    const load = () =>
      settingsService
        .getShop()
        .then((res) => {
          setSettingsState(res.data);
          setOpenStatus(res.openStatus);
        })
        .catch(() => {});
    load();
    const timer = setInterval(load, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  const setSettings = useCallback((s: ShopSettings, status: OpenStatus) => {
    setSettingsState(s);
    setOpenStatus(status);
  }, []);

  const getShippingFee = useCallback(
    (subtotal: number) => {
      if (subtotal === 0) return 0;
      return subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFee;
    },
    [settings],
  );

  return <ShopSettingsContext.Provider value={{ settings, openStatus, setSettings, getShippingFee }}>{children}</ShopSettingsContext.Provider>;
}

export function useShopSettings() {
  const ctx = useContext(ShopSettingsContext);
  if (!ctx) throw new Error("useShopSettings phải được dùng bên trong <ShopSettingsProvider>");
  return ctx;
}

/** "07:00" → "7:00" cho dễ đọc */
export const formatHour = (hhmm: string) => hhmm.replace(/^0(\d)/, "$1");
