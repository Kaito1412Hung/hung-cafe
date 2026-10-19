import { api } from "@/lib/api";
import type { Customer, CustomerDetail } from "@/types/customer";
import type { DashboardStats } from "@/types/stats";
import type { Role } from "@/types/user";

export const adminService = {
  async getStats(days: number): Promise<DashboardStats> {
    return (await api<{ data: DashboardStats }>(`/admin/stats?days=${days}`)).data;
  },

  /** Tải file Excel báo cáo doanh thu (trả về file + tên file từ server) */
  async downloadRevenueReport(days: number): Promise<{ blob: Blob; fileName: string }> {
    const res = await fetch(`/api/admin/reports/revenue?days=${days}`, { credentials: "include" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message ?? "Không tạo được báo cáo");
    }
    const fileName = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? "bao-cao-doanh-thu.xlsx";
    return { blob: await res.blob(), fileName };
  },

  async getCustomers(params: { search?: string; role?: Role | "all" } = {}): Promise<Customer[]> {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.role && params.role !== "all") query.set("role", params.role);
    const qs = query.toString();
    return (await api<{ data: Customer[] }>(`/admin/customers${qs ? `?${qs}` : ""}`)).data;
  },

  async getCustomer(id: number): Promise<CustomerDetail> {
    return (await api<{ data: CustomerDetail }>(`/admin/customers/${id}`)).data;
  },

  async changeRole(id: number, role: Role): Promise<CustomerDetail> {
    return (await api<{ data: CustomerDetail }>(`/admin/customers/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) })).data;
  },

  /** Tạo mật khẩu tạm cho khách (chỉ hiện 1 lần) */
  async resetPassword(id: number): Promise<{ email: string; temporaryPassword: string }> {
    return (await api<{ data: { email: string; temporaryPassword: string } }>(`/admin/customers/${id}/reset-password`, { method: "POST" })).data;
  },

  async deleteCustomer(id: number): Promise<void> {
    await api(`/admin/customers/${id}`, { method: "DELETE" });
  },
};
