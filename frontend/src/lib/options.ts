/**
 * Tuỳ chọn khi gọi món — bản sao của backend/src/modules/cart/options.ts (sửa 1 bên thì sửa cả 2).
 * Giá niêm yết của món = size S.
 */
export const SIZES = [
  { value: "S", label: "Nhỏ", extra: 0 },
  { value: "M", label: "Vừa", extra: 6000 },
  { value: "L", label: "Lớn", extra: 10000 },
] as const;

export const SUGARS = [
  { value: "100", label: "100%" },
  { value: "70", label: "70%" },
  { value: "50", label: "50%" },
  { value: "30", label: "30%" },
  { value: "0", label: "Không đường" },
] as const;

export const ICES = [
  { value: "normal", label: "Bình thường" },
  { value: "less", label: "Ít đá" },
  { value: "none", label: "Không đá" },
  { value: "separate", label: "Đá để riêng" },
] as const;

export type Size = (typeof SIZES)[number]["value"];
export type Sugar = (typeof SUGARS)[number]["value"];
export type Ice = (typeof ICES)[number]["value"];

export interface ItemOptions {
  size: Size | "";
  sugar: Sugar | "";
  ice: Ice | "";
  note: string;
}

export const DEFAULT_OPTIONS: ItemOptions = { size: "S", sugar: "100", ice: "normal", note: "" };

export const sizeExtra = (size: string) => SIZES.find((s) => s.value === size)?.extra ?? 0;

/** Mô tả ngắn: "Size M · 50% đường · Ít đá" (món không có tuỳ chọn → chuỗi rỗng) */
export function describeOptions(o: Pick<ItemOptions, "size" | "sugar" | "ice">) {
  const parts: string[] = [];
  if (o.size) parts.push(`Size ${o.size}`);
  if (o.sugar) parts.push(o.sugar === "0" ? "Không đường" : `${o.sugar}% đường`);
  const ice = ICES.find((i) => i.value === o.ice);
  if (ice) parts.push(ice.value === "normal" ? "Đá bình thường" : ice.label);
  return parts.join(" · ");
}
