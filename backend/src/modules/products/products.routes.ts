import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { validateBody } from "../../middlewares/validate";
import * as controller from "./products.controller";
import { productPatchSchema, productSchema } from "./products.schema";

export const productsRouter = Router();
const adminOnly = [requireAuth, requireRole("admin")];

// Ai cũng xem được thực đơn
productsRouter.get("/", controller.list);
productsRouter.get("/:id", controller.getOne);

// Chỉ admin được thêm / sửa / xoá
productsRouter.post("/", ...adminOnly, validateBody(productSchema), controller.create);
productsRouter.put("/:id", ...adminOnly, validateBody(productSchema), controller.update);
productsRouter.patch("/:id", ...adminOnly, validateBody(productPatchSchema), controller.update);
productsRouter.delete("/:id", ...adminOnly, controller.remove);
