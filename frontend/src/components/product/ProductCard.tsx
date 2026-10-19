"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Star } from "lucide-react";
import { ProductImage } from "@/components/ui/ProductImage";
import { RatingBadge } from "@/components/ui/Stars";
import { useCartActions } from "@/hooks/useCartActions";
import { cn, formatPrice } from "@/lib/utils";
import { useCategories } from "@/context/CategoriesContext";
import type { Product } from "@/types/product";
import { FavoriteButton } from "./FavoriteButton";
import { QuickAddModal } from "./QuickAddModal";

export function ProductCard({ product }: { product: Product }) {
  const { addToCart, addingIds } = useCartActions();
  const { getLabel } = useCategories();
  const adding = addingIds.includes(product.id);
  // Món có size / đường / đá → mở hộp thoại chọn; bánh thì thêm luôn
  const [picking, setPicking] = useState(false);
  const soldOut = !product.isAvailable || product.stock === 0;

  return (
    <article className="group flex flex-col rounded-3xl bg-white p-3 shadow-sm ring-1 ring-coffee-100 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-coffee-900/10">
      <Link href={`/menu/${product.slug}`} className="relative block aspect-square overflow-hidden rounded-2xl" aria-label={`Xem chi tiết ${product.name}`}>
        <ProductImage
          src={product.image}
          alt={product.name}
          className={cn("h-full w-full transition duration-500 group-hover:scale-110", soldOut && "grayscale")}
        />
        {product.isBestSeller && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-coffee-900 backdrop-blur">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> Bán chạy
          </span>
        )}
        <FavoriteButton productId={product.id} name={product.name} className="absolute right-3 top-3" />
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-coffee-950/40">
            <span className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-coffee-900">Tạm hết</span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col px-2 pb-1 pt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-coffee-500">{getLabel(product.category)}</p>
          <RatingBadge average={product.ratingAverage} count={product.ratingCount} />
        </div>
        <h3 className="mt-1 font-display text-lg font-semibold text-coffee-950">
          <Link href={`/menu/${product.slug}`} className="transition hover:text-coffee-600">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-coffee-600">{product.description}</p>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-lg font-bold text-coffee-900">{formatPrice(product.price)}</span>
          <button
            disabled={soldOut || adding}
            onClick={() => (product.hasOptions ? setPicking(true) : addToCart(product.id, product.name))}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-coffee-900 text-cream transition hover:scale-110 hover:bg-coffee-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            aria-label={`Thêm ${product.name} vào giỏ`}
          >
            {adding ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
          </button>
        </div>
      </div>
      <QuickAddModal product={picking ? product : null} onClose={() => setPicking(false)} />
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl bg-white p-3 ring-1 ring-coffee-100">
      <div className="aspect-square rounded-2xl bg-coffee-100" />
      <div className="space-y-3 px-2 pb-2 pt-4">
        <div className="h-3 w-16 rounded bg-coffee-100" />
        <div className="h-5 w-3/4 rounded bg-coffee-100" />
        <div className="h-4 w-full rounded bg-coffee-100" />
        <div className="h-8 w-1/2 rounded bg-coffee-100" />
      </div>
    </div>
  );
}
