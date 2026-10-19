"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, ShieldX } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

/**
 * Chỉ admin mới thấy nội dung bên trong.
 * Lưu ý: đây chỉ là lớp bảo vệ giao diện — backend mới là nơi chặn thật sự (requireRole).
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <Loader2 className="h-8 w-8 animate-spin text-coffee-500" />
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
          <ShieldX className="h-8 w-8" />
        </span>
        <h1 className="mt-6 font-display text-3xl font-bold text-coffee-950">Không có quyền truy cập</h1>
        <p className="mt-2 max-w-sm text-coffee-600">
          Tài khoản <strong>{user.email}</strong> là khách hàng. Trang này chỉ dành cho quản trị viên.
        </p>
        <Link href="/" className={buttonClass("primary", "md", "mt-8 rounded-full")}>
          Về trang chủ
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
