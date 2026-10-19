"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const OTHER = "__other";

/**
 * Chọn lý do huỷ đơn: các lý do gợi ý + "Lý do khác" (tự nhập).
 * Báo ra ngoài chuỗi lý do cuối cùng ("" = chưa chọn / chưa nhập).
 */
export function CancelReasonPicker({ reasons, onChange, name }: { reasons: string[]; onChange: (reason: string) => void; name: string }) {
  const [choice, setChoice] = useState("");
  const [other, setOther] = useState("");

  const pick = (value: string) => {
    setChoice(value);
    onChange(value === OTHER ? other.trim() : value);
  };

  return (
    <div className="space-y-2" role="radiogroup" aria-label="Lý do huỷ đơn">
      {[...reasons, OTHER].map((r) => (
        <label
          key={r}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm ring-1 transition",
            choice === r ? "bg-red-50 text-red-800 ring-red-300" : "text-coffee-800 ring-coffee-200 hover:bg-coffee-50",
          )}
        >
          <input type="radio" name={name} checked={choice === r} onChange={() => pick(r)} className="h-4 w-4 accent-red-600" />
          {r === OTHER ? "Lý do khác" : r}
        </label>
      ))}
      {choice === OTHER && (
        <textarea
          autoFocus
          value={other}
          maxLength={255}
          onChange={(e) => {
            setOther(e.target.value);
            onChange(e.target.value.trim());
          }}
          placeholder="Nhập lý do..."
          className="min-h-20 w-full resize-none rounded-xl border border-coffee-200 px-3.5 py-2.5 text-sm focus:border-coffee-500 focus:outline-none focus:ring-4 focus:ring-coffee-200/60"
        />
      )}
    </div>
  );
}
