import type { Metadata } from "next";
import Link from "next/link";
import { Coffee, Home } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { StatusPage } from "@/components/layout/StatusPage";

export const metadata: Metadata = { title: "Không tìm thấy trang" };

/** Next.js tự hiện trang này khi URL không khớp trang nào (VD: /trang-linh-tinh) */
export default function NotFound() {
  return (
    <StatusPage
      code="404"
      icon={<Coffee className="h-9 w-9" />}
      title="Ối, ly này trống rồi!"
      description="Trang bạn tìm không tồn tại hoặc đã được dời đi chỗ khác. Ghé thực đơn xem có món nào hợp gu nhé."
    >
      <Link href="/menu" className={buttonClass("primary", "lg", "rounded-full")}>
        <Coffee className="h-5 w-5" /> Xem thực đơn
      </Link>
      <Link href="/" className={buttonClass("outline", "lg", "rounded-full")}>
        <Home className="h-5 w-5" /> Về trang chủ
      </Link>
    </StatusPage>
  );
}
