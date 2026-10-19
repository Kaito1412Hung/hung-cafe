"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { authService } from "@/services/authService";
import type { User } from "@/types/user";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** true ngay sau khi đăng ký → hiện hộp hỏi "Bạn muốn được gọi là gì?" */
  justRegistered: boolean;
  dismissWelcome: () => void;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  /** Cập nhật thông tin hiển thị sau khi sửa hồ sơ */
  updateUser: (u: User) => void;
  /** Xoá phiên phía giao diện (server đã xoá cookie: đăng xuất mọi thiết bị, xoá tài khoản) */
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Lưu thông tin người đăng nhập để mọi component đều dùng được qua useAuth() */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [justRegistered, setJustRegistered] = useState(false);

  // Mở trang → hỏi backend xem cookie còn hợp lệ không
  useEffect(() => {
    authService
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await authService.login(email, password);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const u = await authService.register(name, email, password);
    setUser(u);
    setJustRegistered(true);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const clearSession = useCallback(() => setUser(null), []);
  const dismissWelcome = useCallback(() => setJustRegistered(false), []);

  return (
    <AuthContext.Provider value={{ user, loading, justRegistered, dismissWelcome, login, register, logout, updateUser: setUser, clearSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải được dùng bên trong <AuthProvider>");
  return ctx;
}
