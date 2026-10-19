"use client";

import { useState, type FormEvent } from "react";
import { TicketPercent, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";
import { couponService } from "@/services/couponService";
import type { AppliedCoupon } from "@/types/coupon";

interface CouponBoxProps {
  applied: AppliedCoupon | null;
  onChange: (coupon: AppliedCoupon | null) => void;
}

/** Ô nhập mã giảm giá trong giỏ hàng. Server kiểm tra điều kiện và trả về số tiền được giảm */
export function CouponBox({ applied, onChange }: CouponBoxProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const handleApply = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setChecking(true);
    setError(null);
    try {
      onChange(await couponService.check(code.trim()));
      setCode("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setChecking(false);
    }
  };

  if (applied) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-3.5 ring-1 ring-emerald-600/20">
        <TicketPercent className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-emerald-800">
            {applied.code} · −{formatPrice(applied.discount)}
          </p>
          {applied.description && <p className="text-emerald-700">{applied.description}</p>}
        </div>
        <button onClick={() => onChange(null)} className="cursor-pointer rounded-lg p-1 text-emerald-700 hover:bg-emerald-100" aria-label="Bỏ mã giảm giá">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleApply} className="space-y-1.5">
      <label htmlFor="coupon" className="text-sm font-medium text-coffee-800">
        Mã giảm giá
      </label>
      <div className="flex gap-2">
        <input
          id="coupon"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          placeholder="VD: GIAM10"
          maxLength={30}
          autoComplete="off"
          className="h-11 min-w-0 flex-1 rounded-xl border border-coffee-200 bg-white px-3.5 text-sm uppercase tracking-wide text-coffee-950 placeholder:normal-case placeholder:tracking-normal placeholder:text-coffee-400/80 focus:border-coffee-500 focus:outline-none focus:ring-4 focus:ring-coffee-200/60"
        />
        <Button type="submit" variant="outline" loading={checking} disabled={!code.trim()} className="h-11 shrink-0 rounded-xl">
          Áp dụng
        </Button>
      </div>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </form>
  );
}
