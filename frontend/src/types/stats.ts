import type { OrderStatus } from "./order";

interface Comparison {
  current: number;
  previous: number;
}

/** N ngày gần nhất, hoặc cả 1 năm */
export type StatsPeriod = { kind: "days"; days: number } | { kind: "year"; year: number };

export interface DashboardStats {
  period: StatsPeriod;
  /** Các năm có đơn hàng (mới nhất trước) */
  years: number[];
  revenue: Comparison;
  orders: Comparison;
  newCustomers: Comparison;
  totalCustomers: number;
  averageOrderValue: number;
  pendingOrders: number;
  /** Biểu đồ: theo ngày ("YYYY-MM-DD") hoặc theo tháng ("YYYY-MM") */
  chart: { unit: "day" | "month"; points: { date: string; revenue: number; orders: number }[] };
  topProducts: { name: string; image: string; quantity: number; revenue: number }[];
  recentOrders: { id: number; customerName: string; total: number; status: OrderStatus; createdAt: string }[];
  lowStock: { id: number; name: string; image: string; stock: number; isAvailable: boolean }[];
  statusCounts: Partial<Record<OrderStatus, number>>;
}
