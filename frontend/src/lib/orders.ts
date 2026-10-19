import type { OrderStatus } from "@/types/order";

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
