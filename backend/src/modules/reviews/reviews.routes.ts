import { Router, type Request } from "express";
import { optionalAuth, requireAuth, requireRole } from "../../middlewares/auth";
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

/** Số nguyên dương trong query (?page=2), sai / thiếu → undefined */
function intParam(value: unknown) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

// Admin: tất cả đánh giá, lọc ?rating=1..5&productId=&search=&hasComment=1&id=&sort=newest|lowest&page=&pageSize=
reviewsRouter.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const q = req.query;
  const rating = intParam(q.rating);
  const page = intParam(q.page) ?? 1;
  const pageSize = Math.min(intParam(q.pageSize) ?? 10, 50);
  const result = await reviewService.listForAdmin({
    rating: rating && rating <= 5 ? rating : undefined,
    productId: intParam(q.productId),
    id: intParam(q.id),
    search: typeof q.search === "string" && q.search.trim() ? q.search.trim().slice(0, 100) : undefined,
    hasComment: q.hasComment === "1",
    sort: q.sort === "lowest" ? "lowest" : "newest",
    page,
    pageSize,
  });
  res.json({ data: result.reviews, total: result.total, page, pageSize, summary: result.summary });
});

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
