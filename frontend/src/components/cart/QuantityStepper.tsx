import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  max: number;
  disabled?: boolean;
  /** "touch": to ~40px trên điện thoại (dễ bấm), về cỡ thường từ màn hình sm */
  size?: "sm" | "md" | "touch";
  onChange: (value: number) => void;
}

export function QuantityStepper({ value, max, disabled, size = "md", onChange }: QuantityStepperProps) {
  const btn = cn(
    "flex items-center justify-center rounded-full text-coffee-700 transition hover:bg-coffee-100 cursor-pointer",
    "disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent",
    size === "sm" ? "h-7 w-7" : size === "touch" ? "h-10 w-10 sm:h-9 sm:w-9" : "h-9 w-9",
  );

  return (
    <div className={cn("inline-flex items-center rounded-full border border-coffee-200 bg-white p-0.5", disabled && "opacity-60")}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={disabled || value <= 1} aria-label="Giảm số lượng">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className={cn("text-center font-semibold tabular-nums text-coffee-950", size === "sm" ? "w-7 text-sm" : size === "touch" ? "w-10 sm:w-9" : "w-9")}>{value}</span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label="Tăng số lượng">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
