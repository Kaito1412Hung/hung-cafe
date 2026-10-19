"use client";

import { useState } from "react";
import { Loader2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/cart/QuantityStepper";
import { useCartActions } from "@/hooks/useCartActions";
import { DEFAULT_OPTIONS, sizeExtra, type ItemOptions } from "@/lib/options";
import { cn, formatPrice } from "@/lib/utils";
import type { Product } from "@/types/product";
import { OptionPicker } from "./OptionPicker";

/**
 * Trạng thái khi chọn món (size / đường / đá / ghi chú / số lượng) + hàm thêm vào giỏ.
 * Tách ra hook để trang chi tiết và hộp thoại chọn nhanh dùng chung, nhưng bố trí giao diện khác nhau.
 */
export function useAddToCart(product: Product, onAdded?: () => void) {
  const { addToCart, addingIds } = useCartActions();
  const [quantity, setQuantity] = useState(1);
  const [options, setOptions] = useState<ItemOptions>(product.hasOptions ? DEFAULT_OPTIONS : { size: "", sugar: "", ice: "", note: "" });

  const add = async () => {
    const ok = await addToCart(product.id, product.name, quantity, { ...options, note: options.note.trim() });
    if (ok) {
      setQuantity(1);
      onAdded?.();
    }
  };

  return {
    quantity,
    setQuantity,
    options,
    setOptions,
    add,
    adding: addingIds.includes(product.id),
    soldOut: !product.isAvailable || product.stock === 0,
    max: Math.min(product.stock, 99),
    total: (product.price + sizeExtra(options.size)) * quantity,
  };
}

type AddToCart = ReturnType<typeof useAddToCart>;

export function SoldOutNotice() {
  return <div className="rounded-2xl bg-coffee-100 px-5 py-4 text-center font-medium text-coffee-700">Món này đang tạm hết — quay lại sau nhé!</div>;
}

/** Nút "Thêm vào giỏ · giá" */
export function AddButton({ state, className }: { state: AddToCart; className?: string }) {
  return (
    <Button size="lg" className={cn("rounded-2xl", className)} onClick={state.add} disabled={state.adding}>
      {state.adding ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingBag className="h-5 w-5" />}
      Thêm vào giỏ · {formatPrice(state.total)}
    </Button>
  );
}

/** Hàng "Số lượng ……… − 1 +": chữ bên trái, ô bên phải (dùng ở đáy hộp thoại chọn nhanh) */
export function QuantityRow({ state, stock }: { state: AddToCart; stock: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <span className="text-sm font-medium text-coffee-800">Số lượng</span>
        {stock <= 10 && <p className="text-xs font-medium text-amber-700">Chỉ còn {stock} phần</p>}
      </div>
      {/* "touch": nút to ~40px trên điện thoại cho dễ bấm bằng ngón tay */}
      <QuantityStepper value={state.quantity} max={state.max} onChange={state.setQuantity} disabled={state.adding} size="touch" />
    </div>
  );
}

/** Trang chi tiết món: chọn tuỳ chọn, số lượng rồi thêm vào giỏ (bố cục dọc, nhiều chỗ) */
export function AddToCartPanel({ product }: { product: Product }) {
  const state = useAddToCart(product);
  if (state.soldOut) return <SoldOutNotice />;

  return (
    <div className="space-y-5">
      <OptionPicker value={state.options} onChange={state.setOptions} hasOptions={product.hasOptions} />

      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-coffee-800">Số lượng</span>
        <QuantityStepper value={state.quantity} max={state.max} onChange={state.setQuantity} disabled={state.adding} />
        {product.stock <= 10 && <span className="text-xs font-medium text-amber-700">Chỉ còn {product.stock} phần</span>}
      </div>
      <AddButton state={state} className="w-full sm:w-auto sm:min-w-72" />
    </div>
  );
}
