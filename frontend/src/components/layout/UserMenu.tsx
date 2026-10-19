"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Heart, LayoutDashboard, LogOut, Receipt, ShieldCheck, User as UserIcon, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { displayName } from "@/lib/user";
import { cn } from "@/lib/utils";

const itemClass = "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-coffee-800 hover:bg-coffee-50";

export function UserMenu() {
  const { user, loading, logout } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Click ra ngoài / Esc thì đóng menu
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (loading) return <div className="h-9 w-24 animate-pulse rounded-full bg-coffee-100" />;

  if (!user) {
    return (
      <Link href="/login" className={buttonClass("primary", "sm", "rounded-full px-4")}>
        <UserIcon className="h-4 w-4" /> Đăng nhập
      </Link>
    );
  }

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    toast("Đã đăng xuất", "info");
    router.push("/");
  };

  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex cursor-pointer items-center gap-2 rounded-full py-1 pl-1 pr-3 transition hover:bg-coffee-100"
        aria-expanded={open}
        aria-label="Menu tài khoản"
      >
        <Avatar user={user} size="sm" />
        <span className="hidden max-w-28 truncate text-sm font-medium text-coffee-900 sm:block">{displayName(user)}</span>
        <ChevronDown className={cn("h-4 w-4 text-coffee-500 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-coffee-100 animate-modal-in">
          <div className="flex flex-col items-center border-b border-coffee-100 px-4 pb-4 pt-5 text-center">
            <Avatar user={user} size="lg" />
            <p className="mt-3 max-w-full truncate font-semibold text-coffee-950">Xin chào, {displayName(user)}!</p>
            <p className="max-w-full truncate text-xs text-coffee-500">{user.email}</p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-coffee-100 px-2 py-0.5 text-xs font-medium text-coffee-800">
              {user.role === "admin" && <ShieldCheck className="h-3 w-3" />}
              {user.role === "admin" ? "Quản trị viên" : "Khách hàng"}
            </span>
            <Link href="/account" onClick={close} className={buttonClass("outline", "sm", "mt-4 rounded-full px-4")}>
              Quản lý tài khoản
            </Link>
          </div>
          <div className="p-1.5">
            <Link href="/account" onClick={close} className={itemClass}>
              <UserRound className="h-4 w-4" /> Tài khoản của tôi
            </Link>
            <Link href="/orders" onClick={close} className={itemClass}>
              <Receipt className="h-4 w-4" /> Đơn hàng của tôi
            </Link>
            <Link href="/favorites" onClick={close} className={itemClass}>
              <Heart className="h-4 w-4" /> Món yêu thích
            </Link>
            {user.role === "admin" && (
              <Link href="/admin/dashboard" onClick={close} className={itemClass}>
                <LayoutDashboard className="h-4 w-4" /> Trang quản lý
              </Link>
            )}
            <button onClick={handleLogout} className={cn(itemClass, "w-full cursor-pointer text-red-600 hover:bg-red-50")}>
              <LogOut className="h-4 w-4" /> Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
