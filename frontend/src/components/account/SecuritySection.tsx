"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Eye, EyeOff, LogOut, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { SettingsCard } from "@/components/admin/SettingsCard";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { profileService } from "@/services/profileService";

type Errors = Record<string, string | undefined>;

/** Chấm điểm độ mạnh mật khẩu 0–4 (đơn giản, chỉ để gợi ý người dùng) */
function passwordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}
const STRENGTH = [
  { label: "Rất yếu", color: "bg-red-500" },
  { label: "Yếu", color: "bg-red-400" },
  { label: "Trung bình", color: "bg-amber-400" },
  { label: "Khá mạnh", color: "bg-emerald-400" },
  { label: "Mạnh", color: "bg-emerald-600" },
];

function PasswordInput({ id, value, onChange, invalid, autoComplete }: { id: string; value: string; onChange: (v: string) => void; invalid?: boolean; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} invalid={invalid} className="pr-11" />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-coffee-400 hover:text-coffee-700" aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/* ================= Đổi mật khẩu (tài khoản Google chưa có mật khẩu: tạo mật khẩu) ================= */
export function ChangePasswordForm() {
  const toast = useToast();
  const { user, updateUser } = useAuth();
  // Tài khoản tạo bằng Google chưa có mật khẩu → không hỏi mật khẩu hiện tại
  const creating = user?.hasPassword === false;
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const strength = passwordStrength(pw.newPassword);

  const set = (k: keyof typeof pw, v: string) => {
    setPw((p) => ({ ...p, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found: Errors = {};
    if (!creating && !pw.currentPassword) found.currentPassword = "Vui lòng nhập mật khẩu hiện tại";
    if (pw.newPassword.length < 6) found.newPassword = "Mật khẩu mới cần ít nhất 6 ký tự";
    else if (pw.newPassword === pw.currentPassword) found.newPassword = "Mật khẩu mới phải khác mật khẩu cũ";
    if (pw.confirm !== pw.newPassword) found.confirm = "Mật khẩu nhập lại không khớp";
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    setSaving(true);
    try {
      const message = await profileService.changePassword(creating ? "" : pw.currentPassword, pw.newPassword);
      setPw({ currentPassword: "", newPassword: "", confirm: "" });
      if (creating && user) updateUser({ ...user, hasPassword: true });
      toast(message);
    } catch (err) {
      if (err instanceof ApiError && err.errors) setErrors(err.errors);
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <SettingsCard
        title={creating ? "Tạo mật khẩu" : "Đổi mật khẩu"}
        description={
          creating
            ? "Tài khoản của bạn đang đăng nhập bằng Google. Tạo mật khẩu để đăng nhập được cả bằng email + mật khẩu."
            : "Sau khi đổi, các thiết bị khác đang đăng nhập sẽ bị đăng xuất để bảo vệ tài khoản."
        }
        footer={
          <Button type="submit" loading={saving}>
            {creating ? "Tạo mật khẩu" : "Đổi mật khẩu"}
          </Button>
        }
      >
        <div className="grid gap-4 @md:grid-cols-2">
          {user?.googleLinked && (
            <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 @md:col-span-2">
              <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Đã liên kết Google — bạn đăng nhập được bằng nút <strong>Tiếp tục với Google</strong>.
              </span>
            </p>
          )}
          {!creating && (
            <Field label="Mật khẩu hiện tại" htmlFor="currentPassword" error={errors.currentPassword} className="@md:col-span-2">
              <PasswordInput id="currentPassword" autoComplete="current-password" value={pw.currentPassword} onChange={(v) => set("currentPassword", v)} invalid={!!errors.currentPassword} />
            </Field>
          )}
          <Field label="Mật khẩu mới" htmlFor="newPassword" error={errors.newPassword}>
            <PasswordInput id="newPassword" autoComplete="new-password" value={pw.newPassword} onChange={(v) => set("newPassword", v)} invalid={!!errors.newPassword} />
          </Field>
          <Field label="Nhập lại mật khẩu mới" htmlFor="confirm" error={errors.confirm}>
            <PasswordInput id="confirm" autoComplete="new-password" value={pw.confirm} onChange={(v) => set("confirm", v)} invalid={!!errors.confirm} />
          </Field>
          {pw.newPassword && (
            <div className="@md:col-span-2">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < strength ? STRENGTH[strength].color : "bg-coffee-100")} />
                ))}
              </div>
              <p className="mt-1.5 text-xs text-coffee-600">
                Độ mạnh: <strong>{STRENGTH[strength].label}</strong> · Nên dùng ≥ 10 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.
              </p>
            </div>
          )}
        </div>
      </SettingsCard>
    </form>
  );
}

/* ================= Phiên đăng nhập ================= */
export function SessionsCard() {
  const { clearSession } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleLogoutAll = async () => {
    setBusy(true);
    try {
      await profileService.logoutAllDevices();
      clearSession();
      toast("Đã đăng xuất khỏi tất cả thiết bị", "info");
      router.push("/login");
    } catch (err) {
      toast((err as Error).message, "error");
      setBusy(false);
    }
  };

  return (
    <SettingsCard title="Phiên đăng nhập" description="Nghi ngờ ai đó đang dùng tài khoản của bạn? Đăng xuất tất cả thiết bị ngay.">
      <div className="flex flex-col gap-4 rounded-xl border border-coffee-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-coffee-950">Đăng xuất khỏi tất cả thiết bị</p>
          <p className="mt-0.5 text-sm text-coffee-500">Bao gồm cả thiết bị này. Bạn sẽ cần đăng nhập lại.</p>
        </div>
        <Button variant="outline" onClick={() => setConfirm(true)} className="shrink-0">
          <LogOut className="h-4 w-4" /> Đăng xuất tất cả
        </Button>
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        size="sm"
        title="Đăng xuất khỏi tất cả thiết bị?"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(false)} disabled={busy}>
              Huỷ
            </Button>
            <Button onClick={handleLogoutAll} loading={busy}>
              Đăng xuất tất cả
            </Button>
          </>
        }
      >
        <p className="text-sm text-coffee-700">Mọi trình duyệt, điện thoại đang đăng nhập tài khoản này sẽ bị đăng xuất ngay lập tức.</p>
      </Modal>
    </SettingsCard>
  );
}

/* ================= Xoá tài khoản (chỉ khách hàng) ================= */
export function DeleteAccountCard() {
  const { user, clearSession } = useAuth();
  // Tài khoản Google chưa có mật khẩu → xác nhận bằng cách gõ lại email
  const byEmail = user?.hasPassword === false;
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const close = () => {
    setOpen(false);
    setPassword("");
    setError(undefined);
  };

  const handleDelete = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) return setError(byEmail ? "Vui lòng gõ lại email để xác nhận" : "Vui lòng nhập mật khẩu để xác nhận");
    setBusy(true);
    try {
      await profileService.deleteAccount(byEmail ? { confirmEmail: password } : { password });
      clearSession();
      toast("Tài khoản của bạn đã được xoá. Hẹn gặp lại!", "info");
      router.push("/");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <section className="@container overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-red-200">
      <div className="grid gap-6 p-6 @3xl:grid-cols-[240px_1fr] @3xl:gap-10">
        <div>
          <h2 className="font-display text-lg font-semibold text-red-700">Xoá tài khoản</h2>
          <p className="mt-1 text-sm leading-relaxed text-coffee-500">Hành động này không thể hoàn tác.</p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-coffee-700">
            Giỏ hàng và thông tin cá nhân sẽ bị xoá vĩnh viễn. Đơn hàng cũ vẫn được quán lưu lại để đối soát.
          </p>
          <Button variant="danger" onClick={() => setOpen(true)} className="shrink-0">
            Xoá tài khoản
          </Button>
        </div>
      </div>

      <Modal
        open={open}
        onClose={close}
        size="sm"
        title="Xoá vĩnh viễn tài khoản?"
        footer={
          <>
            <Button variant="outline" onClick={close} disabled={busy}>
              Huỷ
            </Button>
            <Button variant="danger" type="submit" form="delete-account-form" loading={busy}>
              Tôi hiểu, xoá tài khoản
            </Button>
          </>
        }
      >
        <form id="delete-account-form" onSubmit={handleDelete} noValidate className="space-y-4">
          <div className="flex gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            Bạn sẽ không thể đăng nhập lại bằng tài khoản này.
          </div>
          {byEmail ? (
            <Field label={`Gõ lại email ${user?.email} để xác nhận`} htmlFor="deleteEmail" error={error}>
              <Input id="deleteEmail" type="email" autoComplete="off" value={password} onChange={(e) => { setPassword(e.target.value); setError(undefined); }} invalid={!!error} />
            </Field>
          ) : (
            <Field label="Nhập mật khẩu để xác nhận" htmlFor="deletePassword" error={error}>
              <PasswordInput id="deletePassword" autoComplete="current-password" value={password} onChange={(v) => { setPassword(v); setError(undefined); }} invalid={!!error} />
            </Field>
          )}
        </form>
      </Modal>
    </section>
  );
}
