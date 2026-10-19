import { Router, type Request } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { validateBody } from "../../middlewares/validate";
import { AppError } from "../../utils/AppError";
import * as categoryService from "./categories.service";

export const categoriesRouter = Router();
const adminOnly = [requireAuth, requireRole("admin")];

function parseId(req: Request) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, "ID danh mục không hợp lệ");
  return id;
}

// Ai cũng xem được (thanh lọc ở trang Thực đơn cần)
categoriesRouter.get("/", async (_req, res) => {
  res.json({ data: await categoryService.findAll() });
});

categoriesRouter.post("/", ...adminOnly, validateBody(categoryService.categorySchema), async (req, res) => {
  res.status(201).json({ data: await categoryService.create(req.body) });
});

categoriesRouter.put("/:id", ...adminOnly, validateBody(categoryService.categorySchema), async (req, res) => {
  res.json({ data: await categoryService.update(parseId(req), req.body) });
});

categoriesRouter.delete("/:id", ...adminOnly, async (req, res) => {
  await categoryService.remove(parseId(req));
  res.status(204).end();
});
