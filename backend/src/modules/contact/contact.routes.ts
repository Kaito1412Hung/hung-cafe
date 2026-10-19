import { Router, type Request } from "express";
import { z } from "zod";
import { optionalAuth, requireAuth, requireRole } from "../../middlewares/auth";
import { validateBody } from "../../middlewares/validate";
import { rateLimit } from "../../middlewares/rateLimit";
import { AppError } from "../../utils/AppError";
import * as contactService from "./contact.service";

const adminOnly = [requireAuth, requireRole("admin")];

function parseId(req: Request) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, "ID không hợp lệ");
  return id;
}

/* ----- /api/contact: tin nhắn liên hệ ----- */
export const contactRouter = Router();

// Ai cũng gửi được; nếu đang đăng nhập thì lưu kèm tài khoản
// Ngoài giới hạn theo email (trong service), giới hạn thêm theo IP: 10 tin / 10 phút
contactRouter.post("/", rateLimit({ windowMs: 10 * 60 * 1000, max: 10, message: "Bạn gửi quá nhiều tin nhắn." }), optionalAuth, validateBody(contactService.contactSchema), async (req, res) => {
  await contactService.createMessage(req.body, req.user?.id ?? null);
  res.status(201).json({ message: "Đã gửi tin nhắn. Quán sẽ phản hồi bạn sớm nhất!" });
});

contactRouter.get("/", ...adminOnly, async (_req, res) => {
  res.json(await contactService.listMessages());
});

contactRouter.patch("/:id", ...adminOnly, validateBody(z.object({ isRead: z.boolean() })), async (req, res) => {
  res.json({ data: await contactService.setMessageRead(parseId(req), req.body.isRead) });
});

contactRouter.delete("/:id", ...adminOnly, async (req, res) => {
  await contactService.deleteMessage(parseId(req));
  res.status(204).end();
});

/* ----- /api/newsletter: đăng ký nhận tin ----- */
export const newsletterRouter = Router();

newsletterRouter.post("/", rateLimit({ windowMs: 10 * 60 * 1000, max: 10, message: "Bạn thao tác quá nhiều lần." }), validateBody(contactService.newsletterSchema), async (req, res) => {
  const { alreadySubscribed } = await contactService.subscribe(req.body.email);
  res.status(alreadySubscribed ? 200 : 201).json({
    // Chưa có gửi email → hiện luôn mã giảm giá cho khách (mã CHAOBANMOI: giảm 20% đơn đầu tiên)
    message: alreadySubscribed ? "Email này đã đăng ký nhận tin rồi nhé!" : "Đăng ký thành công!",
    couponCode: "CHAOBANMOI",
  });
});

newsletterRouter.get("/", ...adminOnly, async (_req, res) => {
  res.json({ data: await contactService.listSubscribers() });
});

newsletterRouter.delete("/:id", ...adminOnly, async (req, res) => {
  await contactService.deleteSubscriber(parseId(req));
  res.status(204).end();
});

/* ----- /api/stats/public: số liệu thật cho trang chủ ----- */
export const publicStatsRouter = Router();

publicStatsRouter.get("/public", async (_req, res) => {
  res.json({ data: await contactService.getPublicStats() });
});
