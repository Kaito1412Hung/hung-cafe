import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { validateBody } from "../../middlewares/validate";
import { shopSettingsSchema } from "./settings.schema";
import * as settingsService from "./settings.service";

export const settingsRouter = Router();

// Ai cũng đọc được (footer, giỏ hàng cần thông tin quán + phí ship + giờ mở cửa)
settingsRouter.get("/", async (_req, res) => {
  const settings = await settingsService.getShopSettings();
  res.json({ data: settings, openStatus: settingsService.getOpenStatus(settings) });
});

settingsRouter.put("/", requireAuth, requireRole("admin"), validateBody(shopSettingsSchema), async (req, res) => {
  const settings = await settingsService.updateShopSettings(req.body);
  res.json({ data: settings, openStatus: settingsService.getOpenStatus(settings) });
});
