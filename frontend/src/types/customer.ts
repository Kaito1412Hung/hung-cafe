import type { Order } from "./order";
import type { Role } from "./user";

export interface Customer {
  id: number;
  name: string;
  nickname: string;
  avatar: string;
  phone: string;
  address: string;
  email: string;
  role: Role;
  createdAt: string;
  orderCount: number;
  /** Tổng tiền các đơn đã hoàn thành */
  totalSpent: number;
  lastOrderAt: string | null;
}

export interface CustomerDetail extends Customer {
  orders: Order[];
}
