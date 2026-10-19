import { pool } from "../../db/pool";
import { AppError } from "../../utils/AppError";
import { slugify } from "../../utils/slugify";
import type { Product, ProductInput, ProductPatch } from "./products.schema";

// Đổi tên cột snake_case (DB) → camelCase (JSON) ngay trong câu SQL
const COLUMNS = `
  id, slug, name, description, price, category, image, stock,
  is_available   AS "isAvailable",
  is_best_seller AS "isBestSeller",
  created_at     AS "createdAt",
  updated_at     AS "updatedAt"`;

// Map field (camelCase) → cột DB. Chỉ những cột có trong đây mới được phép cập nhật.
const FIELD_TO_COLUMN: Record<keyof ProductInput, string> = {
  name: "name",
  description: "description",
  price: "price",
  category: "category",
  image: "image",
  stock: "stock",
  isAvailable: "is_available",
  isBestSeller: "is_best_seller",
};

export interface ProductFilters {
  category?: string;
  search?: string;
}

export async function findAll(filters: ProductFilters = {}): Promise<Product[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  // Luôn dùng tham số $1, $2... thay vì nối chuỗi → chống SQL injection
  if (filters.category) {
    values.push(filters.category);
    conditions.push(`category = $${values.length}`);
  }
  if (filters.search) {
    values.push(`%${filters.search}%`);
    conditions.push(`name ILIKE $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await pool.query<Product>(`SELECT ${COLUMNS} FROM products ${where} ORDER BY created_at DESC, id DESC`, values);
  return rows;
}

/** Tạo slug không trùng: "ca-phe-sua-da", nếu đã có thì "ca-phe-sua-da-2", "-3"... */
async function uniqueSlug(name: string, excludeId = 0) {
  const base = slugify(name);
  const { rows } = await pool.query<{ slug: string }>(
    "SELECT slug FROM products WHERE (slug = $1 OR slug LIKE $1 || '-%') AND id <> $2",
    [base, excludeId],
  );
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Điền slug cho các món chưa có (dữ liệu cũ / dữ liệu mẫu) — gọi trong "npm run db:setup" */
export async function backfillSlugs() {
  const { rows } = await pool.query<{ id: number; name: string }>("SELECT id, name FROM products WHERE slug IS NULL ORDER BY id");
  for (const p of rows) {
    await pool.query("UPDATE products SET slug = $1 WHERE id = $2", [await uniqueSlug(p.name, p.id), p.id]);
  }
  return rows.length;
}

async function assertCategoryExists(slug: string) {
  const { rowCount } = await pool.query("SELECT 1 FROM categories WHERE slug = $1", [slug]);
  if (!rowCount) throw new AppError(400, "Danh mục không tồn tại", { category: "Danh mục không tồn tại" });
}

export async function findBySlug(slug: string): Promise<Product> {
  const { rows } = await pool.query<Product>(`SELECT ${COLUMNS} FROM products WHERE slug = $1`, [slug]);
  if (!rows[0]) throw new AppError(404, "Không tìm thấy món này");
  return rows[0];
}

export async function findById(id: number): Promise<Product> {
  const { rows } = await pool.query<Product>(`SELECT ${COLUMNS} FROM products WHERE id = $1`, [id]);
  if (!rows[0]) throw new AppError(404, "Không tìm thấy sản phẩm");
  return rows[0];
}

export async function create(input: ProductInput): Promise<Product> {
  await assertCategoryExists(input.category);
  const { rows } = await pool.query<Product>(
    `INSERT INTO products (slug, name, description, price, category, image, stock, is_available, is_best_seller)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING ${COLUMNS}`,
    [await uniqueSlug(input.name), input.name, input.description, input.price, input.category, input.image, input.stock, input.isAvailable, input.isBestSeller],
  );
  return rows[0];
}

/** Dùng cho cả PUT (đủ trường) và PATCH (một vài trường) */
export async function update(id: number, input: ProductPatch): Promise<Product> {
  const sets: string[] = [];
  const values: unknown[] = [];

  if (input.category !== undefined) await assertCategoryExists(input.category);

  for (const [field, value] of Object.entries(input)) {
    const column = FIELD_TO_COLUMN[field as keyof ProductInput];
    if (!column || value === undefined) continue;
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  }

  // Đổi tên món → cập nhật luôn đường dẫn (slug) cho khớp tên mới
  if (input.name !== undefined) {
    values.push(await uniqueSlug(input.name, id));
    sets.push(`slug = $${values.length}`);
  }

  values.push(id);
  const { rows } = await pool.query<Product>(
    `UPDATE products SET ${sets.join(", ")}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING ${COLUMNS}`,
    values,
  );
  if (!rows[0]) throw new AppError(404, "Không tìm thấy sản phẩm");
  return rows[0];
}

export async function remove(id: number): Promise<void> {
  const { rowCount } = await pool.query("DELETE FROM products WHERE id = $1", [id]);
  if (!rowCount) throw new AppError(404, "Không tìm thấy sản phẩm");
}
