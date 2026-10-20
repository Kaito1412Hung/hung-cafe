import type { ItemOptions, Topping } from "@/lib/options";

export type OrderStatus = "pending" | "confirmed" | "shipping" | "completed" | "cancelled";

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
}

export interface OrderSummary {
  counts: Record<OrderStatus, number>;
  total: number;
  /** Doanh thu từ các đơn đã hoàn thành */
  revenue: number;
}
