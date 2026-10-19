import { z } from "zod";
import { pool } from "../../db/pool";
import { AppError } from "../../utils/AppError";
import { slugify } from "../../utils/slugify";

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Tên danh mục cần ít nhất 2 ký tự").max(50, "Tên danh mục tối đa 50 ký tự"),
  sortOrder: z.number({ error: "Thứ tự phải là số" }).int().min(0).max(999),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export interface Category {
  id: number;
  slug: string;
  name: string;
  sortOrder: number;
  productCount: number;
}

const SELECT = `
  SELECT c.id, c.slug, c.name, c.sort_order AS "sortOrder", COUNT(p.id)::int AS "productCount"
  FROM categories c
  LEFT JOIN products p ON p.category = c.slug`;

export async function findAll(): Promise<Category[]> {
  const { rows } = await pool.query<Category>(`${SELECT} GROUP BY c.id ORDER BY c.sort_order, c.id`);
  return rows;
}

async function findById(id: number): Promise<Category> {
  const { rows } = await pool.query<Category>(`${SELECT} WHERE c.id = $1 GROUP BY c.id`, [id]);
  if (!rows[0]) throw new AppError(404, "Không tìm thấy danh mục");
  return rows[0];
}

async function assertNameAvailable(name: string, excludeId = 0) {
  const { rowCount } = await pool.query("SELECT 1 FROM categories WHERE LOWER(name) = LOWER($1) AND id <> $2", [name, excludeId]);
  if (rowCount) throw new AppError(409, "Đã có danh mục tên này", { name: "Đã có danh mục tên này" });
}

export async function create(input: CategoryInput): Promise<Category> {
  await assertNameAvailable(input.name);

  // Slug sinh từ tên lúc tạo và giữ cố định (các món tham chiếu theo slug)
  const base = slugify(input.name);
  const { rows: taken } = await pool.query<{ slug: string }>("SELECT slug FROM categories WHERE slug = $1 OR slug LIKE $1 || '-%'", [base]);
  const used = new Set(taken.map((r) => r.slug));
  let slug = base;
  for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;

  const { rows } = await pool.query<{ id: number }>("INSERT INTO categories (slug, name, sort_order) VALUES ($1, $2, $3) RETURNING id", [
    slug,
    input.name,
    input.sortOrder,
  ]);
  return findById(rows[0].id);
}

export async function update(id: number, input: CategoryInput): Promise<Category> {
  await findById(id);
  await assertNameAvailable(input.name, id);
  await pool.query("UPDATE categories SET name = $1, sort_order = $2 WHERE id = $3", [input.name, input.sortOrder, id]);
  return findById(id);
}

export async function remove(id: number) {
  const category = await findById(id);
  if (category.productCount > 0) {
    throw new AppError(409, `Danh mục "${category.name}" đang có ${category.productCount} món. Hãy chuyển các món sang danh mục khác trước khi xoá.`);
  }
  await pool.query("DELETE FROM categories WHERE id = $1", [id]);
}
