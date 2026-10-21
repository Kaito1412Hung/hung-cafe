import { Router } from "express";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { cloudinaryEnabled } from "../../config/env";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { validateBody } from "../../middlewares/validate";
import { uploadToCloudinary } from "./cloudinary";

/** Thư mục lưu file upload (đã thêm vào .gitignore) */
export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

const MAX_BYTES = 2 * 1024 * 1024; // 2MB sau khi giải mã
const EXT: Record<string, string> = { jpeg: "jpg", png: "png", webp: "webp" };

// Frontend đã thu nhỏ ảnh rồi gửi dạng data URL → không cần thư viện xử lý multipart
export const uploadSchema = z.object({
  image: z
    .string()
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Chỉ nhận ảnh JPG, PNG hoặc WEBP"),
});

export const uploadsRouter = Router();

uploadsRouter.post("/products", requireAuth, requireRole("admin"), validateBody(uploadSchema), async (req, res) => {
  const [, type, base64] = (req.body.image as string).match(/^data:image\/(\w+);base64,(.+)$/)!;
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length > MAX_BYTES) {
    res.status(400).json({ message: "Ảnh tối đa 2MB" });
    return;
  }

  // Đã điền mã Cloudinary trong .env → gửi ảnh lên cloud (ảnh còn mãi kể cả khi máy chủ bị xoá ổ cứng lúc deploy)
  if (cloudinaryEnabled) {
    res.status(201).json({ data: { url: await uploadToCloudinary(req.body.image) } });
    return;
  }

  // Chưa có mã Cloudinary → lưu vào ổ cứng máy chủ như cũ
  // Tên file ngẫu nhiên → không trùng, không đoán được, không dính ký tự lạ từ người dùng
  const fileName = `${Date.now()}-${randomBytes(6).toString("hex")}.${EXT[type]}`;
  const dir = path.join(UPLOAD_DIR, "products");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), buffer);

  res.status(201).json({ data: { url: `/api/uploads/products/${fileName}` } });
});
