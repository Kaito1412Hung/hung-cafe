import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { openapiDoc } from "./docs/openapi";
import { pool } from "./db/pool";
import { authRouter } from "./modules/auth/auth.routes";
import { productsRouter } from "./modules/products/products.routes";
import { categoriesRouter } from "./modules/categories/categories.routes";
import { cartRouter } from "./modules/cart/cart.routes";
import { ordersRouter } from "./modules/orders/orders.routes";
import { settingsRouter } from "./modules/settings/settings.routes";
import { adminRouter } from "./modules/admin/admin.routes";
import { notificationsRouter } from "./modules/notifications/notifications.routes";
import { UPLOAD_DIR, uploadsRouter } from "./modules/uploads/uploads.routes";
import { contactRouter, newsletterRouter, publicStatsRouter } from "./modules/contact/contact.routes";
import { couponsRouter } from "./modules/coupons/coupons.routes";
import { reviewsRouter } from "./modules/reviews/reviews.routes";
import { favoritesRouter } from "./modules/favorites/favorites.routes";
import { reportsRouter } from "./modules/admin/reports.routes";
import { toppingsRouter } from "./modules/toppings/toppings.routes";
import { paymentsRouter } from "./modules/payments/payments.routes";
import { errorHandler, notFound } from "./middlewares/errorHandler";

export const app = express();

// Request đi qua proxy (máy dev: Next.js cùng máy; deploy: Vercel + Render) → tin header X-Forwarded-For
// đúng số trạm để lấy IP thật của người dùng (dùng cho chống spam). Cấu hình bằng TRUST_PROXY trong .env
app.set("trust proxy", env.TRUST_PROXY);
// helmet: thêm các header bảo mật cơ bản (chống nhúng iframe, đoán kiểu file...). Cho phép web khác hiển thị ảnh đã upload.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(cookieParser());

// Upload ảnh sản phẩm cần body lớn hơn → khai báo TRƯỚC bộ đọc JSON chung (300kb)
app.use("/api/uploads", express.json({ limit: "3mb" }), uploadsRouter);
// Trả file ảnh đã upload (cache 7 ngày vì tên file không bao giờ đổi)
app.use("/api/uploads", express.static(UPLOAD_DIR, { maxAge: "7d", immutable: true, fallthrough: false }));

app.use(express.json({ limit: "300kb" })); // đủ cho ảnh đại diện đã thu nhỏ

app.get("/api/health", async (req, res) => {
  await pool.query("SELECT 1");
  // yourIp: IP của chính người đang gọi, như backend nhìn thấy → kiểm tra TRUST_PROXY sau khi deploy
  res.json({ status: "ok", database: "connected", yourIp: req.ip ?? null });
});

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/cart", cartRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/contact", contactRouter);
app.use("/api/newsletter", newsletterRouter);
app.use("/api/stats", publicStatsRouter);
app.use("/api/coupons", couponsRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/favorites", favoritesRouter);
app.use("/api/toppings", toppingsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/admin/reports", reportsRouter);

// Tài liệu API (Swagger): xem và bấm thử mọi API tại /api/docs, bản JSON chuẩn OpenAPI tại /api/docs.json
app.get("/api/docs.json", (_req, res) => {
  res.json(openapiDoc);
});
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(openapiDoc, {
    customSiteTitle: "Hưng Café API",
    swaggerOptions: { docExpansion: "none", persistAuthorization: true, tryItOutEnabled: true },
  }),
);

app.use(notFound);
app.use(errorHandler);
