"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CircleCheckBig, Loader2, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { EmptyCart } from "@/components/cart/EmptyCart";
import { useAuth } from "@/context/AuthContext";
import { formatDateTime, formatOrderCode } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { orderService } from "@/services/orderService";
import type { Order } from "@/types/order";
import { OrderItemsList } from "./OrderItemsList";
import { OrderProgress } from "./OrderProgress";
import { OrderStatusBadge } from "./OrderStatusBadge";

export function MyOrders() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const newOrderId = Number(useSearchParams().get("new")) || null;

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [cancelling, setCancelling] = useState<Order | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    orderService
      .getMine()
      .then((data) => !cancelled && setOrders(data))
      .catch((err: Error) => {
        if (cancelled) return;
        toast(err.message, "error");
        setOrders([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user, toast]);

  const handleCancel = async () => {
    if (!cancelling) return;
    setSubmitting(true);
    try {
      const updated = await orderService.cancelMine(cancelling.id);
      setOrders((prev) => prev?.map((o) => (o.id === updated.id ? updated : o)) ?? null);
      toast(`Đã huỷ đơn ${formatOrderCode(updated.id)}`, "info");
      setCancelling(null);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  let content;
  if (authLoading || (user && orders === null)) {
    content = (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-coffee-400" />
      </div>
    );
  } else if (!user) {
    content = (
      <EmptyCart title="Bạn chưa đăng nhập" description="Đăng nhập để xem lịch sử đơn hàng." action={{ href: "/login?next=/orders", label: "Đăng nhập" }} />
    );
  } else if (!orders || orders.length === 0) {
    content = <EmptyCart title="Chưa có đơn hàng nào" description="Đặt món đầu tiên của bạn ngay hôm nay nhé!" action={{ href: "/menu", label: "Xem thực đơn" }} />;
  } else {
    content = (
      <div className="space-y-6">
        {orders.map((order) => (
          <article
            key={order.id}
            className={cn(
              "rounded-3xl bg-white p-5 shadow-sm ring-1 ring-coffee-100 sm:p-6",
              order.id === newOrderId && "ring-2 ring-emerald-400",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-semibold text-coffee-950">Đơn {formatOrderCode(order.id)}</p>
                <p className="text-sm text-coffee-500">Đặt lúc {formatDateTime(order.createdAt)}</p>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>

            <div className="mt-6">
              <OrderProgress status={order.status} />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
              <OrderItemsList order={order} />
              <div className="h-fit space-y-2 rounded-2xl bg-coffee-50 p-4 text-sm text-coffee-800">
                <p className="font-semibold text-coffee-950">{order.customerName}</p>
                <p className="flex gap-2">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-coffee-500" /> {order.phone}
                </p>
                <p className="flex gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-coffee-500" /> {order.address}
                </p>
                {order.note && <p className="border-t border-coffee-200 pt-2 italic text-coffee-600">&ldquo;{order.note}&rdquo;</p>}
              </div>
            </div>

            {order.status === "pending" && (
              <div className="mt-5 flex justify-end border-t border-coffee-100 pt-4">
                <Button variant="outline" size="sm" onClick={() => setCancelling(order)}>
                  Huỷ đơn
                </Button>
              </div>
            )}
          </article>
        ))}
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
      <h1 className="font-display text-4xl font-bold tracking-tight text-coffee-950 sm:text-5xl">Đơn hàng của tôi</h1>

      {newOrderId && orders?.some((o) => o.id === newOrderId) && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-800 ring-1 ring-emerald-600/15">
          <CircleCheckBig className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">
            <strong>Đặt hàng thành công!</strong> Quán sẽ gọi cho bạn để xác nhận đơn {formatOrderCode(newOrderId)} trong ít phút.
          </p>
        </div>
      )}

      <div className="mt-8">{content}</div>

      <Modal
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        size="sm"
        title="Huỷ đơn hàng?"
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelling(null)} disabled={submitting}>
              Không
            </Button>
            <Button variant="danger" onClick={handleCancel} loading={submitting}>
              Huỷ đơn
            </Button>
          </>
        }
      >
        <p className="text-sm text-coffee-700">Bạn chắc chắn muốn huỷ đơn {cancelling && formatOrderCode(cancelling.id)}?</p>
      </Modal>
    </section>
  );
}
