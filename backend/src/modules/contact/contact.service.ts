import { z } from "zod";
import { pool } from "../../db/pool";
import { AppError } from "../../utils/AppError";
import { notifyAdmins } from "../notifications/notifications.service";

/* ================= Tin nhắn liên hệ ================= */

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Vui lòng nhập tên (ít nhất 2 ký tự)").max(100),
  email: z.string().trim().toLowerCase().email("Email không hợp lệ"),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s.-]/g, ""))
    .refine((v) => v === "" || /^(0|\+84)\d{9}$/.test(v), "Số điện thoại không hợp lệ")
    .default(""),
  subject: z.string().trim().max(120, "Tiêu đề tối đa 120 ký tự").default(""),
  message: z.string().trim().min(10, "Nội dung cần ít nhất 10 ký tự").max(2000, "Nội dung tối đa 2000 ký tự"),
});
export type ContactInput = z.infer<typeof contactSchema>;

export interface ContactMessage extends ContactInput {
  id: number;
  userId: number | null;
  isRead: boolean;
  createdAt: Date;
}

const MESSAGE_COLUMNS = `id, user_id AS "userId", name, email, phone, subject, message, is_read AS "isRead", created_at AS "createdAt"`;

export async function createMessage(input: ContactInput, userId: number | null) {
  // Chống spam: mỗi email tối đa 3 tin trong 10 phút
  const { rows: recent } = await pool.query<{ count: string }>(
    "SELECT COUNT(*) FROM contact_messages WHERE email = $1 AND created_at > NOW() - INTERVAL '10 minutes'",
    [input.email],
  );
  if (Number(recent[0].count) >= 3) throw new AppError(429, "Bạn gửi hơi nhiều tin nhắn rồi, thử lại sau ít phút nhé");

  const { rows } = await pool.query<ContactMessage>(
    `INSERT INTO contact_messages (user_id, name, email, phone, subject, message)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${MESSAGE_COLUMNS}`,
    [userId, input.name, input.email, input.phone, input.subject, input.message],
  );
  const msg = rows[0];
  await notifyAdmins({
    type: "contact_message",
    title: `Tin nhắn mới từ ${msg.name}`,
    message: (msg.subject ? `${msg.subject} — ` : "") + msg.message.slice(0, 120),
    link: `/admin/contact?message=${msg.id}`,
  });
  return msg;
}

export async function listMessages() {
  const [list, unread] = await Promise.all([
    pool.query<ContactMessage>(`SELECT ${MESSAGE_COLUMNS} FROM contact_messages ORDER BY created_at DESC, id DESC`),
    pool.query<{ count: string }>("SELECT COUNT(*) FROM contact_messages WHERE NOT is_read"),
  ]);
  return { data: list.rows, unreadCount: Number(unread.rows[0].count) };
}

export async function setMessageRead(id: number, isRead: boolean) {
  const { rows } = await pool.query<ContactMessage>(`UPDATE contact_messages SET is_read = $1 WHERE id = $2 RETURNING ${MESSAGE_COLUMNS}`, [isRead, id]);
  if (!rows[0]) throw new AppError(404, "Không tìm thấy tin nhắn");
  return rows[0];
}

export async function deleteMessage(id: number) {
  const { rowCount } = await pool.query("DELETE FROM contact_messages WHERE id = $1", [id]);
  if (!rowCount) throw new AppError(404, "Không tìm thấy tin nhắn");
}

/* ================= Đăng ký nhận tin ================= */

export const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email không hợp lệ"),
});

export async function subscribe(email: string) {
  const { rowCount } = await pool.query("INSERT INTO newsletter_subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING", [email]);
  return { alreadySubscribed: rowCount === 0 };
}

export async function listSubscribers() {
  const { rows } = await pool.query<{ id: number; email: string; createdAt: Date }>(
    `SELECT id, email, created_at AS "createdAt" FROM newsletter_subscribers ORDER BY created_at DESC`,
  );
  return rows;
}

export async function deleteSubscriber(id: number) {
  const { rowCount } = await pool.query("DELETE FROM newsletter_subscribers WHERE id = $1", [id]);
  if (!rowCount) throw new AppError(404, "Không tìm thấy email này");
}

/* ================= Số liệu thật cho trang chủ ================= */

export async function getPublicStats() {
  const { rows } = await pool.query<{ products: number; customers: number; completedOrders: number }>(
    `SELECT
       (SELECT COUNT(*) FROM products WHERE is_available)::int AS products,
       (SELECT COUNT(*) FROM users WHERE role = 'customer')::int AS customers,
       (SELECT COUNT(*) FROM orders WHERE status = 'completed')::int AS "completedOrders"`,
  );
  // Món bán chạy nhất theo đơn thật; chưa có đơn thì lấy món được đánh dấu "Bán chạy"
  const best = await pool.query<{ name: string; slug: string; image: string }>(
    `SELECT p.name, p.slug, p.image
     FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN products p ON p.id = oi.product_id
     WHERE o.status <> 'cancelled' AND p.is_available
     GROUP BY p.id ORDER BY SUM(oi.quantity) DESC LIMIT 1`,
  );
  const fallback = best.rows[0]
    ? null
    : await pool.query<{ name: string; slug: string; image: string }>(
        "SELECT name, slug, image FROM products WHERE is_available ORDER BY is_best_seller DESC, id LIMIT 1",
      );
  return { ...rows[0], bestSeller: best.rows[0] ?? fallback?.rows[0] ?? null };
}
