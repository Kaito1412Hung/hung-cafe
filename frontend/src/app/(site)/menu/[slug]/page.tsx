import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Clock, Leaf, Star, Truck } from "lucide-react";
import { AddToCartPanel } from "@/components/product/AddToCartPanel";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductImage } from "@/components/ui/ProductImage";
import { Stars } from "@/components/ui/Stars";
import { FavoriteButton } from "@/components/product/FavoriteButton";
import { ProductReviews } from "@/components/review/ProductReviews";
import { cn, formatPrice } from "@/lib/utils";
import type { Category } from "@/types/category";
import type { Product } from "@/types/product";

/**
 * Trang chi tiết món — render ở SERVER (Server Component):
 * HTML có sẵn nội dung → tải nhanh, Google đọc được (SEO), tab trình duyệt hiện đúng tên món.
 * Server gọi thẳng backend (không qua rewrites vì đây không phải trình duyệt).
 */
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

async function fetchJson<T>(path: string): Promise<T | null> {
  const res = await fetch(`${BACKEND_URL}/api${path}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Không tải được dữ liệu (${res.status})`);
  return ((await res.json()) as { data: T }).data;
}

// cache(): generateMetadata và trang cùng gọi getProduct nhưng chỉ fetch 1 lần
const getProduct = cache((slug: string) => fetchJson<Product>(`/products/slug/${encodeURIComponent(slug)}`));

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return { title: "Không tìm thấy món" };
  const description = product.description || `${product.name} — ${formatPrice(product.price)} tại Hưng Café`;
  return {
    title: product.name,
    description,
    // Gửi link món qua Zalo / Facebook → hiện ảnh của món đó
    openGraph: { title: `${product.name} · ${formatPrice(product.price)}`, description, images: product.image ? [product.image] : undefined },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound(); // → hiện trang 404 của quán

  const [sameCategory, categories] = await Promise.all([
    fetchJson<Product[]>(`/products?category=${encodeURIComponent(product.category)}`),
    fetchJson<Category[]>("/categories"),
  ]);
  const categoryName = categories?.find((c) => c.slug === product.category)?.name ?? product.category;
  const related = (sameCategory ?? []).filter((p) => p.id !== product.id && p.isAvailable).slice(0, 4);
  const soldOut = !product.isAvailable || product.stock === 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-coffee-500">
        <Link href="/" className="hover:text-coffee-900">
          Trang chủ
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/menu" className="hover:text-coffee-900">
          Thực đơn
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>{categoryName}</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-coffee-900">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-14">
        {/* Ảnh lớn */}
        <div className="relative">
          <div className="overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-coffee-900/10 ring-1 ring-coffee-100">
            <ProductImage src={product.image} alt={product.name} className={cn("aspect-square w-full", soldOut && "grayscale")} />
          </div>
          {product.isBestSeller && (
            <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-sm font-semibold text-coffee-900 shadow backdrop-blur">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> Bán chạy
            </span>
          )}
        </div>

        {/* Thông tin */}
        <div className="flex flex-col">
          <Link href="/menu" className="w-fit text-sm font-semibold uppercase tracking-[0.2em] text-coffee-500 hover:text-coffee-800">
            {categoryName}
          </Link>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-coffee-950 sm:text-5xl">{product.name}</h1>
          {product.ratingCount > 0 && (
            <a href="#danh-gia" className="mt-3 inline-flex w-fit items-center gap-2 text-sm text-coffee-700 hover:text-coffee-950">
              <Stars value={product.ratingAverage ?? 0} />
              <span className="font-semibold">{product.ratingAverage?.toFixed(1)}</span>
              <span className="text-coffee-500 underline-offset-2 hover:underline">({product.ratingCount} đánh giá)</span>
            </a>
          )}
          <p className="mt-4 text-3xl font-bold text-coffee-900">
            {formatPrice(product.price)}
            {product.hasSize && <span className="ml-2 align-middle text-sm font-normal text-coffee-500">size S · M +6.000đ · L +10.000đ</span>}
          </p>

          <div className="mt-3">
            {soldOut ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700 ring-1 ring-red-600/15">
                Tạm hết hàng
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 ring-1 ring-emerald-600/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Còn hàng
              </span>
            )}
          </div>

          <p className="mt-6 text-lg leading-relaxed text-coffee-700">{product.description || "Món ngon được pha chế mới mỗi khi bạn đặt."}</p>

          <div className="mt-8 border-t border-coffee-100 pt-8">
            <AddToCartPanel product={product} />
            <FavoriteButton productId={product.id} name={product.name} variant="outline" className="mt-3" />
          </div>

          <ul className="mt-8 grid gap-3 text-sm text-coffee-700 sm:grid-cols-3">
            {[
              { icon: Clock, text: "Pha mới khi bạn đặt" },
              { icon: Truck, text: "Giao nhanh trong 30 phút" },
              { icon: Leaf, text: "Nguyên liệu tươi mỗi ngày" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 ring-1 ring-coffee-100">
                <Icon className="h-4 w-4 shrink-0 text-coffee-500" /> {text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Đánh giá của khách (chỉ khách đã nhận món mới viết được) */}
      <section id="danh-gia" className="mt-20 scroll-mt-24">
        <h2 className="mb-8 font-display text-3xl font-bold text-coffee-950">Đánh giá từ khách hàng</h2>
        <ProductReviews productId={product.id} productName={product.name} slug={product.slug} />
      </section>

      {/* Món liên quan */}
      {related.length > 0 && (
        <section className="mt-20">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-3xl font-bold text-coffee-950">Có thể bạn cũng thích</h2>
            <Link href="/menu" className="text-sm font-medium text-coffee-600 hover:text-coffee-950">
              Xem thực đơn →
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
