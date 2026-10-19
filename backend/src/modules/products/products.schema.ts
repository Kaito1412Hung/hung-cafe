import { z } from "zod";

export const CATEGORIES = ["coffee", "tea", "freeze", "cake"] as const;

// Quy tắc của từng trường (chưa có giá trị mặc định)
const fields = {
  name: z.string().trim().min(2, "Tên sản phẩm cần ít nhất 2 ký tự").max(60, "Tên sản phẩm tối đa 60 ký tự"),
  description: z.string().trim().max(200, "Mô tả tối đa 200 ký tự"),
  price: z.number({ error: "Giá phải là số" }).int().min(1000, "Giá phải từ 1.000đ trở lên"),
  category: z.enum(CATEGORIES, { error: "Danh mục không hợp lệ" }),
  image: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https?:\/\/.+/.test(v), "URL ảnh phải bắt đầu bằng http:// hoặc https://"),
  stock: z.number({ error: "Tồn kho phải là số" }).int("Tồn kho là số nguyên").min(0, "Tồn kho phải ≥ 0"),
  isAvailable: z.boolean(),
  isBestSeller: z.boolean(),
};

/** POST / PUT: thiếu trường không bắt buộc thì dùng giá trị mặc định */
export const productSchema = z.object({
  ...fields,
  description: fields.description.default(""),
  image: fields.image.default(""),
  isAvailable: fields.isAvailable.default(true),
  isBestSeller: fields.isBestSeller.default(false),
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
  createdAt: Date;
  updatedAt: Date;
}
