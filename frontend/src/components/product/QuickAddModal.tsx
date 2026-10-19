"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ProductImage } from "@/components/ui/ProductImage";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types/product";
import { AddButton, QuantityRow, SoldOutNotice, useAddToCart } from "./AddToCartPanel";
import { OptionPicker } from "./OptionPicker";

/** Bấm "+" ở thẻ món có size / đường / đá → mở hộp thoại chọn nhanh thay vì thêm luôn */
export function QuickAddModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  if (!product) return null;
  // key: mở món khác → form chọn reset về mặc định
  return <QuickAddContent key={product.id} product={product} onClose={onClose} />;
}

function QuickAddContent({ product, onClose }: { product: Product; onClose: () => void }) {
  const state = useAddToCart(product, onClose);

  return (
    <Modal
      open
      onClose={onClose}
      title={product.name}
      description="Chọn theo khẩu vị của bạn"
      // Phương án A: hàng "Số lượng" + nút dài nằm ở đáy, luôn đứng yên khi cuộn phần lựa chọn
      footer={
        state.soldOut ? undefined : (
          <div className="w-full space-y-3">
            <QuantityRow state={state} stock={product.stock} />
            <AddButton state={state} className="w-full" />
          </div>
        )
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4 rounded-2xl bg-coffee-50 p-3">
          <ProductImage src={product.image} alt={product.name} className="h-16 w-16 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <p className="font-semibold text-coffee-950">{formatPrice(product.price)}</p>
            <Link
              href={`/menu/${product.slug}`}
              onClick={onClose}
              className="inline-flex items-center gap-1 text-sm text-coffee-600 underline underline-offset-2 hover:text-coffee-900"
            >
              Xem chi tiết & đánh giá <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        {state.soldOut ? (
          <SoldOutNotice />
        ) : (
          <OptionPicker value={state.options} onChange={state.setOptions} hasOptions={product.hasOptions} idPrefix={`quick-${product.id}`} />
        )}
      </div>
    </Modal>
  );
}
