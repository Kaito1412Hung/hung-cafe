"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ChevronRight, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { SettingsCard } from "@/components/admin/SettingsCard";
import { useShopSettings } from "@/context/ShopSettingsContext";
import { ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { settingsService } from "@/services/settingsService";
import type { ShopSettings } from "@/types/settings";

type Errors = Record<string, string | undefined>;

/* ================= Thông tin cửa hàng + giao hàng ================= */
function ShopSettingsForm() {
  const toast = useToast();
  const { settings, setSettings } = useShopSettings();
  // Form giữ bản nháp riêng; "Huỷ thay đổi" thì quay về giá trị đã lưu
  const [draft, setDraft] = useState<ShopSettings | null>(null);
  const values = draft ?? settings;
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ShopSettings>(key: K, value: ShopSettings[K]) => {
    setDraft({ ...values, [key]: value });
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await settingsService.updateShop(values);
      setSettings(saved);
      setDraft(null);
      setErrors({});
      toast("Đã lưu thông tin cửa hàng");
    } catch (err) {
      if (err instanceof ApiError && err.errors) setErrors(err.errors);
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const numberInput = (key: "shippingFee" | "freeShippingThreshold") => (
    <Input
      id={key}
      type="number"
      min={0}
      step={1000}
      value={values[key]}
      onChange={(e) => set(key, e.target.value === "" ? 0 : Number(e.target.value))}
      invalid={!!errors[key]}
    />
  );

  const footer = (
    <>
      <Button variant="outline" type="button" onClick={() => setDraft(null)} disabled={!draft || saving}>
        Huỷ thay đổi
      </Button>
      <Button type="submit" form="shop-form" loading={saving} disabled={!draft}>
        Lưu thay đổi
      </Button>
    </>
  );

  return (
    <form id="shop-form" onSubmit={handleSubmit} noValidate className="space-y-6">
      <SettingsCard title="Thông tin cửa hàng" description="Hiển thị ở chân trang (footer) của website.">
        <div className="grid gap-4 @md:grid-cols-2">
          <Field label="Tên quán" htmlFor="name" error={errors.name}>
            <Input id="name" value={values.name} onChange={(e) => set("name", e.target.value)} invalid={!!errors.name} />
          </Field>
          <Field label="Số điện thoại" htmlFor="phone" error={errors.phone}>
            <Input id="phone" value={values.phone} onChange={(e) => set("phone", e.target.value)} invalid={!!errors.phone} />
          </Field>
          <Field label="Email liên hệ" htmlFor="email" error={errors.email} className="@md:col-span-2">
            <Input id="email" type="email" value={values.email} onChange={(e) => set("email", e.target.value)} invalid={!!errors.email} />
          </Field>
          <Field label="Địa chỉ" htmlFor="address" error={errors.address} className="@md:col-span-2">
            <Input id="address" value={values.address} onChange={(e) => set("address", e.target.value)} invalid={!!errors.address} />
          </Field>
          <Field label="Giờ mở cửa Thứ 2 – Thứ 6" htmlFor="openingHoursWeekday" error={errors.openingHoursWeekday}>
            <Input id="openingHoursWeekday" value={values.openingHoursWeekday} onChange={(e) => set("openingHoursWeekday", e.target.value)} invalid={!!errors.openingHoursWeekday} />
          </Field>
          <Field label="Giờ mở cửa Thứ 7 – CN" htmlFor="openingHoursWeekend" error={errors.openingHoursWeekend}>
            <Input id="openingHoursWeekend" value={values.openingHoursWeekend} onChange={(e) => set("openingHoursWeekend", e.target.value)} invalid={!!errors.openingHoursWeekend} />
          </Field>
          <Field label="Giới thiệu ngắn" htmlFor="tagline" error={errors.tagline} hint={`${values.tagline.length}/160 ký tự`} className="@md:col-span-2">
            <Textarea id="tagline" value={values.tagline} onChange={(e) => set("tagline", e.target.value)} className="min-h-20" invalid={!!errors.tagline} />
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Giao hàng"
        description="Backend dùng các giá trị này để tính tiền khi khách đặt hàng."
        footer={footer}
      >
        <div className="grid gap-4 @md:grid-cols-2">
          <Field label="Phí giao hàng (VNĐ)" htmlFor="shippingFee" error={errors.shippingFee}>
            {numberInput("shippingFee")}
          </Field>
          <Field label="Miễn phí giao khi đơn từ (VNĐ)" htmlFor="freeShippingThreshold" error={errors.freeShippingThreshold}>
            {numberInput("freeShippingThreshold")}
          </Field>
        </div>
        <p className="mt-4 rounded-xl bg-coffee-50 px-4 py-3 text-sm text-coffee-700">
          Đơn dưới <strong>{formatPrice(values.freeShippingThreshold)}</strong> tính phí <strong>{formatPrice(values.shippingFee)}</strong>, từ mức này
          trở lên được miễn phí giao hàng.
        </p>
      </SettingsCard>
    </form>
  );
}

export default function AdminSettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-sm text-coffee-500">Quản lý / Cài đặt</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-coffee-950">Cài đặt cửa hàng</h1>
        <p className="mt-1 text-coffee-600">Thông tin cửa hàng và phí giao hàng.</p>
      </div>

      <Link
        href="/admin/profile"
        className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-coffee-100 transition hover:bg-coffee-50"
      >
        <UserRound className="h-5 w-5 text-coffee-500" />
        <p className="flex-1 text-sm text-coffee-700">
          Muốn đổi <strong>ảnh đại diện, tên hiển thị hoặc mật khẩu</strong> của bạn? Vào trang Hồ sơ của tôi.
        </p>
        <ChevronRight className="h-4 w-4 text-coffee-400" />
      </Link>

      <ShopSettingsForm />
    </div>
  );
}
