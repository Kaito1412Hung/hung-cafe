import { api } from "@/lib/api";
import type { Customer, CustomerDetail } from "@/types/customer";
import type { DashboardStats } from "@/types/stats";
import type { Role } from "@/types/user";

export const adminService = {
  async getStats(days: number): Promise<DashboardStats> {
    return (await api<{ data: DashboardStats }>(`/admin/stats?days=${days}`)).data;
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

  async deleteCustomer(id: number): Promise<void> {
    await api(`/admin/customers/${id}`, { method: "DELETE" });
  },
};
