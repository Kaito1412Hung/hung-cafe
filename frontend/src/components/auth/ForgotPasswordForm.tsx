"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CircleCheckBig, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/FormField";
import { useShopSettings } from "@/context/ShopSettingsContext";
import { api } from "@/lib/api";

/**
 * Quên mật khẩu (bản cơ bản, chưa gửi email):
 * khách gửi yêu cầu → admin nhận thông báo → admin xác minh qua điện thoại rồi đặt lại mật khẩu.
 */
export function ForgotPasswordForm() {
  const { settings } = useShopSettings();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Email không hợp lệ");
    setSubmitting(true);
    try {
      await api("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const contact = (
    <div className="space-y-2 rounded-2xl bg-coffee-50 p-4 text-sm text-coffee-700">
      <p className="font-medium text-coffee-900">Cần gấp? Liên hệ trực tiếp với quán:</p>
      <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:text-coffee-950">
        <Phone className="h-4 w-4 text-coffee-500" /> {settings.phone}
      </a>
      <a href={`mailto:${settings.email}`} className="flex items-center gap-2 break-all hover:text-coffee-950">
        <Mail className="h-4 w-4 shrink-0 text-coffee-500" /> {settings.email}
      </a>
    </div>
  );

  if (sent) {
    return (
      <div className="animate-fade-up space-y-6">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CircleCheckBig className="h-7 w-7" />
        </span>
        <div>
          <h1 className="font-display text-4xl font-bold text-coffee-950">Đã gửi yêu cầu</h1>
          <p className="mt-3 leading-relaxed text-coffee-600">
            Nếu <strong>{email}</strong> đã đăng ký tài khoản, quán sẽ liên hệ bạn để xác minh và gửi <strong>mật khẩu tạm</strong>. Sau khi đăng
            nhập, hãy đổi lại mật khẩu trong &ldquo;Tài khoản của tôi&rdquo;.
          </p>
        </div>
        {contact}
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-coffee-900 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Quay lại đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-4xl font-bold text-coffee-950">Quên mật khẩu?</h1>
      <p className="mt-2 text-coffee-600">Nhập email bạn đã dùng để đăng ký, quán sẽ hỗ trợ bạn lấy lại tài khoản.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        <Field label="Email" htmlFor="email" error={error}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(undefined);
            }}
            placeholder="ban@email.com"
            invalid={!!error}
            autoFocus
          />
        </Field>
        <Button type="submit" size="lg" loading={submitting} className="w-full rounded-xl">
          Gửi yêu cầu
        </Button>
      </form>

      <div className="mt-6">{contact}</div>

      <p className="mt-8 text-center text-sm text-coffee-600">
        Nhớ ra rồi?{" "}
        <Link href="/login" className="font-semibold text-coffee-900 underline-offset-4 hover:underline">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
