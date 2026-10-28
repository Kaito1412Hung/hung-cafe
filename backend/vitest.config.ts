/**
 * Cấu hình test tự động (Vitest). Chạy: npm test
 *
 * Test API chạy trên database RIÊNG tên hung_cafe_test (xoá và tạo lại mỗi lần chạy),
 * không bao giờ đụng database chính (dữ liệu demo, tài khoản kaito…) hay database trên web thật.
 * - Trên máy: lấy server PostgreSQL trong DATABASE_URL của backend/.env, đổi tên database thành hung_cafe_test
 * - Trên GitHub Actions: dùng TEST_DATABASE_URL (database tạm của GitHub)
 */
import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

const fromFile = loadEnv({ quiet: true }).parsed ?? {};

function testDatabaseUrl() {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const base = process.env.DATABASE_URL ?? fromFile.DATABASE_URL;
  if (!base) throw new Error("Thiếu DATABASE_URL (backend/.env) hoặc TEST_DATABASE_URL để chạy test");
  const url = new URL(base);
  url.pathname = "/hung_cafe_test";
  return url.toString();
}

// Biến môi trường riêng cho test. Đặt cả giá trị rỗng để file .env thật không "lọt" vào (dotenv không ghi đè biến đã có)
const testEnv: Record<string, string> = {
  NODE_ENV: "test",
  DATABASE_URL: testDatabaseUrl(),
  DATABASE_SSL: "false",
  JWT_SECRET: "chuoi-bi-mat-chi-dung-cho-test-tu-dong-1234567890",
  CLIENT_URL: "http://localhost:3000",
  TRUST_PROXY: "loopback",
  DEBUG_IP: "false",
  DEMO_EMAILS: "demo@test.local",
  SEED_ADMIN_EMAIL: "admin@test.local",
  SEED_ADMIN_PASSWORD: "TestAdmin#2026",
  SEED_CUSTOMER_EMAIL: "khach@test.local",
  SEED_CUSTOMER_PASSWORD: "TestKhach#2026",
  // VNPay bật bằng khoá giả để test chữ ký; Cloudinary tắt để không upload ảnh thật
  VNP_TMN_CODE: "TESTCODE",
  VNP_HASH_SECRET: "khoa-gia-chi-de-test-123456",
  VNP_RETURN_URL: "http://localhost:3000/thanh-toan/ket-qua",
  CLOUDINARY_CLOUD_NAME: "",
  CLOUDINARY_API_KEY: "",
  CLOUDINARY_API_SECRET: "",
  // Google bật bằng mã giả; test giả lập phần nói chuyện với Google (tests/api/dang-nhap-google.test.ts)
  GOOGLE_CLIENT_ID: "test-client-id.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "ma-gia-chi-de-test",
};
Object.assign(process.env, testEnv);

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    env: testEnv,
    globalSetup: ["tests/global-setup.ts"],
    // Các file test dùng chung 1 database → chạy lần lượt cho chắc
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
