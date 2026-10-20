import { z } from "zod";
import { SERVES } from "../cart/options";

// Quy tắc của từng trường (chưa có giá trị mặc định)
const fields = {
  name: z.string().trim().min(2, "Tên sản phẩm cần ít nhất 2 ký tự").max(60, "Tên sản phẩm tối đa 60 ký tự"),
  description: z.string().trim().max(200, "Mô tả tối đa 200 ký tự"),
  price: z.number({ error: "Giá phải là số" }).int().min(1000, "Giá phải từ 1.000đ trở lên"),
  // Mã danh mục (slug) — service sẽ kiểm tra danh mục có tồn tại trong DB không
  category: z.string({ error: "Vui lòng chọn danh mục" }).trim().min(1, "Vui lòng chọn danh mục").max(50),
  image: z
    .string()
    .trim()
    // Link ảnh ngoài (http/https) hoặc ảnh đã upload lên server (/api/uploads/...)
    .refine((v) => v === "" || /^https?:\/\/.+/.test(v) || /^\/api\/uploads\/[\w./-]+$/.test(v), "Ảnh phải là link http(s) hoặc ảnh đã tải lên"),
  stock: z.number({ error: "Tồn kho phải là số" }).int("Tồn kho là số nguyên").min(0, "Tồn kho phải ≥ 0"),
  isAvailable: z.boolean(),
  isBestSeller: z.boolean(),
  /** Có chọn size (S/M/L) không */
  hasSize: z.boolean(),
  /** Có chọn mức đường không */
  hasSugar: z.boolean(),
  /** Cách phục vụ: none (đồ ăn) | cold (chỉ đá) | hot (chỉ nóng) | both (khách chọn nóng hoặc đá) */
  serve: z.enum(SERVES, { error: "Cách phục vụ không hợp lệ" }),
  /** Có cho thêm topping không */
  allowToppings: z.boolean(),
};

/** POST / PUT: thiếu trường không bắt buộc thì dùng giá trị mặc định */
export const productSchema = z.object({
  ...fields,
  description: fields.description.default(""),
  image: fields.image.default(""),
  isAvailable: fields.isAvailable.default(true),
  isBestSeller: fields.isBestSeller.default(false),
  hasSize: fields.hasSize.default(true),
  hasSugar: fields.hasSugar.default(true),
  serve: fields.serve.default("cold"),
  allowToppings: fields.allowToppings.default(false),
});

/**
 * PATCH: chỉ gửi những trường muốn đổi.
 * Không dùng productSchema.partial() vì zod vẫn tự điền .default() cho trường bị thiếu
 * → PATCH {isAvailable:false} sẽ vô tình xoá mô tả/ảnh. Dùng `fields` (không có default) để tránh.
 */
export const productPatchSchema = z
  .object(fields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "Cần ít nhất một trường để cập nhật" });

export type ProductInput = z.infer<typeof productSchema>;
export type ProductPatch = z.infer<typeof productPatchSchema>;

export interface Product extends ProductInput {
  id: number;
  slug: string;
  /** Món có ít nhất 1 lựa chọn (size / đường / nóng-đá / topping) → mở hộp thoại chọn khi bấm "+" */
  hasOptions: boolean;
  /** Điểm đánh giá trung bình (null = chưa có đánh giá) */
  ratingAverage: number | null;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}
