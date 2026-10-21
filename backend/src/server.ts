import { app } from "./app";
import { env } from "./config/env";
import { pool } from "./db/pool";
import { expireUnpaidOrders } from "./modules/orders/orders.service";

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

  // Mỗi phút: huỷ đơn VNPay quá hạn chưa thanh toán (trả kho + lượt mã giảm giá)
  const expire = () =>
    expireUnpaidOrders()
      .then((n) => n && console.log(`⏰ Đã huỷ ${n} đơn VNPay quá hạn chưa thanh toán`))
      .catch((err) => console.error("Lỗi huỷ đơn quá hạn:", (err as Error).message));
  expire();
  setInterval(expire, 60_000).unref();
}

main();
