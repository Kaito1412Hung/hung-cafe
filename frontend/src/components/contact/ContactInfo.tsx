"use client";

import { Clock, ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { formatHour, useShopSettings } from "@/context/ShopSettingsContext";
import { cn } from "@/lib/utils";

/** Thông tin liên hệ bên cạnh form — lấy từ Cài đặt cửa hàng */
export function ContactInfo() {
  const { settings, openStatus } = useShopSettings();
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`;

  const items = [
    { icon: MapPin, label: "Địa chỉ", value: settings.address, href: mapUrl, action: "Xem bản đồ" },
    { icon: Phone, label: "Điện thoại", value: settings.phone, href: `tel:${settings.phone.replace(/\s/g, "")}`, action: "Gọi ngay" },
    { icon: Mail, label: "Email", value: settings.email, href: `mailto:${settings.email}`, action: "Gửi email" },
  ];

  return (
    <div className="space-y-4">
      {items.map(({ icon: Icon, label, value, href, action }) => (
        <div key={label} className="flex gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-coffee-100">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-coffee-100 text-coffee-700">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-coffee-500">{label}</p>
            <p className="mt-0.5 break-words font-medium text-coffee-950">{value}</p>
            <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-coffee-600 hover:text-coffee-950">
              {action} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      ))}

      <div className="rounded-2xl bg-coffee-900 p-5 text-cream">
        <p className="flex items-center gap-2 font-medium">
          <Clock className="h-4 w-4" /> Giờ mở cửa
        </p>
        <dl className="mt-3 space-y-1.5 text-sm text-coffee-200">
          <div className="flex justify-between gap-4">
            <dt>Thứ 2 – Thứ 6</dt>
            <dd>{formatHour(settings.weekdayOpen)} – {formatHour(settings.weekdayClose)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Thứ 7 – Chủ nhật</dt>
            <dd>{formatHour(settings.weekendOpen)} – {formatHour(settings.weekendClose)}</dd>
          </div>
        </dl>
        {openStatus && (
          <p className={cn("mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium", openStatus.isOpen ? "bg-emerald-500/20 text-emerald-200" : "bg-red-500/20 text-red-200")}>
            <span className={cn("h-2 w-2 rounded-full", openStatus.isOpen ? "animate-pulse bg-emerald-400" : "bg-red-400")} />
            {openStatus.message}
          </p>
        )}
      </div>
    </div>
  );
}
