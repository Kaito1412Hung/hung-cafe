import type { Request, RequestHandler } from "express";
import { AppError } from "../utils/AppError";

/**
 * Giới hạn số lần gọi trong một khoảng thời gian (chống spam / dò mật khẩu).
 * Lưu trong bộ nhớ server: đủ cho 1 server; nếu chạy nhiều server thì cần chuyển sang Redis.
 */
class HitCounter {
  private hits = new Map<string, number[]>();

  constructor(private windowMs: number) {
    // Dọn các key cũ mỗi 10 phút để Map không phình mãi
    setInterval(() => this.prune(), 10 * 60 * 1000).unref();
  }

  private recent(key: string, now = Date.now()) {
    return (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
  }

  count(key: string) {
    return this.recent(key).length;
  }

  add(key: string) {
    const list = this.recent(key);
    list.push(Date.now());
    this.hits.set(key, list);
    return list.length;
  }

  /** Số ms tới khi lần gọi cũ nhất hết hạn (để báo "thử lại sau X phút") */
  retryAfter(key: string) {
    const oldest = this.recent(key)[0];
    return oldest ? this.windowMs - (Date.now() - oldest) : 0;
  }

  reset(key: string) {
    this.hits.delete(key);
  }

  private prune() {
    for (const key of this.hits.keys()) {
      if (this.recent(key).length === 0) this.hits.delete(key);
    }
  }
}

const minutes = (ms: number) => Math.max(1, Math.ceil(ms / 60_000));

/** IP thật của người dùng (app đặt "trust proxy" để đọc qua Next.js proxy) */
export const clientIp = (req: Request) => req.ip ?? "unknown";

/** Middleware: mỗi IP tối đa `max` lần trong `windowMs` */
export function rateLimit(options: { windowMs: number; max: number; message: string }): RequestHandler {
  const counter = new HitCounter(options.windowMs);
  return (req, res, next) => {
    const key = clientIp(req);
    if (counter.count(key) >= options.max) {
      const wait = counter.retryAfter(key);
      res.setHeader("Retry-After", Math.ceil(wait / 1000));
      throw new AppError(429, `${options.message} Vui lòng thử lại sau ${minutes(wait)} phút.`);
    }
    counter.add(key);
    next();
  };
}

/* ---------- Chống dò mật khẩu khi đăng nhập ---------- */

const LOGIN_WINDOW = 15 * 60 * 1000;
/** Sai 5 lần trong 15 phút với cùng 1 email → khoá đăng nhập email đó 15 phút */
const MAX_FAILS_PER_EMAIL = 5;
/** 1 IP sai quá 20 lần (thử nhiều email khác nhau) → khoá IP đó */
const MAX_FAILS_PER_IP = 20;

const failsByEmail = new HitCounter(LOGIN_WINDOW);
const failsByIp = new HitCounter(LOGIN_WINDOW);

export const loginGuard = {
  /** Gọi TRƯỚC khi kiểm tra mật khẩu: đang bị khoá thì báo lỗi 429 luôn */
  check(email: string, ip: string, options: { skipEmail?: boolean } = {}) {
    const emailKey = email.toLowerCase();
    if (!options.skipEmail && failsByEmail.count(emailKey) >= MAX_FAILS_PER_EMAIL) {
      throw new AppError(
        429,
        `Bạn đã nhập sai mật khẩu ${MAX_FAILS_PER_EMAIL} lần. Tài khoản tạm khoá đăng nhập, thử lại sau ${minutes(failsByEmail.retryAfter(emailKey))} phút hoặc bấm "Quên mật khẩu".`,
      );
    }
    if (failsByIp.count(ip) >= MAX_FAILS_PER_IP) {
      throw new AppError(429, `Có quá nhiều lần đăng nhập sai từ thiết bị này. Thử lại sau ${minutes(failsByIp.retryAfter(ip))} phút.`);
    }
  },

  /** Ghi nhận 1 lần sai, trả về số lần còn được thử (skipEmail: tài khoản demo, chỉ đếm theo IP) */
  fail(email: string, ip: string, options: { skipEmail?: boolean } = {}) {
    failsByIp.add(ip);
    if (options.skipEmail) return MAX_FAILS_PER_EMAIL;
    return MAX_FAILS_PER_EMAIL - failsByEmail.add(email.toLowerCase());
  },

  /** Đăng nhập đúng → xoá đếm sai của email đó */
  success(email: string) {
    failsByEmail.reset(email.toLowerCase());
  },
};
