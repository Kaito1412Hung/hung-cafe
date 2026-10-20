import { ORDER_STATUS, statusLabel } from "@/lib/orders";
import { cn } from "@/lib/utils";
import type { Fulfillment, OrderStatus } from "@/types/order";

export function OrderStatusBadge({ status, fulfillment, className }: { status: OrderStatus; fulfillment?: Fulfillment; className?: string }) {
  const s = ORDER_STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1", s.tone, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {statusLabel(status, fulfillment)}
    </span>
  );
}
