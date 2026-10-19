import { pool } from "../../db/pool";
import { DEFAULT_SHOP_SETTINGS, type ShopSettings } from "./settings.schema";

const SHOP_KEY = "shop";

export async function getShopSettings(): Promise<ShopSettings> {
  const { rows } = await pool.query<{ value: Partial<ShopSettings> }>("SELECT value FROM settings WHERE key = $1", [SHOP_KEY]);
  // Gộp với mặc định để trường mới thêm sau này vẫn có giá trị
  return { ...DEFAULT_SHOP_SETTINGS, ...rows[0]?.value };
}

export async function updateShopSettings(input: ShopSettings): Promise<ShopSettings> {
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [SHOP_KEY, JSON.stringify(input)],
  );
  return getShopSettings();
}

/** Phí giao hàng theo cài đặt hiện tại — dùng khi tạo đơn */
export function calcShippingFee(subtotal: number, settings: Pick<ShopSettings, "shippingFee" | "freeShippingThreshold">) {
  if (subtotal === 0) return 0;
  return subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFee;
}
