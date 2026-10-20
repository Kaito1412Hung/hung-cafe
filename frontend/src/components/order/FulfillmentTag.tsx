import { AlarmClock, Bike, Store } from "lucide-react";
import { FULFILLMENT, formatScheduled } from "@/lib/orders";
import { cn } from "@/lib/utils";
import type { Order } from "@/types/order";

/** Nhãn nhỏ: 🛵 Giao tận nơi / 🏪 Đến quán lấy, kèm ⏰ giờ hẹn nếu có */
export function FulfillmentTag({ order, className }: { order: Pick<Order, "fulfillment" | "scheduledAt">; className?: string }) {
  const pickup = order.fulfillment === "pickup";
  const Icon = pickup ? Store : Bike;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1",
          pickup ? "bg-violet-50 text-violet-700 ring-violet-600/20" : "bg-coffee-50 text-coffee-700 ring-coffee-200",
        )}
      >
        <Icon className="h-3 w-3" /> {FULFILLMENT[order.fulfillment].label}
      </span>
      {order.scheduledAt && (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-600/20">
          <AlarmClock className="h-3 w-3" /> Hẹn {formatScheduled(order.scheduledAt)}
        </span>
      )}
    </span>
  );
}
