import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onChange: (page: number) => void;
  itemLabel?: string;
}

/** Các trang cần hiện: trang đầu, trang cuối và 1 trang mỗi bên trang hiện tại; chỗ bị bỏ thì là "…" */
function pageList(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const keep = new Set([1, totalPages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= totalPages));
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

export function Pagination({ page, totalPages, totalItems, pageSize, onChange, itemLabel = "sản phẩm" }: PaginationProps) {
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  const navBtn =
    "flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-coffee-200 text-coffee-700 transition hover:bg-coffee-50 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-coffee-100 px-6 py-4 sm:flex-row">
      <p className="text-sm text-coffee-500">
        Hiển thị <span className="font-medium text-coffee-900">{from}–{to}</span> trên{" "}
        <span className="font-medium text-coffee-900">{totalItems}</span> {itemLabel}
      </p>
      <div className="flex items-center gap-1.5">
        <button className={navBtn} onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Trang trước">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageList(page, totalPages).map((n, i) =>
          n === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-sm text-coffee-400">
              …
            </span>
          ) : (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={cn(
                "h-9 min-w-9 cursor-pointer rounded-lg px-3 text-sm font-medium transition",
                n === page ? "bg-coffee-900 text-cream" : "text-coffee-700 hover:bg-coffee-100",
              )}
            >
              {n}
            </button>
          ),
        )}
        <button className={navBtn} onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Trang sau">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
