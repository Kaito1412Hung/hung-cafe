"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { reviewService } from "@/services/reviewService";
import type { Review } from "@/types/review";

const LABELS = ["", "Tệ", "Chưa ngon", "Tạm được", "Ngon", "Tuyệt vời!"];

interface ReviewModalProps {
  /** Món cần đánh giá (null = đóng) */
  product: { id: number; name: string } | null;
  /** Đánh giá cũ (nếu có) để sửa lại */
  initial?: { rating: number; comment: string } | null;
  onClose: () => void;
  onSaved: (review: Review) => void;
}

/** Cha truyền `key` theo món để form reset khi đổi món */
export function ReviewModal({ product, initial, onClose, onSaved }: ReviewModalProps) {
  const toast = useToast();
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const shown = hover || rating;

  const handleSave = async () => {
    if (!product || rating === 0) return;
    setSaving(true);
    try {
      const saved = await reviewService.save(product.id, rating, comment.trim());
      toast(initial ? "Đã cập nhật đánh giá" : "Cảm ơn bạn đã đánh giá! ⭐");
      onSaved(saved);
      onClose();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={product !== null}
      onClose={onClose}
      size="sm"
      title={initial ? "Sửa đánh giá" : "Đánh giá món"}
      description={product?.name}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Huỷ
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={rating === 0}>
            Gửi đánh giá
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Số sao">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={rating === i}
                aria-label={`${i} sao`}
                onClick={() => setRating(i)}
                onMouseEnter={() => setHover(i)}
                className="cursor-pointer rounded-lg p-1 transition hover:scale-110"
              >
                <Star className={cn("h-9 w-9 transition", i <= shown ? "fill-amber-400 text-amber-400" : "text-coffee-200")} />
              </button>
            ))}
          </div>
          <p className="h-5 text-sm font-medium text-coffee-700">{shown ? LABELS[shown] : "Chạm vào sao để chấm điểm"}</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="review-comment" className="text-sm font-medium text-coffee-800">
            Nhận xét <span className="font-normal text-coffee-500">(không bắt buộc)</span>
          </label>
          <textarea
            id="review-comment"
            value={comment}
            maxLength={500}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Món có hợp khẩu vị không? Giao hàng thế nào?..."
            className="min-h-28 w-full resize-none rounded-xl border border-coffee-200 px-3.5 py-2.5 text-sm focus:border-coffee-500 focus:outline-none focus:ring-4 focus:ring-coffee-200/60"
          />
          <p className="text-right text-xs text-coffee-400">{comment.length}/500</p>
        </div>
      </div>
    </Modal>
  );
}
