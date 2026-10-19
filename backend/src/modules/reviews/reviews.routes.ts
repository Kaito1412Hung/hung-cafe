import { Router, type Request } from "express";
import { optionalAuth, requireAuth } from "../../middlewares/auth";
import { rateLimit } from "../../middlewares/rateLimit";
import { validateBody } from "../../middlewares/validate";
import { AppError } from "../../utils/AppError";
import * as reviewService from "./reviews.service";

export const reviewsRouter = Router();

function parseId(value: unknown, label = "ID") {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, `${label} không hợp lệ`);
  return id;
}

// Công khai: đánh giá nổi bật cho trang chủ
reviewsRouter.get("/featured", async (_req, res) => {
  res.json({ data: await reviewService.listFeatured() });
});

// Công khai (đăng nhập thì biết thêm mình có được đánh giá không)
reviewsRouter.get("/product/:productId", optionalAuth, async (req: Request, res) => {
  res.json({ data: await reviewService.listByProduct(parseId(req.params.productId, "Mã món"), req.user?.id) });
});

reviewsRouter.get("/mine", requireAuth, async (req, res) => {
  res.json({ data: await reviewService.listMine(req.user!.id) });
});

reviewsRouter.post(
  "/",
  requireAuth,
  rateLimit({ windowMs: 60 * 1000, max: 10, message: "Bạn gửi đánh giá quá nhanh." }),
  validateBody(reviewService.reviewSchema),
  async (req, res) => {
    res.status(201).json({ data: await reviewService.upsert(req.user!.id, req.body) });
  },
);

reviewsRouter.delete("/:id", requireAuth, async (req, res) => {
  await reviewService.remove(parseId(req.params.id), req.user!);
  res.status(204).end();
});
