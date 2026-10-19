"use client";

import { useState } from "react";
import { Coffee } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Ảnh sản phẩm do người dùng nhập URL nên có thể đến từ bất kỳ domain nào
 * → dùng <img> thường thay vì next/image, kèm ảnh dự phòng khi link hỏng.
 */
export function ProductImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-linear-to-br from-coffee-200 to-coffee-400 text-coffee-50",
          className,
        )}
      >
        <Coffee className="h-1/3 w-1/3 max-h-12 max-w-12" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" onError={() => setFailedSrc(src)} className={cn("object-cover", className)} />
  );
}
