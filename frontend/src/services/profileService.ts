import { api } from "@/lib/api";
import type { ProfileInput, User } from "@/types/user";

/** Các thao tác trên tài khoản của chính mình */
export const profileService = {
  async update(input: ProfileInput): Promise<User> {
    return (await api<{ user: User }>("/auth/me", { method: "PATCH", body: JSON.stringify(input) })).user;
  },

  /** avatar: data URL, hoặc "" để xoá ảnh */
  async updateAvatar(avatar: string): Promise<User> {
    return (await api<{ user: User }>("/auth/me/avatar", { method: "PUT", body: JSON.stringify({ avatar }) })).user;
  },

  /** currentPassword "" = tài khoản Google tạo mật khẩu lần đầu. Trả về câu thông báo của server */
  async changePassword(currentPassword: string, newPassword: string): Promise<string> {
    return (await api<{ message: string }>("/auth/password", { method: "PATCH", body: JSON.stringify({ currentPassword, newPassword }) })).message;
  },

  async logoutAllDevices(): Promise<void> {
    await api("/auth/logout-all", { method: "POST" });
  },

  /** Có mật khẩu → gửi password; tài khoản Google chưa có mật khẩu → gửi confirmEmail (gõ lại email) */
  async deleteAccount(confirm: { password?: string; confirmEmail?: string }): Promise<void> {
    await api("/auth/me", { method: "DELETE", body: JSON.stringify(confirm) });
  },
};
