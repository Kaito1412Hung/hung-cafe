import type { Metadata } from "next";
import { MenuBrowser } from "@/components/product/MenuBrowser";

export const metadata: Metadata = { title: "Thực đơn" };

export default function MenuPage() {
  return (
    <>
      <section className="border-b border-coffee-100 bg-coffee-100/40">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-coffee-500">Thực đơn</p>
          <h1 className="mt-3 font-display text-5xl font-bold tracking-tight text-coffee-950 sm:text-6xl">
            Chọn món bạn yêu thích
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-coffee-600">
            Cà phê, trà, đá xay và bánh ngọt — tất cả đều được làm mới mỗi ngày.
          </p>
        </div>
      </section>
      <MenuBrowser />
    </>
  );
}
