import { api, ApiError } from "@/lib/api";
import type { User } from "@/types/user";

export const authService = {
  async login(email: string, password: string): Promise<User> {
    const res = await api<{ user: User }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    return res.user;
  },

  async register(name: string, email: string, password: string): Promise<User> {
    const res = await api<{ user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    return res.user;
  },

  async logout(): Promise<void> {
    await api("/auth/logout", { method: "POST" });
  },

  /** Lấy user hiện tại từ cookie; chưa đăng nhập thì trả null */
  async me(): Promise<User | null> {
    try {
      // Chưa đăng nhập: server trả { user: null } (không phải lỗi 401)
      const res = await api<{ user: User | null }>("/auth/me");
      return res.user;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null;
      throw err;
    }
  },
};
