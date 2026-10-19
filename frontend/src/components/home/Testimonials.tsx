import { Quote, Star } from "lucide-react";
import { SectionHeading } from "./SectionHeading";

const REVIEWS = [
  { name: "Minh Anh", role: "Designer", text: "Góc làm việc yên tĩnh, wifi mạnh, bạc xỉu ngọt vừa phải. Tuần nào mình cũng ghé 3–4 lần." },
  { name: "Hoàng Long", role: "Kỹ sư phần mềm", text: "Pour over Cầu Đất ở đây có hậu vị trái cây rất rõ. Barista còn tư vấn cách pha tại nhà nữa." },
  { name: "Thu Trang", role: "Sinh viên", text: "Trà đào cam sả đỉnh của chóp! Giá hợp lý, nhân viên dễ thương, không gian chụp ảnh siêu xinh." },
];

export function Testimonials() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Khách hàng nói gì" title="Hơn 15.000 nụ cười mỗi tháng" />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {REVIEWS.map((r) => (
            <figure key={r.name} className="relative rounded-3xl bg-white p-8 shadow-sm ring-1 ring-coffee-100">
              <Quote className="absolute right-6 top-6 h-10 w-10 text-coffee-100" />
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <blockquote className="mt-4 leading-relaxed text-coffee-800">&ldquo;{r.text}&rdquo;</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-coffee-200 font-semibold text-coffee-800">
                  {r.name.charAt(0)}
                </span>
                <div>
                  <p className="font-semibold text-coffee-950">{r.name}</p>
                  <p className="text-sm text-coffee-500">{r.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
