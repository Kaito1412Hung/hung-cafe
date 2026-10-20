import { Router } from "express";
import { optionalAuth, requireAuth } from "../../middlewares/auth";
import { validateBody } from "../../middlewares/validate";
import { rateLimit } from "../../middlewares/rateLimit";
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

// Chống tạo tài khoản ảo hàng loạt / spam yêu cầu quên mật khẩu (tính theo IP)
const registerLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: "Thiết bị này đã tạo quá nhiều tài khoản." });
const forgotLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: "Bạn đã gửi quá nhiều yêu cầu." });

authRouter.post("/register", registerLimit, validateBody(registerSchema), controller.register);
authRouter.post("/login", validateBody(loginSchema), controller.login);
authRouter.post("/logout", controller.logout);
authRouter.post("/logout-all", requireAuth, controller.logoutAll);
authRouter.post("/forgot-password", forgotLimit, validateBody(forgotPasswordSchema), controller.forgotPassword);

// Hồ sơ của chính mình
// Chưa đăng nhập vẫn trả 200 + { user: null } (thay vì 401) → Console trình duyệt không hiện dòng đỏ mỗi lần mở web
authRouter.get("/me", optionalAuth, controller.me);
authRouter.patch("/me", requireAuth, validateBody(updateProfileSchema), controller.updateProfile);
authRouter.put("/me/avatar", requireAuth, validateBody(avatarSchema), controller.updateAvatar);
authRouter.delete("/me", requireAuth, validateBody(deleteAccountSchema), controller.deleteAccount);
authRouter.patch("/password", requireAuth, validateBody(changePasswordSchema), controller.changePassword);
