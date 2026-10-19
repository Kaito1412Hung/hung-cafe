"use client";

import { useState } from "react";
import { Loader2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/cart/QuantityStepper";
import { useCartActions } from "@/hooks/useCartActions";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types/product";

/** Phần tương tác trên trang chi tiết: chọn số lượng + thêm vào giỏ (trang còn lại render ở server) */
export function AddToCartPanel({ product }: { product: Product }) {
  const { addToCart, pendingIds } = useCartActions();
  const [quantity, setQuantity] = useState(1);
  const soldOut = !product.isAvailable || product.stock === 0;
  const adding = pendingIds.includes(product.id);
  const max = Math.min(product.stock, 99);

  if (soldOut) {
    return (
      <div className="rounded-2xl bg-coffee-100 px-5 py-4 text-center font-medium text-coffee-700">
        Món này đang tạm hết — quay lại sau nhé!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-coffee-700">Số lượng</span>
        <QuantityStepper value={quantity} max={max} onChange={setQuantity} disabled={adding} />
        {product.stock <= 10 && <span className="text-xs font-medium text-amber-700">Chỉ còn {product.stock} phần</span>}
      </div>
      <Button size="lg" className="w-full rounded-2xl sm:w-auto sm:min-w-72" onClick={() => addToCart(product.id, product.name, quantity)} disabled={adding}>
        {adding ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingBag className="h-5 w-5" />}
        Thêm vào giỏ · {formatPrice(product.price * quantity)}
      </Button>
    </div>
  );
}
