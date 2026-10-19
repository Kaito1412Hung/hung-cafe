import { z } from "zod";

export const ORDER_STATUSES = ["pending", "confirmed", "shipping", "completed", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã huỷ",
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

export const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, "Tên người nhận cần ít nhất 2 ký tự").max(100),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s.-]/g, ""))
    .refine((v) => /^(0|\+84)\d{9}$/.test(v), "Số điện thoại không hợp lệ (VD: 0971131945)"),
  address: z.string().trim().min(5, "Địa chỉ cần ít nhất 5 ký tự").max(255, "Địa chỉ tối đa 255 ký tự"),
  note: z.string().trim().max(255, "Ghi chú tối đa 255 ký tự").default(""),
});

export const updateStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES, { error: "Trạng thái không hợp lệ" }),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export interface OrderItem {
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
  shippingFee: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItem[];
}
