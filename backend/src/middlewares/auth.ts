import type { RequestHandler } from "express";
import { pool } from "../db/pool";
import { AppError } from "../utils/AppError";
import { AUTH_COOKIE, verifyToken } from "../utils/jwt";
import type { Role } from "../modules/auth/auth.schema";

/**
 * Bắt buộc đã đăng nhập: đọc JWT trong cookie, gắn thông tin vào req.user.
 * Role được đọc lại từ DB mỗi request (không tin role trong token) để khi admin
 * đổi quyền hoặc xoá tài khoản thì có hiệu lực ngay, không phải đợi token hết hạn.
 * So sánh token_version để hỗ trợ "đăng xuất khỏi tất cả thiết bị".
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) throw new AppError(401, "Bạn cần đăng nhập");

  let payload: { id: number; tokenVersion: number };
  try {
    payload = verifyToken(token);
  } catch {
    throw new AppError(401, "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
  }
  const userId = payload.id;

  const { rows } = await pool.query<{ role: Role; tokenVersion: number }>(
    `SELECT role, token_version AS "tokenVersion" FROM users WHERE id = $1`,
    [userId],
  );
  if (!rows[0]) throw new AppError(401, "Tài khoản không còn tồn tại");
  // Token ký trước lần "đăng xuất mọi thiết bị" / đổi mật khẩu → không còn hiệu lực
  if (rows[0].tokenVersion !== payload.tokenVersion) {
    throw new AppError(401, "Phiên đăng nhập đã bị thu hồi, vui lòng đăng nhập lại");
  }

  req.user = { id: userId, role: rows[0].role };
  next();
};

/** Chỉ cho phép các vai trò được liệt kê (dùng SAU requireAuth) */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, "Bạn không có quyền thực hiện thao tác này");
    }
    next();
  };

/**
 * Không bắt buộc đăng nhập: có cookie hợp lệ thì gắn req.user, không có thì bỏ qua.
 * Dùng cho chức năng ai cũng dùng được nhưng biết người gửi thì tốt hơn (VD: form liên hệ).
 */
export const optionalAuth: RequestHandler = async (req, res, next) => {
  if (!req.cookies?.[AUTH_COOKIE]) return next();
  try {
    await requireAuth(req, res, () => {});
  } catch {
    req.user = undefined; // token hỏng / hết hạn → coi như khách vãng lai
  }
  next();
};
