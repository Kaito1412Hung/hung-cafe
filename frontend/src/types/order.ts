export type OrderStatus = "pending" | "confirmed" | "shipping" | "completed" | "cancelled";

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
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface CheckoutInput {
  customerName: string;
  phone: string;
  address: string;
  note: string;
}

export interface OrderSummary {
  counts: Record<OrderStatus, number>;
  total: number;
  /** Doanh thu từ các đơn đã hoàn thành */
  revenue: number;
}
