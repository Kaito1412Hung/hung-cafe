import { Award, Bean, Flame, Sprout } from "lucide-react";

const FEATURES = [
  { icon: Bean, title: "Hạt tuyển chọn", desc: "100% hạt nguyên chất từ Cầu Đất & Buôn Ma Thuột, không tẩm ướp." },
  { icon: Flame, title: "Rang mới mỗi ngày", desc: "Rang mẻ nhỏ mỗi sáng để giữ trọn hương thơm tự nhiên." },
  { icon: Award, title: "Barista chuyên nghiệp", desc: "Đội ngũ được đào tạo bài bản, từng đạt giải Latte Art." },
  { icon: Sprout, title: "Không gian xanh", desc: "Góc làm việc yên tĩnh, ngập cây xanh và ánh sáng tự nhiên." },
];

export function Features() {
  return (
    <section className="bg-coffee-950 py-20 text-cream">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="group rounded-3xl border border-coffee-800 p-6 transition hover:border-coffee-600 hover:bg-coffee-900/50">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-coffee-800 text-coffee-200 transition group-hover:bg-coffee-500 group-hover:text-white">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-coffee-300">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
