/**
 * Làm việc với cổng VNPay (phiên bản 2.1.0): tạo link thanh toán có chữ ký và kiểm tra chữ ký VNPay gửi về.
 *
 * Chữ ký = HMAC-SHA512(chuỗi tham số đã sắp xếp theo tên, khoá bí mật VNP_HASH_SECRET).
 * Ai không có khoá bí mật thì không làm giả được kết quả "đã thanh toán".
 */
import crypto from "node:crypto";
import { env } from "../../config/env";

/** Các tham số VNPay gửi về / mình gửi đi đều là chuỗi */
export type VnpParams = Record<string, string>;

/** Sắp xếp theo tên rồi nối "a=1&b=2" — mã hoá giống code mẫu của VNPay (khoảng trắng thành "+") */
export function buildSignData(params: VnpParams) {
  return Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key]).replace(/%20/g, "+")}`)
    .join("&");
}

export function sign(data: string, secret = env.VNP_HASH_SECRET) {
  return crypto.createHmac("sha512", secret).update(Buffer.from(data, "utf-8")).digest("hex");
}

/** "20261021153000" — VNPay dùng giờ Việt Nam, dạng yyyyMMddHHmmss */
export function vnpDate(d: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .format(d)
    .replace(/\D/g, "");
}

/** IP của khách ("::ffff:127.0.0.1" → "127.0.0.1"), VNPay chỉ cần để ghi nhận */
export const normalizeIp = (ip: string | undefined) => (ip ?? "127.0.0.1").replace(/^::ffff:/, "").replace(/^::1$/, "127.0.0.1");

interface PaymentUrlInput {
  /** Số tiền (đồng) — VNPay yêu cầu nhân 100 */
  amount: number;
  /** Mã giao dịch của mình, không trùng */
  txnRef: string;
  /** Mô tả, chỉ dùng chữ không dấu */
  orderInfo: string;
  ipAddr: string;
  expireAt: Date;
}

export function buildPaymentUrl({ amount, txnRef, orderInfo, ipAddr, expireAt }: PaymentUrlInput) {
  const params: VnpParams = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: env.VNP_TMN_CODE,
    vnp_Amount: String(amount * 100),
    vnp_CurrCode: "VND",
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: "other",
    vnp_Locale: "vn",
    vnp_ReturnUrl: env.VNP_RETURN_URL || `${env.CLIENT_URL}/thanh-toan/ket-qua`,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: vnpDate(new Date()),
    vnp_ExpireDate: vnpDate(expireAt),
  };
  const signData = buildSignData(params);
  return `${env.VNP_URL}?${signData}&vnp_SecureHash=${sign(signData)}`;
}

/** Kiểm tra chữ ký trên dữ liệu VNPay gửi về (trang quay về hoặc IPN) */
export function verifySignature(query: Record<string, unknown>) {
  const received = String(query.vnp_SecureHash ?? "");
  if (!received) return false;
  const params: VnpParams = {};
  for (const [key, value] of Object.entries(query)) {
    if (key.startsWith("vnp_") && key !== "vnp_SecureHash" && key !== "vnp_SecureHashType") params[key] = String(value);
  }
  const expected = sign(buildSignData(params));
  // So sánh an toàn (không lộ thông tin qua thời gian so sánh)
  return received.length === expected.length && crypto.timingSafeEqual(Buffer.from(received.toLowerCase()), Buffer.from(expected));
}

/** Ý nghĩa một số mã lỗi VNPay hay gặp (vnp_ResponseCode) */
export const RESPONSE_MESSAGES: Record<string, string> = {
  "07": "Giao dịch bị nghi ngờ gian lận, vui lòng liên hệ ngân hàng",
  "09": "Thẻ chưa đăng ký dịch vụ Internet Banking",
  "10": "Xác thực thông tin thẻ sai quá 3 lần",
  "11": "Hết thời gian chờ thanh toán",
  "12": "Thẻ / tài khoản đang bị khoá",
  "13": "Nhập sai mã OTP",
  "24": "Bạn đã huỷ giao dịch",
  "51": "Tài khoản không đủ số dư",
  "65": "Tài khoản đã vượt hạn mức giao dịch trong ngày",
  "75": "Ngân hàng đang bảo trì",
  "79": "Nhập sai mật khẩu thanh toán quá số lần quy định",
};
