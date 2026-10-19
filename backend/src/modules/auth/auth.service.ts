import bcrypt from "bcryptjs";
import { pool } from "../../db/pool";
import { AppError } from "../../utils/AppError";
import type { LoginInput, RegisterInput, Role, UpdateProfileInput } from "./auth.schema";
import { notifyAdmins } from "../notifications/notifications.service";

export interface PublicUser {
  id: number;
  name: string;
  /** Tên hiển thị / biệt danh ("" = chưa đặt) */
  nickname: string;
  email: string;
  role: Role;
  avatar: string;
  phone: string;
  address: string;
  /** "YYYY-MM-DD" hoặc null */
  birthday: string | null;
  gender: "" | "male" | "female" | "other";
  createdAt: Date;
}

/** Kèm token_version để ký JWT — chỉ dùng nội bộ, không trả ra ngoài */
export interface AuthResult {
  user: PublicUser;
  tokenVersion: number;
}

// Không bao giờ trả password_hash ra ngoài
const PUBLIC_COLUMNS = `id, name, nickname, email, role, avatar, phone, address,
  to_char(birthday, 'YYYY-MM-DD') AS birthday, gender, created_at AS "createdAt"`;

// Field (camelCase) → cột DB được phép cập nhật qua "sửa hồ sơ"
const PROFILE_COLUMNS: Record<keyof UpdateProfileInput, string> = {
  name: "name",
  nickname: "nickname",
  phone: "phone",
  address: "address",
  birthday: "birthday",
  gender: "gender",
};

async function getPasswordHash(id: number) {
  const { rows } = await pool.query<{ passwordHash: string }>(`SELECT password_hash AS "passwordHash" FROM users WHERE id = $1`, [id]);
  if (!rows[0]) throw new AppError(404, "Tài khoản không tồn tại");
  return rows[0].passwordHash;
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await pool.query("SELECT 1 FROM users WHERE email = $1", [input.email]);
  if (existing.rowCount) throw new AppError(409, "Email đã được sử dụng", { email: "Email đã được sử dụng" });

  const passwordHash = await bcrypt.hash(input.password, 10);
  const { rows } = await pool.query<PublicUser>(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'customer')
     RETURNING ${PUBLIC_COLUMNS}`,
    [input.name, input.email, passwordHash],
  );
  await notifyAdmins({
    type: "new_customer",
    title: "Khách hàng mới đăng ký",
    message: `${input.name} (${input.email})`,
    link: "/admin/customers",
  });
  return { user: rows[0], tokenVersion: 0 };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const { rows } = await pool.query<PublicUser & { passwordHash: string; tokenVersion: number }>(
    `SELECT ${PUBLIC_COLUMNS}, password_hash AS "passwordHash", token_version AS "tokenVersion" FROM users WHERE email = $1`,
    [input.email],
  );
  const row = rows[0];

  // Báo chung một lỗi để không lộ email nào đã tồn tại
  const valid = row && (await bcrypt.compare(input.password, row.passwordHash));
  if (!valid) throw new AppError(401, "Email hoặc mật khẩu không đúng");

  const { passwordHash: _hash, tokenVersion, ...user } = row;
  return { user, tokenVersion };
}

export async function findById(id: number): Promise<PublicUser | null> {
  const { rows } = await pool.query<PublicUser>(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function updateProfile(id: number, input: UpdateProfileInput): Promise<PublicUser> {
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [field, value] of Object.entries(input)) {
    const column = PROFILE_COLUMNS[field as keyof UpdateProfileInput];
    if (!column || value === undefined) continue;
    // Ngày sinh rỗng → NULL trong DB
    values.push(field === "birthday" && value === "" ? null : value);
    sets.push(`${column} = $${values.length}`);
  }
  values.push(id);
  const { rows } = await pool.query<PublicUser>(
    `UPDATE users SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING ${PUBLIC_COLUMNS}`,
    values,
  );
  if (!rows[0]) throw new AppError(404, "Tài khoản không tồn tại");
  return rows[0];
}

export async function updateAvatar(id: number, avatar: string): Promise<PublicUser> {
  const { rows } = await pool.query<PublicUser>(`UPDATE users SET avatar = $1 WHERE id = $2 RETURNING ${PUBLIC_COLUMNS}`, [avatar, id]);
  if (!rows[0]) throw new AppError(404, "Tài khoản không tồn tại");
  return rows[0];
}

/** Tăng token_version → mọi token đang tồn tại hết hiệu lực. Trả về version mới. */
async function bumpTokenVersion(id: number) {
  const { rows } = await pool.query<{ tokenVersion: number }>(
    `UPDATE users SET token_version = token_version + 1 WHERE id = $1 RETURNING token_version AS "tokenVersion"`,
    [id],
  );
  return rows[0].tokenVersion;
}

/** Đổi mật khẩu xong thì các thiết bị khác bị đăng xuất; thiết bị hiện tại nhận token mới */
export async function changePassword(id: number, currentPassword: string, newPassword: string) {
  const valid = await bcrypt.compare(currentPassword, await getPasswordHash(id));
  if (!valid) throw new AppError(400, "Mật khẩu hiện tại không đúng", { currentPassword: "Mật khẩu hiện tại không đúng" });

  await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [await bcrypt.hash(newPassword, 10), id]);
  return bumpTokenVersion(id);
}

export async function logoutAllDevices(id: number) {
  await bumpTokenVersion(id);
}

/** Khách tự xoá tài khoản (phải nhập đúng mật khẩu). Đơn hàng cũ vẫn giữ (user_id → NULL). */
export async function deleteOwnAccount(id: number, role: Role, password: string) {
  if (role === "admin") throw new AppError(400, "Tài khoản quản trị không thể tự xoá. Hãy nhờ admin khác hạ quyền trước.");
  const valid = await bcrypt.compare(password, await getPasswordHash(id));
  if (!valid) throw new AppError(400, "Mật khẩu không đúng", { password: "Mật khẩu không đúng" });
  await pool.query("DELETE FROM users WHERE id = $1", [id]);
}

/**
 * Khách báo quên mật khẩu → gửi thông báo cho admin (bản cơ bản, chưa có email).
 * Luôn "thành công" dù email có tồn tại hay không → không lộ email nào đã đăng ký.
 */
export async function requestPasswordReset(email: string) {
  const { rows } = await pool.query<{ id: number; name: string }>("SELECT id, name FROM users WHERE email = $1", [email]);
  const user = rows[0];
  if (!user) return;

  // Chống spam: mỗi tài khoản chỉ gửi 1 yêu cầu trong 10 phút
  const link = `/admin/customers?user=${user.id}`;
  const { rowCount } = await pool.query(
    "SELECT 1 FROM notifications WHERE type = 'password_reset' AND link = $1 AND created_at > NOW() - INTERVAL '10 minutes' LIMIT 1",
    [link],
  );
  if (rowCount) return;

  await notifyAdmins({
    type: "password_reset",
    title: "Yêu cầu đặt lại mật khẩu",
    message: `${user.name} (${email}) quên mật khẩu — hãy liên hệ khách để xác minh rồi đặt lại.`,
    link,
  });
}
