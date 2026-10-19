import { app } from "./app";
import { env } from "./config/env";
import { pool } from "./db/pool";

async function main() {
  try {
    await pool.query("SELECT 1");
    console.log("✅ Đã kết nối PostgreSQL");
  } catch (err) {
    console.error("❌ Không kết nối được PostgreSQL. Kiểm tra DATABASE_URL trong file .env");
    console.error((err as Error).message);
    process.exit(1);
  }

  app.listen(env.PORT, () => {
    console.log(`🚀 API đang chạy tại http://localhost:${env.PORT}`);
  });
}

main();
