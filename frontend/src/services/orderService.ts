import { api } from "@/lib/api";
import type { CheckoutInput, Order, OrderStatus, OrderSummary } from "@/types/order";

export const orderService = {
  /* ----- Khách hàng ----- */
  async checkout(input: CheckoutInput): Promise<Order> {
    return (await api<{ data: Order }>("/orders", { method: "POST", body: JSON.stringify(input) })).data;
  },

  async getMine(): Promise<Order[]> {
    return (await api<{ data: Order[] }>("/orders/my")).data;
  },

  async cancelMine(id: number): Promise<Order> {
    return (await api<{ data: Order }>(`/orders/my/${id}/cancel`, { method: "PATCH" })).data;
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
  async getAll(params: { status?: OrderStatus | "all"; search?: string } = {}) {
    const query = new URLSearchParams();
    if (params.status && params.status !== "all") query.set("status", params.status);
    if (params.search) query.set("search", params.search);
    const qs = query.toString();
    return api<{ data: Order[]; summary: OrderSummary }>(`/orders${qs ? `?${qs}` : ""}`);
  },

  async updateStatus(id: number, status: OrderStatus): Promise<Order> {
    return (await api<{ data: Order }>(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) })).data;
  },
};
