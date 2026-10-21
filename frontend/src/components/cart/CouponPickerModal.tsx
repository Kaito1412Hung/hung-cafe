"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Info, Loader2, TicketPercent, TicketSlash } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { couponService } from "@/services/couponService";
import type { AppliedCoupon, AvailableCoupon } from "@/types/coupon";

/** "15.000đ" → "15K" cho gọn trên tấm vé */
const short = (v: number) => (v % 1000 === 0 ? `${v / 1000}K` : formatPrice(v));

/** Một mã dạng "tấm vé": cuống bên trái ghi mức giảm, bên phải là mô tả + điều kiện */
function Ticket({ coupon, selected, best, onSelect }: { coupon: AvailableCoupon; selected: boolean; best: boolean; onSelect: () => void }) {
  const off = !coupon.eligible;
  return (
    <label
      className={cn(
        "relative flex overflow-hidden rounded-2xl ring-1 transition",
        off ? "cursor-not-allowed opacity-60 ring-coffee-200" : "cursor-pointer hover:ring-coffee-400",
        selected ? "ring-2 ring-emerald-500" : !off && "ring-coffee-200",
      )}
    >
      <input type="radio" name="coupon" checked={selected} disabled={off} onChange={onSelect} className="sr-only" />
      {best && <span className="absolute right-0 top-0 rounded-bl-xl bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">Giảm nhiều nhất</span>}

      {/* Cuống vé */}
      <div
        className={cn(
          "flex w-20 shrink-0 flex-col items-center justify-center border-r-2 border-dashed border-white px-2 text-center",
          off ? "bg-coffee-100 text-coffee-500" : "bg-coffee-900 text-cream",
        )}
      >
        <span className="text-lg font-bold leading-tight">{coupon.type === "percent" ? `${coupon.value}%` : short(coupon.value)}</span>
        <span className="text-[10px] leading-tight opacity-80">{coupon.type === "percent" && coupon.maxDiscount ? `tối đa ${short(coupon.maxDiscount)}` : "giảm"}</span>
      </div>

      <div className="min-w-0 flex-1 bg-white px-3.5 py-3">
        <p className="font-mono text-sm font-bold tracking-wide text-coffee-950">{coupon.code}</p>
        {coupon.description && <p className="mt-0.5 text-xs text-coffee-600">{coupon.description}</p>}
        {off ? (
          <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
            <Info className="h-3.5 w-3.5 shrink-0" /> {coupon.reason}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-coffee-500">
            Đơn này được giảm <strong className="text-emerald-700">{formatPrice(coupon.discount)}</strong>
            {coupon.usageLeft !== null && ` · còn ${coupon.usageLeft} lượt`}
            {coupon.expiresAt && ` · HSD ${formatDate(coupon.expiresAt)}`}
          </p>
        )}
      </div>

      {/* Nút tròn chọn */}
      <span className="flex items-center bg-white pr-3.5">
        <span className={cn("h-5 w-5 rounded-full border-2 transition", selected ? "border-[6px] border-emerald-500" : "border-coffee-300")} />
      </span>
    </label>
  );
}

/** Dòng "Không dùng mã giảm giá": chọn y như chọn một tấm vé (để bỏ mã) */
function NoCouponOption({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-2xl bg-white py-3 pl-3.5 ring-1 transition",
        selected ? "ring-2 ring-emerald-500" : "ring-coffee-200 hover:ring-coffee-400",
      )}
    >
      <input type="radio" name="coupon" checked={selected} onChange={onSelect} className="sr-only" />
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-coffee-100 text-coffee-600">
        <TicketSlash className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-coffee-950">Không dùng mã giảm giá</span>
        <span className="block text-xs text-coffee-500">Thanh toán đúng giá gốc</span>
      </span>
      <span className="pr-3.5">
        <span className={cn("block h-5 w-5 rounded-full border-2 transition", selected ? "border-[6px] border-emerald-500" : "border-coffee-300")} />
      </span>
    </label>
  );
}

interface CouponPickerModalProps {
  open: boolean;
  applied: AppliedCoupon | null;
  onClose: () => void;
  onApply: (coupon: AppliedCoupon | null) => void;
}

/** Cửa sổ "Chọn mã giảm giá": danh sách mã công khai để bấm chọn + ô nhập mã khác (mã quán tặng riêng) */
export function CouponPickerModal({ open, applied, onClose, onApply }: CouponPickerModalProps) {
  const [list, setList] = useState<AvailableCoupon[] | null>(null);
  const [selected, setSelected] = useState<string | null>(applied?.code ?? null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // Mở cửa sổ → tải danh sách mới nhất (giỏ có thể vừa đổi). Chưa chọn mã nào → chọn sẵn mã giảm nhiều nhất
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    couponService
      .available()
      .then((data) => {
        if (cancelled) return;
        setList(data);
        setSelected((prev) => prev ?? data.find((c) => c.eligible)?.code ?? null);
      })
      .catch(() => !cancelled && setList([]));
    return () => {
      cancelled = true;
    };
  }, [open]);

  const eligible = list?.filter((c) => c.eligible) ?? [];
  const notYet = list?.filter((c) => !c.eligible) ?? [];
  const bestCode = eligible[0]?.code;
  const chosen = list?.find((c) => c.code === selected && c.eligible);

  const handleDone = () => {
    onApply(chosen ? { code: chosen.code, description: chosen.description, discount: chosen.discount } : selected === applied?.code ? applied : null);
    onClose();
  };

  // Mã không có trong danh sách (mã bí mật quán tặng riêng) → gõ tay
  const handleOtherCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setChecking(true);
    setCodeError(null);
    try {
      onApply(await couponService.check(code.trim()));
      onClose();
    } catch (err) {
      setCodeError((err as Error).message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Chọn mã giảm giá"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <p className="text-sm text-coffee-600">
            {chosen ? (
              <>
                Tiết kiệm <strong className="text-emerald-700">{formatPrice(chosen.discount)}</strong>
              </>
            ) : (
              "Chưa chọn mã"
            )}
          </p>
          <Button onClick={handleDone} className="min-w-28">
            Xong
          </Button>
        </div>
      }
    >
      {list === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-7 w-7 animate-spin text-coffee-400" />
        </div>
      ) : (
        <div className="space-y-5">
          {list.length === 0 && (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-coffee-200 px-6 py-8 text-center">
              <TicketPercent className="h-9 w-9 text-coffee-300" />
              <p className="mt-2 text-sm text-coffee-600">Hiện quán chưa có mã giảm giá nào.</p>
            </div>
          )}

          {eligible.length > 0 && (
            <section className="space-y-2.5">
              <h3 className="text-sm font-semibold text-coffee-800">Dùng được cho đơn này ({eligible.length})</h3>
              {eligible.map((c) => (
                <Ticket key={c.code} coupon={c} selected={selected === c.code} best={c.code === bestCode && eligible.length > 1} onSelect={() => setSelected(c.code)} />
              ))}
              <NoCouponOption selected={selected === null} onSelect={() => setSelected(null)} />
            </section>
          )}

          {notYet.length > 0 && (
            <section className="space-y-2.5">
              <h3 className="text-sm font-semibold text-coffee-800">Chưa dùng được ({notYet.length})</h3>
              {notYet.map((c) => (
                <Ticket key={c.code} coupon={c} selected={false} best={false} onSelect={() => {}} />
              ))}
            </section>
          )}

          <form onSubmit={handleOtherCode} className="space-y-1.5 border-t border-coffee-100 pt-4">
            <label htmlFor="other-coupon" className="text-sm font-semibold text-coffee-800">
              Có mã khác?
            </label>
            <div className="flex gap-2">
              <input
                id="other-coupon"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setCodeError(null);
                }}
                placeholder="Nhập mã quán tặng riêng"
                maxLength={30}
                autoComplete="off"
                className="h-11 min-w-0 flex-1 rounded-xl border border-coffee-200 bg-white px-3.5 text-sm uppercase tracking-wide text-coffee-950 placeholder:normal-case placeholder:tracking-normal placeholder:text-coffee-400/80 focus:border-coffee-500 focus:outline-none focus:ring-4 focus:ring-coffee-200/60"
              />
              <Button type="submit" variant="outline" loading={checking} disabled={!code.trim()} className="h-11 shrink-0 rounded-xl">
                Áp dụng
              </Button>
            </div>
            {codeError && <p className="text-xs font-medium text-red-600">{codeError}</p>}
          </form>
        </div>
      )}
    </Modal>
  );
}
