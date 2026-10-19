"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { ProductCard, ProductCardSkeleton } from "@/components/product/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import { SectionHeading } from "./SectionHeading";

export function FeaturedProducts() {
  const { products, loading } = useProducts();
  const featured = products.filter((p) => p.isBestSeller && p.isAvailable).slice(0, 4);

  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            align="left"
            eyebrow="Được yêu thích"
            title="Món bán chạy tuần này"
            description="Những ly đồ uống khách hàng gọi nhiều nhất — đánh dấu “Bán chạy” trong trang quản lý để hiển thị tại đây."
          />
          <Link href="/menu" className={buttonClass("outline", "md", "shrink-0 rounded-full")}>
            Xem toàn bộ thực đơn <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>

        {!loading && featured.length === 0 && (
          <p className="mt-8 text-center text-coffee-600">Chưa có món bán chạy nào. Hãy thêm trong trang quản lý nhé!</p>
        )}
      </div>
    </section>
  );
}
