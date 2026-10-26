/**
 * Realtime bằng Socket.IO: server chủ động báo cho trình duyệt ngay khi có chuyện mới
 * (thay cho việc trình duyệt cứ 30 giây hỏi lại một lần).
 *
 * - Trình duyệt kết nối kèm "vé" ngắn hạn (GET /api/auth/socket-token) → biết là ai.
 *   Không dùng cookie vì khi deploy, Socket.IO nối thẳng vào Render (Vercel không chuyển tiếp WebSocket)
 *   mà cookie đăng nhập lại thuộc tên miền Vercel.
 * - Mỗi người vào phòng "user:<id>", admin vào thêm phòng "admins" → gửi đúng người, không lộ đơn của người khác.
 *
 * Sự kiện gửi đi:
 *   notification:new  → người nhận thông báo (chuông +1)
 *   order:new         → admin (đơn mới: tiền mặt lúc đặt, VNPay lúc trả xong)
 *   order:updated     → admin + chủ đơn (đổi trạng thái, huỷ, thanh toán, hoàn tiền)
 */
import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { env } from "../config/env";
import { pool } from "../db/pool";
import { verifySocketToken } from "../utils/jwt";

let io: Server | null = null;

const userRoom = (id: number) => `user:${id}`;
const ADMIN_ROOM = "admins";

export function initRealtime(server: HttpServer) {
  io = new Server(server, { cors: { origin: env.CLIENT_URL } });

  // Kiểm tra vé trước khi cho kết nối
  io.use(async (socket, next) => {
    try {
      const { id, tokenVersion } = verifySocketToken(String(socket.handshake.auth?.token ?? ""));
      const { rows } = await pool.query<{ role: string; tokenVersion: number }>(
        `SELECT role, token_version AS "tokenVersion" FROM users WHERE id = $1`,
        [id],
      );
      if (!rows[0] || rows[0].tokenVersion !== tokenVersion) return next(new Error("unauthorized"));
      socket.data.user = { id, role: rows[0].role };
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as { id: number; role: string };
    socket.join(userRoom(user.id));
    if (user.role === "admin") socket.join(ADMIN_ROOM);
  });
  return io;
}

export function closeRealtime() {
  io?.close();
  io = null;
}

/** Gửi cho 1 người (mọi tab / thiết bị người đó đang mở) */
export function emitToUser(userId: number, event: string, data: unknown) {
  io?.to(userRoom(userId)).emit(event, data);
}

/** Gửi cho tất cả admin đang mở web */
export function emitToAdmins(event: string, data: unknown) {
  io?.to(ADMIN_ROOM).emit(event, data);
}

/** Báo đơn thay đổi cho admin + chủ đơn (trang đơn tự tải lại) */
export function emitOrderUpdated(order: { id: number; userId: number | null; status: string; paymentStatus: string }) {
  const data = { id: order.id, status: order.status, paymentStatus: order.paymentStatus };
  emitToAdmins("order:updated", data);
  if (order.userId) emitToUser(order.userId, "order:updated", data);
}
