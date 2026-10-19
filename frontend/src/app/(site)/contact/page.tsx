import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";
import { ContactInfo } from "@/components/contact/ContactInfo";

export const metadata: Metadata = {
  title: "Liên hệ",
  description: "Gửi góp ý, đặt bàn, đặt tiệc hoặc hỏi về món — Hưng Café luôn sẵn sàng lắng nghe.",
};

export default function ContactPage() {
  return (
    <>
      <section className="border-b border-coffee-100 bg-coffee-100/40">
        <div className="mx-auto max-w-7xl px-4 py-14 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-coffee-500">Liên hệ</p>
          <h1 className="mt-3 font-display text-5xl font-bold tracking-tight text-coffee-950">Quán luôn lắng nghe bạn</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-coffee-600">Góp ý, đặt bàn, đặt tiệc hay chỉ muốn hỏi về một món mới — nhắn cho quán nhé!</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        <ContactForm />
        <ContactInfo />
      </section>
    </>
  );
}
