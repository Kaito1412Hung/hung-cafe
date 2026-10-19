"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Loader2, MapPin, Receipt, ShieldCheck, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyCart } from "@/components/cart/EmptyCart";
import { useAuth } from "@/context/AuthContext";
import { displayName } from "@/lib/user";
import { cn, formatDate } from "@/lib/utils";
import { AddressForm, PersonalInfoForm } from "./ProfileForms";
import { ChangePasswordForm, DeleteAccountCard, SessionsCard } from "./SecuritySection";

type Tab = "profile" | "address" | "security";

const TABS: { value: Tab; label: string; icon: typeof UserRound }[] = [
  { value: "profile", label: "Hồ sơ", icon: UserRound },
  { value: "address", label: "Địa chỉ", icon: MapPin },
  { value: "security", label: "Bảo mật", icon: ShieldCheck },
];

/** Trang "Tài khoản của tôi" — dùng chung cho khách (/account) và admin (/admin/profile) */
export function AccountView({ variant }: { variant: "site" | "admin" }) {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("profile");

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-coffee-400" />
      </div>
    );
  }

  if (!user) {
    return <EmptyCart title="Bạn chưa đăng nhập" description="Đăng nhập để quản lý tài khoản." action={{ href: "/login?next=/account", label: "Đăng nhập" }} />;
  }

  return (
    <div className="@container space-y-6">
      {/* Thẻ tóm tắt tài khoản */}
      <div className="relative overflow-hidden rounded-3xl bg-coffee-900 p-6 text-cream sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-coffee-700/40 blur-2xl" />
        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <Avatar user={user} size="xl" className="ring-4 ring-coffee-700" />
          <div className="min-w-0">
            <p className="text-sm text-coffee-300">Tài khoản của tôi</p>
            <h1 className="mt-0.5 truncate font-display text-3xl font-bold">{displayName(user)}</h1>
            <p className="mt-1 truncate text-sm text-coffee-200">
              {user.name !== displayName(user) && <>{user.name} · </>}
              {user.email}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-coffee-800 px-2.5 py-1">
                {user.role === "admin" && <ShieldCheck className="h-3 w-3" />}
                {user.role === "admin" ? "Quản trị viên" : "Khách hàng"}
              </span>
              <span className="rounded-full bg-coffee-800 px-2.5 py-1">Thành viên từ {formatDate(user.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 @4xl:grid-cols-[220px_1fr]">
        {/* Menu các mục */}
        <nav className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] @4xl:flex-col @4xl:overflow-visible">
          {TABS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={cn(
                "flex shrink-0 cursor-pointer items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition",
                tab === value ? "bg-coffee-900 text-cream shadow-sm" : "bg-white text-coffee-700 ring-1 ring-coffee-100 hover:bg-coffee-50 @4xl:bg-transparent @4xl:ring-0",
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
          {variant === "site" && (
            <Link
              href="/orders"
              className="flex shrink-0 items-center gap-2.5 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-coffee-700 ring-1 ring-coffee-100 transition hover:bg-coffee-50 @4xl:bg-transparent @4xl:ring-0"
            >
              <Receipt className="h-4 w-4" /> Đơn hàng của tôi <ChevronRight className="ml-auto hidden h-4 w-4 @4xl:block" />
            </Link>
          )}
        </nav>

        <div className="min-w-0 space-y-6">
          {tab === "profile" && <PersonalInfoForm />}
          {tab === "address" && <AddressForm />}
          {tab === "security" && (
            <>
              <ChangePasswordForm />
              <SessionsCard />
              {user.role === "customer" && <DeleteAccountCard />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
