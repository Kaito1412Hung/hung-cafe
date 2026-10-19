"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { cn, formatPrice } from "@/lib/utils";
import { CartItemRow } from "./CartItemRow";
import { EmptyCart } from "./EmptyCart";

/** Ngăn kéo trượt từ bên phải khi bấm biểu tượng giỏ hàng */
export function CartDrawer() {
  const { user } = useAuth();
  const { cart, loading, isOpen, closeCart } = useCart();
  const pathname = usePathname();

  // Đóng bằng Esc + khoá cuộn trang khi mở
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCart();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeCart]);

  return (
    // inert: khi đóng thì không tab/click vào được các phần tử bên trong
    <div className={cn("fixed inset-0 z-50 overflow-hidden", !isOpen && "pointer-events-none")} inert={!isOpen}>
      <div
        onClick={closeCart}
        className={cn("absolute inset-0 bg-coffee-950/50 backdrop-blur-sm transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0")}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Giỏ hàng"
        className={cn(
          "absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-coffee-100 px-6 py-5">
          <h2 className="font-display text-xl font-semibold text-coffee-950">
            Giỏ hàng {cart.totalQuantity > 0 && <span className="text-coffee-500">({cart.totalQuantity})</span>}
          </h2>
          <button onClick={closeCart} className="rounded-lg p-1.5 text-coffee-500 hover:bg-coffee-100 hover:text-coffee-900" aria-label="Đóng giỏ hàng">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          {!user ? (
            <EmptyCart
              title="Bạn chưa đăng nhập"
              description="Đăng nhập để thêm món và xem giỏ hàng của bạn."
              action={{ href: `/login?next=${encodeURIComponent(pathname)}`, label: "Đăng nhập" }}
              onNavigate={closeCart}
            />
          ) : loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-7 w-7 animate-spin text-coffee-400" />
            </div>
          ) : cart.items.length === 0 ? (
            <EmptyCart
              title="Giỏ hàng trống"
              description="Chọn vài món ngon từ thực đơn nhé!"
              action={{ href: "/menu", label: "Xem thực đơn" }}
              onNavigate={closeCart}
            />
          ) : (
            <div className="divide-y divide-coffee-100">
              {cart.items.map((item) => (
                <CartItemRow key={item.id} item={item} compact />
              ))}
            </div>
          )}
        </div>

        {user && cart.items.length > 0 && (
          <div className="space-y-4 border-t border-coffee-100 bg-coffee-50/50 px-6 py-5">
            <div className="flex items-center justify-between">
              <span className="text-coffee-600">Tạm tính</span>
              <span className="text-xl font-bold text-coffee-950">{formatPrice(cart.subtotal)}</span>
            </div>
            <p className="text-xs text-coffee-500">Phí giao hàng được tính ở bước tiếp theo.</p>
            <Link href="/cart" onClick={closeCart} className={buttonClass("primary", "lg", "w-full rounded-xl")}>
              Xem giỏ hàng & đặt món
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
