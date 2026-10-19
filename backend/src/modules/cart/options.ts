import { z } from "zod";

/**
 * Tuỳ chọn khi gọi món (size / đường / đá). Giá niêm yết của món = size S.
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

export const ICES = {
  normal: "Đá bình thường",
  less: "Ít đá",
  none: "Không đá",
  separate: "Đá để riêng",
} as const;

export type Size = keyof typeof SIZES;
export type Sugar = keyof typeof SUGARS;
export type Ice = keyof typeof ICES;

/** Lựa chọn mặc định khi bấm "+" nhanh ở thẻ món */
export const DEFAULT_OPTIONS = { size: "S", sugar: "100", ice: "normal" } as const;

/** Dữ liệu khách gửi lên. Món không có tuỳ chọn (bánh) thì size/đường/đá bị bỏ qua. */
export const itemOptionsSchema = z.object({
  size: z.enum(Object.keys(SIZES) as [Size, ...Size[]], { error: "Size không hợp lệ" }).optional(),
  sugar: z.enum(Object.keys(SUGARS) as [Sugar, ...Sugar[]], { error: "Mức đường không hợp lệ" }).optional(),
  ice: z.enum(Object.keys(ICES) as [Ice, ...Ice[]], { error: "Mức đá không hợp lệ" }).optional(),
  note: z.string().trim().max(100, "Ghi chú cho món tối đa 100 ký tự").optional(),
});

export type ItemOptionsInput = z.infer<typeof itemOptionsSchema>;

export interface ItemOptions {
  size: Size | "";
  sugar: Sugar | "";
  ice: Ice | "";
  note: string;
}

/** Chuẩn hoá lựa chọn theo món: có tuỳ chọn → điền mặc định chỗ thiếu; không có → để trống */
export function normalizeOptions(hasOptions: boolean, input: ItemOptionsInput = {}): ItemOptions {
  const note = input.note?.replace(/\s+/g, " ") ?? "";
  if (!hasOptions) return { size: "", sugar: "", ice: "", note };
  return {
    size: input.size ?? DEFAULT_OPTIONS.size,
    sugar: input.sugar ?? DEFAULT_OPTIONS.sugar,
    ice: input.ice ?? DEFAULT_OPTIONS.ice,
    note,
  };
}

/** Phụ thu theo size (size rỗng = món không có size) */
export const sizeExtra = (size: string) => SIZES[size as Size]?.extra ?? 0;

/** "Vừa (M) · 50% đường · Ít đá · Ghi chú: ..." — dùng cho Excel / thông báo */
export function describeOptions(o: { size: string; sugar: string; ice: string; note: string }) {
  const parts = [
    SIZES[o.size as Size]?.label,
    SUGARS[o.sugar as Sugar],
    ICES[o.ice as Ice],
    o.note && `Ghi chú: ${o.note}`,
  ].filter(Boolean);
  return parts.join(" · ");
}
