"use client";

import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

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

  const withToast = async (action: () => Promise<void>, success?: string) => {
    try {
      await action();
      if (success) toast(success);
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  return {
    ...cart,
    addToCart: (productId: number, name: string, quantity = 1) => {
      if (!user) return requireLogin();
      return withToast(() => cart.addItem(productId, quantity), `Đã thêm ${quantity > 1 ? `${quantity} × ` : ""}"${name}" vào giỏ`);
    },
    changeQuantity: (productId: number, quantity: number) => withToast(() => cart.updateQuantity(productId, quantity)),
    remove: (productId: number, name: string) => withToast(() => cart.removeItem(productId), `Đã xoá "${name}" khỏi giỏ`),
    clear: () => withToast(() => cart.clearCart(), "Đã xoá toàn bộ giỏ hàng"),
  };
}
