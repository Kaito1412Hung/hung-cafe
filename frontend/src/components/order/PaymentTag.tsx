import { Banknote, CreditCard } from "lucide-react";
import { PAYMENT_METHOD, PAYMENT_STATUS } from "@/lib/orders";
import { cn } from "@/lib/utils";
import type { Order } from "@/types/order";

/** Nhãn thanh toán: 💵 Tiền mặt / 💳 VNPay + trạng thái (Đã thanh toán, Chờ thanh toán, Cần hoàn tiền…) */
export function PaymentTag({ order, className }: { order: Pick<Order, "paymentMethod" | "paymentStatus">; className?: string }) {
  const Icon = order.paymentMethod === "vnpay" ? CreditCard : Banknote;
  const status = PAYMENT_STATUS[order.paymentStatus];
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1", status.tone, className)}>
      <Icon className="h-3 w-3" /> {PAYMENT_METHOD[order.paymentMethod]} · {status.label}
    </span>
  );
}
