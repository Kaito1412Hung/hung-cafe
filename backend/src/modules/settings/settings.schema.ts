import { z } from "zod";

const money = (label: string) =>
  z.number({ error: `${label} phải là số` }).int(`${label} là số nguyên`).min(0, `${label} không được âm`).max(10_000_000);

/** Giờ dạng "HH:mm" (24h), VD "07:00", "22:30" */
const time = (label: string) => z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, `${label} phải có dạng giờ:phút, VD 07:00`);

/** Link mạng xã hội: để trống hoặc là link http(s) */
const socialUrl = (label: string) =>
  z
    .string()
    .trim()
    .max(255)
    .refine((v) => v === "" || /^https?:\/\/\S+$/.test(v), `${label} phải là link bắt đầu bằng https://`);

export const shopSettingsSchema = z.object({
  name: z.string().trim().min(2, "Tên quán cần ít nhất 2 ký tự").max(60),
  tagline: z.string().trim().max(160, "Tối đa 160 ký tự"),
  phone: z.string().trim().min(8, "Số điện thoại không hợp lệ").max(20),
  email: z.string().trim().email("Email không hợp lệ"),
  address: z.string().trim().min(5, "Địa chỉ cần ít nhất 5 ký tự").max(255),

  // Giờ mở cửa (dùng để chặn đặt hàng ngoài giờ). Giờ đóng nhỏ hơn giờ mở = mở qua đêm
  weekdayOpen: time("Giờ mở cửa"),
  weekdayClose: time("Giờ đóng cửa"),
  weekendOpen: time("Giờ mở cửa"),
  weekendClose: time("Giờ đóng cửa"),
  /** Tắt để tạm ngưng nhận đơn (VD: quán nghỉ lễ) */
  acceptOrders: z.boolean(),

  facebookUrl: socialUrl("Link Facebook"),
  instagramUrl: socialUrl("Link Instagram"),
  tiktokUrl: socialUrl("Link TikTok"),

  shippingFee: money("Phí giao hàng"),
  freeShippingThreshold: money("Ngưỡng miễn phí giao hàng"),
});

export type ShopSettings = z.infer<typeof shopSettingsSchema>;

/** Giá trị mặc định khi DB chưa có cài đặt (hoặc thiếu trường mới thêm sau) */
export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  name: "Hưng Café",
  tagline: "Từ nông trại Cầu Đất đến tách cà phê của bạn — rang mộc, pha bằng cả trái tim.",
  phone: "097 113 1945",
  email: "hungquangkid14121412@gmail.com",
  address: "Lô F, Chung cư Tây Thạnh, Phường Tây Thạnh, TP.HCM",
  weekdayOpen: "07:00",
  weekdayClose: "22:00",
  weekendOpen: "06:30",
  weekendClose: "23:00",
  acceptOrders: true,
  facebookUrl: "",
  instagramUrl: "",
  tiktokUrl: "",
  shippingFee: 15_000,
  freeShippingThreshold: 200_000,
};
