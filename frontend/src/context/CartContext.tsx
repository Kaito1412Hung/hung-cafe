"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { cartService } from "@/services/cartService";
import type { ItemOptions } from "@/lib/options";
import type { Cart } from "@/types/cart";

const EMPTY_CART: Cart = { items: [], totalQuantity: 0, subtotal: 0 };

interface CartContextValue {
  cart: Cart;
  loading: boolean;
  /** Mã các DÒNG giỏ đang chờ server phản hồi (0 = đang xoá cả giỏ) — để khoá nút */
  pendingIds: number[];
  /** Mã các MÓN đang được thêm vào giỏ */
  addingIds: number[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (productId: number, quantity?: number, options?: Partial<ItemOptions>) => Promise<void>;
  updateQuantity: (lineId: number, quantity: number) => Promise<void>;
  removeItem: (lineId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  /** Làm trống giỏ phía giao diện (sau khi đặt hàng, server đã tự xoá giỏ) */
  resetCart: () => void;
  /** Tải lại giỏ từ server (VD sau khi "Mua lại" đơn cũ) */
  reloadCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Lưu kèm userId để biết giỏ đang hiển thị là của ai (đổi tài khoản → tự tải lại)
  const [state, setState] = useState<{ userId: number; cart: Cart } | null>(null);
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  const [addingIds, setAddingIds] = useState<number[]>([]);
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

  /**
   * Chạy một thao tác giỏ hàng: đánh dấu `id` đang xử lý (để khoá nút), cập nhật giỏ từ kết quả server.
   * `setBusy` chọn danh sách cần đánh dấu: dòng giỏ (pendingIds) hay món đang thêm (addingIds).
   */
  const run = useCallback(
    async (id: number, action: () => Promise<Cart>, setBusy = setPendingIds) => {
      if (!user) throw new Error("Vui lòng đăng nhập để dùng giỏ hàng");
      setBusy((ids) => [...ids, id]);
      try {
        const next = await action();
        setState({ userId: user.id, cart: next });
      } finally {
        setBusy((ids) => ids.filter((x) => x !== id));
      }
    },
    [user],
  );

  const addItem = useCallback(
    (productId: number, quantity = 1, options: Partial<ItemOptions> = {}) =>
      run(productId, () => cartService.addItem(productId, quantity, options), setAddingIds),
    [run],
  );
  const updateQuantity = useCallback(
    (lineId: number, quantity: number) => run(lineId, () => cartService.updateQuantity(lineId, quantity)),
    [run],
  );
  const removeItem = useCallback((lineId: number) => run(lineId, () => cartService.removeItem(lineId)), [run]);
  const clearCart = useCallback(() => run(0, () => cartService.clear()), [run]);

  const resetCart = useCallback(() => {
    if (user) setState({ userId: user.id, cart: EMPTY_CART });
  }, [user]);

  const reloadCart = useCallback(async () => {
    if (user) setState({ userId: user.id, cart: await cartService.get() });
  }, [user]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  return (
    <CartContext.Provider
      value={{ cart, loading, pendingIds, addingIds, isOpen, openCart, closeCart, addItem, updateQuantity, removeItem, clearCart, resetCart, reloadCart }}
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
