import Link from "next/link";
import { Quote } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Stars } from "@/components/ui/Stars";
import type { FeaturedReview } from "@/types/review";
import { SectionHeading } from "./SectionHeading";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

/** Lấy đánh giá THẬT (4–5 sao, có nhận xét) của khách đã mua — chạy ở server */
async function getFeatured(): Promise<FeaturedReview[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/reviews/featured`, { cache: "no-store" });
    if (!res.ok) return [];
    return ((await res.json()) as { data: FeaturedReview[] }).data;
  } catch {
    return [];
  }
}

export async function Testimonials() {
  const reviews = await getFeatured();
  // Chưa có đánh giá thật nào → ẩn hẳn khu này (không bịa lời khen)
  if (reviews.length === 0) return null;

  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Khách hàng nói gì" title="Cảm nhận từ khách quen" />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {reviews.map((r) => (
            <figure key={r.id} className="relative flex flex-col rounded-3xl bg-white p-8 shadow-sm ring-1 ring-coffee-100">
              <Quote className="absolute right-6 top-6 h-10 w-10 text-coffee-100" />
              <Stars value={r.rating} />
              <blockquote className="mt-4 flex-1 leading-relaxed text-coffee-800">&ldquo;{r.comment}&rdquo;</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <Avatar user={{ name: r.authorName, nickname: "", avatar: r.authorAvatar }} size="md" tone="light" />
                <div className="min-w-0">
                  <p className="font-semibold text-coffee-950">{r.authorName}</p>
                  <Link href={`/menu/${r.productSlug}#danh-gia`} className="text-sm text-coffee-500 hover:text-coffee-800">
                    đã đánh giá {r.productName}
                  </Link>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
