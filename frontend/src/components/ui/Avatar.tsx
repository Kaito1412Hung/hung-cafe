import { cn } from "@/lib/utils";
import { displayName } from "@/lib/user";
import type { User } from "@/types/user";

const sizes = {
  xs: "h-7 w-7 text-xs",
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
  xl: "h-24 w-24 text-3xl",
};

interface AvatarProps {
  user: Pick<User, "name" | "nickname" | "avatar">;
  size?: keyof typeof sizes;
  /** Màu nền khi chưa có ảnh */
  tone?: "dark" | "light";
  className?: string;
}

/** Ảnh đại diện; chưa có ảnh thì hiện chữ cái đầu của tên hiển thị */
export function Avatar({ user, size = "md", tone = "dark", className }: AvatarProps) {
  const name = displayName(user);
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold",
        tone === "dark" ? "bg-coffee-900 text-cream" : "bg-coffee-200 text-coffee-800",
        sizes[size],
        className,
      )}
    >
      {user.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatar} alt={name} className="h-full w-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  );
}
