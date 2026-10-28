import { randomBytes } from "node:crypto";
import type { CookieOptions, Request, Response } from "express";
import { AUTH_COOKIE, authCookieOptions, signSocketToken, signToken } from "../../utils/jwt";
import * as authService from "./auth.service";
import { clientIp } from "../../middlewares/rateLimit";
import { googleEnabled, isProduction } from "../../config/env";
import { fetchGoogleProfile, googleAuthUrl, GoogleLoginError } from "./google";

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
  const { user, tokenVersion } = await authService.login(req.body, clientIp(req));
  setAuthCookie(res, user.id, tokenVersion);
  res.json({ user });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(AUTH_COOKIE, clearCookieOptions);
  res.json({ message: "Đã đăng xuất" });
}

/** Vé ngắn hạn (2 phút) để mở kết nối realtime Socket.IO — xem realtime/socket.ts */
export async function socketToken(req: Request, res: Response) {
  const tokenVersion = await authService.getTokenVersion(req.user!.id);
  res.json({ data: { token: signSocketToken({ id: req.user!.id, tokenVersion }) } });
}

/** Người đang đăng nhập; chưa đăng nhập / phiên hết hạn → { user: null } */
export async function me(req: Request, res: Response) {
  if (!req.user) return res.json({ user: null });
  res.json({ user: await authService.findById(req.user.id) });
}

export async function updateProfile(req: Request, res: Response) {
  res.json({ user: await authService.updateProfile(req.user!.id, req.body) });
}

export async function updateAvatar(req: Request, res: Response) {
  res.json({ user: await authService.updateAvatar(req.user!.id, req.body.avatar) });
}

export async function changePassword(req: Request, res: Response) {
  const { tokenVersion, created } = await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  // Thiết bị đang dùng nhận token mới để không bị đăng xuất theo
  setAuthCookie(res, req.user!.id, tokenVersion);
  res.json({
    message: created
      ? "Đã tạo mật khẩu. Từ giờ bạn đăng nhập được bằng email + mật khẩu hoặc bằng Google."
      : "Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.",
  });
}

export async function logoutAll(req: Request, res: Response) {
  await authService.logoutAllDevices(req.user!.id);
  res.clearCookie(AUTH_COOKIE, clearCookieOptions);
  res.json({ message: "Đã đăng xuất khỏi tất cả thiết bị" });
}

export async function deleteAccount(req: Request, res: Response) {
  await authService.deleteOwnAccount(req.user!.id, req.user!.role, req.body);
  res.clearCookie(AUTH_COOKIE, clearCookieOptions);
  res.json({ message: "Tài khoản đã được xoá" });
}

export async function forgotPassword(req: Request, res: Response) {
  await authService.requestPasswordReset(req.body.email);
  res.json({ message: "Nếu email đã đăng ký, quán sẽ liên hệ bạn để hỗ trợ đặt lại mật khẩu." });
}

/** Các cách đăng nhập đang bật → frontend ẩn / hiện nút "Tiếp tục với Google" */
export function options(_req: Request, res: Response) {
  res.json({ data: { google: googleEnabled } });
}

// ===== Đăng nhập bằng Google (xem google.ts) =====

/** Cookie tạm giữ mã "state" + trang cần quay về trong lúc khách ở trang Google (10 phút) */
const GOOGLE_COOKIE = "g_oauth";
const googleCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  // "lax": cookie vẫn được gửi khi Google chuyển khách quay về (điều hướng bình thường)
  sameSite: "lax",
  path: "/api/auth/google",
  maxAge: 10 * 60 * 1000,
};
const { maxAge: _googleMaxAge, ...clearGoogleCookieOptions } = googleCookieOptions;

/** Chỉ quay về trang trong web mình ("/cart"…), không cho "//trang-la.com" → chống chuyển hướng sang web lừa đảo */
function safeNext(next: unknown) {
  if (typeof next !== "string" || !/^\/(?![/\\])/.test(next) || next.length > 200) return "/";
  if (/^\/(login|register|forgot-password)\b/.test(next)) return "/";
  return next;
}

/** GET /api/auth/google?next=/cart → chuyển sang trang chọn tài khoản của Google */
export function googleStart(req: Request, res: Response) {
  if (!googleEnabled) return res.redirect("/login?google_error=off");
  const state = randomBytes(16).toString("hex");
  res.cookie(GOOGLE_COOKIE, { state, next: safeNext(req.query.next) }, googleCookieOptions);
  res.redirect(googleAuthUrl(state));
}

/** GET /api/auth/google/callback?code=…&state=… — Google đưa khách quay về; lỗi gì cũng đưa về trang đăng nhập kèm mã lỗi */
export async function googleCallback(req: Request, res: Response) {
  const saved = req.cookies?.[GOOGLE_COOKIE] as { state?: unknown; next?: unknown } | undefined;
  res.clearCookie(GOOGLE_COOKIE, clearGoogleCookieOptions);
  try {
    if (!googleEnabled) throw new GoogleLoginError("off");
    // Khách bấm "Huỷ" ở trang Google
    if (req.query.error) throw new GoogleLoginError("cancelled");
    const { code, state } = req.query;
    // state phải khớp với cookie của chính trình duyệt này → chống kẻ xấu gửi link callback của nó cho mình (CSRF)
    if (typeof code !== "string" || typeof state !== "string" || typeof saved?.state !== "string" || saved.state !== state) {
      throw new GoogleLoginError("state");
    }
    const profile = await fetchGoogleProfile(code);
    const { user, tokenVersion } = await authService.loginWithGoogle(profile);
    setAuthCookie(res, user.id, tokenVersion);
    res.redirect(safeNext(saved.next));
  } catch (err) {
    // Lỗi bất ngờ (Google trả lỗi, mạng…) thì ghi log để tra; lỗi đã lường trước chỉ báo cho khách
    if (!(err instanceof GoogleLoginError)) console.error("Đăng nhập Google lỗi:", err);
    res.redirect(`/login?google_error=${err instanceof GoogleLoginError ? err.code : "failed"}`);
  }
}
