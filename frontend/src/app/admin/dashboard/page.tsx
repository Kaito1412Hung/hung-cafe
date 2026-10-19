"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Clock, FileSpreadsheet, PackageX, Receipt, ShoppingBag, UserPlus, Wallet } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { ProductImage } from "@/components/ui/ProductImage";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { useAuth } from "@/context/AuthContext";
import { ORDER_STATUS, ORDER_STATUS_LIST, formatDateTime, formatOrderCode } from "@/lib/orders";
import { cn, formatPrice } from "@/lib/utils";
import { displayName } from "@/lib/user";
import { adminService } from "@/services/adminService";
import type { DashboardStats } from "@/types/stats";

const RANGES = [
  { days: 7, label: "7 ngày" },
  { days: 30, label: "30 ngày" },
  { days: 90, label: "90 ngày" },
];

/** % thay đổi so với kỳ trước */
function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) {
    return <span className="text-xs text-coffee-400">{current > 0 ? "Mới phát sinh kỳ này" : "Chưa có dữ liệu kỳ trước"}</span>;
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  const up = pct >= 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", up ? "text-emerald-700" : "text-red-700")}>
      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {up ? "+" : ""}
      {pct}% <span className="font-normal text-coffee-400">so với kỳ trước</span>
    </span>
  );
}

function Card({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl bg-white p-5 shadow-sm ring-1 ring-coffee-100 sm:p-6", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-coffee-950">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const viewAll = (href: string) => (
  <Link href={href} className="flex items-center gap-1 text-sm font-medium text-coffee-600 hover:text-coffee-950">
    Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
  </Link>
);

export default function AdminDashboardPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [days, setDays] = useState(7);
  const [result, setResult] = useState<{ days: number; stats: DashboardStats } | null>(null);
  const stats = result?.days === days ? result.stats : null;
  const [exporting, setExporting] = useState(false);

  /** Tải file Excel báo cáo cùng khoảng thời gian đang chọn */
  const handleExport = async () => {
    setExporting(true);
    try {
      const { blob, fileName } = await adminService.downloadRevenueReport(days);
      // Tạo link tạm trỏ tới file rồi "bấm" để trình duyệt tải về
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast(`Đã tải ${fileName}`);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    adminService
      .getStats(days)
      .then((s) => !cancelled && setResult({ days, stats: s }))
      .catch((err: Error) => !cancelled && toast(err.message, "error"));
    return () => {
      cancelled = true;
    };
  }, [days, toast]);

  const kpis = stats
    ? [
        { label: "Doanh thu", value: formatPrice(stats.revenue.current), icon: Wallet, color: "bg-coffee-100 text-coffee-700", delta: stats.revenue },
        { label: "Đơn hàng", value: stats.orders.current, icon: Receipt, color: "bg-sky-50 text-sky-600", delta: stats.orders },
        { label: "Khách mới", value: stats.newCustomers.current, icon: UserPlus, color: "bg-violet-50 text-violet-600", delta: stats.newCustomers },
        { label: "Giá trị TB / đơn", value: formatPrice(stats.averageOrderValue), icon: ShoppingBag, color: "bg-amber-50 text-amber-600" },
      ]
    : null;

  const maxQty = Math.max(1, ...(stats?.topProducts.map((p) => p.quantity) ?? [1]));
  const statusTotal = stats ? Object.values(stats.statusCounts).reduce((a, b) => a + (b ?? 0), 0) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Tiêu đề + chọn khoảng thời gian */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-coffee-500">Quản lý / Tổng quan</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-coffee-950">Xin chào, {user ? displayName(user) : ""} 👋</h1>
          <p className="mt-1 text-coffee-600">Tình hình kinh doanh của quán trong {days} ngày gần nhất.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleExport} loading={exporting} className="bg-white">
            {!exporting && <FileSpreadsheet className="h-4 w-4 text-emerald-700" />} Xuất Excel
          </Button>
          <div className="inline-flex self-start rounded-xl bg-white p-1 shadow-sm ring-1 ring-coffee-100 sm:self-auto">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                className={cn(
                  "cursor-pointer whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition",
                  days === r.days ? "bg-coffee-900 text-cream" : "text-coffee-600 hover:bg-coffee-50",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Nhắc việc cần làm */}
      {stats && stats.pendingOrders > 0 && (
        <Link
          href="/admin/orders"
          className="flex items-center gap-3 rounded-2xl bg-amber-50 px-5 py-4 text-amber-900 ring-1 ring-amber-600/20 transition hover:bg-amber-100"
        >
          <Clock className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="flex-1 text-sm">
            Có <strong>{stats.pendingOrders} đơn hàng</strong> đang chờ xác nhận.
          </p>
          <span className="flex items-center gap-1 text-sm font-semibold">
            Xử lý ngay <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      )}

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(kpis ?? Array.from({ length: 4 }, () => null)).map((k, i) =>
          k ? (
            <div key={k.label} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-coffee-100">
              <div className="flex items-center justify-between">
                <p className="text-sm text-coffee-500">{k.label}</p>
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${k.color}`}>
                  <k.icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-coffee-950">{k.value}</p>
              <div className="mt-1 min-h-5">{k.delta ? <Delta {...k.delta} /> : <span className="text-xs text-coffee-400">Tính trên đơn đã hoàn thành</span>}</div>
            </div>
          ) : (
            <div key={i} className="h-[124px] animate-pulse rounded-2xl bg-white ring-1 ring-coffee-100" />
          ),
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Biểu đồ doanh thu */}
        <Card
          title="Doanh thu theo ngày"
          className="xl:col-span-2"
          action={<span className="text-xs text-coffee-400">Chỉ tính đơn đã hoàn thành</span>}
        >
          {stats ? <RevenueChart data={stats.daily} /> : <div className="h-64 animate-pulse rounded-xl bg-coffee-50" />}
        </Card>

        {/* Trạng thái đơn */}
        <Card title="Trạng thái đơn hàng">
          {stats ? (
            statusTotal === 0 ? (
              <p className="py-10 text-center text-sm text-coffee-500">Chưa có đơn nào trong {days} ngày qua.</p>
            ) : (
              <ul className="space-y-3">
                {ORDER_STATUS_LIST.map((s) => {
                  const count = stats.statusCounts[s] ?? 0;
                  return (
                    <li key={s} className="flex items-center justify-between gap-3">
                      <OrderStatusBadge status={s} />
                      <span className="text-sm tabular-nums text-coffee-950">
                        <strong>{count}</strong> <span className="text-coffee-400">({Math.round((count / statusTotal) * 100)}%)</span>
                      </span>
                    </li>
                  );
                })}
                <li className="flex justify-between border-t border-coffee-100 pt-3 text-sm">
                  <span className="text-coffee-600">Tổng</span>
                  <strong className="tabular-nums text-coffee-950">{statusTotal} đơn</strong>
                </li>
              </ul>
            )
          ) : (
            <div className="h-48 animate-pulse rounded-xl bg-coffee-50" />
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Món bán chạy */}
        <Card title="Món bán chạy" action={viewAll("/admin/products")}>
          {stats?.topProducts.length ? (
            <ol className="space-y-4">
              {stats.topProducts.map((p, i) => (
                <li key={p.name} className="flex items-center gap-3">
                  <span className="w-4 text-sm font-semibold text-coffee-400">{i + 1}</span>
                  <ProductImage src={p.image} alt={p.name} className="h-10 w-10 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium text-coffee-950">{p.name}</p>
                      <span className="shrink-0 text-xs tabular-nums text-coffee-600">{p.quantity} ly</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-coffee-100">
                      <div className="h-full rounded-full bg-coffee-600" style={{ width: `${(p.quantity / maxQty) * 100}%` }} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-10 text-center text-sm text-coffee-500">{stats ? "Chưa có món nào được bán." : "Đang tải..."}</p>
          )}
        </Card>

        {/* Đơn mới */}
        <Card title="Đơn hàng mới" action={viewAll("/admin/orders")}>
          {stats?.recentOrders.length ? (
            <ul className="divide-y divide-coffee-100">
              {stats.recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-coffee-950">
                      <span className="font-mono">{formatOrderCode(o.id)}</span> · {o.customerName}
                    </p>
                    <p className="text-xs text-coffee-500">{formatDateTime(o.createdAt)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-coffee-950">{formatPrice(o.total)}</p>
                    <p className={cn("text-xs", o.status === "cancelled" ? "text-red-600" : "text-coffee-500")}>{ORDER_STATUS[o.status].label}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-sm text-coffee-500">{stats ? "Chưa có đơn hàng." : "Đang tải..."}</p>
          )}
        </Card>

        {/* Sắp hết hàng */}
        <Card title="Sắp hết hàng" action={viewAll("/admin/products")}>
          {stats?.lowStock.length ? (
            <ul className="space-y-3">
              {stats.lowStock.map((p) => (
                <li key={p.id} className="flex items-center gap-3">
                  <ProductImage src={p.image} alt={p.name} className="h-10 w-10 shrink-0 rounded-lg" />
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-coffee-950">{p.name}</p>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
                      p.stock === 0 ? "bg-red-50 text-red-700 ring-red-600/15" : "bg-amber-50 text-amber-700 ring-amber-600/20",
                    )}
                  >
                    {p.stock === 0 && <PackageX className="h-3 w-3" />}
                    {p.stock === 0 ? "Hết hàng" : `Còn ${p.stock}`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-sm text-coffee-500">{stats ? "Tồn kho đều ổn 👍" : "Đang tải..."}</p>
          )}
        </Card>
      </div>

      {stats && (
        <p className="text-center text-xs text-coffee-400">
          Tổng cộng {stats.totalCustomers} khách hàng đã đăng ký ·{" "}
          <Link href="/admin/customers" className="underline-offset-2 hover:underline">
            Xem danh sách khách hàng
          </Link>
        </p>
      )}
    </div>
  );
}
