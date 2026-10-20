import { api } from "@/lib/api";
import type { CheckoutInput, Order, OrderStatus, OrderSummary } from "@/types/order";

export const orderService = {
  /* ----- Khách hàng ----- */
  async checkout(input: CheckoutInput): Promise<Order> {
    return (await api<{ data: Order }>("/orders", { method: "POST", body: JSON.stringify(input) })).data;
  },

  /** Đơn của tôi theo từng đợt (nút "Xem thêm"): trả về đơn + tổng số đơn */
  async getMine(limit = 10, offset = 0): Promise<{ data: Order[]; total: number }> {
    return api<{ data: Order[]; total: number }>(`/orders/my?limit=${limit}&offset=${offset}`);
  },

  async cancelMine(id: number, reason = ""): Promise<Order> {
    return (await api<{ data: Order }>(`/orders/my/${id}/cancel`, { method: "PATCH", body: JSON.stringify({ reason }) })).data;
  },

  /** Bỏ lại các món của đơn cũ vào giỏ */
  async reorder(id: number): Promise<{ added: string[]; skipped: string[] }> {
    return (await api<{ data: { added: string[]; skipped: string[] } }>(`/orders/my/${id}/reorder`, { method: "POST" })).data;
  },

  /** Chi tiết 1 đơn (admin xem mọi đơn, khách chỉ xem đơn của mình) */
  async getById(id: number): Promise<Order> {
    return (await api<{ data: Order }>(`/orders/${id}`)).data;
  },

  /* ----- Admin ----- */
  /** Admin: lọc + chia trang ở server */
  async getAll(params: { status?: OrderStatus | "all"; search?: string; page?: number; pageSize?: number } = {}) {
    const query = new URLSearchParams();
    if (params.status && params.status !== "all") query.set("status", params.status);
    if (params.search) query.set("search", params.search);
    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("pageSize", String(params.pageSize));
    const qs = query.toString();
    return api<{ data: Order[]; total: number; summary: OrderSummary }>(`/orders${qs ? `?${qs}` : ""}`);
  },

  /** Huỷ đơn thì bắt buộc kèm lý do (khách sẽ thấy) */
  async updateStatus(id: number, status: OrderStatus, reason = ""): Promise<Order> {
    return (await api<{ data: Order }>(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, reason }) })).data;
  },
};
