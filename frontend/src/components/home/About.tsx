import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { unsplash } from "@/lib/utils";
import { SectionHeading } from "./SectionHeading";

const POINTS = [
  "Thu mua trực tiếp từ nông hộ, giá công bằng",
  "Quy trình rang được kiểm soát nhiệt độ từng giây",
  "Ly giấy & ống hút phân huỷ sinh học",
];

export function About() {
  return (
    <section id="about" className="scroll-mt-20 bg-coffee-100/50 py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="grid grid-cols-2 gap-4">
          <div className="relative col-span-2 aspect-[16/10] overflow-hidden rounded-3xl">
            <Image src={unsplash("1554118811-1e0d58224f24", 1000)} alt="Không gian quán" fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" />
          </div>
          <div className="relative aspect-square overflow-hidden rounded-3xl">
            <Image src={unsplash("1600093463592-8e36ae95ef56", 600)} alt="Khu vườn" fill sizes="25vw" className="object-cover" />
          </div>
          <div className="relative flex aspect-square flex-col justify-end overflow-hidden rounded-3xl bg-coffee-900 p-6 text-cream">
            <Image src={unsplash("1447933601403-0c6688de566e", 600)} alt="" fill sizes="25vw" className="object-cover opacity-30" />
            <p className="relative font-display text-5xl font-bold">10</p>
            <p className="relative mt-1 text-sm text-coffee-200">năm gắn bó với hạt cà phê Việt</p>
          </div>
        </div>

        <div>
          <SectionHeading
            align="left"
            eyebrow="Câu chuyện của Hưng"
            title="Chân thật như chính hạt cà phê"
            description="Hưng Café bắt đầu từ một xe đẩy nhỏ ở Tây Thạnh năm 2016. Đến nay, chúng tôi vẫn giữ nguyên tinh thần: cà phê thật, con người thật và những câu chuyện thật."
          />
          <ul className="mt-8 space-y-4">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-coffee-800">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
