"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ExternalLink, LogOut, Settings, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { displayName } from "@/lib/user";
import { cn } from "@/lib/utils";

const itemClass = "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-coffee-800 hover:bg-coffee-50";

/** Menu avatar trên thanh trên cùng của trang quản trị */
export function AdminUserMenu() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  if (!user) return null;

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    toast("Đã đăng xuất", "info");
    router.push("/login");
  };

  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative border-l border-coffee-100 pl-3">
      <button
        onClick={() => setOpen(!open)}
        className={cn("flex cursor-pointer items-center gap-3 rounded-xl py-1 pl-1 pr-2 transition hover:bg-coffee-50", open && "bg-coffee-50")}
        aria-expanded={open}
        aria-label="Menu tài khoản"
      >
        <Avatar user={user} size="md" tone="light" />
        <div className="hidden text-left leading-tight sm:block">
          <p className="max-w-40 truncate text-sm font-semibold text-coffee-950">{displayName(user)}</p>
          <p className="max-w-40 truncate text-xs text-coffee-500">{user.email}</p>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-coffee-400 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-coffee-100 animate-modal-in">
          <div className="flex items-center gap-3 border-b border-coffee-100 p-4">
            <Avatar user={user} size="md" tone="light" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-coffee-950">{displayName(user)}</p>
              <p className="truncate text-xs text-coffee-500">{user.email}</p>
            </div>
          </div>
          <div className="p-1.5">
            <Link href="/admin/profile" onClick={close} className={itemClass}>
              <UserRound className="h-4 w-4" /> Hồ sơ của tôi
            </Link>
            <Link href="/admin/settings" onClick={close} className={itemClass}>
              <Settings className="h-4 w-4" /> Cài đặt cửa hàng
            </Link>
            <Link href="/" target="_blank" onClick={close} className={itemClass}>
              <ExternalLink className="h-4 w-4" /> Xem trang web
            </Link>
            <button onClick={handleLogout} className={cn(itemClass, "cursor-pointer text-red-600 hover:bg-red-50")}>
              <LogOut className="h-4 w-4" /> Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
