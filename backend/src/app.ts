import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { pool } from "./db/pool";
import { authRouter } from "./modules/auth/auth.routes";
import { productsRouter } from "./modules/products/products.routes";
import { cartRouter } from "./modules/cart/cart.routes";
import { ordersRouter } from "./modules/orders/orders.routes";
import { settingsRouter } from "./modules/settings/settings.routes";
import { adminRouter } from "./modules/admin/admin.routes";
import { notificationsRouter } from "./modules/notifications/notifications.routes";
import { errorHandler, notFound } from "./middlewares/errorHandler";

export const app = express();

app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "300kb" })); // đủ cho ảnh đại diện đã thu nhỏ
app.use(cookieParser());

app.get("/api/health", async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok", database: "connected" });
});

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/cart", cartRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/notifications", notificationsRouter);

app.use(notFound);
app.use(errorHandler);
