import type { OrderStatus } from "./order";

interface Comparison {
  current: number;
  previous: number;
}

export interface DashboardStats {
  days: number;
  revenue: Comparison;
  orders: Comparison;
  newCustomers: Comparison;
  totalCustomers: number;
  averageOrderValue: number;
  pendingOrders: number;
  daily: { date: string; revenue: number; orders: number }[];
  topProducts: { name: string; image: string; quantity: number; revenue: number }[];
  recentOrders: { id: number; customerName: string; total: number; status: OrderStatus; createdAt: string }[];
  lowStock: { id: number; name: string; image: string; stock: number; isAvailable: boolean }[];
  statusCounts: Partial<Record<OrderStatus, number>>;
}
