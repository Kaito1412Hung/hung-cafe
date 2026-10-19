import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { validateBody } from "../../middlewares/validate";
import * as controller from "./orders.controller";
import { checkoutSchema, updateStatusSchema } from "./orders.schema";

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

// Khách hàng (đặt "/my" TRƯỚC "/:id" để Express không hiểu "my" là một id)
ordersRouter.post("/", validateBody(checkoutSchema), controller.checkout);
ordersRouter.get("/my", controller.listMine);
ordersRouter.patch("/my/:id/cancel", controller.cancelMine);
ordersRouter.post("/my/:id/reorder", controller.reorderMine);

// Admin
ordersRouter.get("/", requireRole("admin"), controller.listAll);
ordersRouter.patch("/:id/status", requireRole("admin"), validateBody(updateStatusSchema), controller.updateStatus);

// Chi tiết: admin hoặc chủ đơn
ordersRouter.get("/:id", controller.getOne);
