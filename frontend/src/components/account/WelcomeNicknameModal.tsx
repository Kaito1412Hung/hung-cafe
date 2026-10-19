"use client";

import { useState, type FormEvent } from "react";
import { Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { suggestNickname } from "@/lib/user";
import { profileService } from "@/services/profileService";

/**
 * Hiện 1 lần ngay sau khi đăng ký (giống Gmail hỏi "tên hiển thị").
 * Gợi ý sẵn tên (từ cuối của họ tên), khách có thể sửa hoặc bỏ qua.
 */
export function WelcomeNicknameModal() {
  const { user, justRegistered, dismissWelcome } = useAuth();
  if (!user || !justRegistered) return null;
  // key: mỗi tài khoản mới có form riêng
  return <WelcomeForm key={user.id} name={user.name} onDone={dismissWelcome} />;
}

function WelcomeForm({ name, onDone }: { name: string; onDone: () => void }) {
  const { updateUser } = useAuth();
  const toast = useToast();
  const [nickname, setNickname] = useState(suggestNickname(name));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return onDone();
    setSaving(true);
    try {
      updateUser(await profileService.update({ nickname }));
      toast(`Rất vui được gặp bạn, ${nickname.trim()}! ☕`);
      onDone();
    } catch (err) {
      toast((err as Error).message, "error");
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onDone}
      size="sm"
      title="Bạn muốn được gọi là gì?"
      description="Tên này sẽ hiện trên menu tài khoản và khi quán chào bạn."
      footer={
        <>
          <Button variant="ghost" onClick={onDone} disabled={saving}>
            Để sau
          </Button>
          <Button type="submit" form="welcome-form" loading={saving}>
            Lưu tên hiển thị
          </Button>
        </>
      }
    >
      <form id="welcome-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-coffee-50 p-3 text-sm text-coffee-700">
          <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
          Chào mừng bạn đến với Hưng Café! Bạn có thể đổi tên này bất cứ lúc nào trong &ldquo;Tài khoản của tôi&rdquo;.
        </div>
        <Field label="Tên hiển thị" htmlFor="welcomeNickname" hint={`Họ tên đầy đủ: ${name}`}>
          <Input id="welcomeNickname" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={50} autoFocus />
        </Field>
      </form>
    </Modal>
  );
}
