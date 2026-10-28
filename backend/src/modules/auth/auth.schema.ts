import { z } from "zod";

export type Role = "admin" | "customer";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Tên cần ít nhất 2 ký tự").max(100, "Tên tối đa 100 ký tự"),
  email: z.string().trim().toLowerCase().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu cần ít nhất 6 ký tự").max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

/** Cập nhật hồ sơ: chỉ gửi trường muốn đổi (không dùng .default() để tránh ghi đè ngoài ý muốn) */
export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2, "Họ tên cần ít nhất 2 ký tự").max(100, "Họ tên tối đa 100 ký tự"),
    // Tên hiển thị / biệt danh — để trống thì dùng họ tên
    nickname: z.string().trim().max(50, "Tên hiển thị tối đa 50 ký tự"),
    phone: z
      .string()
      .trim()
      .transform((v) => v.replace(/[\s.-]/g, ""))
      .refine((v) => v === "" || /^(0|\+84)\d{9}$/.test(v), "Số điện thoại không hợp lệ (VD: 0971131945)"),
    address: z.string().trim().max(255, "Địa chỉ tối đa 255 ký tự"),
    birthday: z
      .string()
      .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), "Ngày sinh không hợp lệ")
      .refine((v) => v === "" || new Date(v) <= new Date(), "Ngày sinh không được ở tương lai")
      .refine((v) => v === "" || new Date(v).getFullYear() >= 1900, "Ngày sinh không hợp lệ"),
    gender: z.enum(["", "male", "female", "other"], { error: "Giới tính không hợp lệ" }),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "Không có thông tin nào để cập nhật" });

/** Ảnh đại diện gửi dạng data URL (frontend đã thu nhỏ còn 256px). Chuỗi rỗng = xoá ảnh */
export const avatarSchema = z.object({
  avatar: z
    .string()
    .max(200_000, "Ảnh quá lớn, vui lòng chọn ảnh khác")
    .refine((v) => v === "" || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v), "Định dạng ảnh không hợp lệ"),
});

export const changePasswordSchema = z
  .object({
    // Để trống được khi tài khoản Google chưa có mật khẩu (tạo mật khẩu lần đầu) — service kiểm tra
    currentPassword: z.string().default(""),
    newPassword: z.string().min(6, "Mật khẩu mới cần ít nhất 6 ký tự").max(100),
  })
  .refine((v) => v.currentPassword !== v.newPassword, { message: "Mật khẩu mới phải khác mật khẩu cũ", path: ["newPassword"] });

/** Có mật khẩu → nhập mật khẩu; tài khoản Google chưa có mật khẩu → gõ lại email (service kiểm tra) */
export const deleteAccountSchema = z.object({
  password: z.string().default(""),
  confirmEmail: z.string().trim().toLowerCase().default(""),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email không hợp lệ"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
