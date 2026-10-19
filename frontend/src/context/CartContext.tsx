"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { cartService } from "@/services/cartService";
import type { Cart } from "@/types/cart";

const EMPTY_CART: Cart = { items: [], totalQuantity: 0, subtotal: 0 };

interface CartContextValue {
  cart: Cart;
  loading: boolean;
  /** Các productId đang chờ server phản hồi (để khoá nút) */
  pendingIds: number[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (productId: number, quantity?: number) => Promise<void>;
  updateQuantity: (productId: number, quantity: number) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  /** Làm trống giỏ phía giao diện (sau khi đặt hàng, server đã tự xoá giỏ) */
  resetCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Lưu kèm userId để biết giỏ đang hiển thị là của ai (đổi tài khoản → tự tải lại)
  const [state, setState] = useState<{ userId: number; cart: Cart } | null>(null);
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const isCurrent = user !== null && state?.userId === user.id;
  const cart = isCurrent ? state.cart : EMPTY_CART;
  const loading = user !== null && !isCurrent;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    cartService
      .get()
      .then((c) => !cancelled && setState({ userId: user.id, cart: c }))
      .catch(() => !cancelled && setState({ userId: user.id, cart: EMPTY_CART }));
    return () => {
      cancelled = true;
    };
  }, [user]);

  /** Chạy một thao tác giỏ hàng: khoá nút của món đó, cập nhật giỏ từ kết quả server */
  const run = useCallback(
    async (productId: number, action: () => Promise<Cart>) => {
      if (!user) throw new Error("Vui lòng đăng nhập để dùng giỏ hàng");
      setPendingIds((ids) => [...ids, productId]);
      try {
        const next = await action();
        setState({ userId: user.id, cart: next });
      } finally {
        setPendingIds((ids) => ids.filter((id) => id !== productId));
      }
    },
    [user],
  );

  const addItem = useCallback(
    (productId: number, quantity = 1) => run(productId, () => cartService.addItem(productId, quantity)),
    [run],
  );
  const updateQuantity = useCallback(
    (productId: number, quantity: number) => run(productId, () => cartService.updateQuantity(productId, quantity)),
    [run],
  );
  const removeItem = useCallback((productId: number) => run(productId, () => cartService.removeItem(productId)), [run]);
  const clearCart = useCallback(() => run(0, () => cartService.clear()), [run]);

  const resetCart = useCallback(() => {
    if (user) setState({ userId: user.id, cart: EMPTY_CART });
  }, [user]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  return (
    <CartContext.Provider
      value={{ cart, loading, pendingIds, isOpen, openCart, closeCart, addItem, updateQuantity, removeItem, clearCart, resetCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart phải được dùng bên trong <CartProvider>");
  return ctx;
}
