import { Router, type Request } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { validateBody } from "../../middlewares/validate";
import { AppError } from "../../utils/AppError";
import * as customersService from "./customers.service";
import { getDashboardStats } from "./stats.service";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("admin"));

function parseId(req: Request) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, "ID không hợp lệ");
  return id;
}

/* ----- Tổng quan ----- */
adminRouter.get("/stats", async (req, res) => {
  const days = Number(req.query.days);
  const allowed = [7, 30, 90];
  res.json({ data: await getDashboardStats(allowed.includes(days) ? days : 7) });
});

/* ----- Khách hàng ----- */
adminRouter.get("/customers", async (req, res) => {
  const { search, role } = req.query;
  res.json({
    data: await customersService.findAll({
      search: typeof search === "string" && search.trim() ? search.trim() : undefined,
      role: typeof role === "string" ? role : undefined,
    }),
  });
});

adminRouter.get("/customers/:id", async (req, res) => {
  res.json({ data: await customersService.findById(parseId(req)) });
});

const roleSchema = z.object({ role: z.enum(["admin", "customer"], { error: "Vai trò không hợp lệ" }) });

adminRouter.patch("/customers/:id/role", validateBody(roleSchema), async (req, res) => {
  res.json({ data: await customersService.changeRole(req.user!.id, parseId(req), req.body.role) });
});

adminRouter.delete("/customers/:id", async (req, res) => {
  await customersService.remove(req.user!.id, parseId(req));
  res.status(204).end();
});
