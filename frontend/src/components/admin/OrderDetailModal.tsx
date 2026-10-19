"use client";

import { useState } from "react";
import { ArrowRight, Mail, MapPin, Phone, Printer, StickyNote, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { OrderItemsList } from "@/components/order/OrderItemsList";
import { OrderProgress } from "@/components/order/OrderProgress";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { CancelReasonPicker } from "@/components/order/CancelReasonPicker";
import { ADMIN_CANCEL_REASONS, CANCELLABLE, NEXT_STEP, formatDateTime, formatOrderCode } from "@/lib/orders";
import type { Order, OrderStatus } from "@/types/order";

interface OrderDetailModalProps {
  order: Order | null;
  onClose: () => void;
  onChangeStatus: (order: Order, status: OrderStatus, reason?: string) => Promise<void>;
}

export function OrderDetailModal({ order, onClose, onChangeStatus }: OrderDetailModalProps) {
  const [busy, setBusy] = useState<OrderStatus | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [reason, setReason] = useState("");

  if (!order) return null;

  const next = NEXT_STEP[order.status];
  const canCancel = CANCELLABLE.includes(order.status);

  const change = async (status: OrderStatus) => {
    setBusy(status);
    try {
      await onChangeStatus(order, status, status === "cancelled" ? reason : undefined);
      setConfirmCancel(false);
      setReason("");
    } finally {
      setBusy(null);
    }
  };

  const close = () => {
    setConfirmCancel(false);
    setReason("");
    onClose();
  };

  return (
    <Modal
      open
      onClose={close}
      size="lg"
      title={`Đơn ${formatOrderCode(order.id)}`}
      description={`Đặt lúc ${formatDateTime(order.createdAt)} · Cập nhật ${formatDateTime(order.updatedAt)}`}
      footer={
        confirmCancel ? (
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-red-700">Khách sẽ nhận được thông báo kèm lý do. Tồn kho được hoàn lại.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmCancel(false)} disabled={busy !== null}>
                Không
              </Button>
              <Button variant="danger" onClick={() => change("cancelled")} loading={busy === "cancelled"} disabled={reason.length < 3}>
                Xác nhận huỷ
              </Button>
            </div>
          </div>
        ) : (
          <>
            {canCancel && (
              <Button variant="outline" onClick={() => setConfirmCancel(true)} disabled={busy !== null} className="mr-auto text-red-600 hover:bg-red-50">
                <X className="h-4 w-4" /> Huỷ đơn
              </Button>
            )}
            {next ? (
              <Button onClick={() => change(next.status)} loading={busy === next.status}>
                {next.label} <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="outline" onClick={close}>
                Đóng
              </Button>
            )}
          </>
        )
      }
    >
      <div className="space-y-6">
        {confirmCancel && (
          <div className="rounded-2xl bg-red-50/60 p-4 ring-1 ring-red-200">
            <p className="mb-3 text-sm font-semibold text-red-800">Lý do huỷ đơn (khách sẽ thấy)</p>
            <CancelReasonPicker reasons={ADMIN_CANCEL_REASONS} onChange={setReason} name={`cancel-${order.id}`} />
          </div>
        )}
        {order.cancelReason && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-600/15">
            <strong>Lý do huỷ:</strong> {order.cancelReason}
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-coffee-600">Trạng thái hiện tại</span>
          <OrderStatusBadge status={order.status} />
        </div>
        <OrderProgress status={order.status} />

        <div className="grid gap-3 rounded-2xl bg-coffee-50 p-4 text-sm text-coffee-800 sm:grid-cols-2">
          <p className="font-semibold text-coffee-950 sm:col-span-2">{order.customerName}</p>
          <p className="flex gap-2">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-coffee-500" />
            <a href={`tel:${order.phone}`} className="hover:underline">
              {order.phone}
            </a>
          </p>
          <p className="flex min-w-0 gap-2">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-coffee-500" />
            <span className="truncate">{order.userEmail ?? "Tài khoản đã xoá"}</span>
          </p>
          <p className="flex gap-2 sm:col-span-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-coffee-500" /> {order.address}
          </p>
          {order.note && (
            <p className="flex gap-2 sm:col-span-2">
              <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span className="italic">{order.note}</span>
            </p>
          )}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-coffee-500">Món đã đặt</h3>
            <a
              href={`/admin/orders/${order.id}/invoice`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-coffee-700 ring-1 ring-coffee-200 transition hover:bg-coffee-50"
            >
              <Printer className="h-4 w-4" /> In hoá đơn
            </a>
          </div>
          <OrderItemsList order={order} />
        </div>
      </div>
    </Modal>
  );
}
