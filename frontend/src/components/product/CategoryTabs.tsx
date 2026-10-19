"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CategoryTab {
  value: string;
  label: string;
  count: number;
}

interface CategoryTabsProps {
  tabs: CategoryTab[];
  value: string;
  onChange: (value: string) => void;
}

/**
 * Thanh danh mục 1 hàng (giống Shopee / GrabFood): nhiều danh mục thì vuốt ngang hoặc bấm mũi tên ‹ ›.
 * Mũi tên + mép mờ chỉ hiện ở phía còn danh mục bị khuất, nên khách biết là còn để xem tiếp.
 */
export function CategoryTabs({ tabs, value, onChange }: CategoryTabsProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  // Tính lại xem 2 bên còn danh mục bị khuất không (khi cuộn, đổi cỡ màn hình, đổi số danh mục)
  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft < max - 4 });
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    // ResizeObserver: theo dõi khi khung đổi kích thước (xoay điện thoại, kéo cửa sổ...)
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [update, tabs.length]);

  // Chọn danh mục đang bị khuất một nửa → cuộn NGANG cho nó hiện đầy đủ (không làm cả trang cuộn dọc)
  useEffect(() => {
    const el = scroller.current;
    const active = el?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!el || !active) return;
    const pad = 48; // chừa chỗ cho mũi tên
    const left = active.offsetLeft - el.offsetLeft;
    if (left < el.scrollLeft + pad) el.scrollTo({ left: left - pad, behavior: "smooth" });
    else if (left + active.offsetWidth > el.scrollLeft + el.clientWidth - pad) {
      el.scrollTo({ left: left + active.offsetWidth - el.clientWidth + pad, behavior: "smooth" });
    }
  }, [value]);

  /** Bấm mũi tên: cuộn khoảng 70% chiều rộng khung */
  const scrollBy = (direction: -1 | 1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: "smooth" });
  };

  const arrow = (side: "left" | "right") => {
    const Icon = side === "left" ? ChevronLeft : ChevronRight;
    const show = edges[side];
    return (
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 z-10 flex items-center transition-opacity duration-200",
          // Mép mờ cùng màu nền trang → danh mục như "chìm" dần vào cạnh
          side === "left" ? "left-0 bg-linear-to-r from-cream from-55% to-transparent pr-6" : "right-0 justify-end bg-linear-to-l from-cream from-55% to-transparent pl-6",
          show ? "opacity-100" : "opacity-0",
        )}
      >
        <button
          type="button"
          onClick={() => scrollBy(side === "left" ? -1 : 1)}
          tabIndex={show ? 0 : -1}
          aria-hidden={!show}
          aria-label={side === "left" ? "Xem danh mục trước" : "Xem thêm danh mục"}
          className={cn(
            "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white text-coffee-800 shadow-md ring-1 ring-coffee-200 transition hover:bg-coffee-50 sm:h-9 sm:w-9",
            show && "pointer-events-auto",
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      </div>
    );
  };

  return (
    // min-w-0: cho phép thanh co lại khi nằm cạnh ô tìm kiếm (nếu không sẽ đẩy tràn trang)
    <div className="relative -mx-4 min-w-0 sm:mx-0 xl:flex-1">
      {arrow("left")}
      <div
        ref={scroller}
        role="toolbar"
        aria-label="Danh mục món"
        // py-2: chừa chỗ cho viền + bóng đổ (overflow-x-auto cắt cả chiều dọc). scroll-px: "hút" nút thẳng hàng nhưng vẫn chừa lề. Ẩn thanh cuộn cho gọn
        className="flex snap-x scroll-px-4 gap-2 overflow-x-auto scroll-smooth px-4 py-2 [scrollbar-width:none] sm:scroll-px-3 sm:px-3 [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((t) => {
          const active = value === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange(t.value)}
              aria-pressed={active}
              className={cn(
                "flex shrink-0 cursor-pointer snap-start items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition",
                active ? "bg-coffee-900 text-cream shadow-lg shadow-coffee-900/20" : "bg-white text-coffee-700 ring-1 ring-coffee-200 hover:bg-coffee-50",
              )}
            >
              {t.label}
              <span className={cn("rounded-full px-2 text-xs", active ? "bg-coffee-700" : "bg-coffee-100")}>{t.count}</span>
            </button>
          );
        })}
      </div>
      {arrow("right")}
    </div>
  );
}
