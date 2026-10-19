export type NotificationType = "new_order" | "order_cancelled" | "low_stock" | "new_customer";

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}
