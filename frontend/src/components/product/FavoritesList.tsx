"use client";

import { useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { EmptyCart } from "@/components/cart/EmptyCart";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import { favoriteService } from "@/services/favoriteService";
import type { Product } from "@/types/product";
import { ProductCard } from "./ProductCard";

/** Trang "Món yêu thích": các món đã thả tim (bỏ tim thì món biến mất khỏi danh sách) */
export function FavoritesList() {
  const { user, loading: authLoading } = useAuth();
  const { ids } = useFavorites();
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    favoriteService
      .getAll()
      .then((list) => !cancelled && setProducts(list))
      .catch(() => !cancelled && setProducts([]));
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Lọc theo danh sách tim hiện tại → bỏ tim ngay trên trang này thì món ẩn luôn
  const shown = products?.filter((p) => ids.has(p.id)) ?? null;

  let content;
  if (authLoading || (user && shown === null)) {
    content = (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-coffee-400" />
      </div>
    );
  } else if (!user) {
    content = <EmptyCart title="Bạn chưa đăng nhập" description="Đăng nhập để xem các món bạn đã lưu." action={{ href: "/login?next=/favorites", label: "Đăng nhập" }} />;
  } else if (!shown || shown.length === 0) {
    content = (
      <EmptyCart
        title="Chưa có món yêu thích"
        description="Bấm vào biểu tượng trái tim trên món bạn thích để lưu lại, lần sau gọi cho nhanh!"
        action={{ href: "/menu", label: "Xem thực đơn" }}
      />
    );
  } else {
    content = (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {shown.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <h1 className="flex items-center gap-3 font-display text-4xl font-bold tracking-tight text-coffee-950 sm:text-5xl">
        <Heart className="h-9 w-9 fill-rose-500 text-rose-500" /> Món yêu thích
      </h1>
      {shown && shown.length > 0 && <p className="mt-2 text-coffee-600">{shown.length} món bạn đã lưu</p>}
      <div className="mt-8">{content}</div>
    </section>
  );
}
