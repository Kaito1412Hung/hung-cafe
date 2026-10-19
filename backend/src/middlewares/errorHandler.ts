import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../utils/AppError";

export const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(404, `Không tìm thấy đường dẫn ${req.method} ${req.originalUrl}`));
};

/** Mọi lỗi trong app đều chạy về đây (Express 5 tự bắt lỗi của hàm async) */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message, errors: err.errors });
    return;
  }

  // Body gửi lên không phải JSON hợp lệ
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ message: "JSON không hợp lệ" });
    return;
  }

  // Lỗi có sẵn mã 4xx từ thư viện (VD: body quá lớn = 413, file tĩnh không có = 404)
  const status = typeof err?.status === "number" ? err.status : typeof err?.statusCode === "number" ? err.statusCode : 500;
  if (status >= 400 && status < 500) {
    const messages: Record<number, string> = { 404: "Không tìm thấy tài nguyên", 413: "Dữ liệu gửi lên quá lớn" };
    res.status(status).json({ message: messages[status] ?? "Yêu cầu không hợp lệ" });
    return;
  }

  console.error(err);
  res.status(500).json({ message: "Lỗi máy chủ, vui lòng thử lại sau" });
};
