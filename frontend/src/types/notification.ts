export type NotificationType =
  | "new_order"
  | "order_cancelled"
  | "low_stock"
  | "new_customer"
  | "password_reset"
  | "contact_message"
  /** Gửi cho khách khi đơn đổi trạng thái */
  | "order_status"
  | "new_review";

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}
