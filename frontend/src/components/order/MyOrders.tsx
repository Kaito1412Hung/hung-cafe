"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CircleCheckBig, Loader2, MapPin, Phone, RotateCcw, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { EmptyCart } from "@/components/cart/EmptyCart";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { CUSTOMER_CANCEL_REASONS, formatDateTime, formatOrderCode } from "@/lib/orders";
import { ReviewModal } from "@/components/review/ReviewModal";
import { reviewService } from "@/services/reviewService";
import { cn } from "@/lib/utils";
import { orderService } from "@/services/orderService";
import type { Order } from "@/types/order";
import { CancelReasonPicker } from "./CancelReasonPicker";
import { OrderItemsList } from "./OrderItemsList";
import { OrderProgress } from "./OrderProgress";
import { OrderStatusBadge } from "./OrderStatusBadge";

/** Số đơn mỗi lần tải (bấm "Xem thêm" để tải tiếp) */
const PAGE_SIZE = 10;

/** Gộp thêm đơn vào danh sách: bỏ trùng, mới nhất trước */
const mergeOrders = (prev: Order[], more: Order[]) =>
  [...prev, ...more.filter((o) => !prev.some((p) => p.id === o.id))].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);

export function MyOrders() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const newOrderId = Number(useSearchParams().get("new")) || null;

  const { reloadCart, openCart } = useCart();
  const [orders, setOrders] = useState<Order[] | null>(null);
  // Tổng số đơn trên server + số đơn đã tải theo trang (không tính đơn tải riêng từ link thông báo)
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const fetchedLinked = useRef<number | null>(null);
  const [cancelling, setCancelling] = useState<Order | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  // Món đã đánh giá: productId → { số sao, nhận xét }
  const [myRatings, setMyRatings] = useState<Map<number, { rating: number; comment: string }>>(new Map());
  const [reviewing, setReviewing] = useState<{ id: number; name: string } | null>(null);
  const [reordering, setReordering] = useState<number | null>(null);
  // Đơn được nhắc tới trong link thông báo (/orders#don-12) → làm nổi bật
  const [focusId, setFocusId] = useState<number | null>(null);

  // Cuộn tới đơn trong link (#don-12) khi danh sách đã tải xong / khi bấm thông báo khác
  useEffect(() => {
    if (!orders) return;
    const focusFromHash = () => {
      const id = Number(window.location.hash.match(/^#don-(\d+)$/)?.[1]);
      if (!id) return;
      setFocusId(id);
      // Đơn cũ chưa nằm trong các đơn đã tải → lấy riêng đơn đó rồi chèn vào danh sách (effect chạy lại sẽ cuộn tới)
      if (!orders.some((o) => o.id === id)) {
        if (fetchedLinked.current === id) return;
        fetchedLinked.current = id;
        orderService
          .getById(id)
          .then((o) => setOrders((prev) => mergeOrders(prev ?? [], [o])))
          .catch(() => {});
        return;
      }
      requestAnimationFrame(() => document.getElementById(`don-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    };
    const t = setTimeout(focusFromHash, 0);
    window.addEventListener("hashchange", focusFromHash);
    return () => {
      clearTimeout(t);
      window.removeEventListener("hashchange", focusFromHash);
    };
  }, [orders]);

  const handleReorder = async (order: Order) => {
    setReordering(order.id);
    try {
      const { added, skipped } = await orderService.reorder(order.id);
      await reloadCart();
      openCart();
      toast(`Đã thêm ${added.length} món của đơn ${formatOrderCode(order.id)} vào giỏ`);
      if (skipped.length) toast(`Tạm hết, chưa thêm được: ${skipped.join(", ")}`, "info");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setReordering(null);
    }
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    reviewService
      .getMine()
      .then((list) => !cancelled && setMyRatings(new Map(list.map((r) => [r.productId, { rating: r.rating, comment: r.comment }]))))
      .catch(() => {});
    orderService
      .getMine(PAGE_SIZE, 0)
      .then((res) => {
        if (cancelled) return;
        setOrders(res.data);
        setTotal(res.total);
        setLoaded(res.data.length);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        toast(err.message, "error");
        setOrders([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user, toast]);

  /** Tải thêm PAGE_SIZE đơn cũ hơn */
  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await orderService.getMine(PAGE_SIZE, loaded);
      setOrders((prev) => mergeOrders(prev ?? [], res.data));
      setTotal(res.total);
      setLoaded((n) => n + res.data.length);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelling) return;
    setSubmitting(true);
    try {
      const updated = await orderService.cancelMine(cancelling.id, cancelReason);
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
            id={`don-${order.id}`}
            className={cn(
              "scroll-mt-24 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-coffee-100 transition sm:p-6",
              (order.id === newOrderId || order.id === focusId) && "ring-2 ring-emerald-400",
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

            {order.status === "cancelled" && order.cancelReason && (
              <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-600/15">
                <strong>Lý do huỷ:</strong> {order.cancelReason}
              </p>
            )}

            {/* Đơn đã nhận → mời đánh giá từng món (mỗi món 1 lần, bấm lại để sửa) */}
            {order.status === "completed" && (
              <div className="mt-5 rounded-2xl bg-amber-50/60 p-4 ring-1 ring-amber-600/10">
                <p className="text-sm font-semibold text-coffee-900">Đánh giá món đã nhận</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {order.items
                    .filter((item, i, arr) => item.productId && arr.findIndex((x) => x.productId === item.productId) === i)
                    .map((item) => {
                      const rated = myRatings.get(item.productId!);
                      return (
                        <button
                          key={item.productId}
                          onClick={() => setReviewing({ id: item.productId!, name: item.name })}
                          className={cn(
                            "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition",
                            rated ? "bg-white text-coffee-700 ring-coffee-200 hover:bg-coffee-50" : "bg-coffee-900 text-cream ring-coffee-900 hover:bg-coffee-700",
                          )}
                        >
                          <Star className={cn("h-4 w-4", rated ? "fill-amber-400 text-amber-400" : "")} />
                          {item.name}
                          {rated ? <span className="text-coffee-500">· {rated.rating}★ (sửa)</span> : ""}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {(order.status === "pending" || order.status === "completed" || order.status === "cancelled") && (
              <div className="mt-5 flex justify-end gap-2 border-t border-coffee-100 pt-4">
                {order.status === "pending" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCancelReason("");
                      setCancelling(order);
                    }}
                  >
                    Huỷ đơn
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => handleReorder(order)} loading={reordering === order.id} disabled={reordering !== null}>
                    {reordering !== order.id && <RotateCcw className="h-4 w-4" />} Mua lại
                  </Button>
                )}
              </div>
            )}
          </article>
        ))}

        {/* Còn đơn cũ hơn trên server → nút tải tiếp */}
        {loaded < total && (
          <div className="flex flex-col items-center gap-1 pt-2">
            <Button variant="outline" onClick={loadMore} loading={loadingMore} className="min-w-56 rounded-full">
              Xem thêm đơn cũ hơn
            </Button>
            <p className="text-xs text-coffee-500">
              Đang hiện {loaded} / {total} đơn
            </p>
          </div>
        )}
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

      <ReviewModal
        key={reviewing?.id ?? 0}
        product={reviewing}
        initial={reviewing ? (myRatings.get(reviewing.id) ?? null) : null}
        onClose={() => setReviewing(null)}
        onSaved={(r) => setMyRatings((prev) => new Map(prev).set(r.productId, { rating: r.rating, comment: r.comment }))}
      />

      <Modal
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        size="sm"
        title="Huỷ đơn hàng?"
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelling(null)} disabled={submitting}>
              Không huỷ
            </Button>
            <Button variant="danger" onClick={handleCancel} loading={submitting}>
              Huỷ đơn
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-coffee-700">
          Bạn chắc chắn muốn huỷ đơn {cancelling && formatOrderCode(cancelling.id)}? Cho quán biết lý do nhé (không bắt buộc):
        </p>
        <CancelReasonPicker key={cancelling?.id} reasons={CUSTOMER_CANCEL_REASONS} onChange={setCancelReason} name="customer-cancel" />
      </Modal>
    </section>
  );
}
