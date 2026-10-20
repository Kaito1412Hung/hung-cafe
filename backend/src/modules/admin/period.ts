/** Khoảng thời gian cho Tổng quan + báo cáo Excel: N ngày gần nhất, hoặc cả 1 năm */
export type Period = { kind: "days"; days: number } | { kind: "year"; year: number };

const DAY = 24 * 60 * 60 * 1000;
/** Việt Nam luôn là UTC+7 (không đổi giờ mùa hè) */
const VN_OFFSET = 7 * 60 * 60 * 1000;

export const ALLOWED_DAYS = [7, 30, 90];

/** 00:00 ngày 1/1 của năm theo giờ Việt Nam */
const yearStart = (year: number) => new Date(Date.UTC(year, 0, 1) - VN_OFFSET);

/** Năm hiện tại theo giờ Việt Nam */
export const currentYear = (now = new Date()) => new Date(now.getTime() + VN_OFFSET).getUTCFullYear();

/** Đọc ?days=30 hoặc ?year=2026 (sai thì dùng mặc định `fallbackDays`) */
export function parsePeriod(query: Record<string, unknown>, fallbackDays: number): Period {
  const year = Number(query.year);
  if (Number.isInteger(year) && year >= 2000 && year <= currentYear()) return { kind: "year", year };
  const days = Number(query.days);
  return { kind: "days", days: ALLOWED_DAYS.includes(days) ? days : fallbackDays };
}

/**
 * Mốc thời gian [start, end) của kỳ này và kỳ trước để so sánh.
 * - N ngày: N ngày gần nhất ↔ N ngày trước đó
 * - Năm đang diễn ra: 1/1 → hôm nay ↔ cùng khoảng đó của năm trước (so sánh công bằng)
 */
export function periodRange(period: Period, now = new Date()) {
  if (period.kind === "days") {
    const start = new Date(now.getTime() - period.days * DAY);
    return { start, end: now, prevStart: new Date(start.getTime() - period.days * DAY), prevEnd: start };
  }
  const start = yearStart(period.year);
  const end = new Date(Math.min(yearStart(period.year + 1).getTime(), now.getTime()));
  const prevStart = yearStart(period.year - 1);
  return { start, end, prevStart, prevEnd: new Date(prevStart.getTime() + (end.getTime() - start.getTime())) };
}

/** Các tháng của năm cần vẽ: năm nay thì tới tháng hiện tại, năm cũ thì đủ 12 tháng → ["2026-01-01", "2026-10-01"] */
export function monthSpan(year: number, now = new Date()) {
  const vnNow = new Date(now.getTime() + VN_OFFSET);
  const lastMonth = year === vnNow.getUTCFullYear() ? vnNow.getUTCMonth() + 1 : 12;
  return { first: `${year}-01-01`, last: `${year}-${String(lastMonth).padStart(2, "0")}-01` };
}

/** 00:00 hôm nay (giờ Việt Nam) lùi lại `days - 1` ngày — báo cáo Excel tính theo ngày lịch */
export function calendarDaysStart(days: number, now = new Date()) {
  const todayStart = Math.floor((now.getTime() + VN_OFFSET) / DAY) * DAY - VN_OFFSET;
  return new Date(todayStart - (days - 1) * DAY);
}
