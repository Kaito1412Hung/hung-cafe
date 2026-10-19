"use client";

import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { formatHour, useShopSettings } from "@/context/ShopSettingsContext";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { SectionLink } from "./SectionLink";

export function Footer() {
  // Thông tin quán lấy từ trang Cài đặt của admin
  const { settings, openStatus } = useShopSettings();

  // Chỉ hiện mạng xã hội nào admin đã nhập link
  const socials = [
    { label: "Facebook", url: settings.facebookUrl },
    { label: "Instagram", url: settings.instagramUrl },
    { label: "TikTok", url: settings.tiktokUrl },
  ].filter((s) => s.url);

  return (
    <footer id="contact" className="bg-coffee-950 text-coffee-200">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="space-y-4">
          <Logo light />
          <p className="text-sm leading-relaxed text-coffee-300">{settings.tagline}</p>
          {socials.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-coffee-800 px-3 py-1.5 text-xs transition hover:border-coffee-400 hover:text-cream"
                >
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-4 font-display text-lg text-cream">Khám phá</h3>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/" className="hover:text-cream">Trang chủ</Link></li>
            <li><Link href="/menu" className="hover:text-cream">Thực đơn</Link></li>
            <li><SectionLink href="/#about" className="hover:text-cream">Câu chuyện</SectionLink></li>
            <li><Link href="/contact" className="hover:text-cream">Liên hệ với quán</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-display text-lg text-cream">Liên hệ</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3"><MapPin className="h-4 w-4 shrink-0 text-coffee-400" /> {settings.address}</li>
            <li className="flex gap-3"><Phone className="h-4 w-4 shrink-0 text-coffee-400" /> {settings.phone}</li>
            <li className="flex gap-3"><Mail className="h-4 w-4 shrink-0 text-coffee-400" /> <span className="break-all">{settings.email}</span></li>
            <li>
              <Link href="/contact" className="inline-flex items-center gap-2 rounded-full bg-coffee-800 px-3 py-1.5 text-xs font-medium text-cream transition hover:bg-coffee-700">
                <MessageCircle className="h-3.5 w-3.5" /> Gửi tin nhắn cho quán
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-display text-lg text-cream">Giờ mở cửa</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3">
              <Clock className="h-4 w-4 shrink-0 text-coffee-400" /> Thứ 2 – Thứ 6: {formatHour(settings.weekdayOpen)} – {formatHour(settings.weekdayClose)}
            </li>
            <li className="flex gap-3">
              <Clock className="h-4 w-4 shrink-0 text-coffee-400" /> Thứ 7 – CN: {formatHour(settings.weekendOpen)} – {formatHour(settings.weekendClose)}
            </li>
          </ul>
          {openStatus && (
            <p className={cn("mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium", openStatus.isOpen ? "bg-emerald-900/50 text-emerald-300" : "bg-red-900/40 text-red-300")}>
              <span className={cn("h-2 w-2 rounded-full", openStatus.isOpen ? "animate-pulse bg-emerald-400" : "bg-red-400")} />
              {openStatus.message}
            </p>
          )}
        </div>
      </div>
      <div className="border-t border-coffee-900 py-6 text-center text-xs text-coffee-400">
        © {new Date().getFullYear()} {settings.name}. Dự án học tập Next.js + TypeScript.
      </div>
    </footer>
  );
}
