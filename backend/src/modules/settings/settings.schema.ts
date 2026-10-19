import { z } from "zod";

const money = (label: string) =>
  z.number({ error: `${label} phải là số` }).int(`${label} là số nguyên`).min(0, `${label} không được âm`).max(10_000_000);

export const shopSettingsSchema = z.object({
  name: z.string().trim().min(2, "Tên quán cần ít nhất 2 ký tự").max(60),
  tagline: z.string().trim().max(160, "Tối đa 160 ký tự"),
  phone: z.string().trim().min(8, "Số điện thoại không hợp lệ").max(20),
  email: z.string().trim().email("Email không hợp lệ"),
  address: z.string().trim().min(5, "Địa chỉ cần ít nhất 5 ký tự").max(255),
  openingHoursWeekday: z.string().trim().min(1, "Vui lòng nhập giờ mở cửa").max(60),
  openingHoursWeekend: z.string().trim().min(1, "Vui lòng nhập giờ mở cửa").max(60),
  shippingFee: money("Phí giao hàng"),
  freeShippingThreshold: money("Ngưỡng miễn phí giao hàng"),
});

export type ShopSettings = z.infer<typeof shopSettingsSchema>;

/** Giá trị mặc định khi DB chưa có cài đặt */
export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  name: "Hưng Café",
  tagline: "Từ nông trại Cầu Đất đến tách cà phê của bạn — rang mộc, pha bằng cả trái tim.",
  phone: "097 113 1945",
  email: "hungquangkid14121412@gmail.com",
  address: "Lô F, Chung cư Tây Thạnh, Phường Tây Thạnh, TP.HCM",
  openingHoursWeekday: "7:00 – 22:00",
  openingHoursWeekend: "6:30 – 23:00",
  shippingFee: 15_000,
  freeShippingThreshold: 200_000,
};
