import type { PoolClient } from "pg";
import { afterCommit } from "../../db/afterCommit";
import { pool } from "../../db/pool";
import { emitToUser } from "../../realtime/socket";

export type NotificationType =
  | "new_order"
  | "order_cancelled"
  | "low_stock"
  | "new_customer"
  | "password_reset"
  | "contact_message"
  | "new_review"
  // Gửi cho KHÁCH khi đơn của họ đổi trạng thái
  | "order_status";

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: Date;
}

const COLUMNS = `id, type, title, message, link, is_read AS "isRead", created_at AS "createdAt"`;

/** Ngưỡng tồn kho để báo "sắp hết hàng" */
export const LOW_STOCK_THRESHOLD = 10;

/** Số thông báo tối đa giữ lại cho mỗi người (cũ hơn thì tự dọn) */
const KEEP_PER_USER = 100;

interface NotifyInput {
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
}

/**
 * Gửi thông báo tới tất cả admin.
 * Truyền `client` khi đang ở trong transaction → thông báo chỉ được lưu nếu transaction COMMIT.
 */
export async function notifyAdmins(input: NotifyInput, client: PoolClient | typeof pool = pool) {
  const { rows } = await client.query<Notification & { userId: number }>(
    `INSERT INTO notifications (user_id, type, title, message, link)
     SELECT id, $1, $2, $3, $4 FROM users WHERE role = 'admin'
     RETURNING user_id AS "userId", ${COLUMNS}`,
    [input.type, input.title, input.message ?? "", input.link ?? ""],
  );
  pushRealtime(rows, client);
}

/** Gửi thông báo cho 1 người cụ thể (VD: khách có đơn vừa đổi trạng thái) */
export async function notifyUser(userId: number, input: NotifyInput, client: PoolClient | typeof pool = pool) {
  const { rows } = await client.query<Notification & { userId: number }>(
    `INSERT INTO notifications (user_id, type, title, message, link) VALUES ($1, $2, $3, $4, $5)
     RETURNING user_id AS "userId", ${COLUMNS}`,
    [userId, input.type, input.title, input.message ?? "", input.link ?? ""],
  );
  pushRealtime(rows, client);
}

/** Chuông của người nhận +1 ngay (chỉ gửi sau khi đã lưu xong — xem db/afterCommit.ts) */
function pushRealtime(rows: (Notification & { userId: number })[], client: PoolClient | typeof pool) {
  afterCommit(client, () => {
    for (const { userId, ...notification } of rows) emitToUser(userId, "notification:new", notification);
  });
}

export async function listForUser(userId: number, limit: number) {
  const [list, unread] = await Promise.all([
    pool.query<Notification>(`SELECT ${COLUMNS} FROM notifications WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2`, [
      userId,
      limit,
    ]),
    pool.query<{ count: string }>("SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND NOT is_read", [userId]),
  ]);
  return { data: list.rows, unreadCount: Number(unread.rows[0].count) };
}

export async function markRead(userId: number, id: number) {
  // Điều kiện user_id đảm bảo không ai đánh dấu được thông báo của người khác
  await pool.query("UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2", [id, userId]);
}

export async function markAllRead(userId: number) {
  await pool.query("UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND NOT is_read", [userId]);
}

/** Dọn bớt thông báo cũ, mỗi người chỉ giữ KEEP_PER_USER cái mới nhất */
export async function cleanup() {
  await pool.query(
    `DELETE FROM notifications n
     USING (
       SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, id DESC) AS rn FROM notifications
     ) ranked
     WHERE n.id = ranked.id AND ranked.rn > $1`,
    [KEEP_PER_USER],
  );
}
