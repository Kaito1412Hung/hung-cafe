"use client";

import { useMemo, useState } from "react";
import { Search, SearchX } from "lucide-react";
import { Select } from "@/components/ui/FormField";
import { useProducts } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";
import { useCategories } from "@/context/CategoriesContext";
import type { Category } from "@/types/product";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";

type SortKey = "popular" | "price-asc" | "price-desc" | "name";

export function MenuBrowser() {
  const { products, loading } = useProducts();
  const { categories } = useCategories();
  const [category, setCategory] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("popular");

  // useMemo: chỉ tính lại danh sách khi dữ liệu hoặc bộ lọc thay đổi
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.filter(
      (p) => (category === "all" || p.category === category) && p.name.toLowerCase().includes(q),
    );
    return [...list].sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "name") return a.name.localeCompare(b.name, "vi");
      return Number(b.isBestSeller) - Number(a.isBestSeller);
    });
  }, [products, category, query, sort]);

  const tabs: { value: Category | "all"; label: string }[] = [
    { value: "all", label: "Tất cả" },
    ...categories.map((c) => ({ value: c.slug, label: c.name })),
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {tabs.map((t) => {
            const count = t.value === "all" ? products.length : products.filter((p) => p.category === t.value).length;
            return (
              <button
                key={t.value}
                onClick={() => setCategory(t.value)}
                className={cn(
                  "flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition",
                  category === t.value
                    ? "bg-coffee-900 text-cream shadow-lg shadow-coffee-900/20"
                    : "bg-white text-coffee-700 ring-1 ring-coffee-200 hover:bg-coffee-50",
                )}
              >
                {t.label}
                <span className={cn("rounded-full px-2 text-xs", category === t.value ? "bg-coffee-700" : "bg-coffee-100")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <div className="relative min-w-0 flex-1 lg:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm món..."
              className="h-11 w-full rounded-full border border-coffee-200 bg-white pl-10 pr-4 text-sm focus:border-coffee-500 focus:outline-none focus:ring-4 focus:ring-coffee-200/60"
            />
          </div>
          <div className="w-40 shrink-0">
            <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="rounded-full" aria-label="Sắp xếp">
              <option value="popular">Phổ biến</option>
              <option value="price-asc">Giá thấp → cao</option>
              <option value="price-desc">Giá cao → thấp</option>
              <option value="name">Tên A → Z</option>
            </Select>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
          : visible.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>

      {!loading && visible.length === 0 && (
        <div className="flex flex-col items-center py-20 text-center">
          <SearchX className="h-12 w-12 text-coffee-300" />
          <p className="mt-4 font-display text-xl text-coffee-900">Không tìm thấy món nào</p>
          <p className="mt-1 text-coffee-600">Thử từ khoá khác hoặc chọn danh mục khác nhé.</p>
        </div>
      )}
    </section>
  );
}
