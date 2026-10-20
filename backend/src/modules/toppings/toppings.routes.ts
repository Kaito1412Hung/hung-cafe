import { Router, type Request } from "express";
import { optionalAuth, requireAuth, requireRole } from "../../middlewares/auth";
import { validateBody } from "../../middlewares/validate";
import { AppError } from "../../utils/AppError";
import * as toppingService from "./toppings.service";

export const toppingsRouter = Router();
const adminOnly = [requireAuth, requireRole("admin")];

function parseId(req: Request) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, "ID không hợp lệ");
  return id;
}

// Ai cũng xem được topping đang bán; admin thêm ?all=1 để xem cả topping đã ngưng
toppingsRouter.get("/", optionalAuth, async (req, res) => {
  const all = req.query.all === "1" && req.user?.role === "admin";
  res.json({ data: await toppingService.findAll(all) });
});

toppingsRouter.post("/", ...adminOnly, validateBody(toppingService.toppingSchema), async (req, res) => {
  res.status(201).json({ data: await toppingService.create(req.body) });
});

toppingsRouter.patch("/:id", ...adminOnly, validateBody(toppingService.toppingPatchSchema), async (req, res) => {
  res.json({ data: await toppingService.update(parseId(req), req.body) });
});

toppingsRouter.delete("/:id", ...adminOnly, async (req, res) => {
  await toppingService.remove(parseId(req));
  res.status(204).end();
});
