"use client";

import { Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import { cn } from "@/lib/utils";

/** Nút thả tim lưu món yêu thích. `variant="overlay"` nằm đè lên ảnh, "outline" dùng ở trang chi tiết */
export function FavoriteButton({ productId, name, variant = "overlay", className }: { productId: number; name: string; variant?: "overlay" | "outline"; className?: string }) {
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const liked = isFavorite(productId);

  const handleClick = async (e: React.MouseEvent) => {
    // Nút nằm trong link của thẻ món → không cho nhảy trang
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast("Đăng nhập để lưu món yêu thích nhé", "info");
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    try {
      const now = await toggle(productId);
      toast(now ? `Đã thêm "${name}" vào món yêu thích` : `Đã bỏ "${name}" khỏi món yêu thích`, now ? "success" : "info");
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={liked}
      aria-label={liked ? `Bỏ yêu thích ${name}` : `Yêu thích ${name}`}
      title={liked ? "Bỏ yêu thích" : "Thêm vào món yêu thích"}
      className={cn(
        "flex cursor-pointer items-center justify-center transition active:scale-90",
        variant === "overlay"
          ? "h-9 w-9 rounded-full bg-white/90 shadow-sm backdrop-blur hover:scale-110"
          : "h-12 gap-2 rounded-2xl px-4 text-sm font-medium ring-1 ring-coffee-200 hover:bg-coffee-50",
        className,
      )}
    >
      <Heart className={cn("h-5 w-5 transition", liked ? "fill-rose-500 text-rose-500" : "text-coffee-700")} />
      {variant === "outline" && <span className="text-coffee-800">{liked ? "Đã yêu thích" : "Yêu thích"}</span>}
    </button>
  );
}
