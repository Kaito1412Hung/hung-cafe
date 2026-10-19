import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "danger" | "warning" | "brand";

const tones: Record<Tone, string> = {
  neutral: "bg-coffee-100 text-coffee-800",
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15",
  danger: "bg-red-50 text-red-700 ring-1 ring-red-600/15",
  warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
  brand: "bg-coffee-900 text-cream",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}
