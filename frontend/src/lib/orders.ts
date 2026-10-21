import { vnDate, vnParts } from "@/lib/utils";
import type { Fulfillment, Order, OrderStatus } from "@/types/order";
import type { ShopSettings } from "@/types/settings";

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: string; dot: string }> = {
  pending: { label: "Chờ xác nhận", tone: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500" },
  confirmed: { label: "Đã xác nhận", tone: "bg-sky-50 text-sky-700 ring-sky-600/20", dot: "bg-sky-500" },
  shipping: { label: "Đang giao", tone: "bg-violet-50 text-violet-700 ring-violet-600/20", dot: "bg-violet-500" },
  completed: { label: "Hoàn thành", tone: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  cancelled: { label: "Đã huỷ", tone: "bg-red-50 text-red-700 ring-red-600/15", dot: "bg-red-500" },
};

export const ORDER_STATUS_LIST = Object.keys(ORDER_STATUS) as OrderStatus[];

/** Hình thức nhận */
export const FULFILLMENT: Record<Fulfillment, { label: string; hint: string }> = {
  delivery: { label: "Giao tận nơi", hint: "Shipper giao đến địa chỉ của bạn" },
  pickup: { label: "Đến quán lấy", hint: "Không tính phí giao, đến quán lấy là có" },
};

/** Đơn đến quán lấy: "Đang giao" → "Chờ khách lấy", "Hoàn thành" → "Khách đã lấy" (khớp PICKUP_STATUS_LABELS ở backend) */
const PICKUP_LABELS: Partial<Record<OrderStatus, string>> = { shipping: "Chờ khách lấy", completed: "Khách đã lấy" };

/** Tên trạng thái theo hình thức nhận */
export function statusLabel(status: OrderStatus, fulfillment: Fulfillment = "delivery") {
  return (fulfillment === "pickup" ? PICKUP_LABELS[status] : undefined) ?? ORDER_STATUS[status].label;
}

/** Bước tiếp theo admin bấm, chữ trên nút đổi theo hình thức nhận */
export function nextStep(status: OrderStatus, fulfillment: Fulfillment = "delivery") {
  const step = NEXT_STEP[status];
  if (!step || fulfillment !== "pickup") return step;
  if (status === "confirmed") return { ...step, label: "Đã pha xong" };
  if (status === "shipping") return { ...step, label: "Khách đã lấy" };
  return step;
}

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

/** "09:05 21/10/2026" (giờ Việt Nam) */
export function formatDateTime(iso: string) {
  const { year, month, day, hour, minute } = vnParts(new Date(iso));
  return `${hour}:${minute} ${day}/${month}/${year}`;
}

/** "14:05" — kèm ngày "14:05 · 19/10" khi khác ngày với `base` (VD đơn đặt tối, sáng hôm sau mới giao) */
export function formatStepTime(iso: string, base?: string) {
  const d = new Date(iso);
  const { month, day, hour, minute } = vnParts(d);
  const time = `${hour}:${minute}`;
  if (!base || vnDate(new Date(base)) === vnDate(d)) return time;
  return `${time} · ${day}/${month}`;
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
 * Giờ dự kiến (chỉ khi đơn chưa xong / chưa huỷ):
 * - Có hẹn giờ → đúng giờ hẹn
 * - Đến quán lấy: (giờ xác nhận, chưa có thì giờ đặt) + pha chế; đã pha xong thì không cần dự kiến nữa
 * - Giao tận nơi, chờ xác nhận / đã xác nhận: (giờ xác nhận hoặc giờ đặt) + pha chế + giao
 * - Giao tận nơi, đang giao: giờ bắt đầu giao + thời gian giao
 */
export function estimateDelivery(
  order: Pick<Order, "status" | "createdAt" | "confirmedAt" | "shippingAt" | "fulfillment" | "scheduledAt">,
  settings: Pick<ShopSettings, "prepMinutes" | "deliveryMinutes">,
): Date | null {
  const minutes = 60_000;
  if (order.status === "completed" || order.status === "cancelled") return null;
  const pickup = order.fulfillment === "pickup";
  if (pickup && order.status === "shipping") return null;
  if (order.scheduledAt) return new Date(order.scheduledAt);
  if (order.status === "shipping" && order.shippingAt) return new Date(new Date(order.shippingAt).getTime() + settings.deliveryMinutes * minutes);
  const from = new Date(order.confirmedAt ?? order.createdAt).getTime();
  return new Date(from + (settings.prepMinutes + (pickup ? 0 : settings.deliveryMinutes)) * minutes);
}

/* ================= Hẹn giờ nhận ================= */


/** Giờ hẹn: "15:00 hôm nay", "15:00 ngày mai", ngày khác thì "15:00 · 22/10" */
export function formatScheduled(iso: string, now = new Date()) {
  const d = new Date(iso);
  const { hour, minute } = vnParts(d);
  const time = `${hour}:${minute}`;
  const day = vnDate(d);
  if (day === vnDate(now)) return `${time} hôm nay`;
  if (day === vnDate(new Date(now.getTime() + 86_400_000))) return `${time} ngày mai`;
  return `${time} · ${day.slice(8, 10)}/${day.slice(5, 7)}`;
}

const VN_OFFSET = 7 * 60 * 60_000;
const SLOT_MINUTES = 15;

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export interface ScheduleDay {
  key: "today" | "tomorrow";
  label: string;
  slots: { value: string; label: string }[];
}

/**
 * Các giờ hẹn chọn được (mỗi 15 phút) cho hôm nay và ngày mai: trong giờ mở cửa,
 * không sớm hơn thời gian quán cần (pha chế, cộng thời gian giao nếu giao tận nơi). Backend kiểm tra lại.
 */
export function scheduleOptions(
  settings: Pick<ShopSettings, "prepMinutes" | "deliveryMinutes" | "weekdayOpen" | "weekdayClose" | "weekendOpen" | "weekendClose">,
  fulfillment: Fulfillment,
  now = new Date(),
): ScheduleDay[] {
  const lead = settings.prepMinutes + (fulfillment === "delivery" ? settings.deliveryMinutes : 0);
  const earliest = now.getTime() + lead * 60_000;
  const days: ScheduleDay[] = [];
  for (const [key, offset] of [["today", 0], ["tomorrow", 1]] as const) {
    const [y, m, d] = vnDate(new Date(now.getTime() + offset * 86_400_000)).split("-").map(Number);
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const weekend = weekday === 0 || weekday === 6;
    const open = toMinutes(weekend ? settings.weekendOpen : settings.weekdayOpen);
    let close = toMinutes(weekend ? settings.weekendClose : settings.weekdayClose);
    if (close <= open) close = 23 * 60 + 45; // mở qua đêm: chỉ cho hẹn tới trước nửa đêm
    const slots: ScheduleDay["slots"] = [];
    for (let t = Math.ceil(open / SLOT_MINUTES) * SLOT_MINUTES; t <= close; t += SLOT_MINUTES) {
      const at = Date.UTC(y, m - 1, d, Math.floor(t / 60), t % 60) - VN_OFFSET;
      if (at >= earliest) slots.push({ value: new Date(at).toISOString(), label: hhmm(t) });
    }
    if (slots.length) days.push({ key, label: `${key === "today" ? "Hôm nay" : "Ngày mai"} (${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")})`, slots });
  }
  return days;
}
