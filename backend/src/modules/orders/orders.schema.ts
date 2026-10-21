import { z } from "zod";
import type { ItemOptions, ToppingSnapshot } from "../cart/options";

export const ORDER_STATUSES = ["pending", "confirmed", "shipping", "completed", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã huỷ",
};

/** Hình thức nhận: giao tận nơi hoặc khách đến quán lấy */
export const FULFILLMENTS = ["delivery", "pickup"] as const;
export type Fulfillment = (typeof FULFILLMENTS)[number];

/** Cách trả tiền: tiền mặt khi nhận / VNPay */
export const PAYMENT_METHODS = ["cod", "vnpay"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
/** unpaid: COD chưa thu · pending: chờ trả VNPay · paid · refund_pending: đã trả nhưng đơn bị huỷ · refunded · failed: quá hạn chưa trả */
export type PaymentStatus = "unpaid" | "pending" | "paid" | "refund_pending" | "refunded" | "failed";

/** Đơn "đến quán lấy" thì bước "shipping" nghĩa là đã pha xong, chờ khách tới lấy */
export const PICKUP_STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
  shipping: "Chờ khách lấy",
  completed: "Khách đã lấy",
};

/**
 * Trạng thái được phép chuyển tới (máy trạng thái).
 * pending → confirmed → shipping → completed; huỷ được khi chưa giao.
 */
export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipping", "cancelled"],
  shipping: ["completed"],
  completed: [],
  cancelled: [],
};

export const checkoutSchema = z
  .object({
    customerName: z.string().trim().min(2, "Tên người nhận cần ít nhất 2 ký tự").max(100),
    phone: z
      .string()
      .trim()
      .transform((v) => v.replace(/[\s.-]/g, ""))
      .refine((v) => /^(0|\+84)\d{9}$/.test(v), "Số điện thoại không hợp lệ (VD: 0971131945)"),
    /** Đến quán lấy thì không cần địa chỉ */
    fulfillment: z.enum(FULFILLMENTS, { error: "Hình thức nhận không hợp lệ" }).default("delivery"),
    address: z.string().trim().max(255, "Địa chỉ tối đa 255 ký tự").default(""),
    note: z.string().trim().max(255, "Ghi chú tối đa 255 ký tự").default(""),
    /** Mã giảm giá (không bắt buộc) */
    couponCode: z.string().trim().toUpperCase().max(30).default(""),
    /** Thanh toán khi nhận hàng (mặc định) hoặc VNPay */
    paymentMethod: z.enum(PAYMENT_METHODS, { error: "Cách thanh toán không hợp lệ" }).default("cod"),
    /** Giờ hẹn nhận (ISO), không gửi / null = càng sớm càng tốt. Giờ hợp lệ hay không do orders.service kiểm tra */
    scheduledAt: z.iso.datetime({ offset: true, error: "Giờ hẹn không hợp lệ" }).nullable().default(null),
  })
  .refine((v) => v.fulfillment === "pickup" || v.address.length >= 5, { path: ["address"], message: "Địa chỉ cần ít nhất 5 ký tự" })
  .transform((v) => ({ ...v, address: v.fulfillment === "pickup" ? "" : v.address }));

const cancelReason = z.string().trim().max(255, "Lý do tối đa 255 ký tự");

export const updateStatusSchema = z
  .object({
    status: z.enum(ORDER_STATUSES, { error: "Trạng thái không hợp lệ" }),
    /** Bắt buộc khi admin huỷ đơn — khách sẽ thấy lý do này */
    reason: cancelReason.default(""),
  })
  .refine((v) => v.status !== "cancelled" || v.reason.length >= 3, { path: ["reason"], message: "Vui lòng nhập lý do huỷ đơn" });

// Khách huỷ không bắt buộc gửi lý do (body rỗng cũng được)
export const cancelMineSchema = z.object({ reason: cancelReason.default("") }).default({ reason: "" });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export interface OrderItem extends Omit<ItemOptions, "toppings"> {
  /** Topping lúc đặt (tên + giá chụp lại) */
  toppings: ToppingSnapshot[];
  productId: number | null;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: number;
  userId: number | null;
  userEmail: string | null;
  customerName: string;
  phone: string;
  address: string;
  note: string;
  status: OrderStatus;
  subtotal: number;
  /** Mã giảm giá đã dùng ("" = không dùng) và số tiền được giảm */
  couponCode: string;
  discount: number;
  shippingFee: number;
  total: number;
  cancelReason: string;
  createdAt: Date;
  updatedAt: Date;
  fulfillment: Fulfillment;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  /** Hạn chót trả tiền VNPay (quá hạn tự huỷ) */
  paymentDeadline: Date | null;
  paidAt: Date | null;
  /** Lần thanh toán VNPay thành công gần nhất (mã giao dịch, ngân hàng) */
  payment: { transactionNo: string; bankCode: string } | null;
  /** Giờ hẹn nhận (null = càng sớm càng tốt) */
  scheduledAt: Date | null;
  /** Giờ của từng bước (null = chưa tới bước đó) */
  confirmedAt: Date | null;
  shippingAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  items: OrderItem[];
}
