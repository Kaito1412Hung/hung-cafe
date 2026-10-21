import type { ItemOptions, Topping } from "@/lib/options";

export type OrderStatus = "pending" | "confirmed" | "shipping" | "completed" | "cancelled";

/** Cách trả tiền: tiền mặt khi nhận / VNPay */
export type PaymentMethod = "cod" | "vnpay";
/** unpaid: COD chưa thu · pending: chờ trả VNPay · paid · refund_pending: cần hoàn tiền · refunded · failed: quá hạn chưa trả */
export type PaymentStatus = "unpaid" | "pending" | "paid" | "refund_pending" | "refunded" | "failed";

export interface OrderItem extends Omit<ItemOptions, "toppings"> {
  /** Topping lúc đặt (tên + giá chụp lại) */
  toppings: Topping[];
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
  /** Mã giảm giá đã dùng ("" = không) và số tiền được giảm */
  couponCode: string;
  discount: number;
  shippingFee: number;
  total: number;
  /** Lý do huỷ (khi đơn bị huỷ) */
  cancelReason: string;
  createdAt: string;
  updatedAt: string;
  /** Giao tận nơi / khách đến quán lấy */
  fulfillment: Fulfillment;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  /** Hạn chót trả tiền VNPay (quá hạn tự huỷ) */
  paymentDeadline: string | null;
  paidAt: string | null;
  /** Giao dịch VNPay thành công (mã giao dịch, ngân hàng) */
  payment: { transactionNo: string; bankCode: string } | null;
  /** Giờ hẹn nhận (null = càng sớm càng tốt) */
  scheduledAt: string | null;
  /** Giờ của từng bước (null = chưa tới bước đó) */
  confirmedAt: string | null;
  shippingAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  items: OrderItem[];
}

export type Fulfillment = "delivery" | "pickup";

export interface CheckoutInput {
  customerName: string;
  phone: string;
  /** Đến quán lấy thì để trống */
  address: string;
  note: string;
  couponCode?: string;
  fulfillment: Fulfillment;
  /** Giờ hẹn (ISO), null = càng sớm càng tốt */
  scheduledAt: string | null;
  paymentMethod: PaymentMethod;
}

export interface OrderSummary {
  counts: Record<OrderStatus, number>;
  total: number;
  /** Doanh thu từ các đơn đã hoàn thành */
  revenue: number;
}
