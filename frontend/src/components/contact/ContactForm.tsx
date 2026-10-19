"use client";

import { useState, type FormEvent } from "react";
import { CircleCheckBig, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/FormField";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { contactService } from "@/services/contactService";
import type { ContactInput } from "@/types/contact";

type Errors = Partial<Record<keyof ContactInput, string>>;

function validate(v: ContactInput): Errors {
  const errors: Errors = {};
  if (v.name.trim().length < 2) errors.name = "Vui lòng nhập tên";
  if (!/^\S+@\S+\.\S+$/.test(v.email)) errors.email = "Email không hợp lệ";
  if (v.phone && !/^(0|\+84)\d{9}$/.test(v.phone.replace(/[\s.-]/g, ""))) errors.phone = "Số điện thoại không hợp lệ";
  if (v.message.trim().length < 10) errors.message = "Nội dung cần ít nhất 10 ký tự";
  return errors;
}

/** Form liên hệ — đang đăng nhập thì tự điền tên, email, SĐT */
export function ContactForm() {
  const { user } = useAuth();
  // Dùng bản nháp: ô nào người dùng chưa gõ thì lấy từ tài khoản (tải xong mới có)
  const [draft, setDraft] = useState<Partial<ContactInput>>({});
  const values: ContactInput = {
    name: draft.name ?? user?.name ?? "",
    email: draft.email ?? user?.email ?? "",
    phone: draft.phone ?? user?.phone ?? "",
    subject: draft.subject ?? "",
    message: draft.message ?? "",
  };
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  const set = (key: keyof ContactInput, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSending(true);
    try {
      setSentMessage(await contactService.send(values));
      setDraft({});
    } catch (err) {
      if (err instanceof ApiError && err.errors) setErrors(err.errors);
      else setErrors({ message: (err as Error).message });
    } finally {
      setSending(false);
    }
  };

  if (sentMessage) {
    return (
      <div className="flex flex-col items-center rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-coffee-100 animate-fade-up">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CircleCheckBig className="h-8 w-8" />
        </span>
        <h2 className="mt-5 font-display text-2xl font-bold text-coffee-950">Cảm ơn bạn!</h2>
        <p className="mt-2 max-w-sm text-coffee-600">{sentMessage}</p>
        <Button variant="outline" className="mt-6 rounded-full" onClick={() => setSentMessage(null)}>
          Gửi tin nhắn khác
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-coffee-100 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Họ và tên" htmlFor="name" error={errors.name} required>
          <Input id="name" autoComplete="name" value={values.name} onChange={(e) => set("name", e.target.value)} invalid={!!errors.name} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email} required hint="Quán sẽ phản hồi qua email này">
          <Input id="email" type="email" autoComplete="email" value={values.email} onChange={(e) => set("email", e.target.value)} invalid={!!errors.email} />
        </Field>
        <Field label="Số điện thoại" htmlFor="phone" error={errors.phone} hint="Không bắt buộc">
          <Input id="phone" type="tel" autoComplete="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} invalid={!!errors.phone} />
        </Field>
        <Field label="Tiêu đề" htmlFor="subject" hint="Không bắt buộc">
          <Input id="subject" value={values.subject} onChange={(e) => set("subject", e.target.value)} placeholder="VD: Đặt tiệc sinh nhật" maxLength={120} />
        </Field>
      </div>
      <Field label="Nội dung" htmlFor="message" error={errors.message} required hint={`${values.message.length}/2000 ký tự`}>
        <Textarea
          id="message"
          value={values.message}
          onChange={(e) => set("message", e.target.value)}
          placeholder="Bạn muốn góp ý, hỏi về món, đặt bàn hay đặt tiệc? Cứ nhắn cho quán nhé..."
          className="min-h-36"
          maxLength={2000}
          invalid={!!errors.message}
        />
      </Field>
      <Button type="submit" size="lg" loading={sending} className="w-full rounded-xl sm:w-auto">
        <Send className="h-4 w-4" /> Gửi tin nhắn
      </Button>
    </form>
  );
}
