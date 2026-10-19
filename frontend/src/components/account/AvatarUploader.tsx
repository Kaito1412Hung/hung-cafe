"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { resizeImageToSquare } from "@/lib/image";
import { profileService } from "@/services/profileService";

export function AvatarUploader() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);

  if (!user) return null;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy("upload");
    try {
      const dataUrl = await resizeImageToSquare(file);
      updateUser(await profileService.updateAvatar(dataUrl));
      toast("Đã cập nhật ảnh đại diện");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = ""; // cho phép chọn lại cùng 1 file
    }
  };

  const handleRemove = async () => {
    setBusy("remove");
    try {
      updateUser(await profileService.updateAvatar(""));
      toast("Đã xoá ảnh đại diện", "info");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-coffee-200"
        aria-label="Đổi ảnh đại diện"
        disabled={busy !== null}
      >
        <Avatar user={user} size="xl" />
        {busy !== "upload" && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-coffee-950/50 text-white opacity-0 transition group-hover:opacity-100">
            <Camera className="h-6 w-6" />
          </span>
        )}
        {busy === "upload" && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-coffee-950/50 text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
          </span>
        )}
      </button>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} disabled={busy !== null}>
            <Camera className="h-4 w-4" /> {user.avatar ? "Đổi ảnh" : "Tải ảnh lên"}
          </Button>
          {user.avatar && (
            <Button size="sm" variant="ghost" onClick={handleRemove} loading={busy === "remove"} disabled={busy !== null} className="text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" /> Xoá
            </Button>
          )}
        </div>
        <p className="text-xs text-coffee-500">JPG, PNG hoặc WEBP, tối đa 5MB. Ảnh sẽ được cắt vuông tự động.</p>
      </div>

      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
    </div>
  );
}
