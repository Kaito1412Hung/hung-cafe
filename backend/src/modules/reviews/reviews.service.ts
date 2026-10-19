import { z } from "zod";
import { pool } from "../../db/pool";
import { AppError } from "../../utils/AppError";
import { notifyAdmins } from "../notifications/notifications.service";

export const reviewSchema = z.object({
  productId: z.number({ error: "Thiếu món cần đánh giá" }).int().positive(),
  rating: z.number({ error: "Vui lòng chọn số sao" }).int().min(1, "Vui lòng chọn số sao").max(5),
  comment: z.string().trim().max(500, "Nhận xét tối đa 500 ký tự").default(""),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export interface Review {
  id: number;
  productId: number;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
  /** Tên hiển thị (tên gọi nếu có, không thì họ tên) */
  authorName: string;
  authorAvatar: string;
  userId: number;
}

const COLUMNS = `r.id, r.product_id AS "productId", r.rating, r.comment, r.created_at AS "createdAt", r.updated_at AS "updatedAt",
  r.user_id AS "userId", COALESCE(NULLIF(u.nickname, ''), u.name) AS "authorName", u.avatar AS "authorAvatar"`;

/** Chỉ khách đã nhận món (có đơn "Hoàn thành" chứa món đó) mới được đánh giá */
async function hasPurchased(userId: number, productId: number) {
  const { rowCount } = await pool.query(
    `SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE o.user_id = $1 AND o.status = 'completed' AND oi.product_id = $2 LIMIT 1`,
    [userId, productId],
  );
  return Boolean(rowCount);
}

/** Đánh giá của 1 món + thống kê sao. Có `userId` thì cho biết người đó đánh giá được không. */
export async function listByProduct(productId: number, userId?: number) {
  const [list, stats] = await Promise.all([
    pool.query<Review>(`SELECT ${COLUMNS} FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.product_id = $1 ORDER BY r.created_at DESC LIMIT 50`, [
      productId,
    ]),
    pool.query<{ rating: number; count: number }>("SELECT rating, COUNT(*)::int AS count FROM reviews WHERE product_id = $1 GROUP BY rating", [productId]),
  ]);

  const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of stats.rows) breakdown[r.rating] = r.count;
  const count = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const sum = Object.entries(breakdown).reduce((a, [star, n]) => a + Number(star) * n, 0);

  return {
    summary: { average: count ? Math.round((sum / count) * 10) / 10 : null, count, breakdown },
    reviews: list.rows,
    canReview: userId ? await hasPurchased(userId, productId) : false,
    myReview: userId ? (list.rows.find((r) => r.userId === userId) ?? null) : null,
  };
}

/** Viết mới hoặc sửa đánh giá của mình (mỗi người 1 đánh giá / món) */
export async function upsert(userId: number, input: ReviewInput): Promise<Review> {
  const { rows: products } = await pool.query<{ name: string; slug: string }>("SELECT name, slug FROM products WHERE id = $1", [input.productId]);
  if (!products[0]) throw new AppError(404, "Không tìm thấy món này");
  if (!(await hasPurchased(userId, input.productId))) {
    throw new AppError(403, "Bạn cần nhận món này (đơn đã hoàn thành) trước khi đánh giá");
  }

  const { rows } = await pool.query<{ id: number; isNew: boolean }>(
    `INSERT INTO reviews (product_id, user_id, rating, comment) VALUES ($1, $2, $3, $4)
     ON CONFLICT (product_id, user_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = NOW()
     RETURNING id, (xmax = 0) AS "isNew"`,
    [input.productId, userId, input.rating, input.comment],
  );

  // Chỉ báo admin khi có đánh giá MỚI (sửa lại thì thôi)
  if (rows[0].isNew) {
    const { rows: users } = await pool.query<{ name: string }>("SELECT COALESCE(NULLIF(nickname, ''), name) AS name FROM users WHERE id = $1", [userId]);
    await notifyAdmins({
      type: "new_review",
      title: `${"★".repeat(input.rating)} ${products[0].name}`,
      message: `${users[0]?.name ?? "Khách"}: ${input.comment || "(không có nhận xét)"}`.slice(0, 255),
      link: `/menu/${products[0].slug}#danh-gia`,
    });
  }

  const { rows: saved } = await pool.query<Review>(`SELECT ${COLUMNS} FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.id = $1`, [rows[0].id]);
  return saved[0];
}

/** Người viết tự xoá, hoặc admin xoá đánh giá không phù hợp */
export async function remove(id: number, user: { id: number; role: string }) {
  const { rows } = await pool.query<{ userId: number }>(`SELECT user_id AS "userId" FROM reviews WHERE id = $1`, [id]);
  if (!rows[0]) throw new AppError(404, "Không tìm thấy đánh giá");
  if (user.role !== "admin" && rows[0].userId !== user.id) throw new AppError(403, "Bạn không thể xoá đánh giá của người khác");
  await pool.query("DELETE FROM reviews WHERE id = $1", [id]);
}

/** Các món mình đã đánh giá (để trang Đơn hàng hiện "Đã đánh giá") */
export async function listMine(userId: number) {
  const { rows } = await pool.query<{ productId: number; rating: number; comment: string }>(`SELECT product_id AS "productId", rating, comment FROM reviews WHERE user_id = $1`, [
    userId,
  ]);
  return rows;
}

/** Đánh giá nổi bật cho trang chủ: 4–5 sao, có nhận xét, mỗi khách 1 cái (mới nhất), lấy `limit` khách gần đây */
export async function listFeatured(limit = 3) {
  const { rows } = await pool.query<Review & { productName: string; productSlug: string }>(
    `SELECT * FROM (
       SELECT DISTINCT ON (r.user_id) ${COLUMNS}, p.name AS "productName", p.slug AS "productSlug"
       FROM reviews r JOIN users u ON u.id = r.user_id JOIN products p ON p.id = r.product_id
       WHERE r.rating >= 4 AND LENGTH(r.comment) >= 15
       ORDER BY r.user_id, r.rating DESC, r.created_at DESC
     ) best
     ORDER BY "createdAt" DESC LIMIT $1`,
    [limit],
  );
  return rows;
}
