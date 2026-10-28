import "dotenv/config";
import { z } from "zod";

/** Đọc và kiểm tra biến môi trường ngay khi khởi động — thiếu là báo lỗi rõ ràng */
const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CLIENT_URL: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "Thiếu DATABASE_URL"),
  DATABASE_SSL: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET cần ít nhất 32 ký tự"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  /**
   * Tin bao nhiêu "trạm trung gian" (proxy) đứng trước backend khi đọc IP thật của khách từ header X-Forwarded-For.
   * - Máy dev: "loopback" (chỉ tin Next.js chạy cùng máy)
   * - Deploy Vercel → Render: "4" (đã đo bằng DEBUG_IP: Vercel → Cloudflare → bộ chia tải Render → máy Render)
   * Dùng cho chống spam / dò mật khẩu: sai thì mọi khách bị tính chung 1 IP.
   */
  TRUST_PROXY: z
    .string()
    .trim()
    .default("loopback")
    .transform((v): boolean | number | string => (/^\d+$/.test(v) ? Number(v) : v === "true" ? true : v === "false" ? false : v)),
  /**
   * Tài khoản demo dùng chung (mật khẩu công khai trong README), cách nhau dấu phẩy.
   * Bị khoá: đổi mật khẩu / hồ sơ / ảnh, đăng xuất mọi thiết bị, xoá tài khoản; gõ sai mật khẩu không khoá đăng nhập.
   */
  DEMO_EMAILS: z
    .string()
    .default("")
    .transform((v) => v.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)),
  /** Bật tạm khi cần đo TRUST_PROXY: /api/health trả thêm chuỗi proxy (X-Forwarded-For…). Đo xong thì tắt */
  DEBUG_IP: z
    .string()
    .default("false")
    .transform((v) => v === "true"),

  // Thanh toán VNPay (để trống → web chỉ có thanh toán khi nhận hàng)
  VNP_TMN_CODE: z.string().default(""),
  VNP_HASH_SECRET: z.string().default(""),
  VNP_URL: z.string().default("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"),
  /** Trang VNPay đưa khách quay về sau khi trả tiền (trang của frontend) */
  VNP_RETURN_URL: z.string().default(""),
  /** Quá bao nhiêu phút chưa thanh toán thì tự huỷ đơn */
  PAYMENT_TIMEOUT_MINUTES: z.coerce.number().int().min(5).max(60).default(15),

  // Lưu ảnh món trên Cloudinary (để trống → lưu vào ổ cứng máy chủ, thư mục uploads/)
  CLOUDINARY_CLOUD_NAME: z.string().trim().default(""),
  CLOUDINARY_API_KEY: z.string().trim().default(""),
  CLOUDINARY_API_SECRET: z.string().trim().default(""),

  // Đăng nhập bằng Google (để trống → ẩn nút "Tiếp tục với Google")
  GOOGLE_CLIENT_ID: z.string().trim().default(""),
  GOOGLE_CLIENT_SECRET: z.string().trim().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Biến môi trường không hợp lệ:");
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
/** Đã điền mã VNPay trong .env chưa */
export const vnpayEnabled = Boolean(env.VNP_TMN_CODE && env.VNP_HASH_SECRET);
/** Đã điền đủ 3 mã Cloudinary trong .env chưa */
export const cloudinaryEnabled = Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
/** Đã điền mã OAuth Google trong .env chưa */
export const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
