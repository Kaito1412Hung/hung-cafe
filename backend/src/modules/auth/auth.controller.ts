import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { AUTH_COOKIE, authCookieOptions, signToken } from "../../utils/jwt";
import * as authService from "./auth.service";

const { maxAge: _maxAge, ...clearCookieOptions } = authCookieOptions;

function setAuthCookie(res: Response, id: number, tokenVersion: number) {
  res.cookie(AUTH_COOKIE, signToken({ id, tokenVersion }), authCookieOptions);
}

export async function register(req: Request, res: Response) {
  const { user, tokenVersion } = await authService.register(req.body);
  setAuthCookie(res, user.id, tokenVersion);
  res.status(201).json({ user });
}

export async function login(req: Request, res: Response) {
  const { user, tokenVersion } = await authService.login(req.body);
  setAuthCookie(res, user.id, tokenVersion);
  res.json({ user });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(AUTH_COOKIE, clearCookieOptions);
  res.json({ message: "Đã đăng xuất" });
}

export async function me(req: Request, res: Response) {
  const user = await authService.findById(req.user!.id);
  if (!user) throw new AppError(401, "Tài khoản không còn tồn tại");
  res.json({ user });
}

export async function updateProfile(req: Request, res: Response) {
  res.json({ user: await authService.updateProfile(req.user!.id, req.body) });
}

export async function updateAvatar(req: Request, res: Response) {
  res.json({ user: await authService.updateAvatar(req.user!.id, req.body.avatar) });
}

export async function changePassword(req: Request, res: Response) {
  const tokenVersion = await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  // Thiết bị đang dùng nhận token mới để không bị đăng xuất theo
  setAuthCookie(res, req.user!.id, tokenVersion);
  res.json({ message: "Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất." });
}

export async function logoutAll(req: Request, res: Response) {
  await authService.logoutAllDevices(req.user!.id);
  res.clearCookie(AUTH_COOKIE, clearCookieOptions);
  res.json({ message: "Đã đăng xuất khỏi tất cả thiết bị" });
}

export async function deleteAccount(req: Request, res: Response) {
  await authService.deleteOwnAccount(req.user!.id, req.user!.role, req.body.password);
  res.clearCookie(AUTH_COOKIE, clearCookieOptions);
  res.json({ message: "Tài khoản đã được xoá" });
}
