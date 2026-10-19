"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Home, RotateCcw, Unplug } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/Button";
import { StatusPage } from "@/components/layout/StatusPage";

/**
 * Hiện khi một trang bị lỗi lúc chạy (VD: backend tắt khi đang render trang chi tiết món).
 * Phải là Client Component; `reset()` thử render lại trang mà không cần tải lại toàn bộ.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      code="500"
      icon={<Unplug className="h-9 w-9" />}
      title="Máy pha đang trục trặc"
      description="Có lỗi xảy ra khi tải trang này. Bạn thử lại sau ít giây nhé — nếu vẫn lỗi, hãy liên hệ quán."
    >
      <Button size="lg" className="rounded-full" onClick={reset}>
        <RotateCcw className="h-5 w-5" /> Thử lại
      </Button>
      <Link href="/" className={buttonClass("outline", "lg", "rounded-full")}>
        <Home className="h-5 w-5" /> Về trang chủ
      </Link>
      {process.env.NODE_ENV === "development" && (
        <p className="w-full rounded-xl bg-red-50 px-4 py-2 font-mono text-xs text-red-700">{error.message}</p>
      )}
    </StatusPage>
  );
}
