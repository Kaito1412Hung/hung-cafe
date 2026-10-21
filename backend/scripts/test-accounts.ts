/**
 * Dữ liệu của 2 tài khoản test (khách kaito@gmail.com, admin kaitokid@gmail.com).
 *
 * npm run test-accounts                   → LIỆT KÊ dữ liệu 2 tài khoản đã tạo ra (không thay đổi gì)
 * npm run test-accounts -- --clean        → XOÁ dữ liệu đó (hỏi lại trước), GIỮ 2 tài khoản như mới tạo
 * npm run test-accounts -- --clean --yes  → xoá không hỏi lại
 *
 * Khi xoá đơn chưa huỷ: trả lại tồn kho + lượt mã giảm giá (giống lúc huỷ đơn), xoá thông báo liên quan.
 * Không đụng dữ liệu demo hay tài khoản khác. Thay đổi do admin kaitokid sửa món / mã / cài đặt
 * thì không lần ra được ở đây → dùng bản chụp: npm run db:compare / db:restore.
 */
import { Client } from "pg";
import { DATABASE_URL, confirm } from "./lib";

const TEST_EMAILS = ["kaito@gmail.com", "kaitokid@gmail.com"];

async function main() {
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();
  try {
    const { rows: users } = await db.query<{ id: number; email: string; role: string; nickname: string; phone: string; address: string; avatar: string; birthday: string | null; gender: string }>(
      `SELECT id, email, role, nickname, phone, address, avatar, birthday, gender FROM users WHERE email = ANY($1) ORDER BY id`,
      [TEST_EMAILS],
    );
    if (users.length === 0) {
      console.log("Không thấy tài khoản test nào.");
      return;
    }
    const ids = users.map((u) => u.id);

    // Chạy lần lượt từng câu (1 kết nối không chạy nhiều câu cùng lúc được)
    const orders = await db.query<{ id: number; email: string; status: string; total: number; fulfillment: string }>(
      `SELECT o.id, u.email, o.status, o.total, o.fulfillment FROM orders o JOIN users u ON u.id = o.user_id WHERE o.user_id = ANY($1) ORDER BY o.id`,
      [ids],
    );
    const reviews = await db.query<{ id: number; email: string; rating: number; product: string }>(
      `SELECT r.id, u.email, r.rating, p.name AS product FROM reviews r JOIN users u ON u.id = r.user_id JOIN products p ON p.id = r.product_id WHERE r.user_id = ANY($1) ORDER BY r.id`,
      [ids],
    );
    const cart = await db.query<{ email: string; product: string; quantity: number }>(
      `SELECT u.email, p.name AS product, c.quantity FROM cart_items c JOIN users u ON u.id = c.user_id JOIN products p ON p.id = c.product_id WHERE c.user_id = ANY($1) ORDER BY c.id`,
      [ids],
    );
    const favorites = await db.query<{ email: string; product: string }>(
      `SELECT u.email, p.name AS product FROM favorites f JOIN users u ON u.id = f.user_id JOIN products p ON p.id = f.product_id WHERE f.user_id = ANY($1)`,
      [ids],
    );
    const notifications = await db.query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = ANY($1)`, [ids]);
    const contacts = await db.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM contact_messages WHERE user_id = ANY($1) OR lower(email) = ANY($2)`,
      [ids, TEST_EMAILS],
    );
    const newsletter = await db.query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM newsletter_subscribers WHERE lower(email) = ANY($1)`, [TEST_EMAILS]);
    const orderIds = orders.rows.map((o) => o.id);
    const reviewIds = reviews.rows.map((r) => r.id);
    // Thông báo gửi cho admin về đơn / đánh giá của tài khoản test
    const adminLinks = [...orderIds.map((id) => `/admin/orders?order=${id}`), ...reviewIds.map((id) => `/admin/reviews?review=${id}`)];
    const adminNotes = await db.query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM notifications WHERE link = ANY($1)`, [adminLinks]);

    /* ----- Liệt kê ----- */
    console.log("👤 Tài khoản test:");
    for (const u of users) {
      const profile = [u.nickname && "tên hiển thị", u.phone && "SĐT", u.address && "địa chỉ", u.avatar && "ảnh đại diện", u.birthday && "ngày sinh", u.gender && "giới tính"].filter(Boolean);
      console.log(`   - ${u.email} (${u.role === "admin" ? "admin" : "khách"})${profile.length ? ` · hồ sơ đã điền: ${profile.join(", ")}` : " · hồ sơ trống"}`);
    }
    console.log(`\n📦 Đơn hàng: ${orders.rowCount}`);
    for (const o of orders.rows) console.log(`   - #${String(o.id).padStart(5, "0")} ${o.email} · ${o.status} · ${o.fulfillment} · ${o.total.toLocaleString("vi-VN")}đ`);
    console.log(`⭐ Đánh giá: ${reviews.rowCount}`);
    for (const r of reviews.rows) console.log(`   - ${r.rating}★ ${r.product} (${r.email})`);
    console.log(`🛒 Giỏ hàng: ${cart.rowCount} dòng`);
    for (const c of cart.rows) console.log(`   - ${c.quantity} × ${c.product} (${c.email})`);
    console.log(`❤️  Yêu thích: ${favorites.rowCount}${favorites.rowCount ? ` (${favorites.rows.map((f) => f.product).join(", ")})` : ""}`);
    console.log(`🔔 Thông báo của 2 tài khoản: ${notifications.rows[0].count} · thông báo admin về đơn / đánh giá test: ${adminNotes.rows[0].count}`);
    console.log(`✉️  Tin nhắn liên hệ: ${contacts.rows[0].count} · đăng ký nhận tin: ${newsletter.rows[0].count}`);

    const total =
      orders.rowCount! + reviews.rowCount! + cart.rowCount! + favorites.rowCount! + notifications.rows[0].count + adminNotes.rows[0].count + contacts.rows[0].count + newsletter.rows[0].count;
    const profileDirty = users.some((u) => u.nickname || u.phone || u.address || u.avatar || u.birthday || u.gender);

    if (!process.argv.includes("--clean")) {
      console.log(total === 0 && !profileDirty ? "\n✅ 2 tài khoản đang sạch như mới tạo." : "\nMuốn xoá: npm run test-accounts -- --clean");
      return;
    }
    if (total === 0 && !profileDirty) {
      console.log("\n✅ Không có gì để xoá.");
      return;
    }
    if (!(await confirm("\n⚠️  Xoá toàn bộ dữ liệu trên của 2 tài khoản test (giữ lại tài khoản)?"))) {
      console.log("Đã huỷ, chưa thay đổi gì.");
      process.exitCode = 1;
      return;
    }

    /* ----- Xoá (1 transaction: lỗi thì không đổi gì) ----- */
    await db.query("BEGIN");
    try {
      // Đơn chưa huỷ → trả lại tồn kho + lượt mã giảm giá (đơn đã huỷ thì lúc huỷ đã trả rồi)
      await db.query(
        `UPDATE products p SET stock = p.stock + x.qty
         FROM (SELECT oi.product_id, SUM(oi.quantity) AS qty FROM order_items oi JOIN orders o ON o.id = oi.order_id
               WHERE o.id = ANY($1) AND o.status <> 'cancelled' AND oi.product_id IS NOT NULL GROUP BY oi.product_id) x
         WHERE p.id = x.product_id`,
        [orderIds],
      );
      await db.query(
        `UPDATE coupons c SET used_count = GREATEST(c.used_count - x.n, 0)
         FROM (SELECT coupon_code, COUNT(*) AS n FROM orders WHERE id = ANY($1) AND status <> 'cancelled' AND coupon_code <> '' GROUP BY coupon_code) x
         WHERE c.code = x.coupon_code`,
        [orderIds],
      );
      await db.query(`DELETE FROM notifications WHERE user_id = ANY($1) OR link = ANY($2)`, [ids, adminLinks]);
      await db.query(`DELETE FROM orders WHERE id = ANY($1)`, [orderIds]); // order_items xoá theo (CASCADE)
      await db.query(`DELETE FROM reviews WHERE user_id = ANY($1)`, [ids]);
      await db.query(`DELETE FROM cart_items WHERE user_id = ANY($1)`, [ids]);
      await db.query(`DELETE FROM favorites WHERE user_id = ANY($1)`, [ids]);
      await db.query(`DELETE FROM contact_messages WHERE user_id = ANY($1) OR lower(email) = ANY($2)`, [ids, TEST_EMAILS]);
      await db.query(`DELETE FROM newsletter_subscribers WHERE lower(email) = ANY($1)`, [TEST_EMAILS]);
      await db.query(`UPDATE users SET nickname = '', phone = '', address = '', avatar = '', birthday = NULL, gender = '' WHERE id = ANY($1)`, [ids]);
      await db.query("COMMIT");
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    }
    console.log("\n🧹 Đã xoá xong, 2 tài khoản giữ nguyên như mới tạo (mật khẩu không đổi).");
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
