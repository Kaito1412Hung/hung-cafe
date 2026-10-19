"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { unsplash } from "@/lib/utils";
import { contactService } from "@/services/contactService";

export function Newsletter() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  // Lưu email vào database (admin xem ở Quản lý → Liên hệ → Đăng ký nhận tin)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast("Email chưa đúng định dạng", "error");
      return;
    }
    setSending(true);
    try {
      toast(await contactService.subscribe(email));
      setEmail("");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="px-4 pb-24 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-coffee-900 px-6 py-16 text-center sm:px-16">
        <Image src={unsplash("1497935586351-b67a49e012bf", 1600)} alt="" fill sizes="100vw" className="object-cover opacity-20" />
        <div className="relative mx-auto max-w-2xl">
          <h2 className="font-display text-4xl font-bold text-cream sm:text-5xl">Giảm 20% cho đơn đầu tiên</h2>
          <p className="mt-4 text-lg text-coffee-200">Đăng ký nhận tin để không bỏ lỡ món mới và ưu đãi độc quyền mỗi tuần.</p>
          <form onSubmit={handleSubmit} className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email của bạn"
              className="h-12 flex-1 rounded-full border border-coffee-700 bg-coffee-950/50 px-5 text-cream placeholder:text-coffee-400 focus:border-coffee-400 focus:outline-none"
            />
            <Button type="submit" variant="secondary" loading={sending} className="h-12 rounded-full px-6">
              Đăng ký <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
