import { Client } from "pg";
import { env } from "../config/env";
import { pool } from "./pool";
import { SCHEMA_SQL } from "./schema";
import { seed } from "./seed";
import { backfillSlugs } from "../modules/products/products.service";

/**
 * npm run db:setup
 * 1. Tạo database (nếu chưa có)  2. Tạo bảng  3. Nạp dữ liệu mẫu (nếu bảng còn trống)
 */
async function createDatabaseIfMissing() {
  const url = new URL(env.DATABASE_URL);
  const dbName = decodeURIComponent(url.pathname.slice(1));

  // Kết nối vào database mặc định "postgres" để tạo database mới
  url.pathname = "/postgres";
  const admin = new Client({
    connectionString: url.toString(),
    ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
  });
  await admin.connect();
  try {
    const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (!rowCount) {
      // Tên database không truyền được qua tham số $1 → escape thủ công
      await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
      console.log(`✅ Đã tạo database "${dbName}"`);
    } else {
      console.log(`ℹ️  Database "${dbName}" đã tồn tại`);
    }
  } finally {
    await admin.end();
  }
}

async function main() {
  try {
    await createDatabaseIfMissing();
  } catch (err) {
    // Trên cloud thường không có quyền CREATE DATABASE — database đã được tạo sẵn
    console.warn(`⚠️  Bỏ qua bước tạo database: ${(err as Error).message}`);
  }

  await pool.query(SCHEMA_SQL);
  console.log("✅ Đã tạo bảng users, products, cart_items, orders, order_items, settings, notifications, categories, contact_messages, newsletter_subscribers, coupons, reviews, favorites");

  await seed();
  const filled = await backfillSlugs();
  if (filled) console.log(`✅ Đã tạo đường dẫn (slug) cho ${filled} món`);
  await pool.end();
  console.log("🎉 Hoàn tất!");
}

main().catch(async (err) => {
  console.error("❌ Setup thất bại:", err.message);
  await pool.end();
  process.exit(1);
});
