"use client";

import { ICES, SIZES, SUGARS, type ItemOptions } from "@/lib/options";
import { cn, formatPrice } from "@/lib/utils";

interface Choice {
  value: string;
  label: string;
  hint?: string;
}

/** Một hàng nút bấm chọn 1 trong nhiều (giống radio nhưng dạng "viên thuốc") */
function ChoiceGroup({ label, name, choices, value, onChange }: { label: string; name: string; choices: Choice[]; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-coffee-800">{label}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {choices.map((c) => {
          const active = c.value === value;
          return (
            <label
              key={c.value}
              className={cn(
                "flex cursor-pointer flex-col items-center rounded-xl px-3.5 py-2 text-sm ring-1 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-coffee-500",
                active ? "bg-coffee-900 font-semibold text-cream ring-coffee-900" : "bg-white text-coffee-800 ring-coffee-200 hover:ring-coffee-400",
              )}
            >
              <input type="radio" name={name} value={c.value} checked={active} onChange={() => onChange(c.value)} className="sr-only" />
              <span>{c.label}</span>
              {c.hint && <span className={cn("text-[11px]", active ? "text-coffee-200" : "text-coffee-500")}>{c.hint}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

interface OptionPickerProps {
  value: ItemOptions;
  onChange: (value: ItemOptions) => void;
  /** Món có size / đường / đá không (bánh thì chỉ có ghi chú) */
  hasOptions: boolean;
  idPrefix?: string;
}

/** Chọn size / đường / đá + ghi chú riêng cho món */
export function OptionPicker({ value, onChange, hasOptions, idPrefix = "opt" }: OptionPickerProps) {
  const set = <K extends keyof ItemOptions>(key: K, v: ItemOptions[K]) => onChange({ ...value, [key]: v });

  return (
    <div className="space-y-4">
      {hasOptions && (
        <>
          <ChoiceGroup
            label="Size"
            name={`${idPrefix}-size`}
            value={value.size}
            onChange={(v) => set("size", v as ItemOptions["size"])}
            choices={SIZES.map((s) => ({ value: s.value, label: `${s.label} (${s.value})`, hint: s.extra ? `+${formatPrice(s.extra)}` : "Giá gốc" }))}
          />
          <ChoiceGroup label="Lượng đường" name={`${idPrefix}-sugar`} value={value.sugar} onChange={(v) => set("sugar", v as ItemOptions["sugar"])} choices={[...SUGARS]} />
          <ChoiceGroup label="Lượng đá" name={`${idPrefix}-ice`} value={value.ice} onChange={(v) => set("ice", v as ItemOptions["ice"])} choices={[...ICES]} />
        </>
      )}
      <div>
        <label htmlFor={`${idPrefix}-note`} className="mb-2 block text-sm font-medium text-coffee-800">
          Ghi chú cho món <span className="font-normal text-coffee-500">(không bắt buộc)</span>
        </label>
        <input
          id={`${idPrefix}-note`}
          value={value.note}
          maxLength={100}
          onChange={(e) => set("note", e.target.value)}
          placeholder={hasOptions ? "VD: thêm sữa, pha đậm, không lấy ống hút..." : "VD: cắt sẵn, ghi chữ lên bánh..."}
          className="h-11 w-full rounded-xl border border-coffee-200 bg-white px-3.5 text-sm text-coffee-950 placeholder:text-coffee-400/80 focus:border-coffee-500 focus:outline-none focus:ring-4 focus:ring-coffee-200/60"
        />
      </div>
    </div>
  );
}
