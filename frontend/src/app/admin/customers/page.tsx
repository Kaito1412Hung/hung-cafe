"use client";

import { useEffect, useState } from "react";
import { Crown, Search, Users } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { Avatar } from "@/components/ui/Avatar";
import { Pagination } from "@/components/admin/Pagination";
import { CustomerDetailModal } from "@/components/admin/CustomerDetailModal";
import { useAuth } from "@/context/AuthContext";
import { formatDateTime } from "@/lib/orders";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { adminService } from "@/services/adminService";
import type { Customer } from "@/types/customer";
import type { Role } from "@/types/user";

const PAGE_SIZE = 10;
type RoleFilter = Role | "all";

export default function AdminCustomersPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [role, setRole] = useState<RoleFilter>("all");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const queryKey = `${role}|${debounced}`;
  const [result, setResult] = useState<{ key: string; customers: Customer[] } | null>(null);
  const loading = result?.key !== queryKey;
  const customers = result?.customers ?? [];

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    adminService
      .getCustomers({ role, search: debounced })
      .then((data) => !cancelled && setResult({ key: queryKey, customers: data }))
      .catch((err: Error) => !cancelled && toast(err.message, "error"));
    return () => {
      cancelled = true;
    };
  }, [role, debounced, queryKey, toast]);

  const totalPages = Math.max(1, Math.ceil(customers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = customers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const updateLocal = (fn: (list: Customer[]) => Customer[]) => setResult((prev) => (prev ? { ...prev, customers: fn(prev.customers) } : prev));

  const tabs: { value: RoleFilter; label: string }[] = [
    { value: "all", label: "Tất cả" },
    { value: "customer", label: "Khách hàng" },
    { value: "admin", label: "Quản trị viên" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-sm text-coffee-500">Quản lý / Khách hàng</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-coffee-950">Khách hàng</h1>
        <p className="mt-1 text-coffee-600">Danh sách tài khoản, lịch sử mua hàng và phân quyền.</p>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-coffee-100">
        <div className="flex flex-col gap-3 border-b border-coffee-100 p-4 lg:flex-row lg:items-center">
          <div className="inline-flex shrink-0 self-start rounded-xl bg-coffee-50 p-1">
            {tabs.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setRole(t.value);
                  setPage(1);
                }}
                className={cn(
                  "cursor-pointer rounded-lg px-3.5 py-1.5 text-sm font-medium transition",
                  role === t.value ? "bg-white text-coffee-950 shadow-sm" : "text-coffee-600 hover:text-coffee-950",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tên, biệt danh, email hoặc SĐT..."
              className="h-11 w-full rounded-xl border border-coffee-200 bg-coffee-50/50 pl-10 pr-4 text-sm focus:border-coffee-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-coffee-200/60"
            />
          </div>
        </div>

        {!loading && customers.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-20 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-coffee-100">
              <Users className="h-8 w-8 text-coffee-500" />
            </span>
            <p className="mt-4 font-display text-lg font-semibold text-coffee-950">Không tìm thấy tài khoản</p>
            <p className="mt-1 text-sm text-coffee-500">Thử từ khoá khác nhé.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-coffee-100 text-xs font-semibold uppercase tracking-wider text-coffee-500">
                  <th className="px-6 py-3.5">Tài khoản</th>
                  <th className="px-4 py-3.5">Vai trò</th>
                  <th className="px-4 py-3.5 text-right">Số đơn</th>
                  <th className="px-4 py-3.5 text-right">Đã chi tiêu</th>
                  <th className="px-4 py-3.5">Đơn gần nhất</th>
                  <th className="px-6 py-3.5">Tham gia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100/70">
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-4 py-5">
                            <div className="h-4 w-20 rounded bg-coffee-100" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : paginated.map((c) => (
                      <tr key={c.id} onClick={() => setSelectedId(c.id)} className="cursor-pointer transition hover:bg-coffee-50/60">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar user={c} tone={c.role === "admin" ? "dark" : "light"} />
                            <div className="min-w-0">
                              <p className="font-medium text-coffee-950">
                                {c.name} {c.id === user?.id && <span className="text-xs font-normal text-coffee-500">(Bạn)</span>}
                                {c.nickname && c.nickname !== c.name && <span className="ml-1 text-xs font-normal text-coffee-500">“{c.nickname}”</span>}
                              </p>
                              <p className="truncate text-xs text-coffee-500">{c.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          {c.role === "admin" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-coffee-900 px-2.5 py-0.5 text-xs font-medium text-cream">
                              <Crown className="h-3 w-3" /> Quản trị viên
                            </span>
                          ) : (
                            <span className="rounded-full bg-coffee-100 px-2.5 py-0.5 text-xs font-medium text-coffee-800">Khách hàng</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm tabular-nums text-coffee-950">{c.orderCount}</td>
                        <td className="px-4 py-3.5 text-right text-sm font-semibold tabular-nums text-coffee-950">{formatPrice(c.totalSpent)}</td>
                        <td className="px-4 py-3.5 text-sm text-coffee-500">{c.lastOrderAt ? formatDateTime(c.lastOrderAt) : "—"}</td>
                        <td className="px-6 py-3.5 text-sm text-coffee-500">{formatDate(c.createdAt)}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && customers.length > 0 && (
          <Pagination page={currentPage} totalPages={totalPages} totalItems={customers.length} pageSize={PAGE_SIZE} onChange={setPage} itemLabel="tài khoản" />
        )}
      </div>

      <CustomerDetailModal
        customerId={selectedId}
        currentUserId={user?.id}
        onClose={() => setSelectedId(null)}
        onUpdated={(updated) => updateLocal((list) => list.map((c) => (c.id === updated.id ? { ...c, role: updated.role } : c)))}
        onDeleted={(id) => updateLocal((list) => list.filter((c) => c.id !== id))}
      />
    </div>
  );
}
