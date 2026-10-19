"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { favoriteService } from "@/services/favoriteService";

interface FavoritesContextValue {
  /** Mã các món đã thả tim (của tài khoản đang đăng nhập) */
  ids: Set<number>;
  isFavorite: (productId: number) => boolean;
  /** Thả tim / bỏ tim. Trả về trạng thái mới */
  toggle: (productId: number) => Promise<boolean>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Gắn kèm userId để đổi tài khoản thì không hiện nhầm tim của người trước
  const [state, setState] = useState<{ userId: number; ids: Set<number> } | null>(null);
  const ids = useMemo(() => (user && state?.userId === user.id ? state.ids : new Set<number>()), [user, state]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    favoriteService
      .getAll()
      .then((products) => !cancelled && setState({ userId: user.id, ids: new Set(products.map((p) => p.id)) }))
      .catch(() => !cancelled && setState({ userId: user.id, ids: new Set() }));
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggle = useCallback(
    async (productId: number) => {
      if (!user) throw new Error("Vui lòng đăng nhập để lưu món yêu thích");
      const current = state?.userId === user.id ? state.ids : new Set<number>();
      const willLike = !current.has(productId);
      const apply = (like: boolean) =>
        setState((prev) => {
          const next = new Set(prev?.userId === user.id ? prev.ids : []);
          if (like) next.add(productId);
          else next.delete(productId);
          return { userId: user.id, ids: next };
        });

      // Đổi giao diện ngay cho mượt, lỗi thì trả lại như cũ
      apply(willLike);
      try {
        await (willLike ? favoriteService.add(productId) : favoriteService.remove(productId));
        return willLike;
      } catch (err) {
        apply(!willLike);
        throw err;
      }
    },
    [user, state],
  );

  const isFavorite = useCallback((productId: number) => ids.has(productId), [ids]);

  return <FavoritesContext.Provider value={{ ids, isFavorite, toggle }}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites phải được dùng bên trong <FavoritesProvider>");
  return ctx;
}
