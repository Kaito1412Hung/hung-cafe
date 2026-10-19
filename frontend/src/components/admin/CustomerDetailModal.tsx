"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, Phone, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { formatDateTime, formatOrderCode } from "@/lib/orders";
import { formatDate, formatPrice } from "@/lib/utils";
import { adminService } from "@/services/adminService";
import { ResetPasswordCard } from "./ResetPasswordCard";
import type { Customer, CustomerDetail } from "@/types/customer";

interface CustomerDetailModalProps {
  customerId: number | null;
  currentUserId: number | undefined;
  onClose: () => void;
  onUpdated: (c: Customer) => void;
  onDeleted: (id: number) => void;
}

export function CustomerDetailModal({ customerId, currentUserId, onClose, onUpdated, onDeleted }: CustomerDetailModalProps) {
  const toast = useToast();
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [busy, setBusy] = useState<"role" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Chỉ dùng dữ liệu khớp với khách đang mở (tránh hiện nhầm người trước)
  const data = detail?.id === customerId ? detail : null;
  const isSelf = customerId === currentUserId;

  useEffect(() => {
    if (customerId === null) return;
    let cancelled = false;
    adminService
      .getCustomer(customerId)
      .then((d) => !cancelled && setDetail(d))
      .catch((err: Error) => !cancelled && toast(err.message, "error"));
    return () => {
      cancelled = true;
    };
  }, [customerId, toast]);

  if (customerId === null) return null;

  const close = () => {
    setConfirmDelete(false);
    onClose();
  };

  const toggleRole = async () => {
    if (!data) return;
    setBusy("role");
    try {
      const updated = await adminService.changeRole(data.id, data.role === "admin" ? "customer" : "admin");
      setDetail(updated);
      onUpdated(updated);
      toast(updated.role === "admin" ? `${updated.name} đã thành quản trị viên` : `${updated.name} đã về vai trò khách hàng`);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!data) return;
    setBusy("delete");
    try {
      await adminService.deleteCustomer(data.id);
      toast(`Đã xoá tài khoản ${data.email}`, "info");
      onDeleted(data.id);
      close();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };

  const footer = !data ? undefined : isSelf ? (
    <p className="mr-auto text-sm text-coffee-500">Đây là tài khoản của bạn — đổi thông tin ở trang Cài đặt.</p>
  ) : confirmDelete ? (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-red-700">Xoá vĩnh viễn tài khoản này? Đơn hàng cũ vẫn được giữ lại.</p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={busy !== null}>
          Không
        </Button>
        <Button variant="danger" onClick={handleDelete} loading={busy === "delete"}>
          Xoá tài khoản
        </Button>
      </div>
    </div>
  ) : (
    <>
      <Button
        variant="outline"
        onClick={() => setConfirmDelete(true)}
        disabled={busy !== null || data.role === "admin"}
        title={data.role === "admin" ? "Hạ quyền trước khi xoá" : undefined}
        className="mr-auto text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" /> Xoá
      </Button>
      <Button variant={data.role === "admin" ? "outline" : "primary"} onClick={toggleRole} loading={busy === "role"}>
        {data.role === "admin" ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
        {data.role === "admin" ? "Hạ xuống khách hàng" : "Cấp quyền quản trị"}
      </Button>
    </>
  );

  return (
    <Modal open onClose={close} size="lg" title={data?.name ?? "Đang tải..."} description={data?.email} footer={footer}>
      {!data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-coffee-400" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar user={data} size="lg" tone={data.role === "admin" ? "dark" : "light"} />
            <div className="min-w-0 space-y-1 text-sm text-coffee-700">
              {data.nickname && <p>Tên hiển thị: <strong className="text-coffee-950">{data.nickname}</strong></p>}
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-coffee-400" /> {data.phone || <span className="text-coffee-400">Chưa có số điện thoại</span>}</p>
              <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-coffee-400" /> {data.address || <span className="text-coffee-400">Chưa có địa chỉ</span>}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Vai trò", value: data.role === "admin" ? "Quản trị viên" : "Khách hàng" },
              { label: "Tham gia", value: formatDate(data.createdAt) },
              { label: "Số đơn", value: data.orderCount },
              { label: "Đã chi tiêu", value: formatPrice(data.totalSpent) },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-coffee-50 p-3">
                <p className="text-xs text-coffee-500">{s.label}</p>
                <p className="mt-0.5 font-semibold text-coffee-950">{s.value}</p>
              </div>
            ))}
          </div>

          {!isSelf && <ResetPasswordCard key={data.id} customerId={data.id} email={data.email} />}

          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-coffee-500">Lịch sử đơn hàng</h3>
            {data.orders.length === 0 ? (
              <p className="rounded-xl bg-coffee-50 py-8 text-center text-sm text-coffee-500">Chưa có đơn hàng nào.</p>
            ) : (
              <ul className="divide-y divide-coffee-100 rounded-xl ring-1 ring-coffee-100">
                {data.orders.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-coffee-950">
                        <span className="font-mono">{formatOrderCode(o.id)}</span>
                        <span className="text-coffee-500"> · {o.items.reduce((s, i) => s + i.quantity, 0)} món</span>
                      </p>
                      <p className="text-xs text-coffee-500">{formatDateTime(o.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <OrderStatusBadge status={o.status} />
                      <span className="w-24 text-right text-sm font-semibold tabular-nums text-coffee-950">{formatPrice(o.total)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
