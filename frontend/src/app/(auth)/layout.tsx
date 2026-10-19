import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { unsplash } from "@/lib/utils";

/** Layout chia đôi màn hình cho trang đăng nhập / đăng ký */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-4 py-8 sm:px-12 lg:px-20">
        <div className="flex items-center justify-between">
          <Logo />
          <Link href="/" className="flex items-center gap-1.5 text-sm font-medium text-coffee-600 hover:text-coffee-950">
            <ArrowLeft className="h-4 w-4" /> Trang chủ
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">{children}</div>
      </div>

      <div className="relative hidden lg:block">
        <Image src={unsplash("1501339847302-ac426a4a7cbb", 1400)} alt="Không gian Hưng Café" fill priority sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-linear-to-t from-coffee-950/80 via-coffee-950/20 to-transparent" />
        <div className="absolute inset-x-12 bottom-12 text-cream">
          <p className="font-display text-4xl font-bold leading-tight">&ldquo;Một tách cà phê — trọn vẹn một ngày.&rdquo;</p>
          <p className="mt-3 text-coffee-200">Hưng Café · Tây Thạnh, TP.HCM</p>
        </div>
      </div>
    </div>
  );
}
