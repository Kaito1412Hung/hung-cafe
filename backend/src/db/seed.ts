import bcrypt from "bcryptjs";
import { pool } from "./pool";
import { SEED_PRODUCTS } from "./seed-data";

async function upsertUser(name: string, email: string | undefined, password: string | undefined, role: "admin" | "customer") {
  if (!email || !password) {
    console.warn(`⚠️  Bỏ qua tài khoản ${role}: thiếu SEED_*_EMAIL / SEED_*_PASSWORD trong .env`);
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  const { rowCount } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING`,
    [name, email.toLowerCase(), hash, role],
  );
  console.log(rowCount ? `✅ Đã tạo tài khoản ${role}: ${email}` : `ℹ️  Tài khoản ${email} đã tồn tại`);
}

/** Nạp tài khoản mẫu + sản phẩm mẫu. Chạy lại không bị trùng. */
export async function seed() {
  await upsertUser("Quản trị viên", process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD, "admin");
  await upsertUser("Khách hàng", process.env.SEED_CUSTOMER_EMAIL, process.env.SEED_CUSTOMER_PASSWORD, "customer");

  const { rows } = await pool.query<{ count: string }>("SELECT COUNT(*) FROM products");
  if (Number(rows[0].count) > 0) {
    console.log("ℹ️  Bảng products đã có dữ liệu, bỏ qua seed sản phẩm");
    return;
  }

  // Thêm ngược để món đầu danh sách có created_at mới nhất
  for (const p of [...SEED_PRODUCTS].reverse()) {
    await pool.query(
      `INSERT INTO products (name, description, price, category, image, stock, is_available, is_best_seller)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [p.name, p.description, p.price, p.category, p.image, p.stock, p.isAvailable, p.isBestSeller],
    );
  }
  console.log(`✅ Đã thêm ${SEED_PRODUCTS.length} sản phẩm mẫu`);
}

// Cho phép chạy riêng: npm run db:seed
if (require.main === module) {
  seed()
    .catch((err) => {
      console.error("❌ Seed thất bại:", err.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
