"use client";

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { adminService } from "@/services/adminService";

/**
 * Admin đặt lại mật khẩu cho khách (khi khách báo quên mật khẩu).
 * Mật khẩu tạm chỉ hiện 1 lần ở đây — server chỉ lưu bản đã băm, không xem lại được.
 */
export function ResetPasswordCard({ customerId, email }: { customerId: number; email: string }) {
  const toast = useToast();
  const [step, setStep] = useState<"idle" | "confirm" | "done">("idle");
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const handleReset = async () => {
    setBusy(true);
    try {
      const res = await adminService.resetPassword(customerId);
      setPassword(res.temporaryPassword);
      setStep("done");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Không sao chép được, hãy bôi đen để copy", "error");
    }
  };

  return (
    <div className="rounded-xl border border-coffee-100 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-600">
            <KeyRound className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-coffee-950">Đặt lại mật khẩu</p>
            <p className="text-xs text-coffee-500">Dùng khi khách quên mật khẩu (nhớ xác minh qua điện thoại trước).</p>
          </div>
        </div>
        {step === "idle" && (
          <Button size="sm" variant="outline" onClick={() => setStep("confirm")}>
            Tạo mật khẩu tạm
          </Button>
        )}
      </div>

      {step === "confirm" && (
        <div className="mt-4 flex flex-col gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <p>Mật khẩu cũ của khách sẽ ngừng hoạt động và khách bị đăng xuất khỏi mọi thiết bị.</p>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="ghost" onClick={() => setStep("idle")} disabled={busy}>
              Huỷ
            </Button>
            <Button size="sm" onClick={handleReset} loading={busy}>
              Xác nhận
            </Button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-coffee-600">
            Mật khẩu tạm của <strong>{email}</strong> — chỉ hiện <strong>một lần</strong>, hãy gửi cho khách ngay:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 select-all rounded-lg bg-coffee-900 px-4 py-2.5 text-center font-mono text-lg tracking-widest text-cream">{password}</code>
            <Button size="icon" variant="secondary" onClick={copy} aria-label="Sao chép mật khẩu" className="h-11 w-11">
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-coffee-500">Dặn khách đăng nhập rồi đổi mật khẩu mới trong &ldquo;Tài khoản của tôi → Bảo mật&rdquo;.</p>
        </div>
      )}
    </div>
  );
}
