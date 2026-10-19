import jwt, { type SignOptions } from "jsonwebtoken";
import type { CookieOptions } from "express";
import { env, isProduction } from "../config/env";

export const AUTH_COOKIE = "token";

interface TokenPayload {
  sub: string;
  /** token_version lúc ký — khác với DB nghĩa là token đã bị thu hồi */
  tv: number;
}

export function signToken(user: { id: number; tokenVersion: number }) {
  const payload: TokenPayload = { sub: String(user.id), tv: user.tokenVersion };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] });
}

export function verifyToken(token: string) {
  const payload = jwt.verify(token, env.JWT_SECRET) as unknown as TokenPayload;
  return { id: Number(payload.sub), tokenVersion: payload.tv ?? 0 };
}

/**
 * Lưu JWT trong cookie httpOnly: JavaScript phía trình duyệt không đọc được
 * → an toàn hơn localStorage trước tấn công XSS.
 */
export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
