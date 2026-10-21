import { Router, type Request } from "express";
import { requireAuth } from "../../middlewares/auth";
import { rateLimit } from "../../middlewares/rateLimit";
import { AppError } from "../../utils/AppError";
import * as paymentService from "./payments.service";

export const paymentsRouter = Router();

// Công khai: frontend biết có hiện lựa chọn VNPay không
paymentsRouter.get("/config", (_req, res) => {
  res.json({ data: paymentService.paymentConfig() });
});

// Khách tạo link thanh toán VNPay cho đơn của mình (lần đầu / thanh toán lại)
paymentsRouter.post(
  "/vnpay/:orderId",
  requireAuth,
  rateLimit({ windowMs: 60 * 1000, max: 10, message: "Bạn bấm thanh toán quá nhanh." }),
  async (req: Request, res) => {
    const orderId = Number(req.params.orderId);
    if (!Number.isInteger(orderId) || orderId <= 0) throw new AppError(400, "Mã đơn không hợp lệ");
    res.json({ data: await paymentService.createVnpayUrl(req.user!.id, orderId, req.ip) });
  },
);

// Trang "quay về" của frontend gửi lại nguyên tham số VNPay → kiểm tra chữ ký rồi mới ghi nhận
paymentsRouter.get("/vnpay/return", async (req, res) => {
  const result = await paymentService.handleVnpayResult(req.query as Record<string, unknown>);
  res.json({ data: { status: result.status, orderId: result.orderId, message: result.message } });
});

// IPN: máy chủ VNPay gọi thẳng vào đây (chỉ dùng được khi backend có địa chỉ công khai — lúc deploy)
paymentsRouter.get("/vnpay/ipn", async (req, res) => {
  const result = await paymentService.handleVnpayResult(req.query as Record<string, unknown>);
  res.json({ RspCode: result.rspCode, Message: result.message });
});
