"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Clock, PackageCheck, Receipt, Search, Truck, Wallet } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { Pagination } from "@/components/admin/Pagination";
import { OrderDetailModal } from "@/components/admin/OrderDetailModal";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { ORDER_STATUS, ORDER_STATUS_LIST, formatDateTime, formatOrderCode } from "@/lib/orders";
import { cn, formatPrice } from "@/lib/utils";
import { orderService } from "@/services/orderService";
import type { Order, OrderStatus, OrderSummary } from "@/types/order";

const PAGE_SIZE = 8;
type StatusFilter = OrderStatus | "all";

export default function AdminOrdersPage() {
  // useSearchParams() cần được bọc trong Suspense
  return (
    <Suspense>
      <AdminOrders />
    </Suspense>
  );
}

function AdminOrders() {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  // ?order=12 (từ thông báo) → tự mở chi tiết đơn #12
  const orderParam = Number(useSearchParams().get("order")) || null;
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Kết quả gắn với "key" của bộ lọc → biết dữ liệu đang hiển thị có khớp bộ lọc hiện tại không
  const queryKey = `${status}|${debouncedSearch}`;
  const [result, setResult] = useState<{ key: string; orders: Order[]; summary: OrderSummary } | null>(null);
  const loading = result?.key !== queryKey;

  // Gõ tìm kiếm: đợi 350ms ngừng gõ mới gọi API (debounce)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    orderService
      .getAll({ status, search: debouncedSearch })
      .then((res) => !cancelled && setResult({ key: queryKey, orders: res.data, summary: res.summary }))
      .catch((err: Error) => !cancelled && toast(err.message, "error"));
    return () => {
      cancelled = true;
    };
  }, [status, debouncedSearch, queryKey, toast]);

  const orders = useMemo(() => result?.orders ?? [], [result]);
  const summary = result?.summary;
  const selected = orders.find((o) => o.id === (selectedId ?? orderParam)) ?? null;

  const closeDetail = () => {
    setSelectedId(null);
    if (orderParam) router.replace(pathname, { scroll: false });
  };

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = orders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleChangeStatus = async (order: Order, next: OrderStatus, reason = "") => {
    try {
      const updated = await orderService.updateStatus(order.id, next, reason);
      // Cập nhật tại chỗ: thay đơn trong danh sách + chỉnh lại số đếm
      setResult((prev) => {
        if (!prev) return prev;
        const counts = { ...prev.summary.counts, [order.status]: prev.summary.counts[order.status] - 1, [next]: prev.summary.counts[next] + 1 };
        const revenue = prev.summary.revenue + (next === "completed" ? updated.total : 0);
        return { ...prev, orders: prev.orders.map((o) => (o.id === updated.id ? updated : o)), summary: { ...prev.summary, counts, revenue } };
      });
      toast(`${formatOrderCode(order.id)}: ${ORDER_STATUS[next].label}`, next === "cancelled" ? "info" : "success");
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const stats = [
    { label: "Chờ xác nhận", value: summary?.counts.pending, icon: Clock, color: "bg-amber-50 text-amber-600" },
    { label: "Đang xử lý / giao", value: summary ? summary.counts.confirmed + summary.counts.shipping : undefined, icon: Truck, color: "bg-violet-50 text-violet-600" },
    { label: "Hoàn thành", value: summary?.counts.completed, icon: PackageCheck, color: "bg-emerald-50 text-emerald-600" },
    { label: "Doanh thu", value: summary ? formatPrice(summary.revenue) : undefined, icon: Wallet, color: "bg-coffee-100 text-coffee-700" },
  ];

  const tabs: { value: StatusFilter; label: string; count?: number }[] = [
    { value: "all", label: "Tất cả", count: summary?.total },
    ...ORDER_STATUS_LIST.map((s) => ({ value: s, label: ORDER_STATUS[s].label, count: summary?.counts[s] })),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-sm text-coffee-500">Quản lý / Đơn hàng</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-coffee-950">Đơn hàng</h1>
        <p className="mt-1 text-coffee-600">Xác nhận, giao hàng và theo dõi đơn của khách.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-coffee-100">
            <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm text-coffee-500">{label}</p>
              {value === undefined ? <div className="mt-1.5 h-7 w-16 animate-pulse rounded bg-coffee-100" /> : <p className="mt-0.5 text-2xl font-bold text-coffee-950">{value}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-coffee-100">
        <div className="space-y-3 border-b border-coffee-100 p-4">
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
            {tabs.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setStatus(t.value);
                  setPage(1);
                }}
                className={cn(
                  "flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition",
                  status === t.value ? "bg-coffee-900 text-cream" : "text-coffee-600 hover:bg-coffee-100",
                )}
              >
                {t.label}
                {t.count !== undefined && (
                  <span className={cn("rounded-md px-1.5 text-xs", status === t.value ? "bg-coffee-700" : "bg-coffee-100 text-coffee-700")}>{t.count}</span>
                )}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo mã đơn, tên khách hoặc số điện thoại..."
              className="h-11 w-full rounded-xl border border-coffee-200 bg-coffee-50/50 pl-10 pr-4 text-sm focus:border-coffee-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-coffee-200/60"
            />
          </div>
        </div>

        {!loading && orders.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-20 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-coffee-100">
              <Receipt className="h-8 w-8 text-coffee-500" />
            </span>
            <p className="mt-4 font-display text-lg font-semibold text-coffee-950">Không có đơn hàng nào</p>
            <p className="mt-1 text-sm text-coffee-500">Thử đổi bộ lọc hoặc từ khoá tìm kiếm.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-coffee-100 text-xs font-semibold uppercase tracking-wider text-coffee-500">
                  <th className="px-6 py-3.5">Mã đơn</th>
                  <th className="px-4 py-3.5">Khách hàng</th>
                  <th className="px-4 py-3.5">Món</th>
                  <th className="px-4 py-3.5">Tổng tiền</th>
                  <th className="px-4 py-3.5">Trạng thái</th>
                  <th className="px-4 py-3.5">Thời gian</th>
                  <th className="px-6 py-3.5 text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100/70">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-5">
                            <div className="h-4 w-20 rounded bg-coffee-100" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : paginated.map((o) => {
                      const qty = o.items.reduce((s, i) => s + i.quantity, 0);
                      return (
                        <tr key={o.id} onClick={() => setSelectedId(o.id)} className="cursor-pointer transition hover:bg-coffee-50/60">
                          <td className="px-6 py-4 font-mono text-sm font-semibold text-coffee-950">{formatOrderCode(o.id)}</td>
                          <td className="px-4 py-4">
                            <p className="font-medium text-coffee-950">{o.customerName}</p>
                            <p className="text-xs text-coffee-500">{o.phone}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm text-coffee-800">{qty} món</p>
                            <p className="max-w-52 truncate text-xs text-coffee-500">{o.items.map((i) => i.name).join(", ")}</p>
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold text-coffee-950">{formatPrice(o.total)}</td>
                          <td className="px-4 py-4">
                            <OrderStatusBadge status={o.status} />
                          </td>
                          <td className="px-4 py-4 text-sm text-coffee-500">{formatDateTime(o.createdAt)}</td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-medium text-coffee-700 underline-offset-4 hover:underline">Chi tiết</span>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <Pagination page={currentPage} totalPages={totalPages} totalItems={orders.length} pageSize={PAGE_SIZE} onChange={setPage} itemLabel="đơn hàng" />
        )}
      </div>

      <OrderDetailModal order={selected} onClose={closeDetail} onChangeStatus={handleChangeStatus} />
    </div>
  );
}
