import { pool } from "../../db/pool";
import { DEFAULT_SHOP_SETTINGS, type ShopSettings } from "./settings.schema";

const SHOP_KEY = "shop";
const TIME_ZONE = "Asia/Ho_Chi_Minh";

export async function getShopSettings(): Promise<ShopSettings> {
  const { rows } = await pool.query<{ value: Partial<ShopSettings> }>("SELECT value FROM settings WHERE key = $1", [SHOP_KEY]);
  const stored = rows[0]?.value ?? {};
  // Chỉ lấy các trường đang dùng (bỏ trường cũ không còn dùng), trường mới thiếu thì lấy mặc định
  return Object.fromEntries(
    Object.entries(DEFAULT_SHOP_SETTINGS).map(([key, def]) => [key, (stored as Record<string, unknown>)[key] ?? def]),
  ) as ShopSettings;
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

export interface OpenStatus {
  isOpen: boolean;
  /** Giờ mở / đóng hôm nay, VD "07:00" */
  todayOpen: string;
  todayClose: string;
  /** Câu hiển thị cho khách, VD "Đang mở cửa · đóng lúc 22:00" */
  message: string;
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Giờ và thứ hiện tại theo giờ Việt Nam (server đặt ở đâu cũng tính đúng) */
function nowInVietnam(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { minutes: Number(parts.hour) * 60 + Number(parts.minute), isWeekend: parts.weekday === "Sat" || parts.weekday === "Sun" };
}

/** Quán đang mở cửa hay không (hỗ trợ mở qua đêm: VD 18:00 → 02:00) */
export function getOpenStatus(settings: ShopSettings, now = new Date()): OpenStatus {
  const { minutes, isWeekend } = nowInVietnam(now);
  const todayOpen = isWeekend ? settings.weekendOpen : settings.weekdayOpen;
  const todayClose = isWeekend ? settings.weekendClose : settings.weekdayClose;

  if (!settings.acceptOrders) {
    return { isOpen: false, todayOpen, todayClose, message: "Quán đang tạm ngưng nhận đơn online" };
  }

  const open = toMinutes(todayOpen);
  const close = toMinutes(todayClose);
  const isOpen = open === close || (open < close ? minutes >= open && minutes < close : minutes >= open || minutes < close);

  return {
    isOpen,
    todayOpen,
    todayClose,
    message: isOpen ? `Đang mở cửa · đóng lúc ${todayClose}` : `Quán đã đóng cửa · mở lại lúc ${todayOpen}`,
  };
}
