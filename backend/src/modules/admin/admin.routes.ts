import { Router, type Request } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { validateBody } from "../../middlewares/validate";
import { AppError } from "../../utils/AppError";
import * as customersService from "./customers.service";
import { parsePeriod } from "./period";
import { getDashboardStats } from "./stats.service";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("admin"));

function parseId(req: Request) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, "ID không hợp lệ");
  return id;
}

/* ----- Tổng quan ----- */
// ?days=7|30|90 hoặc ?year=2026 (cả năm, biểu đồ theo tháng)
adminRouter.get("/stats", async (req, res) => {
  res.json({ data: await getDashboardStats(parsePeriod(req.query, 7)) });
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

export const roleSchema = z.object({ role: z.enum(["admin", "customer"], { error: "Vai trò không hợp lệ" }) });

adminRouter.patch("/customers/:id/role", validateBody(roleSchema), async (req, res) => {
  res.json({ data: await customersService.changeRole(req.user!.id, parseId(req), req.body.role) });
});

adminRouter.post("/customers/:id/reset-password", async (req, res) => {
  res.json({ data: await customersService.resetPassword(req.user!.id, parseId(req)) });
});

adminRouter.delete("/customers/:id", async (req, res) => {
  await customersService.remove(req.user!.id, parseId(req));
  res.status(204).end();
});
