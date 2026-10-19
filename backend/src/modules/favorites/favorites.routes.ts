import { Router, type Request } from "express";
import { requireAuth } from "../../middlewares/auth";
import { pool } from "../../db/pool";
import { AppError } from "../../utils/AppError";
import * as productService from "../products/products.service";

/** Món yêu thích (thả tim) — lưu theo tài khoản */
export const favoritesRouter = Router();
favoritesRouter.use(requireAuth);

function parseProductId(req: Request) {
  const id = Number(req.params.productId);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, "Mã món không hợp lệ");
  return id;
}

/** Danh sách món đã thả tim, mới nhất trước */
favoritesRouter.get("/", async (req, res) => {
  const { rows } = await pool.query<{ productId: number }>(
    `SELECT product_id AS "productId" FROM favorites WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user!.id],
  );
  const products = await productService.findByIds(rows.map((r) => r.productId));
  res.json({ data: products });
});

// PUT/DELETE "idempotent": bấm 2 lần cũng không lỗi
favoritesRouter.put("/:productId", async (req, res) => {
  const productId = parseProductId(req);
  await productService.findById(productId); // 404 nếu món không tồn tại
  await pool.query("INSERT INTO favorites (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [req.user!.id, productId]);
  res.status(204).end();
});

favoritesRouter.delete("/:productId", async (req, res) => {
  await pool.query("DELETE FROM favorites WHERE user_id = $1 AND product_id = $2", [req.user!.id, parseProductId(req)]);
  res.status(204).end();
});
