"use client";

import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { useShopSettings } from "@/context/ShopSettingsContext";
import { Logo } from "./Logo";

const SOCIALS = ["Facebook", "Instagram", "TikTok"];

export function Footer() {
  // Thông tin quán lấy từ trang Cài đặt của admin
  const { settings } = useShopSettings();

  return (
    <footer id="contact" className="bg-coffee-950 text-coffee-200">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="space-y-4">
          <Logo light />
          <p className="text-sm leading-relaxed text-coffee-300">
            {settings.tagline}
          </p>
          <div className="flex gap-2">
            {SOCIALS.map((s) => (
              <a
                key={s}
                href="#"
                className="rounded-full border border-coffee-800 px-3 py-1.5 text-xs transition hover:border-coffee-400 hover:text-cream"
              >
                {s}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-4 font-display text-lg text-cream">Khám phá</h3>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/" className="hover:text-cream">Trang chủ</Link></li>
            <li><Link href="/menu" className="hover:text-cream">Thực đơn</Link></li>
            <li><Link href="/#about" className="hover:text-cream">Câu chuyện</Link></li>
            <li><Link href="/admin/products" className="hover:text-cream">Quản lý sản phẩm</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-display text-lg text-cream">Liên hệ</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3"><MapPin className="h-4 w-4 shrink-0 text-coffee-400" /> {settings.address}</li>
            <li className="flex gap-3"><Phone className="h-4 w-4 shrink-0 text-coffee-400" /> {settings.phone}</li>
            <li className="flex gap-3"><Mail className="h-4 w-4 shrink-0 text-coffee-400" /> <span className="break-all">{settings.email}</span></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-display text-lg text-cream">Giờ mở cửa</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3"><Clock className="h-4 w-4 shrink-0 text-coffee-400" /> Thứ 2 – Thứ 6: {settings.openingHoursWeekday}</li>
            <li className="flex gap-3"><Clock className="h-4 w-4 shrink-0 text-coffee-400" /> Thứ 7 – CN: {settings.openingHoursWeekend}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-coffee-900 py-6 text-center text-xs text-coffee-400">
        © {new Date().getFullYear()} {settings.name}. Dự án học tập Next.js + TypeScript.
      </div>
    </footer>
  );
}
