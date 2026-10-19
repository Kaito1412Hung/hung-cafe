import type { PoolClient } from "pg";
import { z } from "zod";
import { pool } from "../../db/pool";
import { AppError } from "../../utils/AppError";

export interface Coupon {
  id: number;
  code: string;
  description: string;
  type: "percent" | "fixed";
  value: number;
  maxDiscount: number | null;
  minOrder: number;
  usageLimit: number | null;
  usedCount: number;
  firstOrderOnly: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: Date;
}

const COLUMNS = `id, code, description, type, value, max_discount AS "maxDiscount", min_order AS "minOrder",
  usage_limit AS "usageLimit", used_count AS "usedCount", first_order_only AS "firstOrderOnly",
  starts_at AS "startsAt", expires_at AS "expiresAt", is_active AS "isActive", created_at AS "createdAt"`;

/* ---------- Kiểm tra dữ liệu admin nhập ---------- */
const fields = {
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,30}$/, "Mã gồm 3–30 ký tự: chữ không dấu, số, - hoặc _"),
  description: z.string().trim().max(150, "Mô tả tối đa 150 ký tự"),
  type: z.enum(["percent", "fixed"], { error: "Loại giảm giá không hợp lệ" }),
  value: z.number({ error: "Giá trị phải là số" }).int().positive("Giá trị phải lớn hơn 0"),
  maxDiscount: z.number().int().positive("Giảm tối đa phải lớn hơn 0").nullable(),
  minOrder: z.number().int().min(0, "Đơn tối thiểu phải ≥ 0"),
  usageLimit: z.number().int().positive("Số lượt phải lớn hơn 0").nullable(),
  firstOrderOnly: z.boolean(),
  startsAt: z.iso.datetime({ offset: true, error: "Ngày bắt đầu không hợp lệ" }).nullable(),
  expiresAt: z.iso.datetime({ offset: true, error: "Ngày hết hạn không hợp lệ" }).nullable(),
  isActive: z.boolean(),
};

const checkRules = (v: { type?: string; value?: number; startsAt?: string | null; expiresAt?: string | null }, ctx: z.RefinementCtx) => {
  if (v.type === "percent" && v.value !== undefined && v.value > 100) {
    ctx.addIssue({ code: "custom", path: ["value"], message: "Giảm theo % tối đa 100%" });
  }
  if (v.startsAt && v.expiresAt && new Date(v.expiresAt) <= new Date(v.startsAt)) {
    ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "Ngày hết hạn phải sau ngày bắt đầu" });
  }
};

export const couponSchema = z
  .object({
    ...fields,
    description: fields.description.default(""),
    maxDiscount: fields.maxDiscount.default(null),
    minOrder: fields.minOrder.default(0),
    usageLimit: fields.usageLimit.default(null),
    firstOrderOnly: fields.firstOrderOnly.default(false),
    startsAt: fields.startsAt.default(null),
    expiresAt: fields.expiresAt.default(null),
    isActive: fields.isActive.default(true),
  })
  .superRefine(checkRules);

// PATCH: không dùng .default() để trường không gửi lên giữ nguyên giá trị cũ
export const couponPatchSchema = z.object(fields).partial().superRefine(checkRules);

export type CouponInput = z.infer<typeof couponSchema>;
export type CouponPatch = z.infer<typeof couponPatchSchema>;

const FIELD_TO_COLUMN: Record<keyof CouponInput, string> = {
  code: "code",
  description: "description",
  type: "type",
  value: "value",
  maxDiscount: "max_discount",
  minOrder: "min_order",
  usageLimit: "usage_limit",
  firstOrderOnly: "first_order_only",
  startsAt: "starts_at",
  expiresAt: "expires_at",
  isActive: "is_active",
};

/* ---------- Tính tiền giảm ---------- */

/** Số tiền được giảm cho tạm tính `subtotal` (không vượt quá tạm tính) */
export function calcDiscount(c: Pick<Coupon, "type" | "value" | "maxDiscount">, subtotal: number) {
  const raw = c.type === "percent" ? Math.floor((subtotal * c.value) / 100) : c.value;
  return Math.min(raw, c.maxDiscount ?? Infinity, subtotal);
}

const money = (v: number) => new Intl.NumberFormat("vi-VN").format(v) + "đ";

/**
 * Kiểm tra mã có dùng được cho khách + tạm tính này không. Sai điều kiện → lỗi 400 nói rõ lý do.
 * Gọi trong transaction đặt hàng với `lock = true` để khoá dòng mã (2 người dùng lượt cuối cùng lúc).
 */
export async function evaluate(client: PoolClient | typeof pool, rawCode: string, userId: number, subtotal: number, lock = false) {
  const code = rawCode.trim().toUpperCase();
  const { rows } = await client.query<Coupon>(`SELECT ${COLUMNS} FROM coupons WHERE code = $1 ${lock ? "FOR UPDATE" : ""}`, [code]);
  const coupon = rows[0];
  const now = new Date();

  if (!coupon || !coupon.isActive) throw new AppError(400, "Mã giảm giá không tồn tại hoặc đã ngưng áp dụng");
  if (coupon.startsAt && new Date(coupon.startsAt) > now) throw new AppError(400, "Mã giảm giá chưa tới ngày áp dụng");
  if (coupon.expiresAt && new Date(coupon.expiresAt) <= now) throw new AppError(400, "Mã giảm giá đã hết hạn");
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) throw new AppError(400, "Mã giảm giá đã hết lượt sử dụng");
  if (subtotal < coupon.minOrder) {
    throw new AppError(400, `Mã này áp dụng cho đơn từ ${money(coupon.minOrder)} — bạn cần mua thêm ${money(coupon.minOrder - subtotal)}`);
  }

  // Đơn đã huỷ không tính là "đã dùng"
  const { rows: used } = await client.query<{ orders: number; withCode: number }>(
    `SELECT COUNT(*)::int AS orders, COUNT(*) FILTER (WHERE coupon_code = $2)::int AS "withCode"
     FROM orders WHERE user_id = $1 AND status <> 'cancelled'`,
    [userId, code],
  );
  if (coupon.firstOrderOnly && used[0].orders > 0) throw new AppError(400, "Mã này chỉ dành cho đơn hàng đầu tiên");
  if (used[0].withCode > 0) throw new AppError(400, "Bạn đã dùng mã này rồi (mỗi tài khoản dùng 1 lần)");

  return { coupon, discount: calcDiscount(coupon, subtotal) };
}

/* ---------- Admin ---------- */

export async function findAll(): Promise<Coupon[]> {
  const { rows } = await pool.query<Coupon>(`SELECT ${COLUMNS} FROM coupons ORDER BY created_at DESC, id DESC`);
  return rows;
}

async function assertCodeFree(code: string, excludeId = 0) {
  const { rowCount } = await pool.query("SELECT 1 FROM coupons WHERE code = $1 AND id <> $2", [code, excludeId]);
  if (rowCount) throw new AppError(409, "Mã này đã tồn tại", { code: "Mã này đã tồn tại" });
}

export async function create(input: CouponInput): Promise<Coupon> {
  await assertCodeFree(input.code);
  const keys = Object.keys(FIELD_TO_COLUMN) as (keyof CouponInput)[];
  const { rows } = await pool.query<Coupon>(
    `INSERT INTO coupons (${keys.map((k) => FIELD_TO_COLUMN[k]).join(", ")})
     VALUES (${keys.map((_, i) => `$${i + 1}`).join(", ")})
     RETURNING ${COLUMNS}`,
    keys.map((k) => input[k]),
  );
  return rows[0];
}

export async function update(id: number, input: CouponPatch): Promise<Coupon> {
  if (input.code) await assertCodeFree(input.code, id);
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [field, value] of Object.entries(input)) {
    const column = FIELD_TO_COLUMN[field as keyof CouponInput];
    if (!column || value === undefined) continue;
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  }
  if (!sets.length) throw new AppError(400, "Cần ít nhất một trường để cập nhật");
  values.push(id);
  const { rows } = await pool.query<Coupon>(`UPDATE coupons SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING ${COLUMNS}`, values);
  if (!rows[0]) throw new AppError(404, "Không tìm thấy mã giảm giá");
  return rows[0];
}

/** Xoá mã. Đơn cũ vẫn giữ tên mã + số tiền đã giảm (lưu sẵn trong bảng orders). */
export async function remove(id: number) {
  const { rowCount } = await pool.query("DELETE FROM coupons WHERE id = $1", [id]);
  if (!rowCount) throw new AppError(404, "Không tìm thấy mã giảm giá");
}
