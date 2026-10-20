/**
 * Tuỳ chọn khi gọi món — bản sao của backend/src/modules/cart/options.ts (sửa 1 bên thì sửa cả 2).
 * Giá niêm yết của món = size S. Mỗi món tự quyết định có những lựa chọn nào (admin chỉnh trong form món).
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

export const TEMPS = [
  { value: "cold", label: "Uống đá" },
  { value: "hot", label: "Uống nóng" },
] as const;

export const ICES = [
  { value: "normal", label: "Bình thường" },
  { value: "less", label: "Ít đá" },
  { value: "none", label: "Không đá" },
  { value: "separate", label: "Đá để riêng" },
] as const;

/** Cách phục vụ: đồ ăn / chỉ đá / chỉ nóng / khách chọn nóng hoặc đá */
export const SERVES = [
  { value: "none", label: "Không áp dụng (đồ ăn)" },
  { value: "cold", label: "Chỉ uống đá" },
  { value: "hot", label: "Chỉ uống nóng" },
  { value: "both", label: "Khách chọn nóng hoặc đá" },
] as const;

export const MAX_TOPPINGS = 4;

export type Size = (typeof SIZES)[number]["value"];
export type Sugar = (typeof SUGARS)[number]["value"];
export type Temp = (typeof TEMPS)[number]["value"];
export type Ice = (typeof ICES)[number]["value"];
export type Serve = (typeof SERVES)[number]["value"];

/** Món cho chọn những gì */
export interface ProductOptionConfig {
  hasSize: boolean;
  hasSugar: boolean;
  serve: Serve;
  allowToppings: boolean;
}

export interface Topping {
  id: number;
  name: string;
  price: number;
}

/** Lựa chọn khi đang chọn món (toppings = mã topping) */
export interface ItemOptions {
  size: Size | "";
  sugar: Sugar | "";
  temp: Temp | "";
  ice: Ice | "";
  toppings: number[];
  note: string;
}

/** Lựa chọn mặc định theo cấu hình món (giống backend) */
export function defaultOptions(cfg: ProductOptionConfig): ItemOptions {
  return {
    size: cfg.hasSize ? "S" : "",
    sugar: cfg.hasSugar ? "100" : "",
    temp: cfg.serve === "both" ? "cold" : "",
    ice: cfg.serve === "cold" || cfg.serve === "both" ? "normal" : "",
    toppings: [],
    note: "",
  };
}

/** Món này có đang uống đá không (để hiện / ẩn ô chọn lượng đá) */
export const isCold = (cfg: ProductOptionConfig, temp: string) => cfg.serve === "cold" || (cfg.serve === "both" && temp === "cold");

export const sizeExtra = (size: string) => SIZES.find((s) => s.value === size)?.extra ?? 0;

/** Mô tả ngắn: "Size M · Uống nóng · 50% đường · Ít đá" (món không có tuỳ chọn → chuỗi rỗng). Topping hiện riêng */
export function describeOptions(o: { size: string; sugar: string; ice: string; temp?: string }) {
  const parts: string[] = [];
  if (o.size) parts.push(`Size ${o.size}`);
  const temp = TEMPS.find((t) => t.value === o.temp);
  if (temp) parts.push(temp.label);
  if (o.sugar) parts.push(o.sugar === "0" ? "Không đường" : `${o.sugar}% đường`);
  const ice = ICES.find((i) => i.value === o.ice);
  if (ice) parts.push(ice.value === "normal" ? "Đá bình thường" : ice.label);
  return parts.join(" · ");
}

/** "+ Trân châu đen, Pudding trứng" */
export const describeToppings = (toppings?: { name: string }[]) => (toppings?.length ? `+ ${toppings.map((t) => t.name).join(", ")}` : "");
