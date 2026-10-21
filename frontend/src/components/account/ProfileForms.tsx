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
import { cn, vnDate } from "@/lib/utils";
import { profileService } from "@/services/profileService";
import type { Gender, ProfileInput, User } from "@/types/user";
import { AvatarUploader } from "./AvatarUploader";

type Errors = Record<string, string | undefined>;

/** Hook dùng chung: giữ bản nháp của vài trường, so với dữ liệu gốc để biết có thay đổi không */
function useDraft<K extends keyof ProfileInput>(user: User, keys: K[]) {
  const original = Object.fromEntries(keys.map((k) => [k, (user[k as keyof User] ?? "") as string])) as Record<K, string>;
  const [draft, setDraft] = useState<Partial<Record<K, string>>>({});
  const values = { ...original, ...draft } as Record<K, string>;
  // Chỉ những trường người dùng thật sự sửa → gửi lên server đúng những trường đó
  const changes = Object.fromEntries(keys.filter((k) => values[k] !== original[k]).map((k) => [k, values[k]])) as Partial<Record<K, string>>;
  const dirty = Object.keys(changes).length > 0;
  return { values, changes, dirty, set: (k: K, v: string) => setDraft((d) => ({ ...d, [k]: v })), reset: () => setDraft({}) };
}

/* ================= Hồ sơ cá nhân ================= */
export function PersonalInfoForm() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const { values, changes, dirty: fieldsDirty, set, reset: resetFields } = useDraft(user!, ["name", "nickname", "phone", "birthday", "gender"]);
  // Ảnh mới chọn nhưng chưa lưu: null = không đổi, "" = xoá ảnh, "data:..." = ảnh mới
  const [avatarDraft, setAvatarDraft] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const dirty = fieldsDirty || avatarDraft !== null;
  const reset = () => {
    resetFields();
    setAvatarDraft(null);
    setErrors({});
  };

  const change = (k: Parameters<typeof set>[0], v: string) => {
    set(k, v);
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Chỉ Họ và tên là bắt buộc; các ô khác để trống vẫn lưu được
    if (values.name.trim().length < 2) return setErrors({ name: "Họ tên cần ít nhất 2 ký tự" });
    setSaving(true);
    try {
      if (avatarDraft !== null) updateUser(await profileService.updateAvatar(avatarDraft));
      if (fieldsDirty) updateUser(await profileService.update({ ...changes, gender: changes.gender as Gender | undefined }));
      reset();
      toast(fieldsDirty || avatarDraft === null ? "Đã lưu thông tin cá nhân" : avatarDraft ? "Đã cập nhật ảnh đại diện" : "Đã xoá ảnh đại diện");
    } catch (err) {
      if (err instanceof ApiError && err.errors) setErrors(err.errors);
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const today = vnDate();

  return (
    <form onSubmit={handleSubmit} noValidate>
      <SettingsCard
        title="Thông tin cá nhân"
        description="Chỉ có Họ và tên là bắt buộc — các mục khác để trống vẫn lưu được. Muốn đổi mỗi ảnh đại diện cũng được."
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
          <AvatarUploader
            user={{ name: values.name || user!.name, nickname: values.nickname }}
            value={avatarDraft ?? user!.avatar}
            pending={avatarDraft !== null}
            onChange={setAvatarDraft}
            onUndo={() => setAvatarDraft(null)}
            disabled={saving}
          />

          <div className="grid gap-4 @md:grid-cols-2">
            <Field label="Họ và tên" htmlFor="name" error={errors.name} hint="Tên thật, dùng khi giao hàng" required>
              <Input id="name" autoComplete="name" value={values.name} onChange={(e) => change("name", e.target.value)} invalid={!!errors.name} />
            </Field>
            <Field label="Tên hiển thị (biệt danh)" htmlFor="nickname" error={errors.nickname} hint="Không bắt buộc · Quán sẽ gọi bạn bằng tên này">
              <Input id="nickname" value={values.nickname} onChange={(e) => change("nickname", e.target.value)} placeholder={values.name} maxLength={50} invalid={!!errors.nickname} />
            </Field>
            <Field label="Email" htmlFor="email" hint="Email đăng nhập không thể thay đổi">
              <Input id="email" value={user!.email} disabled className="bg-coffee-50 text-coffee-500" />
            </Field>
            <Field label="Số điện thoại" htmlFor="phone" error={errors.phone} hint="Không bắt buộc">
              <Input id="phone" type="tel" autoComplete="tel" value={values.phone} onChange={(e) => change("phone", e.target.value)} placeholder="0971 131 945" invalid={!!errors.phone} />
            </Field>
            <Field label="Ngày sinh" htmlFor="birthday" error={errors.birthday} hint="Không bắt buộc">
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
              <p className="text-xs text-coffee-500">Không bắt buộc</p>
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
