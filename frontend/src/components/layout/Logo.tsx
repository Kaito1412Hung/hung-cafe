import Link from "next/link";
import { Coffee } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ light, href = "/" }: { light?: boolean; href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5">
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:-rotate-12",
          light ? "bg-cream text-coffee-900" : "bg-coffee-900 text-cream",
        )}
      >
        <Coffee className="h-5 w-5" />
      </span>
      <span className={cn("font-display text-xl font-bold tracking-tight", light ? "text-cream" : "text-coffee-950")}>
        Hưng<span className="text-coffee-500">.</span>Café
      </span>
    </Link>
  );
}
