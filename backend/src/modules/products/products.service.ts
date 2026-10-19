import { pool } from "../../db/pool";
import { AppError } from "../../utils/AppError";
import type { Product, ProductInput, ProductPatch } from "./products.schema";

// Đổi tên cột snake_case (DB) → camelCase (JSON) ngay trong câu SQL
const COLUMNS = `
  id, name, description, price, category, image, stock,
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

export async function findById(id: number): Promise<Product> {
  const { rows } = await pool.query<Product>(`SELECT ${COLUMNS} FROM products WHERE id = $1`, [id]);
  if (!rows[0]) throw new AppError(404, "Không tìm thấy sản phẩm");
  return rows[0];
}

export async function create(input: ProductInput): Promise<Product> {
  const { rows } = await pool.query<Product>(
    `INSERT INTO products (name, description, price, category, image, stock, is_available, is_best_seller)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${COLUMNS}`,
    [input.name, input.description, input.price, input.category, input.image, input.stock, input.isAvailable, input.isBestSeller],
  );
  return rows[0];
}

/** Dùng cho cả PUT (đủ trường) và PATCH (một vài trường) */
export async function update(id: number, input: ProductPatch): Promise<Product> {
  const sets: string[] = [];
  const values: unknown[] = [];

  for (const [field, value] of Object.entries(input)) {
    const column = FIELD_TO_COLUMN[field as keyof ProductInput];
    if (!column || value === undefined) continue;
    values.push(value);
    sets.push(`${column} = $${values.length}`);
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
