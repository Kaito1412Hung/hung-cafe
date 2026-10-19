"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, MessageSquareText, PenLine, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button, buttonClass } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Stars } from "@/components/ui/Stars";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { formatDateTime } from "@/lib/orders";
import { reviewService } from "@/services/reviewService";
import type { ProductReviews as Data, Review } from "@/types/review";
import { ReviewModal } from "./ReviewModal";

/** Khu "Đánh giá" ở trang chi tiết món: điểm trung bình, tỉ lệ từng mức sao, danh sách nhận xét */
export function ProductReviews({ productId, productName, slug }: { productId: number; productName: string; slug: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<Data | null>(null);
  const [writing, setWriting] = useState(false);
  const [deleting, setDeleting] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => reviewService.getByProduct(productId).then(setData), [productId]);

  // Tải lại khi đăng nhập / đăng xuất (để biết mình có được đánh giá không)
  useEffect(() => {
    load().catch(() => setData(null));
  }, [load, user]);

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await reviewService.remove(deleting.id);
      toast("Đã xoá đánh giá", "info");
      setDeleting(null);
      await load();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-coffee-400" />
      </div>
    );
  }

  const { summary, reviews, canReview, myReview } = data;

  return (
    <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
      {/* Tổng quan điểm */}
      <div className="h-fit rounded-3xl bg-white p-6 shadow-sm ring-1 ring-coffee-100">
        {summary.count > 0 ? (
          <>
            <div className="flex items-end gap-3">
              <span className="font-display text-5xl font-bold text-coffee-950">{summary.average?.toFixed(1)}</span>
              <div className="pb-1.5">
                <Stars value={summary.average ?? 0} />
                <p className="mt-0.5 text-sm text-coffee-500">{summary.count} đánh giá</p>
              </div>
            </div>
            <ul className="mt-5 space-y-1.5">
              {([5, 4, 3, 2, 1] as const).map((star) => {
                const n = summary.breakdown[star];
                return (
                  <li key={star} className="flex items-center gap-2 text-xs text-coffee-600">
                    <span className="w-6 shrink-0 text-right">{star}★</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-coffee-100">
                      <span className="block h-full rounded-full bg-amber-400" style={{ width: `${(n / summary.count) * 100}%` }} />
                    </span>
                    <span className="w-6 shrink-0">{n}</span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="text-sm text-coffee-600">Chưa có đánh giá nào cho món này.</p>
        )}

        <div className="mt-6 border-t border-coffee-100 pt-5">
          {canReview ? (
            <Button className="w-full" onClick={() => setWriting(true)}>
              <PenLine className="h-4 w-4" /> {myReview ? "Sửa đánh giá của bạn" : "Viết đánh giá"}
            </Button>
          ) : user ? (
            <p className="text-xs leading-relaxed text-coffee-500">Bạn có thể đánh giá sau khi nhận món này (đơn ở trạng thái “Hoàn thành”).</p>
          ) : (
            <Link href={`/login?next=${encodeURIComponent(`/menu/${slug}#danh-gia`)}`} className={buttonClass("outline", "md", "w-full")}>
              Đăng nhập để đánh giá
            </Link>
          )}
        </div>
      </div>

      {/* Danh sách nhận xét */}
      <div>
        {reviews.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-coffee-200 px-6 py-12 text-center">
            <MessageSquareText className="h-10 w-10 text-coffee-300" />
            <p className="mt-3 font-medium text-coffee-800">Hãy là người đầu tiên đánh giá {productName}!</p>
          </div>
        ) : (
          <ul className="divide-y divide-coffee-100 rounded-3xl bg-white px-6 shadow-sm ring-1 ring-coffee-100">
            {reviews.map((r) => (
              <li key={r.id} className="flex gap-4 py-5">
                <Avatar user={{ name: r.authorName, nickname: "", avatar: r.authorAvatar }} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-coffee-950">
                      {r.authorName}
                      {r.userId === user?.id && <span className="ml-2 rounded-full bg-coffee-100 px-2 py-0.5 text-xs font-medium text-coffee-700">Bạn</span>}
                    </p>
                    <span className="text-xs text-coffee-400">{formatDateTime(r.updatedAt)}</span>
                  </div>
                  <Stars value={r.rating} size="xs" className="mt-1" />
                  {r.comment && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-coffee-800">{r.comment}</p>}
                  {/* Người viết hoặc admin được xoá */}
                  {(r.userId === user?.id || user?.role === "admin") && (
                    <button onClick={() => setDeleting(r)} className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs text-coffee-400 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" /> Xoá
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ReviewModal
        key={writing ? "open" : "closed"}
        product={writing ? { id: productId, name: productName } : null}
        initial={myReview}
        onClose={() => setWriting(false)}
        onSaved={() => load()}
      />

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        size="sm"
        title="Xoá đánh giá này?"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={busy}>
              Huỷ
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={busy}>
              Xoá
            </Button>
          </>
        }
      >
        <p className="text-sm text-coffee-700">Đánh giá của {deleting?.authorName} sẽ bị xoá vĩnh viễn.</p>
      </Modal>
    </div>
  );
}
