/**
 * Đăng nhập bằng Google — chuẩn OAuth 2.0 / OpenID Connect, luồng "authorization code":
 * 1. Trình duyệt sang trang Google, mang theo mã "state" ngẫu nhiên (đã cất trong cookie để so lại)
 * 2. Khách chọn tài khoản → Google đưa về /api/auth/google/callback kèm "code" dùng 1 lần
 * 3. Server đổi code + Client Secret lấy id_token (giấy xác nhận có chữ ký của Google), kiểm tra rồi đọc email / tên / ảnh
 * Web mình không bao giờ thấy mật khẩu Google của khách.
 */
import { OAuth2Client } from "google-auth-library";
import { env } from "../../config/env";

export interface GoogleProfile {
  /** Mã tài khoản Google — cố định, không đổi kể cả khi khách đổi email */
  sub: string;
  email: string;
  /** Google đã xác minh khách sở hữu hộp thư này */
  emailVerified: boolean;
  name: string;
  picture: string;
}

/** Lý do đăng nhập Google thất bại → frontend hiện thông báo tương ứng (/login?google_error=…) */
export type GoogleErrorCode = "off" | "cancelled" | "state" | "unverified" | "admin" | "demo" | "failed";

export class GoogleLoginError extends Error {
  constructor(public code: GoogleErrorCode) {
    super(`Đăng nhập Google thất bại: ${code}`);
  }
}

/**
 * Link Google đưa khách quay về. Đi qua tên miền của frontend (Next.js chuyển tiếp /api/* sang backend)
 * để cookie đăng nhập gắn vào đúng tên miền web, giống đăng nhập bằng mật khẩu.
 * Phải khai báo y hệt trong Google Cloud Console → Authorized redirect URIs.
 */
export const googleRedirectUri = () => `${env.CLIENT_URL}/api/auth/google/callback`;

const client = () =>
  new OAuth2Client({ clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, redirectUri: googleRedirectUri() });

/** Link trang đăng nhập của Google. Chỉ xin email + tên + ảnh (không cần Google duyệt app) */
export function googleAuthUrl(state: string) {
  return client().generateAuthUrl({ scope: ["openid", "email", "profile"], state, prompt: "select_account" });
}

/** Đổi "code" lấy id_token rồi kiểm tra: chữ ký của Google, còn hạn, cấp cho đúng app mình (audience) */
export async function fetchGoogleProfile(code: string): Promise<GoogleProfile> {
  const oauth = client();
  const { tokens } = await oauth.getToken(code);
  if (!tokens.id_token) throw new Error("Google không trả về id_token");
  const ticket = await oauth.verifyIdToken({ idToken: tokens.id_token, audience: env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) throw new Error("id_token thiếu sub / email");
  return {
    sub: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified === true,
    name: payload.name ?? "",
    picture: payload.picture ?? "",
  };
}

/** Ảnh đại diện Google → data URL 256px (lưu giống ảnh khách tự tải lên). Lỗi gì cũng bỏ qua, không chặn đăng nhập */
export async function fetchGoogleAvatar(picture: string): Promise<string> {
  try {
    const url = new URL(picture);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".googleusercontent.com")) return "";
    const res = await fetch(picture.replace(/=s\d+(-c)?$/, "=s256-c"), { signal: AbortSignal.timeout(5000) });
    const type = (res.headers.get("content-type") ?? "").split(";")[0];
    if (!res.ok || !/^image\/(png|jpeg|webp)$/.test(type)) return "";
    const data = Buffer.from(await res.arrayBuffer());
    // Cùng giới hạn với ảnh tải lên (~200KB sau khi đổi sang base64)
    if (data.length > 140_000) return "";
    return `data:${type};base64,${data.toString("base64")}`;
  } catch {
    return "";
  }
}
