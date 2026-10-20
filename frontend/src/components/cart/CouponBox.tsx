"use client";

import { useEffect, useState } from "react";
import { ChevronRight, TicketPercent } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { couponService } from "@/services/couponService";
import type { AppliedCoupon } from "@/types/coupon";
import { CouponPickerModal } from "./CouponPickerModal";

interface CouponBoxProps {
  applied: AppliedCoupon | null;
  onChange: (coupon: AppliedCoupon | null) => void;
  /** Tạm tính của giỏ — đổi thì đếm lại số mã dùng được */
  subtotal: number;
}

/** Dòng "Chọn mã giảm giá" trong giỏ hàng: bấm vào mở cửa sổ danh sách mã để chọn (không cần gõ) */
export function CouponBox({ applied, onChange, subtotal }: CouponBoxProps) {
  const [open, setOpen] = useState(false);
  const [usableCount, setUsableCount] = useState<number | null>(null);
  // key mới mỗi lần mở → cửa sổ reset lựa chọn theo mã đang áp dụng
  const [openKey, setOpenKey] = useState(0);

  // Đếm số mã dùng được để gợi ý khách ("2 mã dùng được")
  useEffect(() => {
    let cancelled = false;
    couponService
      .available()
      .then((list) => !cancelled && setUsableCount(list.filter((c) => c.eligible).length))
      .catch(() => !cancelled && setUsableCount(null));
    return () => {
      cancelled = true;
    };
  }, [subtotal]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpenKey((k) => k + 1);
          setOpen(true);
        }}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 rounded-2xl p-3.5 text-left ring-1 transition",
          applied ? "bg-emerald-50 ring-emerald-600/20 hover:bg-emerald-100/70" : "bg-white ring-coffee-200 hover:bg-coffee-50",
        )}
      >
        <TicketPercent className={cn("h-5 w-5 shrink-0", applied ? "text-emerald-600" : "text-coffee-500")} />
        <span className="min-w-0 flex-1">
          {applied ? (
            <>
              <span className="block text-sm font-semibold text-emerald-800">
                {applied.code} · −{formatPrice(applied.discount)}
              </span>
              {applied.description && <span className="block truncate text-xs text-emerald-700">{applied.description}</span>}
            </>
          ) : (
            <>
              <span className="block text-sm font-semibold text-coffee-900">Chọn mã giảm giá</span>
              <span className="block text-xs text-coffee-500">
                {usableCount === null ? "Xem các ưu đãi của quán" : usableCount > 0 ? `${usableCount} mã dùng được cho đơn này` : "Chưa có mã dùng được — xem điều kiện"}
              </span>
            </>
          )}
        </span>
        <span className={cn("flex shrink-0 items-center text-xs font-medium", applied ? "text-emerald-700" : "text-coffee-600")}>
          {applied ? "Đổi mã" : ""}
          <ChevronRight className="h-4 w-4" />
        </span>
      </button>

      <CouponPickerModal key={openKey} open={open} applied={applied} onClose={() => setOpen(false)} onApply={onChange} />
    </>
  );
}
