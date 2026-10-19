import { Check, X } from "lucide-react";
import { ORDER_STATUS, ORDER_STEPS } from "@/lib/orders";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/order";

/** Thanh tiến trình: Chờ xác nhận → Đã xác nhận → Đang giao → Hoàn thành */
export function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        <X className="h-4 w-4" /> Đơn hàng đã bị huỷ
      </div>
    );
  }

  const currentIndex = ORDER_STEPS.indexOf(status);
  return (
    <ol className="flex items-start">
      {ORDER_STEPS.map((step, i) => {
        const done = i <= currentIndex;
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
          </li>
        );
      })}
    </ol>
  );
}
