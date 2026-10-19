import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  // useSearchParams() trong AuthForm cần được bọc Suspense
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
