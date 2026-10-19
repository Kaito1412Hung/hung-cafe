"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, LayoutGrid, Mail, Menu, Package, Settings, ShoppingCart, Tags, Users, X } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { NotificationBell } from "./NotificationBell";
import { AdminUserMenu } from "./AdminUserMenu";
import { cn } from "@/lib/utils";

// Thứ tự menu giữ như thiết kế ban đầu
const NAV = [
  { href: "/admin/products", label: "Sản phẩm", icon: Package },
  { href: "/admin/categories", label: "Danh mục", icon: Tags },
  { href: "/admin/dashboard", label: "Tổng quan", icon: LayoutGrid },
  { href: "/admin/orders", label: "Đơn hàng", icon: ShoppingCart },
  { href: "/admin/customers", label: "Khách hàng", icon: Users },
  { href: "/admin/contact", label: "Liên hệ", icon: Mail },
  { href: "/admin/settings", label: "Cài đặt", icon: Settings },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f4ef] lg:pl-68 print:bg-white print:pl-0">
      {/* Lớp phủ khi mở sidebar trên mobile */}
      {open && <div className="fixed inset-0 z-40 bg-coffee-950/40 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-68 flex-col bg-coffee-950 px-4 py-6 transition-transform lg:translate-x-0 print:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-2">
          <Logo light href="/admin/products" />
          <button onClick={() => setOpen(false)} className="text-coffee-300 lg:hidden" aria-label="Đóng menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-10 px-3 text-xs font-semibold uppercase tracking-wider text-coffee-500">Quản lý</p>
        <nav className="mt-3 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active ? "bg-coffee-800 text-cream" : "text-coffee-300 hover:bg-coffee-900 hover:text-cream",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl bg-coffee-900 p-4">
          <p className="text-sm font-medium text-cream">Đã kết nối backend</p>
          <p className="mt-1 text-xs leading-relaxed text-coffee-400">
            Dữ liệu lưu trong PostgreSQL qua REST API Node.js.
          </p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-16 print:hidden items-center gap-4 border-b border-coffee-100 bg-white/80 px-4 backdrop-blur-lg lg:px-8">
          <button onClick={() => setOpen(true)} className="text-coffee-800 lg:hidden" aria-label="Mở menu">
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1" />
          <Link href="/" target="_blank" className="hidden items-center gap-1.5 text-sm font-medium text-coffee-600 hover:text-coffee-950 sm:flex">
            Xem trang web <ExternalLink className="h-4 w-4" />
          </Link>
          <NotificationBell />
          <AdminUserMenu />
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 print:p-0">{children}</main>
      </div>
    </div>
  );
}
