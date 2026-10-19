import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Leaf, PackageCheck } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { ProductImage } from "@/components/ui/ProductImage";
import { SectionLink } from "@/components/layout/SectionLink";
import { unsplash } from "@/lib/utils";

interface PublicStats {
  products: number;
  customers: number;
  completedOrders: number;
  bestSeller: { name: string; slug: string; image: string } | null;
}

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

/** Số liệu THẬT từ database (render ở server). Backend tắt thì trả null → ẩn phần số liệu */
async function getStats(): Promise<PublicStats | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/stats/public`, { cache: "no-store" });
    return res.ok ? ((await res.json()) as { data: PublicStats }).data : null;
  } catch {
    return null;
  }
}

const formatCount = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

export async function Hero() {
  const stats = await getStats();
  const statItems = stats
    ? [
        { value: formatCount(stats.products), label: "Món trên thực đơn" },
        { value: formatCount(stats.completedOrders), label: "Đơn đã giao" },
        { value: formatCount(stats.customers), label: "Khách hàng thành viên" },
      ]
    : [];

  return (
    <section className="relative overflow-hidden">
      {/* Đốm màu trang trí phía sau */}
      <div className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-coffee-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-amber-200/40 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:pb-28 lg:pt-16">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-coffee-200 bg-white/70 px-4 py-1.5 text-sm font-medium text-coffee-700 backdrop-blur">
            <Leaf className="h-4 w-4 text-emerald-600" /> Rang mộc mỗi sáng tại Đà Lạt
          </span>

          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.1] tracking-tight text-coffee-950 sm:text-6xl lg:text-7xl">
            Đánh thức <br />
            <span className="relative italic text-coffee-600">
              mọi giác quan
              <svg className="absolute -bottom-2 left-0 w-full text-coffee-300" viewBox="0 0 300 12" fill="none" aria-hidden>
                <path d="M2 9c60-6 140-8 296-3" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </span>
            <br /> từ tách đầu tiên
          </h1>

          <p className="mt-8 max-w-lg text-lg leading-relaxed text-coffee-700">
            Hạt Arabica & Robusta tuyển chọn, rang xay thủ công và pha chế bởi những barista tận tâm.
            Một tách cà phê — trọn vẹn một ngày.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/menu" className={buttonClass("primary", "lg", "rounded-full")}>
              Khám phá thực đơn <ArrowRight className="h-5 w-5" />
            </Link>
            <SectionLink href="/#about" className={buttonClass("outline", "lg", "rounded-full")}>
              Câu chuyện của Hưng
            </SectionLink>
          </div>

          <dl className="mt-12 flex gap-10 border-t border-coffee-200 pt-8">
            {statItems.map((s) => (
              <div key={s.label}>
                <dt className="font-display text-3xl font-bold text-coffee-950">{s.value}</dt>
                <dd className="mt-1 text-sm text-coffee-600">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative mx-auto w-full max-w-lg animate-fade-up [animation-delay:150ms]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] shadow-2xl shadow-coffee-900/30">
            <Image
              src={unsplash("1541167760496-1628856ab772", 1000)}
              alt="Barista rót sữa tạo latte art"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-coffee-950/40 to-transparent" />
          </div>

          {/* Thẻ nổi: món bán chạy nhất THẬT (tính từ các đơn đã đặt) */}
          {stats?.bestSeller && (
            <Link
              href={`/menu/${stats.bestSeller.slug}`}
              className="absolute -left-4 top-12 flex animate-float items-center gap-3 rounded-2xl bg-white/95 p-3 pr-5 shadow-xl backdrop-blur transition hover:bg-white sm:-left-10"
            >
              <ProductImage src={stats.bestSeller.image} alt="" className="h-12 w-12 rounded-xl" />
              <div>
                <p className="text-xs text-coffee-500">Bán chạy nhất</p>
                <p className="font-semibold text-coffee-950">{stats.bestSeller.name}</p>
              </div>
            </Link>
          )}

          {stats && stats.completedOrders > 0 && (
            <div className="absolute -right-2 bottom-16 animate-float rounded-2xl bg-coffee-900 p-4 text-cream shadow-xl [animation-delay:1.5s] sm:-right-8">
              <PackageCheck className="h-5 w-5 text-amber-400" />
              <p className="mt-2 font-display text-2xl font-bold">{formatCount(stats.completedOrders)}</p>
              <p className="text-xs text-coffee-300">đơn đã giao tận tay</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
