"use client";

import { useEffect, useState } from "react";
import type { Topping } from "@/lib/options";
import { toppingService } from "@/services/toppingService";

// Lưu tạm trong bộ nhớ trang: mở nhiều hộp thoại chọn món cũng chỉ gọi server 1 lần
let cache: Promise<Topping[]> | null = null;

/** Danh sách topping đang bán. `enabled = false` (món không có topping) thì không tải */
export function useToppings(enabled = true) {
  const [toppings, setToppings] = useState<Topping[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    cache ??= toppingService.getAvailable().catch((err) => {
      cache = null; // lỗi mạng → lần sau thử lại
      throw err;
    });
    cache.then((list) => !cancelled && setToppings(list)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return toppings;
}

/** Gọi sau khi admin sửa topping để khách thấy danh sách mới */
export const clearToppingCache = () => {
  cache = null;
};
