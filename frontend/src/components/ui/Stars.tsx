import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Hiển thị số sao (làm tròn 0.5 → hiện nửa sao bằng cách tô 1 phần) */
export function Stars({ value, size = "sm", className }: { value: number; size?: "xs" | "sm" | "md"; className?: string }) {
  const px = size === "xs" ? "h-3 w-3" : size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <span className={cn("inline-flex gap-0.5", className)} aria-label={`${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i + 1));
        return (
          <span key={i} className={cn("relative", px)}>
            <Star className={cn("absolute inset-0 text-coffee-200", px)} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cn("fill-amber-400 text-amber-400", px)} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** "★ 4.8 (12)" gọn cho thẻ món */
export function RatingBadge({ average, count, className }: { average: number | null; count: number; className?: string }) {
  if (!average || !count) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-coffee-700", className)}>
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      {average.toFixed(1)} <span className="font-normal text-coffee-500">({count})</span>
    </span>
  );
}
