import type { PoolClient } from "pg";
import { pool } from "../../db/pool";
import { env, vnpayEnabled } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { notifyAdmins, notifyUser } from "../notifications/notifications.service";
import { notifyNewOrder } from "../orders/orders.service";
import { RESPONSE_MESSAGES, buildPaymentUrl, normalizeIp, verifySignature } from "./vnpay";

const code = (id: number) => `#${String(id).padStart(5, "0")}`;

/** Cho frontend biết có hiện lựa chọn VNPay không */
export function paymentConfig() {
  return { vnpay: vnpayEnabled, timeoutMinutes: env.PAYMENT_TIMEOUT_MINUTES };
}

/**
 * Tạo link thanh toán VNPay cho đơn của chính khách (lần đầu hoặc "Thanh toán lại").
 * Số tiền lấy từ đơn trong database — không tin số tiền trình duyệt gửi lên.
 */
export async function createVnpayUrl(userId: number, orderId: number, ip: string | undefined) {
  if (!vnpayEnabled) throw new AppError(400, "Quán chưa bật thanh toán VNPay");
  const { rows } = await pool.query<{ total: number; status: string; paymentMethod: string; paymentStatus: string; paymentDeadline: Date | null }>(
    `SELECT total, status, payment_method AS "paymentMethod", payment_status AS "paymentStatus", payment_deadline AS "paymentDeadline"
     FROM orders WHERE id = $1 AND user_id = $2`,
    [orderId, userId],
  );
  const order = rows[0];
  if (!order) throw new AppError(404, "Không tìm thấy đơn hàng");
  if (order.paymentMethod !== "vnpay") throw new AppError(400, "Đơn này thanh toán khi nhận hàng");
  if (order.paymentStatus === "paid") throw new AppError(400, "Đơn này đã được thanh toán");
  if (order.paymentStatus !== "pending" || order.status !== "pending" || !order.paymentDeadline || order.paymentDeadline < new Date()) {
    throw new AppError(400, "Đơn đã hết hạn thanh toán, vui lòng đặt lại");
  }

  // Mỗi lần bấm thanh toán là 1 mã giao dịch mới (VNPay không cho dùng lại mã cũ)
  const txnRef = `${orderId}-${Date.now()}`;
  await pool.query(`INSERT INTO payments (order_id, txn_ref, amount) VALUES ($1, $2, $3)`, [orderId, txnRef, order.total]);
  const url = buildPaymentUrl({
    amount: order.total,
    txnRef,
    orderInfo: `Thanh toan don hang ${code(orderId)} Hung Cafe`,
    ipAddr: normalizeIp(ip),
    expireAt: order.paymentDeadline,
  });
  return { url, deadline: order.paymentDeadline };
}

export interface VnpayResult {
  /** Mã trả lời cho VNPay (IPN): 00 ok · 01 không thấy đơn · 02 đã xử lý · 04 sai số tiền · 97 sai chữ ký · 99 lỗi khác */
  rspCode: "00" | "01" | "02" | "04" | "97" | "99";
  message: string;
  /** Kết quả cho trang khách: paid / failed / invalid */
  status: "paid" | "failed" | "invalid";
  orderId: number | null;
}

/**
 * Xử lý kết quả VNPay gửi về — dùng chung cho trang quay về (return) và IPN.
 * Chỉ ghi "đã thanh toán" khi: chữ ký đúng + đúng mã giao dịch đang chờ + đúng số tiền.
 * Gửi về nhiều lần (IPN gửi lại, khách F5) thì chỉ xử lý lần đầu.
 */
export async function handleVnpayResult(query: Record<string, unknown>): Promise<VnpayResult> {
  if (!vnpayEnabled || !verifySignature(query)) {
    return { rspCode: "97", message: "Chữ ký không hợp lệ", status: "invalid", orderId: null };
  }
  const txnRef = String(query.vnp_TxnRef ?? "");
  const responseCode = String(query.vnp_ResponseCode ?? "");
  const success = responseCode === "00" && String(query.vnp_TransactionStatus ?? "") === "00";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Khoá dòng giao dịch: 2 lần gửi về cùng lúc thì lần sau phải chờ lần trước xong
    const { rows } = await client.query<{ id: number; orderId: number; amount: number; status: string }>(
      `SELECT id, order_id AS "orderId", amount, status FROM payments WHERE txn_ref = $1 FOR UPDATE`,
      [txnRef],
    );
    const payment = rows[0];
    if (!payment) {
      await client.query("ROLLBACK");
      return { rspCode: "01", message: "Không tìm thấy giao dịch", status: "invalid", orderId: null };
    }
    if (Number(query.vnp_Amount) !== payment.amount * 100) {
      await client.query("ROLLBACK");
      return { rspCode: "04", message: "Số tiền không khớp", status: "invalid", orderId: payment.orderId };
    }
    if (payment.status !== "pending") {
      await client.query("ROLLBACK");
      return {
        rspCode: "02",
        message: "Giao dịch đã được xử lý",
        status: payment.status === "success" ? "paid" : "failed",
        orderId: payment.orderId,
      };
    }

    await client.query(
      `UPDATE payments SET status = $1, response_code = $2, transaction_no = $3, bank_code = $4, raw = $5, updated_at = NOW() WHERE id = $6`,
      [success ? "success" : "failed", responseCode, String(query.vnp_TransactionNo ?? ""), String(query.vnp_BankCode ?? ""), JSON.stringify(query), payment.id],
    );
    if (success) await markOrderPaid(client, payment.orderId);
    await client.query("COMMIT");

    return {
      rspCode: "00",
      message: success ? "Thanh toán thành công" : (RESPONSE_MESSAGES[responseCode] ?? "Thanh toán chưa thành công"),
      status: success ? "paid" : "failed",
      orderId: payment.orderId,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Lỗi xử lý kết quả VNPay:", (err as Error).message);
    return { rspCode: "99", message: "Lỗi không xác định", status: "invalid", orderId: null };
  } finally {
    client.release();
  }
}

/** Ghi đơn "đã thanh toán" + báo admin có đơn mới. Đơn đã bị huỷ (quá hạn) mà khách vẫn trả → đánh dấu cần hoàn tiền */
async function markOrderPaid(client: PoolClient, orderId: number) {
  const { rows } = await client.query<{ status: string; paymentStatus: string; userId: number | null }>(
    `SELECT status, payment_status AS "paymentStatus", user_id AS "userId" FROM orders WHERE id = $1 FOR UPDATE`,
    [orderId],
  );
  const order = rows[0];
  if (!order) return;

  if (order.paymentStatus === "pending" && order.status === "pending") {
    await client.query(`UPDATE orders SET payment_status = 'paid', paid_at = NOW(), payment_deadline = NULL, updated_at = NOW() WHERE id = $1`, [orderId]);
    await notifyNewOrder(client, orderId);
    if (order.userId) {
      await notifyUser(
        order.userId,
        { type: "order_status", title: `Đơn ${code(orderId)} đã thanh toán thành công`, message: "Quán sẽ xác nhận và pha chế ngay ☕", link: `/orders#don-${orderId}` },
        client,
      );
    }
    return;
  }

  // Trả tiền khi đơn đã huỷ (quá hạn) hoặc đã trả rồi (trả 2 lần) → quán cần hoàn lại tiền
  await client.query(`UPDATE orders SET payment_status = 'refund_pending', updated_at = NOW() WHERE id = $1`, [orderId]);
  await notifyAdmins(
    {
      type: "order_cancelled",
      title: `Đơn ${code(orderId)} cần hoàn tiền`,
      message: order.status === "cancelled" ? "Khách thanh toán VNPay sau khi đơn đã huỷ (quá hạn)." : "Khách thanh toán VNPay lần nữa cho đơn đã trả tiền.",
      link: `/admin/orders?order=${orderId}`,
    },
    client,
  );
}
