import bcrypt from "bcryptjs";
import { env } from "../../config/env";
import { pool } from "../../db/pool";
import { AppError } from "../../utils/AppError";
import type { LoginInput, RegisterInput, Role, UpdateProfileInput } from "./auth.schema";
import { notifyAdmins } from "../notifications/notifications.service";
import { loginGuard } from "../../middlewares/rateLimit";
import { fetchGoogleAvatar, GoogleLoginError, type GoogleProfile } from "./google";

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
  /** false = tài khoản tạo bằng Google, chưa đặt mật khẩu */
  hasPassword: boolean;
  /** Đã nối với tài khoản Google */
  googleLinked: boolean;
  createdAt: Date;
}

/** Kèm token_version để ký JWT — chỉ dùng nội bộ, không trả ra ngoài */
export interface AuthResult {
  user: PublicUser;
  tokenVersion: number;
}

// Không bao giờ trả password_hash ra ngoài
const PUBLIC_COLUMNS = `id, name, nickname, email, role, avatar, phone, address,
  to_char(birthday, 'YYYY-MM-DD') AS birthday, gender,
  (password_hash IS NOT NULL) AS "hasPassword", (google_id IS NOT NULL) AS "googleLinked", created_at AS "createdAt"`;

// Field (camelCase) → cột DB được phép cập nhật qua "sửa hồ sơ"
const PROFILE_COLUMNS: Record<keyof UpdateProfileInput, string> = {
  name: "name",
  nickname: "nickname",
  phone: "phone",
  address: "address",
  birthday: "birthday",
  gender: "gender",
};

/** Tài khoản demo dùng chung (DEMO_EMAILS trong .env) */
export const isDemoEmail = (email: string) => env.DEMO_EMAILS.includes(email.toLowerCase());

/** Chặn thao tác làm hỏng tài khoản demo cho người dùng sau (đổi mật khẩu, xoá…) */
async function assertNotDemo(id: number) {
  if (!env.DEMO_EMAILS.length) return;
  const { rows } = await pool.query<{ email: string }>("SELECT email FROM users WHERE id = $1", [id]);
  if (rows[0] && isDemoEmail(rows[0].email)) {
    throw new AppError(403, "Đây là tài khoản demo dùng chung nên không đổi được thông tin này. Bạn có thể đăng ký tài khoản riêng để thử đầy đủ.");
  }
}

/** Email + mật khẩu (đã băm) của tài khoản. passwordHash null = tài khoản Google chưa đặt mật khẩu */
async function getCredentials(id: number) {
  const { rows } = await pool.query<{ email: string; passwordHash: string | null }>(
    `SELECT email, password_hash AS "passwordHash" FROM users WHERE id = $1`,
    [id],
  );
  if (!rows[0]) throw new AppError(404, "Tài khoản không tồn tại");
  return rows[0];
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

export async function login(input: LoginInput, ip: string): Promise<AuthResult> {
  // Sai quá nhiều lần → tạm khoá (chống dò mật khẩu). Tài khoản demo không khoá theo email (kẻo 1 người làm khoá cho mọi người), vẫn khoá theo IP
  const demo = isDemoEmail(input.email);
  loginGuard.check(input.email, ip, { skipEmail: demo });

  const { rows } = await pool.query<PublicUser & { passwordHash: string | null; tokenVersion: number }>(
    `SELECT ${PUBLIC_COLUMNS}, password_hash AS "passwordHash", token_version AS "tokenVersion" FROM users WHERE email = $1`,
    [input.email],
  );
  const row = rows[0];

  // Báo chung một lỗi để không lộ email nào đã tồn tại (kể cả tài khoản Google chưa có mật khẩu)
  const valid = row?.passwordHash && (await bcrypt.compare(input.password, row.passwordHash));
  if (!valid) {
    const left = loginGuard.fail(input.email, ip, { skipEmail: demo });
    const warning = left <= 0 ? " Bạn đã hết lượt thử, vui lòng đợi 15 phút." : left <= 2 ? ` Bạn còn ${left} lần thử.` : "";
    throw new AppError(401, `Email hoặc mật khẩu không đúng.${warning}`);
  }
  loginGuard.success(input.email);

  const { passwordHash: _hash, tokenVersion, ...user } = row;
  return { user, tokenVersion };
}

/**
 * Đăng nhập bằng Google: tìm theo google_id → chưa có thì nối vào tài khoản trùng email → không có nữa thì tạo khách mới.
 * Admin và tài khoản demo chỉ đăng nhập bằng mật khẩu: email của chúng dùng tên miền mình không sở hữu,
 * ai mua được tên miền đó là tạo được tài khoản Google cùng email → chiếm quyền.
 */
export async function loginWithGoogle(profile: GoogleProfile): Promise<AuthResult> {
  // Chỉ tin email Google đã xác minh chủ hộp thư
  if (!profile.emailVerified) throw new GoogleLoginError("unverified");
  const email = profile.email.trim().toLowerCase();

  type Row = PublicUser & { googleId: string | null; tokenVersion: number };
  const select = `SELECT ${PUBLIC_COLUMNS}, google_id AS "googleId", token_version AS "tokenVersion" FROM users`;
  const byGoogle = await pool.query<Row>(`${select} WHERE google_id = $1`, [profile.sub]);
  const row = byGoogle.rows[0] ?? (await pool.query<Row>(`${select} WHERE email = $1`, [email])).rows[0];

  if (row) {
    if (row.role === "admin") throw new GoogleLoginError("admin");
    if (isDemoEmail(row.email)) throw new GoogleLoginError("demo");
    // Email này đã nối với một tài khoản Google khác → không tự đổi
    if (row.googleId && row.googleId !== profile.sub) throw new GoogleLoginError("failed");
    const { googleId, tokenVersion, ...user } = row;
    if (!googleId) {
      await pool.query("UPDATE users SET google_id = $1 WHERE id = $2", [profile.sub, row.id]);
      user.googleLinked = true;
    }
    return { user, tokenVersion };
  }

  // Khách mới: lấy tên + ảnh đại diện từ Google, chưa có mật khẩu
  const googleName = profile.name.trim().slice(0, 100);
  const name = googleName.length >= 2 ? googleName : email.split("@")[0].slice(0, 100);
  const avatar = await fetchGoogleAvatar(profile.picture);
  const { rows } = await pool.query<PublicUser>(
    `INSERT INTO users (name, email, password_hash, role, google_id, avatar)
     VALUES ($1, $2, NULL, 'customer', $3, $4)
     RETURNING ${PUBLIC_COLUMNS}`,
    [name, email, profile.sub, avatar],
  );
  await notifyAdmins({
    type: "new_customer",
    title: "Khách hàng mới đăng ký",
    message: `${name} (${email}) — đăng ký bằng Google`,
    link: "/admin/customers",
  });
  return { user: rows[0], tokenVersion: 0 };
}

/** token_version hiện tại (để ký vé realtime cùng "phiên" với cookie đăng nhập) */
export async function getTokenVersion(id: number) {
  const { rows } = await pool.query<{ tokenVersion: number }>(`SELECT token_version AS "tokenVersion" FROM users WHERE id = $1`, [id]);
  if (!rows[0]) throw new AppError(401, "Tài khoản không còn tồn tại");
  return rows[0].tokenVersion;
}

export async function findById(id: number): Promise<PublicUser | null> {
  const { rows } = await pool.query<PublicUser>(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function updateProfile(id: number, input: UpdateProfileInput): Promise<PublicUser> {
  await assertNotDemo(id);
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
  await assertNotDemo(id);
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

/**
 * Đổi mật khẩu xong thì các thiết bị khác bị đăng xuất; thiết bị hiện tại nhận token mới.
 * Tài khoản Google chưa có mật khẩu → tạo mật khẩu, không cần mật khẩu hiện tại.
 */
export async function changePassword(id: number, currentPassword: string, newPassword: string) {
  await assertNotDemo(id);
  const { passwordHash } = await getCredentials(id);
  if (passwordHash) {
    if (!currentPassword) throw new AppError(400, "Vui lòng nhập mật khẩu hiện tại", { currentPassword: "Vui lòng nhập mật khẩu hiện tại" });
    const valid = await bcrypt.compare(currentPassword, passwordHash);
    if (!valid) throw new AppError(400, "Mật khẩu hiện tại không đúng", { currentPassword: "Mật khẩu hiện tại không đúng" });
  }

  await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [await bcrypt.hash(newPassword, 10), id]);
  return { tokenVersion: await bumpTokenVersion(id), created: !passwordHash };
}

export async function logoutAllDevices(id: number) {
  await assertNotDemo(id);
  await bumpTokenVersion(id);
}

/**
 * Khách tự xoá tài khoản: nhập đúng mật khẩu, hoặc gõ lại email nếu tài khoản Google chưa có mật khẩu.
 * Đơn hàng cũ vẫn giữ (user_id → NULL).
 */
export async function deleteOwnAccount(id: number, role: Role, confirm: { password: string; confirmEmail: string }) {
  if (role === "admin") throw new AppError(400, "Tài khoản quản trị không thể tự xoá. Hãy nhờ admin khác hạ quyền trước.");
  await assertNotDemo(id);
  const { email, passwordHash } = await getCredentials(id);
  if (passwordHash) {
    if (!confirm.password) throw new AppError(400, "Vui lòng nhập mật khẩu để xác nhận", { password: "Vui lòng nhập mật khẩu để xác nhận" });
    const valid = await bcrypt.compare(confirm.password, passwordHash);
    if (!valid) throw new AppError(400, "Mật khẩu không đúng", { password: "Mật khẩu không đúng" });
  } else if (confirm.confirmEmail !== email) {
    throw new AppError(400, "Email không khớp với tài khoản", { confirmEmail: "Email không khớp với tài khoản" });
  }
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
