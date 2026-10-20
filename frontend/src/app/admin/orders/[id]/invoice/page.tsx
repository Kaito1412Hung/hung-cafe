"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/Button";
import { useShopSettings } from "@/context/ShopSettingsContext";
import { ORDER_STATUS, formatDateTime, formatOrderCode } from "@/lib/orders";
import { formatPrice } from "@/lib/utils";
import { describeOptions, describeToppings } from "@/lib/options";
import { orderService } from "@/services/orderService";
import type { Order } from "@/types/order";

/**
 * Hoá đơn in được: bấm "In hoá đơn" → hộp thoại in của trình duyệt (chọn máy in hoặc "Lưu thành PDF").
 * Khi in, sidebar / thanh trên của trang quản trị tự ẩn (class print:hidden).
 */
export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { settings } = useShopSettings();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    orderService
      .getById(Number(id))
      .then(setOrder)
      .catch((err: Error) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="font-medium text-red-600">{error}</p>
        <Link href="/admin/orders" className={buttonClass("outline", "md", "mt-6")}>
          Về trang Đơn hàng
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-coffee-400" />
      </div>
    );
  }

  const quantity = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="mx-auto max-w-3xl">
      {/* Thanh công cụ — không in ra giấy */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm font-medium text-coffee-600 hover:text-coffee-950">
          <ArrowLeft className="h-4 w-4" /> Đơn hàng
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> In hoá đơn
        </Button>
      </div>

      <article className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-coffee-100 sm:p-12 print:rounded-none print:p-0 print:shadow-none print:ring-0">
        {/* Thông tin quán */}
        <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-coffee-900 pb-6">
          <div>
            <p className="font-display text-3xl font-bold text-coffee-950">{settings.name}</p>
            <p className="mt-2 max-w-xs text-sm text-coffee-700">{settings.address}</p>
            <p className="text-sm text-coffee-700">
              ĐT: {settings.phone} · {settings.email}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coffee-500">Hoá đơn bán hàng</p>
            <p className="mt-1 font-mono text-2xl font-bold text-coffee-950">{formatOrderCode(order.id)}</p>
            <p className="mt-1 text-sm text-coffee-600">{formatDateTime(order.createdAt)}</p>
            <p className="mt-1 text-sm text-coffee-600">Trạng thái: {ORDER_STATUS[order.status].label}</p>
            {order.cancelReason && <p className="mt-1 max-w-56 text-sm text-red-700">Lý do huỷ: {order.cancelReason}</p>}
          </div>
        </header>

        {/* Khách hàng */}
        <section className="grid gap-1 py-6 text-sm text-coffee-800 sm:grid-cols-[120px_1fr]">
          <span className="text-coffee-500">Khách hàng</span>
          <span className="font-semibold text-coffee-950">{order.customerName}</span>
          <span className="text-coffee-500">Điện thoại</span>
          <span>{order.phone}</span>
          <span className="text-coffee-500">Giao đến</span>
          <span>{order.address}</span>
          {order.note && (
            <>
              <span className="text-coffee-500">Ghi chú</span>
              <span className="italic">{order.note}</span>
            </>
          )}
        </section>

        {/* Danh sách món */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-coffee-200 text-left text-xs uppercase tracking-wider text-coffee-500">
              <th className="py-2.5 pr-2 font-semibold">#</th>
              <th className="py-2.5 pr-2 font-semibold">Món</th>
              <th className="py-2.5 pr-2 text-right font-semibold">SL</th>
              <th className="py-2.5 pr-2 text-right font-semibold">Đơn giá</th>
              <th className="py-2.5 text-right font-semibold">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={i} className="border-b border-coffee-100">
                <td className="py-2.5 pr-2 text-coffee-500">{i + 1}</td>
                <td className="py-2.5 pr-2">
                  <p className="font-medium text-coffee-950">{item.name}</p>
                  {(describeOptions(item) || item.note || item.toppings?.length > 0) && (
                    <p className="text-xs text-coffee-600">
                      {[describeOptions(item), describeToppings(item.toppings), item.note && `Ghi chú: ${item.note}`].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </td>
                <td className="py-2.5 pr-2 text-right tabular-nums">{item.quantity}</td>
                <td className="py-2.5 pr-2 text-right tabular-nums">{formatPrice(item.unitPrice)}</td>
                <td className="py-2.5 text-right font-medium tabular-nums">{formatPrice(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tổng tiền */}
        <dl className="ml-auto mt-6 w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-coffee-600">Tạm tính ({quantity} món)</dt>
            <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between">
              <dt className="text-coffee-600">Giảm giá ({order.couponCode})</dt>
              <dd className="tabular-nums">−{formatPrice(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-coffee-600">Phí giao hàng</dt>
            <dd className="tabular-nums">{order.shippingFee === 0 ? "Miễn phí" : formatPrice(order.shippingFee)}</dd>
          </div>
          <div className="flex justify-between border-t-2 border-coffee-900 pt-2 text-base">
            <dt className="font-bold text-coffee-950">Tổng cộng</dt>
            <dd className="font-bold tabular-nums text-coffee-950">{formatPrice(order.total)}</dd>
          </div>
          <p className="pt-1 text-right text-xs text-coffee-500">Thanh toán khi nhận hàng (COD)</p>
        </dl>

        <footer className="mt-12 border-t border-dashed border-coffee-300 pt-6 text-center">
          <p className="font-display text-lg text-coffee-900">Cảm ơn quý khách — hẹn gặp lại! ☕</p>
          <p className="mt-1 text-xs text-coffee-500">{settings.tagline}</p>
        </footer>
      </article>
    </div>
  );
}
