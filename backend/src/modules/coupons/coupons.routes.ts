import { Router, type Request } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { rateLimit } from "../../middlewares/rateLimit";
import { validateBody } from "../../middlewares/validate";
import { pool } from "../../db/pool";
import { AppError } from "../../utils/AppError";
import { getCart } from "../cart/cart.service";
import * as couponService from "./coupons.service";

export const couponsRouter = Router();
couponsRouter.use(requireAuth);

function parseId(req: Request) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, "ID không hợp lệ");
  return id;
}

/* ----- Khách: kiểm tra mã với giỏ hàng hiện tại ----- */
couponsRouter.post(
  "/check",
  // Chống dò mã: mỗi IP tối đa 20 lần / 5 phút
  rateLimit({ windowMs: 5 * 60 * 1000, max: 20, message: "Bạn thử mã giảm giá quá nhiều lần." }),
  validateBody(z.object({ code: z.string().trim().min(1, "Vui lòng nhập mã giảm giá").max(30) })),
  async (req, res) => {
    const cart = await getCart(req.user!.id);
    const { coupon, discount } = await couponService.evaluate(pool, req.body.code, req.user!.id, cart.subtotal);
    res.json({ data: { code: coupon.code, description: coupon.description, discount } });
  },
);

/* ----- Khách: các mã công khai để chọn (kèm số tiền giảm hoặc lý do chưa dùng được) ----- */
couponsRouter.get("/available", async (req, res) => {
  const cart = await getCart(req.user!.id);
  res.json({ data: await couponService.listAvailable(req.user!.id, cart.subtotal) });
});

/* ----- Admin ----- */
couponsRouter.get("/", requireRole("admin"), async (_req, res) => {
  res.json({ data: await couponService.findAll() });
});

couponsRouter.post("/", requireRole("admin"), validateBody(couponService.couponSchema), async (req, res) => {
  res.status(201).json({ data: await couponService.create(req.body) });
});

couponsRouter.patch("/:id", requireRole("admin"), validateBody(couponService.couponPatchSchema), async (req, res) => {
  res.json({ data: await couponService.update(parseId(req), req.body) });
});

couponsRouter.delete("/:id", requireRole("admin"), async (req, res) => {
  await couponService.remove(parseId(req));
  res.status(204).end();
});
