"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2, Undo2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { resizeImageToSquare } from "@/lib/image";
import type { User } from "@/types/user";

interface AvatarUploaderProps {
  user: Pick<User, "name" | "nickname">;
  /** Ảnh đang hiển thị (ảnh mới chọn chưa lưu, hoặc ảnh hiện tại) */
  value: string;
  /** true khi ảnh đã đổi nhưng chưa bấm "Lưu thay đổi" */
  pending: boolean;
  onChange: (avatar: string) => void;
  onUndo: () => void;
  disabled?: boolean;
}

/**
 * Chọn ảnh đại diện → chỉ XEM TRƯỚC, chưa lưu.
 * Ảnh được lưu cùng các thông tin khác khi bấm "Lưu thay đổi" (giống các trang web lớn).
 */
export function AvatarUploader({ user, value, pending, onChange, onUndo, disabled }: AvatarUploaderProps) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setProcessing(true);
    try {
      onChange(await resizeImageToSquare(file));
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = ""; // cho phép chọn lại cùng 1 file
    }
  };

  const busy = processing || disabled;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-coffee-200"
        aria-label="Đổi ảnh đại diện"
        disabled={busy}
      >
        <Avatar user={{ ...user, avatar: value }} size="xl" />
        <span
          className={`absolute inset-0 flex items-center justify-center rounded-full bg-coffee-950/50 text-white transition ${processing ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        >
          {processing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
        </span>
        {pending && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
            Chưa lưu
          </span>
        )}
      </button>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => inputRef.current?.click()} disabled={busy}>
            <Camera className="h-4 w-4" /> {value ? "Đổi ảnh" : "Chọn ảnh"}
          </Button>
          {pending ? (
            <Button type="button" size="sm" variant="ghost" onClick={onUndo} disabled={busy}>
              <Undo2 className="h-4 w-4" /> Bỏ chọn
            </Button>
          ) : (
            value && (
              <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")} disabled={busy} className="text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" /> Xoá ảnh
              </Button>
            )
          )}
        </div>
        <p className="text-xs text-coffee-500">
          {pending ? "Bấm “Lưu thay đổi” bên dưới để lưu ảnh." : "JPG, PNG hoặc WEBP, tối đa 10MB. Ảnh sẽ được cắt vuông tự động."}
        </p>
      </div>

      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
    </div>
  );
}
