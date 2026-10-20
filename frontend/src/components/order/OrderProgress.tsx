"use client";

import { useEffect, useState } from "react";
import { Check, Clock, X } from "lucide-react";
import { useShopSettings } from "@/context/ShopSettingsContext";
import { ORDER_STATUS, ORDER_STEPS, estimateDelivery, formatDateTime, formatStepTime, stepTime } from "@/lib/orders";
import { cn } from "@/lib/utils";
import type { Order } from "@/types/order";

type ProgressOrder = Pick<Order, "status" | "createdAt" | "confirmedAt" | "shippingAt" | "completedAt" | "cancelledAt">;

/** Giờ hiện tại, tự cập nhật mỗi phút (để biết đơn có đang trễ so với dự kiến không) */
function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** Thanh tiến trình: Chờ xác nhận → Đã xác nhận → Đang giao → Hoàn thành, kèm giờ của từng bước + giờ dự kiến giao */
export function OrderProgress({ order }: { order: ProgressOrder }) {
  const { settings } = useShopSettings();
  const now = useNow();

  if (order.status === "cancelled") {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        <X className="h-4 w-4 shrink-0" /> Đơn hàng đã bị huỷ{order.cancelledAt && <span className="font-normal">lúc {formatDateTime(order.cancelledAt)}</span>}
      </div>
    );
  }

  const currentIndex = ORDER_STEPS.indexOf(order.status);
  const eta = estimateDelivery(order, settings);
  const late = eta !== null && now !== null && now > eta.getTime();

  return (
    <div>
      <ol className="flex items-start">
        {ORDER_STEPS.map((step, i) => {
          const done = i <= currentIndex;
          const at = done ? stepTime(order, step) : null;
          return (
            <li key={step} className="relative flex flex-1 flex-col items-center text-center">
              {i > 0 && (
                <span className={cn("absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2", i <= currentIndex ? "bg-coffee-700" : "bg-coffee-200")} />
              )}
              <span
                className={cn(
                  "relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                  done ? "bg-coffee-800 text-cream" : "bg-coffee-100 text-coffee-400",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className={cn("mt-2 text-[11px] leading-tight sm:text-xs", done ? "font-medium text-coffee-900" : "text-coffee-400")}>
                {ORDER_STATUS[step].label}
              </span>
              {/* Bước chưa tới → để trống; bước đã qua nhưng đơn cũ không có giờ → "—" */}
              <span className="mt-0.5 min-h-4 text-[11px] tabular-nums text-coffee-500">{done ? (at ? formatStepTime(at, order.createdAt) : "—") : ""}</span>
            </li>
          );
        })}
      </ol>

      {eta && (
        <p
          className={cn(
            "mt-4 flex items-start gap-2 rounded-xl px-4 py-2.5 text-sm",
            late ? "bg-amber-50 text-amber-800" : "bg-coffee-50 text-coffee-800",
          )}
        >
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {order.status === "shipping" ? "🛵 " : ""}Dự kiến giao lúc <strong className="tabular-nums">{formatStepTime(eta.toISOString(), order.createdAt)}</strong>
            {late && <span className="block text-xs">Đơn hơi trễ so với dự kiến, quán đang cố gắng giao sớm nhất cho bạn.</span>}
          </span>
        </p>
      )}
    </div>
  );
}
