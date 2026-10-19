"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, ShoppingBag, X } from "lucide-react";
import { Logo } from "./Logo";
import { SectionLink } from "./SectionLink";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Trang chủ" },
  { href: "/menu", label: "Thực đơn" },
  { href: "/#about", label: "Về chúng tôi" },
  { href: "/contact", label: "Liên hệ" },
];

export function Navbar() {
  const pathname = usePathname();
  const { cart, openCart } = useCart();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-all duration-300",
        scrolled ? "border-b border-coffee-100 bg-cream/85 backdrop-blur-lg" : "bg-transparent",
      )}
    >
      <nav className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />

        <ul className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active = link.href === pathname;
            return (
              <li key={link.href}>
                <SectionLink
                  href={link.href}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    active ? "bg-coffee-900 text-cream" : "text-coffee-700 hover:bg-coffee-100 hover:text-coffee-950",
                  )}
                >
                  {link.label}
                </SectionLink>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <button
            onClick={openCart}
            className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-coffee-800 transition hover:bg-coffee-100"
            aria-label={`Giỏ hàng (${cart.totalQuantity} món)`}
          >
            <ShoppingBag className="h-5 w-5" />
            {cart.totalQuantity > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-coffee-500 px-1 text-[10px] font-bold text-white ring-2 ring-cream">
                {cart.totalQuantity > 99 ? "99+" : cart.totalQuantity}
              </span>
            )}
          </button>
          {/* Chuông thông báo: khách nhận tin đơn hàng đổi trạng thái */}
          {user && <NotificationBell />}
          <UserMenu />
          <button
            onClick={() => setOpen(!open)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-coffee-900 hover:bg-coffee-100 md:hidden"
            aria-label="Mở menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Menu mobile */}
      {open && (
        <div className="border-t border-coffee-100 bg-cream px-4 pb-6 pt-2 md:hidden">
          <ul className="space-y-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <SectionLink
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-4 py-3 font-medium text-coffee-800 hover:bg-coffee-100"
                >
                  {link.label}
                </SectionLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
