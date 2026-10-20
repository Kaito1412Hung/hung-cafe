import type { PoolClient } from "pg";
import { z } from "zod";
import { pool } from "../../db/pool";
import { AppError } from "../../utils/AppError";
import type { ToppingSnapshot } from "../cart/options";

export interface Topping {
  id: number;
  name: string;
  price: number;
  isAvailable: boolean;
  sortOrder: number;
}

const COLUMNS = `id, name, price, is_available AS "isAvailable", sort_order AS "sortOrder"`;

export const toppingSchema = z.object({
  name: z.string().trim().min(2, "Tên topping cần ít nhất 2 ký tự").max(50, "Tên topping tối đa 50 ký tự"),
  price: z.number({ error: "Giá phải là số" }).int().min(0, "Giá phải ≥ 0").max(100000, "Giá tối đa 100.000đ"),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(999).default(0),
});
export const toppingPatchSchema = z
  .object({
    name: toppingSchema.shape.name,
    price: toppingSchema.shape.price,
    isAvailable: z.boolean(),
    sortOrder: z.number().int().min(0).max(999),
  })
  .partial();

export type ToppingInput = z.infer<typeof toppingSchema>;

/** `all = false`: chỉ topping đang bán (cho khách chọn) */
export async function findAll(all = false): Promise<Topping[]> {
  const { rows } = await pool.query<Topping>(`SELECT ${COLUMNS} FROM toppings ${all ? "" : "WHERE is_available"} ORDER BY sort_order, id`);
  return rows;
}

/** Topping đang bán dạng Map (mã → tên, giá) để tính tiền trong giỏ / lúc đặt */
export async function availableMap(client: PoolClient | typeof pool = pool): Promise<Map<number, ToppingSnapshot>> {
  const { rows } = await client.query<ToppingSnapshot>("SELECT id, name, price FROM toppings WHERE is_available");
  return new Map(rows.map((t) => [t.id, t]));
}

async function assertNameFree(name: string, excludeId = 0) {
  const { rowCount } = await pool.query("SELECT 1 FROM toppings WHERE LOWER(name) = LOWER($1) AND id <> $2", [name, excludeId]);
  if (rowCount) throw new AppError(409, "Topping này đã có", { name: "Topping này đã có" });
}

export async function create(input: ToppingInput): Promise<Topping> {
  await assertNameFree(input.name);
  const { rows } = await pool.query<Topping>(
    `INSERT INTO toppings (name, price, is_available, sort_order) VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
    [input.name, input.price, input.isAvailable, input.sortOrder],
  );
  return rows[0];
}

const FIELD_TO_COLUMN: Record<string, string> = { name: "name", price: "price", isAvailable: "is_available", sortOrder: "sort_order" };

export async function update(id: number, input: z.infer<typeof toppingPatchSchema>): Promise<Topping> {
  if (input.name) await assertNameFree(input.name, id);
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [field, value] of Object.entries(input)) {
    if (value === undefined || !FIELD_TO_COLUMN[field]) continue;
    values.push(value);
    sets.push(`${FIELD_TO_COLUMN[field]} = $${values.length}`);
  }
  if (!sets.length) throw new AppError(400, "Cần ít nhất một trường để cập nhật");
  values.push(id);
  const { rows } = await pool.query<Topping>(`UPDATE toppings SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING ${COLUMNS}`, values);
  if (!rows[0]) throw new AppError(404, "Không tìm thấy topping");
  return rows[0];
}

/** Xoá topping. Đơn cũ vẫn giữ tên + giá topping (đã chụp lại lúc đặt). */
export async function remove(id: number) {
  const { rowCount } = await pool.query("DELETE FROM toppings WHERE id = $1", [id]);
  if (!rowCount) throw new AppError(404, "Không tìm thấy topping");
}
