import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { validateBody } from "../../middlewares/validate";
import * as controller from "./cart.controller";
import { addItemSchema, updateItemSchema } from "./cart.schema";

export const cartRouter = Router();

// Giỏ hàng gắn với tài khoản → phải đăng nhập
cartRouter.use(requireAuth);

cartRouter.get("/", controller.get);
cartRouter.delete("/", controller.clear);
cartRouter.post("/items", validateBody(addItemSchema), controller.addItem);
cartRouter.patch("/items/:lineId", validateBody(updateItemSchema), controller.updateItem);
cartRouter.delete("/items/:lineId", controller.removeItem);
