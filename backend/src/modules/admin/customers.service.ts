import { pool } from "../../db/pool";
import { AppError } from "../../utils/AppError";
import type { Role } from "../auth/auth.schema";
import { findByUser } from "../orders/orders.service";

export interface Customer {
  id: number;
  name: string;
  nickname: string;
  avatar: string;
  phone: string;
  address: string;
  email: string;
  role: Role;
  createdAt: Date;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: Date | null;
}

const CUSTOMER_SELECT = `
  SELECT u.id, u.name, u.nickname, u.avatar, u.phone, u.address, u.email, u.role, u.created_at AS "createdAt",
         COUNT(o.id) FILTER (WHERE o.status <> 'cancelled')::int AS "orderCount",
         COALESCE(SUM(o.total) FILTER (WHERE o.status = 'completed'), 0)::int AS "totalSpent",
         MAX(o.created_at) AS "lastOrderAt"
  FROM users u
  LEFT JOIN orders o ON o.user_id = u.id`;

export async function findAll(filters: { search?: string; role?: string }): Promise<Customer[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (filters.role === "admin" || filters.role === "customer") {
    values.push(filters.role);
    conditions.push(`u.role = $${values.length}`);
  }
  if (filters.search) {
    values.push(`%${filters.search}%`);
    conditions.push(`(u.name ILIKE $${values.length} OR u.nickname ILIKE $${values.length} OR u.email ILIKE $${values.length} OR u.phone ILIKE $${values.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await pool.query<Customer>(`${CUSTOMER_SELECT} ${where} GROUP BY u.id ORDER BY u.created_at DESC`, values);
  return rows;
}

export async function findById(id: number) {
  const { rows } = await pool.query<Customer>(`${CUSTOMER_SELECT} WHERE u.id = $1 GROUP BY u.id`, [id]);
  if (!rows[0]) throw new AppError(404, "Không tìm thấy tài khoản");
  return { ...rows[0], orders: await findByUser(id) };
}

async function countAdmins() {
  const { rows } = await pool.query<{ count: string }>("SELECT COUNT(*) FROM users WHERE role = 'admin'");
  return Number(rows[0].count);
}

export async function changeRole(actorId: number, id: number, role: Role) {
  if (actorId === id) throw new AppError(400, "Bạn không thể tự đổi quyền của chính mình");
  const target = await findById(id);
  if (target.role === role) return target;
  if (target.role === "admin" && (await countAdmins()) <= 1) {
    throw new AppError(400, "Phải còn ít nhất một quản trị viên");
  }
  await pool.query("UPDATE users SET role = $1 WHERE id = $2", [role, id]);
  return findById(id);
}

export async function remove(actorId: number, id: number) {
  if (actorId === id) throw new AppError(400, "Bạn không thể tự xoá tài khoản của mình");
  const target = await findById(id);
  if (target.role === "admin") throw new AppError(400, "Hãy hạ quyền quản trị viên trước khi xoá");
  // Đơn hàng cũ vẫn giữ lại (user_id → NULL nhờ ON DELETE SET NULL), giỏ hàng bị xoá theo
  await pool.query("DELETE FROM users WHERE id = $1", [id]);
}
