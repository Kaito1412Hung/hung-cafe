"use client";

import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { describeOptions, type ItemOptions } from "@/lib/options";

/** Bọc các thao tác giỏ hàng kèm thông báo + chuyển sang đăng nhập nếu là khách vãng lai */
export function useCartActions() {
  const { user } = useAuth();
  const cart = useCart();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const requireLogin = () => {
    toast("Vui lòng đăng nhập để thêm món vào giỏ", "info");
    router.push(`/login?next=${encodeURIComponent(pathname)}`);
  };

  /** Chạy thao tác + hiện thông báo. Trả về true nếu thành công */
  const withToast = async (action: () => Promise<void>, success?: string) => {
    try {
      await action();
      if (success) toast(success);
      return true;
    } catch (err) {
      toast((err as Error).message, "error");
      return false;
    }
  };

  return {
    ...cart,
    addToCart: (productId: number, name: string, quantity = 1, options: Partial<ItemOptions> = {}) => {
      if (!user) {
        requireLogin();
        return Promise.resolve(false);
      }
      // Thông báo kèm lựa chọn: "Đã thêm "Trà Sữa Khoai Môn" (Size M · 70% đường · Ít đá · 2 topping) vào giỏ"
      const parts = [
        describeOptions({ size: options.size ?? "", sugar: options.sugar ?? "", ice: options.ice ?? "", temp: options.temp ?? "" }),
        options.toppings?.length ? `${options.toppings.length} topping` : "",
      ].filter(Boolean);
      const detail = parts.length ? ` (${parts.join(" · ")})` : "";
      return withToast(() => cart.addItem(productId, quantity, options), `Đã thêm ${quantity > 1 ? `${quantity} × ` : ""}"${name}"${detail} vào giỏ`);
    },
    /** lineId = mã dòng trong giỏ */
    changeQuantity: (lineId: number, quantity: number) => withToast(() => cart.updateQuantity(lineId, quantity)),
    remove: (lineId: number, name: string) => withToast(() => cart.removeItem(lineId), `Đã xoá "${name}" khỏi giỏ`),
    clear: () => withToast(() => cart.clearCart(), "Đã xoá toàn bộ giỏ hàng"),
  };
}
