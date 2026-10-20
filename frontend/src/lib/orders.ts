import type { Order, OrderStatus } from "@/types/order";
import type { ShopSettings } from "@/types/settings";

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: string; dot: string }> = {
  pending: { label: "Chờ xác nhận", tone: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500" },
  confirmed: { label: "Đã xác nhận", tone: "bg-sky-50 text-sky-700 ring-sky-600/20", dot: "bg-sky-500" },
  shipping: { label: "Đang giao", tone: "bg-violet-50 text-violet-700 ring-violet-600/20", dot: "bg-violet-500" },
  completed: { label: "Hoàn thành", tone: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  cancelled: { label: "Đã huỷ", tone: "bg-red-50 text-red-700 ring-red-600/15", dot: "bg-red-500" },
};

export const ORDER_STATUS_LIST = Object.keys(ORDER_STATUS) as OrderStatus[];

/** Bước tiếp theo admin có thể bấm (phải khớp STATUS_TRANSITIONS ở backend) */
export const NEXT_STEP: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  pending: { status: "confirmed", label: "Xác nhận đơn" },
  confirmed: { status: "shipping", label: "Bắt đầu giao" },
  shipping: { status: "completed", label: "Đã giao xong" },
};

export const CANCELLABLE: OrderStatus[] = ["pending", "confirmed"];

/** Lý do huỷ gợi ý (vẫn cho nhập lý do khác) */
export const ADMIN_CANCEL_REASONS = ["Món trong đơn đã hết", "Không liên lạc được với khách", "Địa chỉ ngoài khu vực giao hàng", "Khách yêu cầu huỷ", "Quán quá tải, không kịp giao"];
export const CUSTOMER_CANCEL_REASONS = ["Đặt nhầm món / số lượng", "Muốn đổi địa chỉ hoặc số điện thoại", "Đổi ý, không muốn mua nữa", "Thời gian giao quá lâu"];

/** Các bước hiển thị trên thanh tiến trình đơn hàng */
export const ORDER_STEPS: OrderStatus[] = ["pending", "confirmed", "shipping", "completed"];

export function formatOrderCode(id: number) {
  return `#${String(id).padStart(5, "0")}`;
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}

/** "14:05" — kèm ngày "14:05 · 19/10" khi khác ngày với `base` (VD đơn đặt tối, sáng hôm sau mới giao) */
export function formatStepTime(iso: string, base?: string) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  if (!base || new Date(base).toDateString() === d.toDateString()) return time;
  return `${time} · ${d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}`;
}

/** Giờ của từng bước trên thanh tiến trình */
export function stepTime(order: Pick<Order, "createdAt" | "confirmedAt" | "shippingAt" | "completedAt">, step: OrderStatus): string | null {
  if (step === "pending") return order.createdAt;
  if (step === "confirmed") return order.confirmedAt;
  if (step === "shipping") return order.shippingAt;
  if (step === "completed") return order.completedAt;
  return null;
}

/**
 * Giờ dự kiến giao (chỉ khi đơn chưa xong / chưa huỷ):
 * - Chờ xác nhận / đã xác nhận: (giờ xác nhận, chưa có thì giờ đặt) + pha chế + giao
 * - Đang giao: giờ bắt đầu giao + thời gian giao
 */
export function estimateDelivery(
  order: Pick<Order, "status" | "createdAt" | "confirmedAt" | "shippingAt">,
  settings: Pick<ShopSettings, "prepMinutes" | "deliveryMinutes">,
): Date | null {
  const minutes = 60_000;
  if (order.status === "shipping" && order.shippingAt) return new Date(new Date(order.shippingAt).getTime() + settings.deliveryMinutes * minutes);
  if (order.status === "pending" || order.status === "confirmed") {
    const from = new Date(order.confirmedAt ?? order.createdAt).getTime();
    return new Date(from + (settings.prepMinutes + settings.deliveryMinutes) * minutes);
  }
  return null;
}
