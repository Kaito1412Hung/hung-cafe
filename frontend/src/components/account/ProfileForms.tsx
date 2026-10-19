"use client";

import { useState, type FormEvent } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { SettingsCard } from "@/components/admin/SettingsCard";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { GENDER_LABELS } from "@/lib/user";
import { cn } from "@/lib/utils";
import { profileService } from "@/services/profileService";
import type { Gender, ProfileInput, User } from "@/types/user";
import { AvatarUploader } from "./AvatarUploader";

type Errors = Record<string, string | undefined>;

/** Hook dùng chung: giữ bản nháp của vài trường, so với dữ liệu gốc để biết có thay đổi không */
function useDraft<K extends keyof ProfileInput>(user: User, keys: K[]) {
  const original = Object.fromEntries(keys.map((k) => [k, (user[k as keyof User] ?? "") as string])) as Record<K, string>;
  const [draft, setDraft] = useState<Partial<Record<K, string>>>({});
  const values = { ...original, ...draft } as Record<K, string>;
  const dirty = keys.some((k) => values[k] !== original[k]);
  return { values, dirty, set: (k: K, v: string) => setDraft((d) => ({ ...d, [k]: v })), reset: () => setDraft({}) };
}

/* ================= Hồ sơ cá nhân ================= */
export function PersonalInfoForm() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const { values, dirty, set, reset } = useDraft(user!, ["name", "nickname", "phone", "birthday", "gender"]);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const change = (k: Parameters<typeof set>[0], v: string) => {
    set(k, v);
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (values.name.trim().length < 2) return setErrors({ name: "Họ tên cần ít nhất 2 ký tự" });
    setSaving(true);
    try {
      updateUser(await profileService.update({ ...values, gender: values.gender as Gender }));
      reset();
      setErrors({});
      toast("Đã lưu thông tin cá nhân");
    } catch (err) {
      if (err instanceof ApiError && err.errors) setErrors(err.errors);
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={handleSubmit} noValidate>
      <SettingsCard
        title="Thông tin cá nhân"
        description="Ảnh đại diện và tên hiển thị sẽ xuất hiện trên menu tài khoản."
        footer={
          <>
            <Button type="button" variant="outline" onClick={reset} disabled={!dirty || saving}>
              Huỷ
            </Button>
            <Button type="submit" loading={saving} disabled={!dirty}>
              Lưu thay đổi
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <AvatarUploader />

          <div className="grid gap-4 @md:grid-cols-2">
            <Field label="Họ và tên" htmlFor="name" error={errors.name} hint="Tên thật, dùng khi giao hàng">
              <Input id="name" autoComplete="name" value={values.name} onChange={(e) => change("name", e.target.value)} invalid={!!errors.name} />
            </Field>
            <Field label="Tên hiển thị (biệt danh)" htmlFor="nickname" error={errors.nickname} hint="Quán sẽ gọi bạn bằng tên này, VD: Hưng">
              <Input id="nickname" value={values.nickname} onChange={(e) => change("nickname", e.target.value)} placeholder={values.name} maxLength={50} invalid={!!errors.nickname} />
            </Field>
            <Field label="Email" htmlFor="email" hint="Email đăng nhập không thể thay đổi">
              <Input id="email" value={user!.email} disabled className="bg-coffee-50 text-coffee-500" />
            </Field>
            <Field label="Số điện thoại" htmlFor="phone" error={errors.phone}>
              <Input id="phone" type="tel" autoComplete="tel" value={values.phone} onChange={(e) => change("phone", e.target.value)} placeholder="0971 131 945" invalid={!!errors.phone} />
            </Field>
            <Field label="Ngày sinh" htmlFor="birthday" error={errors.birthday}>
              <Input id="birthday" type="date" max={today} value={values.birthday} onChange={(e) => change("birthday", e.target.value)} invalid={!!errors.birthday} />
            </Field>
            <div className="space-y-1.5">
              <span className="block text-sm font-medium text-coffee-900">Giới tính</span>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Giới tính">
                {(["male", "female", "other", ""] as Gender[]).map((g) => (
                  <button
                    key={g || "none"}
                    type="button"
                    role="radio"
                    aria-checked={values.gender === g}
                    onClick={() => change("gender", g)}
                    className={cn(
                      "h-11 cursor-pointer rounded-xl border px-3.5 text-sm transition",
                      values.gender === g ? "border-coffee-800 bg-coffee-900 text-cream" : "border-coffee-200 bg-white text-coffee-700 hover:bg-coffee-50",
                    )}
                  >
                    {GENDER_LABELS[g]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SettingsCard>
    </form>
  );
}

/* ================= Địa chỉ giao hàng ================= */
export function AddressForm() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const { values, dirty, set, reset } = useDraft(user!, ["address"]);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (values.address.trim() && values.address.trim().length < 5) return setError("Địa chỉ cần ít nhất 5 ký tự");
    setSaving(true);
    try {
      updateUser(await profileService.update({ address: values.address }));
      reset();
      toast("Đã lưu địa chỉ giao hàng");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <SettingsCard
        title="Địa chỉ giao hàng"
        description="Được tự động điền khi bạn đặt hàng, đỡ phải gõ lại mỗi lần."
        footer={
          <>
            <Button type="button" variant="outline" onClick={reset} disabled={!dirty || saving}>
              Huỷ
            </Button>
            <Button type="submit" loading={saving} disabled={!dirty}>
              Lưu địa chỉ
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Địa chỉ mặc định" htmlFor="address" error={error} hint="Số nhà, tên đường, phường, quận, tỉnh/thành">
            <Textarea
              id="address"
              autoComplete="street-address"
              value={values.address}
              onChange={(e) => {
                set("address", e.target.value);
                setError(undefined);
              }}
              className="min-h-20"
              invalid={!!error}
            />
          </Field>
          <div className="flex items-start gap-3 rounded-xl bg-coffee-50 p-4 text-sm text-coffee-700">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-coffee-500" />
            <p>
              Khi đặt hàng, quán sẽ dùng <strong>{user!.name}</strong>
              {user!.phone ? (
                <>
                  {" "}· <strong>{user!.phone}</strong>
                </>
              ) : (
                " (chưa có số điện thoại — thêm ở mục Hồ sơ)"
              )}{" "}
              và địa chỉ này. Bạn vẫn có thể sửa trước khi xác nhận đơn.
            </p>
          </div>
        </div>
      </SettingsCard>
    </form>
  );
}
