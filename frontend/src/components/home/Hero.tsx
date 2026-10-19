import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Leaf, Star } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { unsplash } from "@/lib/utils";

const STATS = [
  { value: "20+", label: "Món đồ uống" },
  { value: "4.9", label: "Điểm đánh giá" },
  { value: "15k", label: "Khách hàng" },
];

export function Hero() {
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
            <Link href="/#about" className={buttonClass("outline", "lg", "rounded-full")}>
              Câu chuyện của Hưng
            </Link>
          </div>

          <dl className="mt-12 flex gap-10 border-t border-coffee-200 pt-8">
            {STATS.map((s) => (
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

          {/* Thẻ nổi */}
          <div className="absolute -left-4 top-12 flex animate-float items-center gap-3 rounded-2xl bg-white/95 p-3 pr-5 shadow-xl backdrop-blur sm:-left-10">
            <div className="relative h-12 w-12 overflow-hidden rounded-xl">
              <Image src={unsplash("1461023058943-07fcbe16d735", 200)} alt="" fill sizes="48px" className="object-cover" />
            </div>
            <div>
              <p className="text-xs text-coffee-500">Bán chạy nhất</p>
              <p className="font-semibold text-coffee-950">Cà Phê Sữa Đá</p>
            </div>
          </div>

          <div className="absolute -right-2 bottom-16 animate-float rounded-2xl bg-coffee-900 p-4 text-cream shadow-xl [animation-delay:1.5s] sm:-right-8">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="mt-2 text-sm font-medium">&ldquo;Ngon nhất Sài Gòn!&rdquo;</p>
            <p className="text-xs text-coffee-300">2.400+ đánh giá</p>
          </div>
        </div>
      </div>
    </section>
  );
}
