/**
 * Gửi ảnh lên Cloudinary (dịch vụ cloud lưu ảnh) bằng API upload có chữ ký.
 * Không dùng thư viện: chỉ cần fetch + chữ ký SHA-1 theo hướng dẫn của Cloudinary.
 *
 * Vì sao cần: máy chủ khi deploy (VD Render bản miễn phí) xoá ổ cứng mỗi lần deploy lại
 * → ảnh lưu trong thư mục uploads/ sẽ mất. Ảnh trên Cloudinary thì còn mãi.
 */
import { createHash } from "node:crypto";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";

/** Thư mục chứa ảnh món trên Cloudinary */
const FOLDER = "hung-cafe/products";

/**
 * Chữ ký: xếp các tham số theo tên A→Z, nối dạng "a=1&b=2", thêm API secret ở cuối rồi băm SHA-1.
 * Cloudinary tự tính lại → khớp mới nhận ảnh. Secret không bao giờ gửi đi.
 */
export function signParams(params: Record<string, string | number>, secret = env.CLOUDINARY_API_SECRET) {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(toSign + secret).digest("hex");
}

/**
 * Chèn "f_auto,q_auto" vào link → Cloudinary tự chọn định dạng nhẹ nhất (WebP / AVIF)
 * và chất lượng vừa đủ cho từng trình duyệt, ảnh tải nhanh hơn mà nhìn không khác.
 */
export function optimizedUrl(secureUrl: string) {
  return secureUrl.replace("/image/upload/", "/image/upload/f_auto,q_auto/");
}

/** Gửi ảnh (data URL) lên Cloudinary, trả về link https của ảnh */
export async function uploadToCloudinary(dataUrl: string): Promise<string> {
  const params = { folder: FOLDER, timestamp: Math.floor(Date.now() / 1000) };
  const form = new URLSearchParams({
    file: dataUrl,
    api_key: env.CLOUDINARY_API_KEY,
    folder: params.folder,
    timestamp: String(params.timestamp),
    signature: signParams(params),
  });

  let response: Response;
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new AppError(502, "Không kết nối được Cloudinary, vui lòng thử lại sau");
  }

  const result = (await response.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!response.ok || !result.secure_url) {
    // Ghi lỗi gốc ra terminal backend để dễ sửa (VD sai mã) — không gửi chi tiết cho người dùng
    console.error(`Cloudinary từ chối ảnh (${response.status}): ${result.error?.message ?? "không rõ lý do"}`);
    throw new AppError(502, "Tải ảnh lên Cloudinary thất bại, vui lòng thử lại sau");
  }
  return optimizedUrl(result.secure_url);
}
