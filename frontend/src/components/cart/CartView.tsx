"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, ShieldCheck, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import { useCartActions } from "@/hooks/useCartActions";
import { useShopSettings } from "@/context/ShopSettingsContext";
import { formatPrice } from "@/lib/utils";
import { CartItemRow } from "./CartItemRow";
import { CheckoutModal } from "./CheckoutModal";
import { EmptyCart } from "./EmptyCart";

export function CartView() {
  const { user, loading: authLoading } = useAuth();
  const { cart, loading, pendingIds, clear } = useCartActions();
  const [confirmClear, setConfirmClear] = useState(false);
  const [checkoutKey, setCheckoutKey] = useState(0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const { settings, getShippingFee } = useShopSettings();
  const shipping = getShippingFee(cart.subtotal);
  const total = cart.subtotal + shipping;
  const remainingForFree = Math.max(0, settings.freeShippingThreshold - cart.subtotal);
  const progress = Math.min(100, (cart.subtotal / settings.freeShippingThreshold) * 100);
  const hasPurchasable = cart.subtotal > 0;
  const hasSoldOut = cart.items.some((i) => !i.isAvailable || i.stock === 0);

  const handleClear = async () => {
    await clear();
    setConfirmClear(false);
  };

  let content;
  if (authLoading || loading) {
    content = (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-coffee-400" />
      </div>
    );
  } else if (!user) {
    content = (
      <EmptyCart
        title="Bạn chưa đăng nhập"
        description="Đăng nhập để xem các món bạn đã chọn."
        action={{ href: "/login?next=/cart", label: "Đăng nhập" }}
      />
    );
  } else if (cart.items.length === 0) {
    content = (
      <EmptyCart title="Giỏ hàng trống" description="Bạn chưa chọn món nào. Ghé thực đơn xem có gì ngon nhé!" action={{ href: "/menu", label: "Xem thực đơn" }} />
    );
  } else {
    content = (
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Danh sách món */}
        <div className="min-w-0 rounded-3xl bg-white px-4 shadow-sm ring-1 ring-coffee-100 sm:px-6">
          <div className="flex items-center justify-between border-b border-coffee-100 py-4">
            <p className="font-medium text-coffee-900">{cart.totalQuantity} món</p>
            <button
              onClick={() => setConfirmClear(true)}
              className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-coffee-500 transition hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" /> Xoá tất cả
            </button>
          </div>
          <div className="divide-y divide-coffee-100">
            {cart.items.map((item) => (
              <CartItemRow key={item.productId} item={item} />
            ))}
          </div>
        </div>

        {/* Tóm tắt đơn */}
        <aside className="h-fit space-y-5 rounded-3xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-coffee-100 lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-semibold text-coffee-950">Tóm tắt đơn hàng</h2>

          <div className="rounded-2xl bg-coffee-50 p-4">
            <p className="flex items-center gap-2 text-sm text-coffee-800">
              <Truck className="h-4 w-4 text-coffee-500" />
              {remainingForFree > 0 ? (
                <span>
                  Mua thêm <strong>{formatPrice(remainingForFree)}</strong> để được miễn phí giao hàng
                </span>
              ) : (
                <span className="font-medium text-emerald-700">Bạn được miễn phí giao hàng!</span>
              )}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-coffee-200">
              <div className="h-full rounded-full bg-coffee-700 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-coffee-600">Tạm tính</dt>
              <dd className="font-medium text-coffee-950">{formatPrice(cart.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-coffee-600">Phí giao hàng</dt>
              <dd className="font-medium text-coffee-950">{shipping === 0 ? "Miễn phí" : formatPrice(shipping)}</dd>
            </div>
            <div className="flex items-end justify-between border-t border-coffee-100 pt-4">
              <dt className="font-semibold text-coffee-950">Tổng cộng</dt>
              <dd className="text-2xl font-bold text-coffee-950">{formatPrice(total)}</dd>
            </div>
          </dl>

          <Button
            size="lg"
            className="w-full rounded-xl"
            disabled={!hasPurchasable || hasSoldOut || pendingIds.length > 0}
            onClick={() => {
              setCheckoutKey((k) => k + 1);
              setCheckoutOpen(true);
            }}
          >
            Đặt hàng
          </Button>
          {hasSoldOut && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-center text-xs font-medium text-red-700">
              Vui lòng xoá các món &ldquo;Tạm hết&rdquo; khỏi giỏ trước khi đặt hàng
            </p>
          )}
          <p className="flex items-center justify-center gap-1.5 text-xs text-coffee-500">
            <ShieldCheck className="h-3.5 w-3.5" /> Giỏ hàng được lưu theo tài khoản của bạn
          </p>
        </aside>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <Link href="/menu" className="inline-flex items-center gap-1.5 text-sm font-medium text-coffee-600 hover:text-coffee-950">
        <ArrowLeft className="h-4 w-4" /> Tiếp tục chọn món
      </Link>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-coffee-950 sm:text-5xl">Giỏ hàng</h1>
      <div className="mt-8">{content}</div>

      <CheckoutModal key={checkoutKey} open={checkoutOpen} total={total} onClose={() => setCheckoutOpen(false)} />

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        size="sm"
        title="Xoá toàn bộ giỏ hàng?"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmClear(false)}>
              Huỷ
            </Button>
            <Button variant="danger" onClick={handleClear} loading={pendingIds.includes(0)}>
              Xoá tất cả
            </Button>
          </>
        }
      >
        <p className="text-sm text-coffee-700">Tất cả {cart.totalQuantity} món trong giỏ sẽ bị xoá.</p>
      </Modal>
    </section>
  );
}
