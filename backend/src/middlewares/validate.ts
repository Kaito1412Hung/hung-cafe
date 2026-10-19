import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError } from "../utils/AppError";

/** Kiểm tra req.body theo zod schema; hợp lệ thì thay body bằng dữ liệu đã chuẩn hoá */
export const validateBody =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path.join(".") || "body";
        errors[field] ??= issue.message;
      }
      throw new AppError(400, "Dữ liệu không hợp lệ", errors);
    }
    req.body = result.data;
    next();
  };
