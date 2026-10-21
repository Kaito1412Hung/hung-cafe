"use client";

import { useEffect, useState } from "react";
import { CreditCard, RotateCcw, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { paymentService } from "@/services/paymentService";
import type { Order } from "@/types/order";

/** Còn lại "mm:ss" tới hạn chót, cập nhật mỗi giây (null khi chưa chạy trên trình duyệt) */
function useCountdown(deadline: string | null) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!deadline) return;
    const tick = () => setLeft(Math.max(0, new Date(deadline).getTime() - Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  return left;
}

const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * Khung thanh toán trong "Đơn hàng của tôi":
 * - Đơn VNPay chưa trả: đếm ngược + nút "Thanh toán ngay"
 * - Đơn đã trả nhưng bị huỷ: báo quán sẽ hoàn tiền / đã hoàn tiền
 */
export function PaymentNotice({ order }: { order: Order }) {
  const toast = useToast();
  const [paying, setPaying] = useState(false);
  const pendingVnpay = order.paymentMethod === "vnpay" && order.paymentStatus === "pending" && order.status === "pending";
  const left = useCountdown(pendingVnpay ? order.paymentDeadline : null);

  if (order.paymentStatus === "refund_pending" || order.paymentStatus === "refunded") {
    return (
      <p className="mt-5 flex items-start gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-900 ring-1 ring-sky-600/20">
        <RotateCcw className="mt-0.5 h-4 w-4 shrink-0" />
        {order.paymentStatus === "refund_pending"
          ? "Đơn đã thanh toán VNPay nhưng bị huỷ — quán sẽ hoàn lại tiền cho bạn, có thắc mắc vui lòng liên hệ quán."
          : "Quán đã hoàn lại tiền cho đơn này."}
      </p>
    );
  }
  if (!pendingVnpay) return null;

  const expired = left !== null && left <= 0;
  const pay = async () => {
    setPaying(true);
    try {
      const { url } = await paymentService.createVnpayUrl(order.id);
      window.location.href = url;
    } catch (err) {
      toast((err as Error).message, "error");
      setPaying(false);
    }
  };

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-600/20">
      <p className="flex items-start gap-2">
        <TimerReset className="mt-0.5 h-4 w-4 shrink-0" />
        {expired ? (
          <span>Đã hết thời gian thanh toán, đơn sẽ tự huỷ trong giây lát.</span>
        ) : (
          <span>
            <strong>Chờ thanh toán VNPay</strong> — còn <strong className="tabular-nums">{left === null ? "…" : mmss(left)}</strong>, quá thời gian đơn tự huỷ.
          </span>
        )}
      </p>
      {!expired && (
        <Button size="sm" onClick={pay} loading={paying}>
          {!paying && <CreditCard className="h-4 w-4" />} Thanh toán ngay
        </Button>
      )}
    </div>
  );
}
