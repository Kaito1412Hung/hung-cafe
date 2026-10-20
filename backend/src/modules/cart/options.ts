import { z } from "zod";

/**
 * Tuỳ chọn khi gọi món (size / đường / nóng-đá / đá / topping). Giá niêm yết của món = size S.
 * Frontend có bản sao danh sách này ở src/lib/options.ts — sửa ở đây thì sửa cả bên đó.
 */
export const SIZES = {
  S: { label: "Nhỏ (S)", extra: 0 },
  M: { label: "Vừa (M)", extra: 6000 },
  L: { label: "Lớn (L)", extra: 10000 },
} as const;

export const SUGARS = {
  "100": "100% đường",
  "70": "70% đường",
  "50": "50% đường",
  "30": "30% đường",
  "0": "Không đường",
} as const;

export const TEMPS = { cold: "Uống đá", hot: "Uống nóng" } as const;

export const ICES = {
  normal: "Đá bình thường",
  less: "Ít đá",
  none: "Không đá",
  separate: "Đá để riêng",
} as const;

/** Cách phục vụ của món: đồ ăn / chỉ đá / chỉ nóng / khách chọn nóng hoặc đá */
export const SERVES = ["none", "cold", "hot", "both"] as const;

export type Size = keyof typeof SIZES;
export type Sugar = keyof typeof SUGARS;
export type Temp = keyof typeof TEMPS;
export type Ice = keyof typeof ICES;
export type Serve = (typeof SERVES)[number];

/** Món này cho khách chọn những gì (admin chỉnh riêng từng món) */
export interface ProductOptionConfig {
  hasSize: boolean;
  hasSugar: boolean;
  serve: Serve;
  allowToppings: boolean;
}

/** Tối đa số topping cho 1 phần */
export const MAX_TOPPINGS = 4;

/** Dữ liệu khách gửi lên. Lựa chọn nào món không có thì bị bỏ qua. */
export const itemOptionsSchema = z.object({
  size: z.enum(Object.keys(SIZES) as [Size, ...Size[]], { error: "Size không hợp lệ" }).optional(),
  sugar: z.enum(Object.keys(SUGARS) as [Sugar, ...Sugar[]], { error: "Mức đường không hợp lệ" }).optional(),
  temp: z.enum(Object.keys(TEMPS) as [Temp, ...Temp[]], { error: "Nóng / đá không hợp lệ" }).optional(),
  ice: z.enum(Object.keys(ICES) as [Ice, ...Ice[]], { error: "Mức đá không hợp lệ" }).optional(),
  toppings: z.array(z.number().int().positive()).max(MAX_TOPPINGS, `Tối đa ${MAX_TOPPINGS} topping cho 1 phần`).optional(),
  note: z.string().trim().max(100, "Ghi chú cho món tối đa 100 ký tự").optional(),
});

export type ItemOptionsInput = z.infer<typeof itemOptionsSchema>;

/** Lựa chọn đã chuẩn hoá (lưu vào giỏ). toppings = chuỗi mã topping tăng dần, VD "1,5" */
export interface ItemOptions {
  size: Size | "";
  sugar: Sugar | "";
  temp: Temp | "";
  ice: Ice | "";
  toppings: string;
  note: string;
}

export interface ToppingSnapshot {
  id: number;
  name: string;
  price: number;
}

/**
 * Chuẩn hoá lựa chọn theo cấu hình món: điền mặc định chỗ thiếu, bỏ chỗ món không có.
 * `availableToppings`: các topping đang bán (mã → thông tin) — topping lạ / đã ngưng bị bỏ qua.
 */
export function normalizeOptions(cfg: ProductOptionConfig, input: ItemOptionsInput, availableToppings: Map<number, ToppingSnapshot>): ItemOptions {
  const note = input.note?.replace(/\s+/g, " ") ?? "";
  // Nhiệt độ chỉ lưu khi khách được chọn (món "nóng hoặc đá"); món chỉ nóng / chỉ đá thì đã rõ
  const temp: ItemOptions["temp"] = cfg.serve === "both" ? (input.temp ?? "cold") : "";
  const isCold = cfg.serve === "cold" || (cfg.serve === "both" && temp === "cold");
  const toppings = cfg.allowToppings
    ? [...new Set(input.toppings ?? [])]
        .filter((id) => availableToppings.has(id))
        .sort((a, b) => a - b)
        .slice(0, MAX_TOPPINGS)
        .join(",")
    : "";
  return {
    size: cfg.hasSize ? (input.size ?? "S") : "",
    sugar: cfg.hasSugar ? (input.sugar ?? "100") : "",
    temp,
    ice: isCold ? (input.ice ?? "normal") : "",
    toppings,
    note,
  };
}

/** "1,5" → [1, 5] */
export const parseToppingIds = (csv: string) => (csv ? csv.split(",").map(Number) : []);

/** Phụ thu theo size (size rỗng = món không có size) */
export const sizeExtra = (size: string) => SIZES[size as Size]?.extra ?? 0;

/** "Vừa (M) · Uống nóng · 50% đường · Ít đá · +Trân châu đen, Pudding trứng · Ghi chú: ..." — dùng cho Excel / thông báo */
export function describeOptions(o: { size: string; sugar: string; temp?: string; ice: string; note: string; toppings?: { name: string }[] }) {
  const parts = [
    SIZES[o.size as Size]?.label,
    TEMPS[o.temp as Temp],
    SUGARS[o.sugar as Sugar],
    ICES[o.ice as Ice],
    o.toppings?.length ? `+${o.toppings.map((t) => t.name).join(", ")}` : "",
    o.note && `Ghi chú: ${o.note}`,
  ].filter(Boolean);
  return parts.join(" · ");
}
