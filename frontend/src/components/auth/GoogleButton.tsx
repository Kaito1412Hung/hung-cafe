"use client";

import { useEffect, useState } from "react";
import { authService } from "@/services/authService";

/** Thông báo khi đăng nhập Google thất bại (backend đưa về /login?google_error=…) */
export const GOOGLE_ERRORS: Record<string, string> = {
  off: "Đăng nhập bằng Google đang tạm tắt. Bạn dùng email và mật khẩu nhé.",
  cancelled: "Bạn đã huỷ đăng nhập bằng Google.",
  state: "Phiên đăng nhập Google đã hết hạn, vui lòng bấm lại nút Google.",
  unverified: "Email của tài khoản Google này chưa được Google xác minh.",
  admin: "Tài khoản quản trị chỉ đăng nhập bằng email và mật khẩu.",
  demo: "Tài khoản demo chỉ đăng nhập bằng email và mật khẩu công khai.",
  failed: "Không đăng nhập được bằng Google, vui lòng thử lại sau.",
};

/** Logo chữ G nhiều màu của Google (theo hướng dẫn thương hiệu "Sign in with Google") */
function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/**
 * Nút "Tiếp tục với Google": mở thẳng link backend (chuyển trang, không gọi fetch) → backend chuyển sang Google.
 * Tự ẩn khi backend chưa có mã OAuth Google.
 */
export function GoogleButton({ next }: { next: string | null }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    authService
      .options()
      .then((o) => setEnabled(o.google))
      .catch(() => setEnabled(false));
  }, []);

  if (!enabled) return null;
  const href = `/api/auth/google${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-coffee-400">
        <span className="h-px flex-1 bg-coffee-100" />
        hoặc
        <span className="h-px flex-1 bg-coffee-100" />
      </div>
      <a
        href={href}
        className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-coffee-200 bg-white text-sm font-semibold text-coffee-900 transition hover:border-coffee-300 hover:bg-coffee-50"
      >
        <GoogleLogo /> Tiếp tục với Google
      </a>
    </div>
  );
}
