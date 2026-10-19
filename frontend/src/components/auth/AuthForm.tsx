"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleAlert, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { displayName } from "@/lib/user";
import type { User } from "@/types/user";

type Mode = "login" | "register";
type Errors = Partial<Record<"name" | "email" | "password", string>>;

function validate(mode: Mode, name: string, email: string, password: string): Errors {
  const errors: Errors = {};
  if (mode === "register" && name.trim().length < 2) errors.name = "Tên cần ít nhất 2 ký tự";
  if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = "Email không hợp lệ";
  if (mode === "register" ? password.length < 6 : !password) {
    errors.password = mode === "register" ? "Mật khẩu cần ít nhất 6 ký tự" : "Vui lòng nhập mật khẩu";
  }
  return errors;
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { login, register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === "login";

  // Chỉ cho phép chuyển tới đường dẫn nội bộ (chống open redirect)
  const redirectAfterAuth = (user: User) => {
    const next = searchParams.get("next");
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
    if (safeNext && (user.role === "admin" || !safeNext.startsWith("/admin"))) router.replace(safeNext);
    else router.replace(user.role === "admin" ? "/admin/products" : "/");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const found = validate(mode, name, email, password);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      const user = isLogin ? await login(email, password) : await register(name, email, password);
      toast(isLogin ? `Chào mừng trở lại, ${displayName(user)}!` : "Tạo tài khoản thành công!");
      redirectAfterAuth(user);
    } catch (err) {
      if (err instanceof ApiError && err.errors) setErrors(err.errors);
      setFormError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-4xl font-bold text-coffee-950">{isLogin ? "Đăng nhập" : "Tạo tài khoản"}</h1>
      <p className="mt-2 text-coffee-600">
        {isLogin ? "Chào mừng bạn quay lại Hưng Café." : "Đăng ký để nhận ưu đãi dành riêng cho thành viên."}
      </p>

      {formError && (
        <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-600/15">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        {!isLogin && (
          <Field label="Họ và tên" htmlFor="name" error={errors.name}>
            <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" invalid={!!errors.name} />
          </Field>
        )}
        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@email.com" invalid={!!errors.email} />
        </Field>
        <Field label="Mật khẩu" htmlFor="password" error={errors.password}>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isLogin ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isLogin ? "••••••" : "Ít nhất 6 ký tự"}
              invalid={!!errors.password}
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-coffee-400 hover:text-coffee-700"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        {isLogin && (
          <div className="-mt-2 text-right">
            <Link href="/forgot-password" className="text-sm font-medium text-coffee-600 underline-offset-4 hover:text-coffee-950 hover:underline">
              Quên mật khẩu?
            </Link>
          </div>
        )}

        <Button type="submit" size="lg" loading={submitting} className="w-full rounded-xl">
          {isLogin ? "Đăng nhập" : "Đăng ký"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-coffee-600">
        {isLogin ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
        <Link
          href={`${isLogin ? "/register" : "/login"}${searchParams.get("next") ? `?next=${encodeURIComponent(searchParams.get("next")!)}` : ""}`}
          className="font-semibold text-coffee-900 underline-offset-4 hover:underline"
        >
          {isLogin ? "Đăng ký ngay" : "Đăng nhập"}
        </Link>
      </p>
    </div>
  );
}
