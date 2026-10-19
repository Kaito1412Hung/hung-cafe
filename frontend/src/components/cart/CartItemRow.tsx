"use client";

import { Trash2 } from "lucide-react";
import { ProductImage } from "@/components/ui/ProductImage";
import { useCartActions } from "@/hooks/useCartActions";
import { cn, formatPrice, getCategoryLabel } from "@/lib/utils";
import type { CartItem } from "@/types/cart";
import { QuantityStepper } from "./QuantityStepper";

/** Một dòng món trong giỏ. `compact` dùng cho ngăn kéo, bản thường dùng cho trang /cart */
export function CartItemRow({ item, compact }: { item: CartItem; compact?: boolean }) {
  const { pendingIds, changeQuantity, remove } = useCartActions();
  const pending = pendingIds.includes(item.productId);
  const soldOut = !item.isAvailable || item.stock === 0;

  return (
    <div className={cn("flex gap-3 sm:gap-4", compact ? "py-4" : "py-5", pending && "opacity-60 transition-opacity")}>
      <ProductImage
        src={item.image}
        alt={item.name}
        className={cn("shrink-0 rounded-2xl", compact ? "h-20 w-20" : "h-20 w-20 sm:h-28 sm:w-28", soldOut && "grayscale")}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {!compact && <p className="text-xs font-medium uppercase tracking-wider text-coffee-500">{getCategoryLabel(item.category)}</p>}
            <h3 className={cn("truncate font-semibold text-coffee-950", !compact && "font-display text-lg")}>{item.name}</h3>
            <p className="text-sm text-coffee-600">{formatPrice(item.price)}</p>
          </div>
          <button
            onClick={() => remove(item.productId, item.name)}
            disabled={pending}
            className="shrink-0 cursor-pointer rounded-lg p-1.5 text-coffee-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed"
            aria-label={`Xoá ${item.name} khỏi giỏ`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2 pt-3">
          {soldOut ? (
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-red-600/15">
              Tạm hết — không tính vào tổng
            </span>
          ) : (
            <QuantityStepper
              value={item.quantity}
              max={Math.min(item.stock, 99)}
              disabled={pending}
              size={compact ? "sm" : "md"}
              onChange={(q) => changeQuantity(item.productId, q)}
            />
          )}
          <span className={cn("font-bold text-coffee-950", soldOut && "text-coffee-400 line-through")}>{formatPrice(item.lineTotal)}</span>
        </div>
      </div>
    </div>
  );
}
