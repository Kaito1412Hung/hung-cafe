import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { AppError } from "../../utils/AppError";
import * as notificationService from "./notifications.service";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get("/", async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
  res.json(await notificationService.listForUser(req.user!.id, limit));
});

// Đặt "read-all" TRƯỚC "/:id/read"
notificationsRouter.patch("/read-all", async (req, res) => {
  await notificationService.markAllRead(req.user!.id);
  res.status(204).end();
});

notificationsRouter.patch("/:id/read", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, "ID không hợp lệ");
  await notificationService.markRead(req.user!.id, id);
  res.status(204).end();
});
