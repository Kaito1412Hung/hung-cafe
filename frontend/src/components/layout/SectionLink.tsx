"use client";

import type { ComponentProps, MouseEvent } from "react";
import Link from "next/link";

/**
 * Link tới một phần trong trang, VD "/#about", "/#contact".
 * Next.js không cuộn lại khi URL đã có sẵn #about (bấm lần 2 không có tác dụng),
 * nên nếu phần đó đang có trên trang hiện tại thì tự cuộn mượt tới đó.
 * Không có (VD đang ở /menu mà bấm "Về chúng tôi") thì chuyển trang như link bình thường.
 */
export function SectionLink({ href, onClick, ...props }: ComponentProps<typeof Link> & { href: string }) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const hash = href.split("#")[1];
    const target = hash ? document.getElementById(hash) : null;
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      // Cập nhật URL cho đúng nhưng không tạo thêm lịch sử (nút Back vẫn hoạt động bình thường)
      history.replaceState(null, "", `${window.location.pathname}#${hash}`);
    }
    onClick?.(e);
  };

  return <Link href={href} onClick={handleClick} {...props} />;
}
