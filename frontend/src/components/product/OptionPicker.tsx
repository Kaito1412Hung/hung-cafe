"use client";

import { Check } from "lucide-react";
import { ICES, MAX_TOPPINGS, SIZES, SUGARS, TEMPS, isCold, type ItemOptions, type ProductOptionConfig, type Topping } from "@/lib/options";
import { cn, formatPrice } from "@/lib/utils";

interface Choice {
  value: string;
  label: string;
  hint?: string;
}

const pill = (active: boolean) =>
  cn(
    "flex cursor-pointer flex-col items-center rounded-xl px-3.5 py-2 text-sm ring-1 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-coffee-500",
    active ? "bg-coffee-900 font-semibold text-cream ring-coffee-900" : "bg-white text-coffee-800 ring-coffee-200 hover:ring-coffee-400",
  );

/** Một hàng nút bấm chọn 1 trong nhiều (giống radio nhưng dạng "viên thuốc") */
function ChoiceGroup({ label, name, choices, value, onChange }: { label: string; name: string; choices: Choice[]; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-coffee-800">{label}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {choices.map((c) => {
          const active = c.value === value;
          return (
            <label key={c.value} className={pill(active)}>
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

/** Chọn nhiều topping (tối đa MAX_TOPPINGS), mỗi topping cộng thêm tiền */
function ToppingGroup({ toppings, value, onChange }: { toppings: Topping[]; value: number[]; onChange: (v: number[]) => void }) {
  const full = value.length >= MAX_TOPPINGS;
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-coffee-800">
        Topping <span className="font-normal text-coffee-500">(tối đa {MAX_TOPPINGS}, không bắt buộc)</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {toppings.map((t) => {
          const active = value.includes(t.id);
          const disabled = !active && full;
          return (
            <label key={t.id} className={cn(pill(active), "flex-row gap-1.5", disabled && "cursor-not-allowed opacity-40 hover:ring-coffee-200")}>
              <input
                type="checkbox"
                checked={active}
                disabled={disabled}
                onChange={() => onChange(active ? value.filter((id) => id !== t.id) : [...value, t.id])}
                className="sr-only"
              />
              {active && <Check className="h-3.5 w-3.5" />}
              <span>{t.name}</span>
              <span className={cn("text-[11px]", active ? "text-coffee-200" : "text-coffee-500")}>+{formatPrice(t.price)}</span>
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
  /** Món cho chọn những gì (size / đường / nóng-đá / topping) */
  config: ProductOptionConfig;
  /** Topping đang bán (chỉ dùng khi món cho thêm topping) */
  toppings: Topping[];
  idPrefix?: string;
}

/** Chọn size / nóng-đá / đường / đá / topping + ghi chú riêng cho món — món không có lựa chọn nào thì chỉ còn ghi chú */
export function OptionPicker({ value, onChange, config, toppings, idPrefix = "opt" }: OptionPickerProps) {
  const set = <K extends keyof ItemOptions>(key: K, v: ItemOptions[K]) => onChange({ ...value, [key]: v });
  const isDrink = config.serve !== "none";

  // Đổi nóng ↔ đá: uống nóng thì bỏ chọn lượng đá, đổi lại đá thì về "Bình thường"
  const setTemp = (temp: ItemOptions["temp"]) => onChange({ ...value, temp, ice: temp === "cold" ? value.ice || "normal" : "" });

  return (
    <div className="space-y-4">
      {config.hasSize && (
        <ChoiceGroup
          label="Size"
          name={`${idPrefix}-size`}
          value={value.size}
          onChange={(v) => set("size", v as ItemOptions["size"])}
          choices={SIZES.map((s) => ({ value: s.value, label: `${s.label} (${s.value})`, hint: s.extra ? `+${formatPrice(s.extra)}` : "Giá gốc" }))}
        />
      )}
      {config.serve === "both" && (
        <ChoiceGroup label="Nóng hay đá" name={`${idPrefix}-temp`} value={value.temp} onChange={(v) => setTemp(v as ItemOptions["temp"])} choices={[...TEMPS]} />
      )}
      {config.serve === "hot" && <p className="rounded-xl bg-amber-50 px-3.5 py-2 text-sm text-amber-800">☕ Món này phục vụ nóng.</p>}
      {config.hasSugar && (
        <ChoiceGroup label="Lượng đường" name={`${idPrefix}-sugar`} value={value.sugar} onChange={(v) => set("sugar", v as ItemOptions["sugar"])} choices={[...SUGARS]} />
      )}
      {isCold(config, value.temp) && (
        <ChoiceGroup label="Lượng đá" name={`${idPrefix}-ice`} value={value.ice} onChange={(v) => set("ice", v as ItemOptions["ice"])} choices={[...ICES]} />
      )}
      {config.allowToppings && toppings.length > 0 && <ToppingGroup toppings={toppings} value={value.toppings} onChange={(v) => set("toppings", v)} />}
      <div>
        <label htmlFor={`${idPrefix}-note`} className="mb-2 block text-sm font-medium text-coffee-800">
          Ghi chú cho món <span className="font-normal text-coffee-500">(không bắt buộc)</span>
        </label>
        <input
          id={`${idPrefix}-note`}
          value={value.note}
          maxLength={100}
          onChange={(e) => set("note", e.target.value)}
          placeholder={isDrink ? "VD: thêm sữa, pha đậm, không lấy ống hút..." : "VD: cắt sẵn, ghi chữ lên bánh..."}
          className="h-11 w-full rounded-xl border border-coffee-200 bg-white px-3.5 text-sm text-coffee-950 placeholder:text-coffee-400/80 focus:border-coffee-500 focus:outline-none focus:ring-4 focus:ring-coffee-200/60"
        />
      </div>
    </div>
  );
}
