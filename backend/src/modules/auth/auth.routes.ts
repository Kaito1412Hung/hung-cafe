import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { validateBody } from "../../middlewares/validate";
import * as controller from "./auth.controller";
import {
  avatarSchema,
  changePasswordSchema,
  deleteAccountSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from "./auth.schema";

export const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), controller.register);
authRouter.post("/login", validateBody(loginSchema), controller.login);
authRouter.post("/logout", controller.logout);
authRouter.post("/logout-all", requireAuth, controller.logoutAll);
authRouter.post("/forgot-password", validateBody(forgotPasswordSchema), controller.forgotPassword);

// Hồ sơ của chính mình
authRouter.get("/me", requireAuth, controller.me);
authRouter.patch("/me", requireAuth, validateBody(updateProfileSchema), controller.updateProfile);
authRouter.put("/me/avatar", requireAuth, validateBody(avatarSchema), controller.updateAvatar);
authRouter.delete("/me", requireAuth, validateBody(deleteAccountSchema), controller.deleteAccount);
authRouter.patch("/password", requireAuth, validateBody(changePasswordSchema), controller.changePassword);
