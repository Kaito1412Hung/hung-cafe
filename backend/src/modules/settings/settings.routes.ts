import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { validateBody } from "../../middlewares/validate";
import { shopSettingsSchema } from "./settings.schema";
import * as settingsService from "./settings.service";

export const settingsRouter = Router();

// Ai cũng đọc được (footer, giỏ hàng cần thông tin quán + phí ship)
settingsRouter.get("/", async (_req, res) => {
  res.json({ data: await settingsService.getShopSettings() });
});

settingsRouter.put("/", requireAuth, requireRole("admin"), validateBody(shopSettingsSchema), async (req, res) => {
  res.json({ data: await settingsService.updateShopSettings(req.body) });
});
