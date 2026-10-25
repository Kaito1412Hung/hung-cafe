/**
 * Chạy 1 lần trước toàn bộ test: xoá + tạo lại database hung_cafe_test, tạo bảng, nạp dữ liệu mẫu,
 * mở cửa quán cả ngày (để test đặt hàng chạy được lúc nào cũng được).
 */
import { Client } from "pg";

export default async function setup() {
  const url = new URL(process.env.DATABASE_URL!);
  const dbName = decodeURIComponent(url.pathname.slice(1));
  // Chốt an toàn: chỉ xoá database có tên kết thúc bằng _test
  if (!dbName.endsWith("_test")) throw new Error(`Từ chối chạy test trên database "${dbName}" (tên phải kết thúc bằng _test)`);

  url.pathname = "/postgres";
  const admin = new Client({ connectionString: url.toString() });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
  await admin.query(`CREATE DATABASE "${dbName}"`);
  await admin.end();

  // Import sau khi đã có biến môi trường (pool đọc DATABASE_URL lúc import)
  const { pool } = await import("../src/db/pool");
  const { SCHEMA_SQL } = await import("../src/db/schema");
  const { seed } = await import("../src/db/seed");
  const { backfillSlugs } = await import("../src/modules/products/products.service");

  const log = console.log;
  console.log = () => {}; // ẩn log "Đã tạo…" của seed cho gọn
  try {
    await pool.query(SCHEMA_SQL);
    await seed();
    await backfillSlugs();
    const allDay = { weekdayOpen: "00:00", weekdayClose: "00:00", weekendOpen: "00:00", weekendClose: "00:00", acceptOrders: true };
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ('shop', $1::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = settings.value || EXCLUDED.value`,
      [JSON.stringify(allDay)],
    );
  } finally {
    console.log = log;
    await pool.end();
  }
}
