import type { User } from "@/types/user";

/** Tên dùng để hiển thị / chào: ưu tiên biệt danh, chưa có thì dùng họ tên */
export function displayName(user: Pick<User, "name" | "nickname">) {
  return user.nickname.trim() || user.name;
}

/** Gợi ý biệt danh từ họ tên tiếng Việt: lấy tên (từ cuối). "Nguyễn Quang Hưng" → "Hưng" */
export function suggestNickname(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? "";
}

export const GENDER_LABELS = { "": "Không muốn tiết lộ", male: "Nam", female: "Nữ", other: "Khác" } as const;
